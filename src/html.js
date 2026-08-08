// Alacris — rendering.
// Templates are parsed once per call site into a <template> plus a list of
// binding descriptors. Each instance clones the template natively and wires
// bindings straight to the DOM nodes. There is no virtual DOM and no diffing:
// a change to a signal writes to exactly the node that depends on it.

import { effect, effectNode, rerun, dispose, signal, root, untrack, onCleanup } from './signal.js';

// Reuse a binding's effect node across re-applications instead of allocating a
// new one each time; `fn` closes over the current value, so it must be swapped.
const live = (n, fn) => (n && rerun(n, fn)) || effectNode(fn);
const kill = (n) => (n && dispose(n), null);

// Apply a value to a child range (list items, and the render() entry point).
function bind(c, v) {
  if (typeof v === 'function') c.d = live(c.d, () => c.set(v()));
  else { c.d = kill(c.d); c.set(v); }
}

const cache = new WeakMap();
const NAME = /([^\s"'=<>/]+)=$/;
const QNAME = /([^\s"'=<>/]+)=["']([^"'<>]*)$/;
const doc = typeof document !== 'undefined' ? document : null;
const comment = () => doc.createComment('');

// Part kinds.
const CHILD = 0;
const ATTR = 1;
const SOLE = 2; // child hole that owns all of its element's content

// Bubbling events worth delegating. One listener per render root replaces one
// listener per binding, which on a thousand-row table is 1 instead of 2,000.
// `focus`/`blur` are absent because they do not bubble at all.
const DELEGATED = new Set([
  'click', 'dblclick', 'input', 'change', 'submit',
  'keydown', 'keyup', 'keypress',
  'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend',
]);

// The listener lives on the render root — the shadow root, or the container
// passed to render() — not on the document. That keeps it working for detached
// containers, keeps composed:false events like `change` in scope, and stops a
// nested component's handlers from firing twice.
function delegate(root, type) {
  const wired = root.$$w || (root.$$w = new Set());
  if (wired.has(type)) return;
  wired.add(type);
  const key = '$$' + type;
  root.addEventListener(type, (e) => {
    const path = e.composedPath();
    const ri = path.indexOf(root);
    if (ri < 0) return;
    // Anything before an inner shadow boundary belongs to that inner root and
    // has already been offered the event by its own listener.
    let lo = 0;
    for (let i = 0; i < ri; i++) if (path[i].nodeType === 11) lo = i + 1;
    for (let i = lo; i < ri; i++) {
      const h = path[i][key];
      if (h) {
        h.call(path[i], e);
        if (e.cancelBubble) return;
      }
    }
  });
}

class Tpl {
  constructor(s, v, ns) { this.s = s; this.v = v; this.ns = ns; this.k = undefined; }
}

/** Tagged template producing HTML. */
export const html = (s, ...v) => new Tpl(s, v, 0);
/** Tagged template producing SVG. */
export const svg = (s, ...v) => new Tpl(s, v, 1);
/** Tag a template with a stable key so lists reorder instead of re-render. */
export const keyed = (k, t) => (t.k = k, t);
/** Identity helper so editors highlight CSS. */
export const css = (s, ...v) => String.raw({ raw: s }, ...v);

function compile(strings, ns) {
  let out = '', tag = '', inTag = 0, q = 0, sup = 0, acc = '', cur = null, off = 0, com = 0;
  const parts = [];
  const n = strings.length;

  for (let i = 0; i < n; i++) {
    const s = strings[i];
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (sup) {
        // inside the value of an attribute that has a binding: swallow statics
        if (c === q) { cur.s.push(acc); acc = ''; cur = null; sup = 0; q = 0; }
        else acc += c;
      } else if (q) {
        out += c; tag += c;
        if (c === q) q = 0;
      } else if (inTag) {
        out += c; tag += c;
        if (c === '"' || c === "'") q = c;
        else if (c === '>') inTag = 0;
      } else if (com) {
        out += c;
        if (c === '>' && out.endsWith('-->')) com = 0;
      } else if (c === '<' && s.startsWith('!--', j + 1)) {
        out += '<!--';
        j += 3;
        com = 1;
      } else {
        out += c;
        if (c === '<') { inTag = 1; tag = ''; }
      }
    }

    if (i === n - 1) break;
    const id = parts.length;

    if (com) {                       // inside a comment: consume the value, emit nothing
      off++;
      continue;
    }
    if (sup) {                       // another hole in the same attribute value
      cur.s.push(acc); acc = ''; cur.h++;
    } else if (inTag && q) {         // first hole in a quoted attribute value
      const m = QNAME.exec(tag);
      if (!m) throw new SyntaxError('alacris: unsupported binding near `' + tag.slice(-24) + '`');
      const cut = m[1].length + 2 + m[2].length;
      out = out.slice(0, -cut); tag = tag.slice(0, -cut);
      cur = { t: 1, n: m[1], s: [m[2]], h: 1, o: off, i: 0 };
      parts.push(cur);
      out += 'j:' + id + ' '; tag += 'j:' + id + ' ';
      sup = 1; acc = '';
    } else if (inTag) {              // bare `attr=${v}`
      const m = NAME.exec(tag);
      if (!m) throw new SyntaxError('alacris: unsupported binding near `' + tag.slice(-24) + '`');
      const cut = m[1].length + 1;
      out = out.slice(0, -cut); tag = tag.slice(0, -cut);
      parts.push({ t: 1, n: m[1], s: null, h: 1, o: off, i: 0 });
      out += 'j:' + id + ' '; tag += 'j:' + id + ' ';
    } else {                         // child position: start + end anchors
      parts.push({ t: 0, n: '', s: null, h: 1, o: off, i: 0 });
      out += '<!--j:' + id + '--><!---->';
    }
    off++;
  }

  const el = doc.createElement('template');
  el.innerHTML = ns ? '<svg>' + out + '</svg>' : out;
  if (ns) {
    const root = el.content.firstChild;
    el.content.replaceChildren(...root.childNodes);
  }

  // Pass 1 — find each marker and the node it belongs to.
  //
  // A child hole that is the *entire* content of an element (`<td>${v}</td>`)
  // gets promoted to SOLE: its anchors are deleted and the binding writes the
  // element's text directly. That is three fewer nodes per hole, which on a
  // thousand-row table is the difference between competitive and not.
  const targets = [];
  const drop = [];
  const w = doc.createTreeWalker(el.content, 129);
  let node;
  while ((node = w.nextNode())) {
    if (node.nodeType === 8) {
      const d = node.data;
      if (d.charCodeAt(0) === 106 && d.charCodeAt(1) === 58) { // "j:"
        const id = +d.slice(2);
        const p = node.parentNode;
        if (p.nodeType === 1 && p.childNodes.length === 2 && p.firstChild === node) {
          parts[id].t = SOLE;
          targets.push(id, p);
          drop.push(node, node.nextSibling);
        } else {
          node.data = '';
          targets.push(id, node);
        }
      }
    } else {
      const a = node.attributes;
      for (let k = a.length - 1; k >= 0; k--) {
        const an = a[k].name;
        if (an.charCodeAt(0) === 106 && an.charCodeAt(1) === 58) {
          targets.push(+an.slice(2), node);
          node.removeAttribute(an);
        }
      }
    }
  }
  for (let i = 0; i < drop.length; i++) drop[i].remove();

  // Pass 2 — number the nodes that actually survive, so instances can find
  // them with one walk.
  const at = new Map();
  const w2 = doc.createTreeWalker(el.content, 129);
  let idx = -1;
  while ((node = w2.nextNode())) at.set(node, ++idx);
  for (let i = 0; i < targets.length; i += 2) parts[targets[i]].i = at.get(targets[i + 1]);

  parts.sort((a, b) => a.i - b.i);
  // Build each attribute part's setter once, here, so instances share them.
  for (let i = 0; i < parts.length; i++) if (parts[i].t === ATTR) prepare(parts[i]);
  return { e: el, p: parts };
}

function tplOf(t) {
  let c = cache.get(t.s);
  if (!c) cache.set(t.s, c = compile(t.s, t.ns));
  return c;
}

// ---------------------------------------------------------------- bindings

// Setters are built once per template part and shared by every instance, so a
// thousand rows allocate a thousand DOM nodes and nothing else. Anything that
// genuinely needs per-instance state (a child range, a modified listener) still
// gets an object; plain attributes, properties and delegated events do not.
function prepare(p) {
  const n = p.n, c = n.charCodeAt(0);

  if (c === 64) { // @event — a handler is a value, never a reactive expression
    p.raw = 1;
    const bits = n.slice(1).split('.');
    const type = bits[0], mods = bits.slice(1);

    if (!mods.length && DELEGATED.has(type)) {
      p.dl = type;
      const key = '$$' + type;
      p.set = (el, v) => { el[key] = v; };
      return p;
    }

    // Modifiers need real listener options, so this one keeps a wrapper.
    p.wrap = 1;
    const stop = mods.indexOf('stop') > -1, prevent = mods.indexOf('prevent') > -1;
    const opts = { capture: mods.indexOf('capture') > -1, once: mods.indexOf('once') > -1, passive: mods.indexOf('passive') > -1 };
    p.mk = (el) => {
      const w = { h: null };
      el.addEventListener(type, e => {
        if (stop) e.stopPropagation();
        if (prevent) e.preventDefault();
        if (w.h) w.h.call(el, e);
      }, opts);
      return w;
    };
    p.set = (w, v) => { w.h = v; };
    return p;
  }

  if (c === 46) { const k = n.slice(1); p.set = (el, v) => { el[k] = v; }; return p; }        // .prop
  if (c === 63) { const k = n.slice(1); p.set = (el, v) => el.toggleAttribute(k, !!v); return p; } // ?attr
  if (n === 'ref') {
    p.raw = 1;
    p.set = (el, v) => { typeof v === 'function' ? v(el) : v && (v.current = el); };
    return p;
  }

  p.set = (el, v) => v == null || v === false
    ? el.removeAttribute(n)
    : el.setAttribute(n, v === true ? '' : v);
  return p;
}

// ---------------------------------------------------------------- instances

class Inst {
  constructor(tr, c, rt) {
    this.c = c; this.rt = rt;
    const f = this.f = c.e.content.cloneNode(true);
    const w = doc.createTreeWalker(f, 129);
    const ps = c.p, ts = this.t = [], ds = this.d = [];
    let idx = -1, node = null;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      while (idx < p.i) { node = w.nextNode(); idx++; }
      if (p.t === ATTR) {
        if (p.dl) delegate(rt, p.dl);
        ts.push(p.wrap ? p.mk(node) : node);
      } else {
        ts.push(p.t === SOLE ? new Sole(node, rt) : new Child(node, node.nextSibling, rt));
      }
      ds.push(null);
    }
    this.update(tr.v);
  }

  update(vals) {
    const ps = this.c.p, ts = this.t, ds = this.d;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const target = ts[i];
      const attr = p.t === ATTR;

      // `s` is non-null only for a value spliced into static text
      // (class="btn ${kind}"), which has to be re-joined on every change.
      if (p.s !== null) {
        const join = () => {
          let r = p.s[0];
          for (let k = 0; k < p.h; k++) {
            const x = vals[p.o + k];
            const y = typeof x === 'function' ? x() : x;
            r += (y == null || y === false ? '' : y) + p.s[k + 1];
          }
          return r;
        };
        let dyn = 0;
        for (let k = 0; k < p.h; k++) if (typeof vals[p.o + k] === 'function') dyn = 1;
        if (dyn) ds[i] = live(ds[i], () => p.set(target, join()));
        else { ds[i] = kill(ds[i]); p.set(target, join()); }
        continue;
      }

      const v = vals[p.o];
      if (p.raw) { p.set(target, v); continue; }

      if (typeof v === 'function') {
        ds[i] = live(ds[i], attr ? () => p.set(target, v()) : () => target.set(v()));
      } else {
        ds[i] = kill(ds[i]);
        attr ? p.set(target, v) : target.set(v);
      }
    }
  }

  destroy() {
    const ts = this.t, ds = this.d;
    for (let i = 0; i < ts.length; i++) {
      if (ds[i]) { dispose(ds[i]); ds[i] = null; }
      const t = ts[i];
      if (t && t.destroy) t.destroy();
    }
  }
}

