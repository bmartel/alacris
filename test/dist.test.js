// Smoke test for the *built* bundle: catches minifier damage that the
// source tests cannot see (property mangling, tree shaking, dead code).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const built = existsSync(new URL('../dist/alacris.js', import.meta.url));
const opts = { skip: built ? false : 'run `npm run build` first' };

test('built bundle behaves like the source', opts, async () => {
  const j = await import('../dist/alacris.js');

  // public API is intact
  for (const k of ['signal', 'computed', 'effect', 'batch', 'untrack', 'root', 'onCleanup', 'flush', 'html', 'svg', 'css', 'keyed', 'render', 'define']) {
    assert.equal(typeof j[k], 'function', `missing export: ${k}`);
  }

  // signals
  const a = j.signal(1);
  const b = j.computed(() => a() * 2);
  const seen = [];
  const stop = j.effect(() => seen.push(b()));
  a(2);
  assert.deepEqual(seen, [2, 4]);
  assert.equal(a.peek(), 2);
  a.update(v => v + 1);
  assert.equal(a(), 3);
  a.set(4);
  assert.equal(a(), 4);
  assert.deepEqual(seen, [2, 4, 6, 8]);
  stop();
  a(5);
  assert.deepEqual(seen, [2, 4, 6, 8]);

  // rendering: text, attributes, properties, events, keyed lists
  const el = document.createElement('div');
  const n = j.signal(1);
  const items = j.signal([1, 2]);
  let clicks = 0;
  j.render(j.html`
    <p class="a ${n}" title=${n} .id=${'p1'} ?hidden=${() => n() > 1} @click=${() => clicks++}>${n}</p>
    <ul>${() => items().map(i => j.keyed(i, j.html`<li>${i}</li>`))}</ul>`, el);

  const p = el.querySelector('p');
  assert.equal(p.textContent, '1');
  assert.equal(p.getAttribute('class'), 'a 1');
  assert.equal(p.getAttribute('title'), '1');
  assert.equal(p.id, 'p1');
  assert.equal(p.hasAttribute('hidden'), false);
  p.click();
  assert.equal(clicks, 1);

  n(2);
  assert.equal(p.textContent, '2');
  assert.equal(p.getAttribute('class'), 'a 2');
  assert.equal(p.hasAttribute('hidden'), true);

  const first = el.querySelector('li');
  items([2, 1, 3]);
  const lis = [...el.querySelectorAll('li')];
  assert.deepEqual(lis.map(x => x.textContent), ['2', '1', '3']);
  assert.equal(lis[1], first);          // keyed move, not re-create

  // custom elements: option keys survive mangling
  j.define('x-dist', {
    props: { label: 'hi', count: 0 },
    shadow: 'open',
    styles: 'p { color: red }',
    setup: (props, host) => j.html`<p @click=${() => host.emit('tap')}>${props.label}:${props.count}</p>`,
  });
  const c = document.createElement('x-dist');
  c.setAttribute('count', '7');
  document.body.append(c);
  const inner = c.shadowRoot.querySelector('p');
  assert.equal(inner.textContent, 'hi:7');
  c.label = 'yo';
  assert.equal(inner.textContent, 'yo:7');
  let tapped = false;
  c.addEventListener('tap', () => { tapped = true; });
  inner.click();
  assert.equal(tapped, true);
  assert.equal(c.shadowRoot.adoptedStyleSheets.length, 1);
});

// The add-on bundles must share the core's reactive graph. If they ever bundle
// their own copy of signal.js again, a store write lands in one graph while the
// renderer's effects sit in another and everything silently stops updating —
// with no error to point at it. This is the test that catches that.
test('store and context share the core reactive graph', opts, async () => {
  const j = await import('../dist/alacris.js');
  const { store, unwrap } = await import('../dist/store.js');
  const { createContext, provide, consume } = await import('../dist/context.js');

  // A store mutation must drive a template rendered by the core bundle.
  const el = document.createElement('div');
  const state = store({ rows: [{ id: 1, label: 'one' }, { id: 2, label: 'two' }] });
  let builds = 0;
  j.render(
    j.html`<ul>${j.each(
      () => state.rows,
      (row) => { builds++; return j.html`<li>${() => row().label}</li>`; },
      (r) => r.id
    )}</ul>`,
    el
  );
  const before = [...el.querySelectorAll('li')];
  assert.deepEqual(before.map(x => x.textContent), ['one', 'two']);

  state.rows[1].label = 'TWO';
  assert.deepEqual([...el.querySelectorAll('li')].map(x => x.textContent), ['one', 'TWO']);
  assert.equal(builds, 2, 'a deep write must not rebuild rows');
  assert.deepEqual([...el.querySelectorAll('li')], before);

  state.rows.push({ id: 3, label: 'three' });
  assert.deepEqual([...el.querySelectorAll('li')].map(x => x.textContent), ['one', 'TWO', 'three']);
  assert.deepEqual(unwrap(state.rows).length, 3);

  // A context value driven by a core signal must reach a consumer.
  const Ctx = createContext('dist');
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.append(child);
  document.body.append(parent);

  const theme = j.signal('light');
  provide(parent, Ctx, theme);
  const seen = [];
  j.root(() => {
    const c = consume(child, Ctx);
    j.effect(() => seen.push(c()));
  });
  assert.deepEqual(seen, ['light']);
  theme('dark');
  assert.deepEqual(seen, ['light', 'dark']);
  parent.remove();
});
