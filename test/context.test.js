import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext, provide, consume, provideTo } from '../src/context.js';
import { define } from '../src/define.js';
import { html } from '../src/html.js';
import { signal, root, effect } from '../src/signal.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
let n = 0;
const tag = () => `c-t${n++}`;

test('a consumer receives the nearest provider value', () => {
  const Theme = createContext('theme');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  provide(parent, Theme, 'dark');
  const theme = consume(child, Theme);
  assert.equal(theme(), 'dark');
  parent.remove();
});

test('a reactive provider pushes updates to consumers', () => {
  const Count = createContext('count');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  const n = signal(1);
  provide(parent, Count, n);

  const seen = [];
  root(() => {
    const c = consume(child, Count);
    effect(() => seen.push(c()));
  });

  assert.deepEqual(seen, [1]);
  n(2);
  assert.deepEqual(seen, [1, 2]);
  n(3);
  assert.deepEqual(seen, [1, 2, 3]);
  parent.remove();
});

test('the nearest provider wins', () => {
  const Ctx = createContext('x');
  const outer = document.createElement('div');
  const inner = document.createElement('div');
  const leaf = document.createElement('div');
  outer.append(inner);
  inner.append(leaf);
  document.body.append(outer);

  provide(outer, Ctx, 'outer');
  provide(inner, Ctx, 'inner');
  assert.equal(consume(leaf, Ctx)(), 'inner');
  outer.remove();
});

test('an unmatched context falls back', () => {
  const Ctx = createContext('missing');
  const el = document.createElement('div');
  document.body.append(el);
  assert.equal(consume(el, Ctx)('') ?? consume(el, Ctx)(), undefined);
  assert.equal(consume(el, Ctx, 'fallback')(), 'fallback');
  el.remove();
});

test('different contexts do not cross', () => {
  const A = createContext('a');
  const B = createContext('b');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  provide(parent, A, 'A');
  provide(parent, B, 'B');
  assert.equal(consume(child, A)(), 'A');
  assert.equal(consume(child, B)(), 'B');
  parent.remove();
});

test('the request event is composed, so it crosses shadow roots', async () => {
  const Ctx = createContext('shadow');
  // Tag names must be literal — a `${}` where a tag goes is not a binding.
  define('ctx-inner', {
    setup(_p, host) {
      const v = consume(host, Ctx, 'none');
      return html`<i>${v}</i>`;
    },
  });
  define('ctx-outer', {
    setup(_p, host) {
      provide(host, Ctx, 'from-outer');
      return html`<ctx-inner></ctx-inner>`;
    },
  });

  const el = document.createElement('ctx-outer');
  document.body.append(el);
  await tick();

  const inner = el.shadowRoot.querySelector('ctx-inner');
  assert.equal(inner.shadowRoot.querySelector('i').textContent, 'from-outer');
  el.remove();
});

test('stopping a provider releases it', () => {
  const Ctx = createContext('stop');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  const stop = provide(parent, Ctx, 'yes');
  assert.equal(consume(child, Ctx)(), 'yes');
  stop();
  assert.equal(consume(child, Ctx, 'gone')(), 'gone');
  parent.remove();
});

test('provideTo stops providing when the element goes away', async () => {
  const Ctx = createContext('scoped');
  define('ctx-scoped', {
    setup(_p, host) {
      provideTo(host, Ctx, 'yes');
      return html`<slot></slot>`;
    },
  });

  const el = document.createElement('ctx-scoped');
  const child = document.createElement('div');
  el.append(child);
  document.body.append(el);
  await tick();

  assert.equal(consume(child, Ctx, 'gone')(), 'yes');

  // The listener is still on `el` and `child` is still inside it, so the
  // fallback here is only reached if setup's cleanup really ran.
  el.remove();
  await tick();
  assert.equal(consume(child, Ctx, 'gone')(), 'gone');
});

test('interoperates with a hand-written protocol provider', () => {
  // Exactly what @lit/context dispatches and listens for.
  const Ctx = createContext('interop');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  parent.addEventListener('context-request', (e) => {
    if (e.context !== Ctx) return;
    e.stopPropagation();
    e.callback('from-a-foreign-provider');
  });

  assert.equal(consume(child, Ctx)(), 'from-a-foreign-provider');
  parent.remove();
});

test('a foreign consumer can read an Alacris provider', () => {
  const Ctx = createContext('interop2');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  provide(parent, Ctx, 'from-alacris');

  let got = null;
  const ev = new Event('context-request', { bubbles: true, composed: true });
  ev.context = Ctx;
  ev.callback = (v) => (got = v);
  ev.subscribe = false;
  child.dispatchEvent(ev);

  assert.equal(got, 'from-alacris');
  parent.remove();
});