// A hole that owns everything inside one element. While the value stays
// primitive this is a single `textContent` write with no anchors and no Text
// bookkeeping. The moment it is handed a template, an array or a list it grows
// the anchors and hands off to a real Child.
class Sole {
  constructor(el, rt) { this.el = el; this.rt = rt; this.c = null; this.d = null; }

  set(v) {
    if (this.c) return this.c.set(v);
    if (v == null || v === false || v === true) { this.el.textContent = ''; return; }
    const t = typeof v;
    // Coerce explicitly: `textContent = 0` is spec'd to write "0", but not every
    // DOM implementation agrees, and a silently blank cell is a nasty bug.
    if (t === 'string') { this.el.textContent = v; return; }
    if (t === 'number') { this.el.textContent = '' + v; return; }
    this.el.textContent = '';
    const s = comment(), e = comment();
    this.el.append(s, e);
    this.c = new Child(s, e, this.rt);
    this.c.set(v);
  }

  destroy() {
    this.d = kill(this.d);
    if (this.c) { this.c.destroy(); this.c = null; }
    this.el.textContent = '';
  }
}

// A child binding owns the range strictly between two comment anchors.
class Child {
  constructor(s, e, rt) {
    this.s = s; this.e = e; this.rt = rt;
    this.tn = this.in = this.li = this.no = this.ea = null;
    this.d = null; this.k = undefined;
  }

