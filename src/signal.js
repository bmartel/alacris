// Alacris — reactive core.
// Push/pull graph: writes mark observers dirty, reads pull the freshest value.
// Computeds are lazy and only recompute when a source actually changed.

const CLEAN = 0, CHECK = 1, DIRTY = 2;
const EMPTY = [];

let obs = null;      // node currently collecting dependencies
let owner = null;    // node owning newly created effects
let runId = 0;       // bumped per run, used to dedupe links
let batching = 0;
let flushing = 0;
const queue = [];

// Link arrays start out null and are created on first use. Most signals are
// never observed and most computations have one or two sources, so allocating
// four arrays per node up front was pure waste — and a thousand-row list builds
// several thousand nodes.
const node = (fn, v, eff, eq) => ({
  fn, v, eff, eq,
  st: fn ? DIRTY : CLEAN,
  srcs: null, slots: null,   // sources, and our index inside each source's obsv
  obsv: null, oslot: null,   // observers, and their index inside our srcs
  lo: null, lr: -1,          // last observer / last run that linked us
  cl: null, own: null,       // cleanups, owned children
  d: 0,
});

function link(o, s) {
  if (s.lo === o && s.lr === runId) return;
  s.lo = o; s.lr = runId;
  if (!o.srcs) { o.srcs = []; o.slots = []; }
  if (!s.obsv) { s.obsv = []; s.oslot = []; }
  const k = o.srcs.push(s) - 1;
  o.slots.push(s.obsv.push(o) - 1);
  s.oslot.push(k);
}

function unlink(o) {
  const { srcs, slots } = o;
  if (!srcs) return;
  for (let k = 0; k < srcs.length; k++) {
    const s = srcs[k], i = slots[k];
    const last = s.obsv.pop(), ls = s.oslot.pop();
    if (i < s.obsv.length) {
      s.obsv[i] = last; s.oslot[i] = ls; last.slots[ls] = i;
    }
  }
  srcs.length = slots.length = 0;
}

function notify(n, st) {
  if (n.st >= st) return;
  const prev = n.st;
  n.st = st;
  if (prev !== CLEAN) return;
  if (n.eff) {
    // Never flush here: every observer of the source must be marked before any
    // effect runs, otherwise a diamond dependency can read a stale branch.
    queue.push(n);
  } else {
    const o = n.obsv;
    if (o) for (let i = 0; i < o.length; i++) notify(o[i], CHECK);
  }
}

function cleanup(n) {
  const own = n.own, cl = n.cl;
  if (own) { n.own = null; for (let i = 0; i < own.length; i++) destroy(own[i]); }
  if (cl) { n.cl = null; for (let i = 0; i < cl.length; i++) cl[i](); }
}

function run(n) {
  cleanup(n);
  unlink(n);
  const po = obs, pw = owner;
  obs = owner = n;
  n.st = CLEAN;
  runId++;
  try {
    const v = n.fn(n.v);
    if (n.eff) {
      if (typeof v === 'function') (n.cl || (n.cl = [])).push(v);
    } else if (n.eq ? !n.eq(n.v, v) : n.v !== v) {
      n.v = v;
      const o = n.obsv;
      if (o) for (let i = 0; i < o.length; i++) notify(o[i], DIRTY);
    }
  } finally { obs = po; owner = pw; }
}

function update(n) {
  if (n.st === CHECK) {
    const srcs = n.srcs || EMPTY;
    for (let i = 0; i < srcs.length; i++) {
      if (srcs[i].fn) update(srcs[i]);
      if (n.st === DIRTY) break;
    }
    if (n.st === CHECK) n.st = CLEAN;
  }
  if (n.st === DIRTY) run(n);
}

function destroy(n) {
  if (n.d) return;
  n.d = 1;
  cleanup(n);
  unlink(n);
  n.st = CLEAN;
}

function read(n) {
  if (n.fn && !n.d) update(n);
  if (obs) link(obs, n);
  return n.v;
}

function write(s, v) {
  if (s.eq ? s.eq(s.v, v) : s.v === v) return v;
  s.v = v;
  const o = s.obsv;
  if (o) for (let i = 0; i < o.length; i++) notify(o[i], DIRTY);
  if (!batching) flush();
  return v;
}

/** Run queued effects. Safe to nest; inner calls are no-ops. */
export function flush() {
  if (flushing) return;
  flushing = 1;
  let err, thrown = 0;
  try {
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i];
      // One throwing effect must not starve the rest of the queue: run every
      // effect, then resurface the first error once the flush is complete.
      if (!n.d && n.st) try { update(n); } catch (e) { if (!thrown) { thrown = 1; err = e; } }
    }
  } finally { queue.length = 0; flushing = 0; }
  if (thrown) throw err;
}

/** A readable/writable reactive value. `s()` reads, `s(v)` / `s.set(v)` writes. */
export function signal(value, eq) {
  const s = node(null, value, 0, eq);
  function sig(v) { return arguments.length ? write(s, v) : read(s); }
  sig.set = v => write(s, v);
  sig.peek = () => s.v;
  sig.update = f => write(s, f(s.v));
  sig.node = s;
  return sig;
}

/** A lazily recomputed derived value. Call it to read. */
export function computed(fn, eq) {
  const c = node(fn, undefined, 0, eq);
  const get = () => read(c);
  get.peek = () => { update(c); return c.v; };
  get.node = c;
  return get;
}

/** Run `fn` now and again whenever its dependencies change. Returns a disposer.
 *  `fn` may return a cleanup function, run before the next execution and on dispose. */
export function effect(fn) {
  return dispose.bind(null, effectNode(fn));
}

// Internals for the renderer. A binding wants the node itself, not a disposer
// closure: it can then swap `fn` and re-run in place when a template is
// re-applied, instead of allocating a fresh node and leaking the old one into
// its owner's child list.
export function effectNode(fn) {
  const n = node(fn, undefined, 1);
  if (owner) (owner.own || (owner.own = [])).push(n);
  run(n);
  return n;
}
// Returns the node if it is still alive, else null: an owner re-running its
// cleanup destroys every effect it created, and a dead node can never be
// revived — the caller has to allocate a fresh one.
export function rerun(n, fn) { if (n.d) return null; n.fn = fn; run(n); return n; }
export function dispose(n) { destroy(n); }

/** Group writes so dependent effects run once, at the end. */
export function batch(fn) {
  batching++;
  try { return fn(); } finally { if (!--batching) flush(); }
}

/** True while a subscriber (an effect or a computed) is collecting
 *  dependencies. Lets store-like integrations skip subscription bookkeeping
 *  entirely for reads that nothing is listening to. */
export function tracking() {
  return obs !== null;
}

/** Read without subscribing. */
export function untrack(fn) {
  const p = obs;
  obs = null;
  try { return fn(); } finally { obs = p; }
}

/** Create an ownership scope. Returns a disposer for every effect created inside. */
export function root(fn) {
  const n = node(null, undefined, 0);
  const po = obs, pw = owner;
  obs = null; owner = n;
  try { fn(); } finally { obs = po; owner = pw; }
  return () => cleanup(n);
}

/** Register a cleanup with the nearest enclosing effect or root. */
export function onCleanup(fn) {
  if (owner) (owner.cl || (owner.cl = [])).push(fn);
  return fn;
}
