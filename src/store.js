// Alacris — store.
//
// A deeply reactive object. Reading a path subscribes to that path; writing one
// wakes only the readers of that path. `state.rows[3].label = 'x'` updates the
// one text node showing it — the list is not re-diffed, the row is not
// rebuilt, and nothing else is even consulted.
//
// This is what makes large state workable. Handing a fresh array to a signal
// tells the renderer only "something changed"; a store tells it exactly what.

import { signal, effect, untrack, batch, onCleanup } from './signal.js';

const RAW = Symbol('alacris.raw');
const KEYS = Symbol('alacris.keys');
const meta = new WeakMap();
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

const isObj = (v) => v !== null && typeof v === 'object';
// Only plain objects and arrays become reactive. Dates, Maps, DOM nodes, class
// instances and everything else are stored and returned as they are.
const plain = (v) => {
  if (!isObj(v)) return false;
  if (Array.isArray(v)) return true;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};

function entry(target) {
  let e = meta.get(target);
  if (!e) meta.set(target, (e = { p: null, s: new Map() }));
  return e;
}

// One version counter per observed key, created the first time it is read.
function version(e, key) {
  let v = e.s.get(key);
  if (!v) e.s.set(key, (v = signal(0)));
  return v;
}

const touch = (e, key) => {
  const v = e.s.get(key);
  if (v) v.set(v.peek() + 1);
};

const handler = {
  get(t, k, r) {
    if (k === RAW) return t;
    if (typeof k === 'symbol') return Reflect.get(t, k, r);
    const v = Reflect.get(t, k, r);
    // Array mutators read `length` and the indices themselves; tracking inside
    // them would subscribe the caller to the whole array.
    if (typeof v === 'function') {
      // `splice` moves every element after the cut, one assignment at a time.
      // Left unbatched, observers would run against a half-shifted array — with
      // holes where elements have not landed yet. Mutators are atomic.
      if (Array.isArray(t) && MUTATORS.has(k)) {
        const e = entry(t);
        const m = e.m || (e.m = new Map());
        let w = m.get(k);
        if (!w) m.set(k, (w = function (...args) { return batch(() => v.apply(this, args)); }));
        return w;
      }
      return v;
    }
    version(entry(t), k)();
    return plain(v) ? proxy(v) : v;
  },

  set(t, k, value) {
    const raw = isObj(value) && value[RAW] ? value[RAW] : value;
    const e = entry(t);
    const had = Object.prototype.hasOwnProperty.call(t, k);
    const prev = t[k];
    if (had && prev === raw) return true;

    const len = Array.isArray(t) ? t.length : -1;
    t[k] = raw;

    batch(() => {
      touch(e, k);
      if (!had) touch(e, KEYS);
      // A push moves `length`; a shrink invalidates everything it dropped.
      if (len >= 0) {
        if (k === 'length') for (let i = raw; i < len; i++) touch(e, '' + i);
        if (t.length !== len) touch(e, 'length');
      }
    });
    return true;
  },

  deleteProperty(t, k) {
    if (!Object.prototype.hasOwnProperty.call(t, k)) return true;
    const e = entry(t);
    delete t[k];
    batch(() => { touch(e, k); touch(e, KEYS); });
    return true;
  },

  has(t, k) {
    if (typeof k !== 'symbol') version(entry(t), k)();
    return Reflect.has(t, k);
  },

  ownKeys(t) {
    version(entry(t), KEYS)();
    return Reflect.ownKeys(t);
  },
};

function proxy(target) {
  const e = entry(target);
  return e.p || (e.p = new Proxy(target, handler));
}

/**
 * Wrap an object or array so every path in it is independently reactive.
 * Mutate it like a normal object; read it inside an effect, a computed or a
 * template binding and that binding alone re-runs.
 */
export function store(initial) {
  if (!plain(initial)) throw new TypeError('alacris: store() needs a plain object or array');
  return proxy(initial);
}

/** The underlying object, with no tracking. Useful for JSON and equality. */
export function unwrap(v) {
  return isObj(v) && v[RAW] ? v[RAW] : v;
}

/**
 * Apply a batch of mutations as one update. Readers see the finished state and
 * run once, however many paths you touched.
 */
export function update(target, fn) {
  return batch(() => fn(target));
}

/**
 * Read without subscribing — the store equivalent of `signal.peek()`.
 */
export function peek(fn) {
  return untrack(fn);
}

/**
 * selector(source) — turn "which one is selected?" from O(n) into O(1).
 *
 * A thousand rows each asking `row.id === selected()` means a thousand
 * subscribers on one signal, so every selection change wakes every row. A
 * selector keeps one tiny signal per asked-about key and flips exactly two of
 * them: the row losing selection and the row gaining it.
 *
 *   const isSelected = selector(() => state.selected);
 *   html`<tr class=${() => (isSelected(row().id) ? 'danger' : '')}>`
 */
export function selector(source, equals) {
  const keys = new Map();
  const same = equals || ((a, b) => a === b);
  let current;

  effect(() => {
    const next = source();
    if (same(next, current)) return;
    const was = keys.get(current);
    if (was) was.s.set(false);
    const now = keys.get(next);
    if (now) now.s.set(true);
    current = next;
  });

  return (key) => {
    let e = keys.get(key);
    if (!e) keys.set(key, (e = { s: signal(same(key, current)), n: 0 }));
    e.n++;
    // Reading happens inside a row's own scope, so the entry dies with the row.
    onCleanup(() => { if (--e.n === 0) keys.delete(key); });
    return e.s();
  };
}