  set(v) {
    if (v == null || v === false || v === '') return this.clear();
    if (v instanceof Tpl) return this.tpl(v);
    if (Array.isArray(v)) return this.list(v);
    if (v.__e) return this.each(v);
    if (v.nodeType) return this.node(v);
    this.text(v);
  }

  each(spec) {
    if (this.ea && this.ea.spec === spec) return;
    this.clear();
    this.ea = new Each(this, spec);
  }

  text(v) {
    if (this.tn) { this.tn.data = v; return; }
    this.clear();
    this.e.before(this.tn = doc.createTextNode(v));
  }

  node(v) {
    if (this.no === v) return;
    this.clear();
    this.e.before(this.no = v);
  }

  tpl(t) {
    const c = tplOf(t);
    if (this.in && this.in.c === c) return this.in.update(t.v);
    this.clear();
    const i = this.in = new Inst(t, c, this.rt);
    this.e.before(i.f);
  }

  list(vals) {
    if (!this.li) { this.clear(); this.li = []; }
    if (vals.length && vals[0] instanceof Tpl && vals[0].k !== undefined) return this.klist(vals);
    const items = this.li, n = vals.length;
    for (let i = items.length - 1; i >= n; i--) {
      const c = items[i];
      c.destroy(); c.s.remove(); c.e.remove();
    }
    if (items.length > n) items.length = n;
    for (let i = 0; i < n; i++) {
      let c = items[i];
      if (!c) {
        const s = comment(), e = comment();
        this.e.before(s, e);
        c = items[i] = new Child(s, e, this.rt);
      }
      bind(c, vals[i]);
    }
  }

  klist(vals) {
    const items = this.li, map = new Map();
    for (let i = 0; i < items.length; i++) map.set(items[i].k, items[i]);
    const out = new Array(vals.length);
    for (let i = 0; i < vals.length; i++) {
      const c = map.get(vals[i].k);
      if (c) { map.delete(vals[i].k); out[i] = c; }
      else out[i] = null;
    }
    map.forEach(c => { c.destroy(); c.s.remove(); c.e.remove(); });

    const parent = this.e.parentNode;
    let ref = this.e;
    for (let i = vals.length - 1; i >= 0; i--) {
      let c = out[i];
      if (!c) {
        const s = comment(), e = comment();
        parent.insertBefore(s, ref); parent.insertBefore(e, ref);
        c = out[i] = new Child(s, e, this.rt);
        c.k = vals[i].k;
      } else if (c.e.nextSibling !== ref) {
        let node = c.s;
        const stop = c.e.nextSibling;
        while (node !== stop) { const nx = node.nextSibling; parent.insertBefore(node, ref); node = nx; }
      }
      bind(c, vals[i]);
      ref = c.s;
    }
    this.li = out;
  }

  clear() {
    // Tear down bindings first, then sweep the range in one pass. Nested
    // children may already be detached, hence the null guard.
    if (this.ea) { this.ea.destroy(); this.ea = null; }
    if (this.in) { this.in.destroy(); this.in = null; }
    if (this.li) { for (let i = 0; i < this.li.length; i++) this.li[i].destroy(); this.li = null; }
    let n = this.s.nextSibling;
    while (n && n !== this.e) { const x = n.nextSibling; n.remove(); n = x; }
    this.tn = this.no = null;
  }

  destroy() {
    this.d = kill(this.d);
    this.clear();
  }
}

/**
 * each(source, row => template, keyFn?)
 *
 * The difference between this and mapping an array yourself is where the work
 * lands. A plain `.map` rebuilds the template result for every item on every
 * change, so the renderer has to walk all N rows to discover that one moved.
 * `each` gives every row its own reactive scope created once: reordering is
 * pure `insertBefore`, and changing one row's data wakes only that row.
 */
export function each(source, render, key) {
  return { __e: 1, s: source, r: render, k: key };
}

class Each {
  constructor(child, spec) {
    this.c = child;
    this.spec = spec;
    this.k = spec.k;
    this.wantIdx = spec.r.length > 1;
    this.items = [];
    this.rows = [];
    this.dead = 0;
    // Registered against the enclosing scope as well, so a component that is
    // torn down without going through Child.clear() still frees every row.
    this.off = onCleanup(() => this.destroy());
    // Snapshot the array *tracked* — its length and its slots are structure, and
    // a push or a reorder must rebuild — then diff the snapshot *untracked*, so
    // the key function reading `row.id` never subscribes this effect to the
    // contents of every row. Without the split, one store write deep inside a
    // single row would rebuild the entire list.
    this.stop = effect(() => {
      const list = spec.s() || [];
      const n = list.length;
      const snap = new Array(n);
      for (let i = 0; i < n; i++) snap[i] = list[i];
      untrack(() => this.sync(snap));
    });
  }

  keyOf(v, i) { return this.k ? this.k(v, i) : v; }

  makeRow(value, index) {
    const row = { v: null, x: null, d: null, f: null, l: null, g: null };
    row.d = root(() => {
      row.v = signal(value);
      if (this.wantIdx) row.x = signal(index);
      const out = this.spec.r(row.v, row.x);
      const inst = new Inst(out, tplOf(out), this.c.rt);
      const frag = inst.f;
      const kids = frag.childNodes;
      // One element root — the overwhelmingly common case — needs no markers.
      if (kids.length === 1 && kids[0].nodeType === 1) {
        row.f = row.l = kids[0];
      } else {
        const a = comment(), b = comment();
        frag.insertBefore(a, frag.firstChild);
        frag.append(b);
        row.f = a; row.l = b;
      }
      row.g = frag;
    });
    return row;
  }

  detach(row) {
    const p = row.f.parentNode;
    if (!p) return;
    let n = row.f;
    const stop = row.l.nextSibling;
    while (n !== stop) { const x = n.nextSibling; p.removeChild(n); n = x; }
  }

  move(row, parent, ref) {
    let n = row.f;
    const stop = row.l.nextSibling;
    for (;;) {
      const x = n.nextSibling;
      parent.insertBefore(n, ref);
      if (n === row.l) break;
      n = x;
    }
  }

  sync(next) {
    if (this.dead) return;
    const prev = this.items;
    const old = this.rows;
    const n = next.length;
    const p = old.length;

    if (n === 0) {
      for (let i = 0; i < p; i++) { old[i].d(); this.detach(old[i]); }
      this.items = [];
      this.rows = [];
      return;
    }

    const rows = new Array(n);
    const used = p ? new Uint8Array(p) : null;

    // Matching runs at the head and tail cover append, prepend, push and pop
    // without ever building a Map.
    let s = 0;
    while (s < p && s < n && this.keyOf(prev[s], s) === this.keyOf(next[s], s)) {
      rows[s] = old[s]; used[s] = 1; s++;
    }
    let pe = p - 1, ne = n - 1;
    while (pe >= s && ne >= s && this.keyOf(prev[pe], pe) === this.keyOf(next[ne], ne)) {
      rows[ne] = old[pe]; used[pe] = 1; pe--; ne--;
    }

    // Whatever is left in the middle gets matched by key.
    if (s <= ne && s <= pe) {
      const seen = new Map();
      for (let i = s; i <= pe; i++) if (!used[i]) seen.set(this.keyOf(prev[i], i), i);
      for (let i = s; i <= ne; i++) {
        const k = this.keyOf(next[i], i);
        const j = seen.get(k);
        if (j !== undefined) { rows[i] = old[j]; used[j] = 1; seen.delete(k); }
      }
    }

    for (let i = 0; i < p; i++) if (!used[i]) { old[i].d(); this.detach(old[i]); }

    for (let i = 0; i < n; i++) {
      const row = rows[i];
      if (!row) rows[i] = this.makeRow(next[i], i);
      else {
        row.v.set(next[i]);          // no-op when the reference is unchanged
        if (row.x) row.x.set(i);
      }
    }

    // Place back to front. Untouched runs cost one nextSibling compare each,
    // and consecutive new rows go in as a single fragment.
    const parent = this.c.e.parentNode;
    let ref = this.c.e;
    let batch = null;
    for (let i = n - 1; i >= 0; i--) {
      const row = rows[i];
      if (row.g) {
        (batch || (batch = doc.createDocumentFragment())).insertBefore(row.g, batch.firstChild);
        row.g = null;
        continue;
      }
      if (batch) { const f = batch.firstChild; parent.insertBefore(batch, ref); batch = null; ref = f; }
      if (row.l.nextSibling !== ref) this.move(row, parent, ref);
      ref = row.f;
    }
    if (batch) parent.insertBefore(batch, ref);

    this.items = next;
    this.rows = rows;
  }

  destroy() {
    if (this.dead) return;
    this.dead = 1;
    this.stop();
    const rows = this.rows;
    for (let i = 0; i < rows.length; i++) { rows[i].d(); this.detach(rows[i]); }
    this.rows = [];
    this.items = [];
  }
}

/** Render a value into a container. Returns a disposer. */
export function render(value, container) {
  const s = comment(), e = comment();
  container.append(s, e);
  const c = new Child(s, e, container);
  bind(c, value);
  return () => { c.destroy(); s.remove(); e.remove(); };
}
