import test from 'node:test';
import assert from 'node:assert/strict';
import { define } from '../src/define.js';
import { html } from '../src/html.js';
import { signal, computed } from '../src/signal.js';

let n = 0;
const tag = () => `x-t${n++}`;
const mount = el => { document.body.append(el); return el; };
const tick = () => new Promise(r => queueMicrotask(() => queueMicrotask(r)));

test('renders into a shadow root', () => {
  const t = tag();
  define(t, () => html`<p>hello</p>`);
  const el = mount(document.createElement(t));
  assert.equal(el.shadowRoot.querySelector('p').textContent, 'hello');
});

test('renders into light DOM when shadow is false', () => {
  const t = tag();
  define(t, { shadow: false, setup: () => html`<p>light</p>` });
  const el = mount(document.createElement(t));
  assert.equal(el.shadowRoot, null);
  assert.equal(el.querySelector('p').textContent, 'light');
});

test('props arrive as signals and drive the DOM', () => {
  const t = tag();
  define(t, { props: { label: 'a' }, setup: p => html`<p>${p.label}</p>` });
  const el = mount(document.createElement(t));
  const p = el.shadowRoot.querySelector('p');
  assert.equal(p.textContent, 'a');
  el.label = 'b';
  assert.equal(p.textContent, 'b');
  assert.equal(el.label, 'b');
});

test('attributes map to props with the declared type', () => {
  const t = tag();
  define(t, {
    props: { count: 0, name: '', open: false, items: [] },
    setup: p => html`<p>${() => `${p.count()}|${p.name()}|${p.open()}|${p.items().length}`}</p>`,
  });
  const el = document.createElement(t);
  el.setAttribute('count', '42');
  el.setAttribute('name', 'jo');
  el.setAttribute('open', '');
  el.setAttribute('items', '[1,2,3]');
  mount(el);
  assert.equal(el.shadowRoot.querySelector('p').textContent, '42|jo|true|3');
  assert.equal(el.count, 42);
  assert.equal(typeof el.count, 'number');
  el.setAttribute('count', '7');
  assert.equal(el.shadowRoot.querySelector('p').textContent, '7|jo|true|3');
  el.removeAttribute('open');
  assert.equal(el.open, false);
});

test('camelCase props observe kebab-case attributes', () => {
  const t = tag();
  define(t, { props: { maxCount: 1 }, setup: p => html`<p>${p.maxCount}</p>` });
  const el = document.createElement(t);
  el.setAttribute('max-count', '9');
  mount(el);
  assert.equal(el.shadowRoot.querySelector('p').textContent, '9');
});

// Frameworks set DOM properties on the element before inserting it.
// (The pre-upgrade replay path in the constructor is covered by demo/test.html,
// which needs a real browser: happy-dom re-creates the node instead of upgrading it.)
test('properties set before connect are kept', () => {
  const t = tag();
  define(t, { props: { value: '' }, setup: p => html`<p>${p.value}</p>` });
  const el = document.createElement(t);
  el.value = 'early';
  mount(el);
  assert.equal(el.shadowRoot.querySelector('p').textContent, 'early');
});

test('local signals and computeds work inside setup', () => {
  const t = tag();
  let inc;
  define(t, () => {
    const c = signal(1);
    const double = computed(() => c() * 2);
    inc = () => c(c() + 1);
    return html`<p>${c} ${double}</p>`;
  });
  const el = mount(document.createElement(t));
  const p = el.shadowRoot.querySelector('p');
  assert.equal(p.textContent, '1 2');
  inc();
  assert.equal(p.textContent, '2 4');
});

test('events bind and emit() dispatches upward', () => {
  const t = tag();
  define(t, {
    setup: (_p, host) => html`<button @click=${() => host.emit('pick', { n: 5 })}>go</button>`,
  });
  const el = mount(document.createElement(t));
  let got = null;
  el.addEventListener('pick', e => { got = e.detail; });
  el.shadowRoot.querySelector('button').click();
  assert.deepEqual(got, { n: 5 });
});

test('styles are attached once per definition', () => {
  const t = tag();
  define(t, { styles: 'p { color: red }', setup: () => html`<p>x</p>` });
  const a = mount(document.createElement(t));
  const b = mount(document.createElement(t));
  assert.equal(a.shadowRoot.adoptedStyleSheets.length, 1);
  assert.equal(a.shadowRoot.adoptedStyleSheets[0], b.shadowRoot.adoptedStyleSheets[0]);
});

test('setup runs once; moving the element does not re-run it', async () => {
  const t = tag();
  let runs = 0;
  define(t, () => { runs++; return html`<p>x</p>`; });
  const el = mount(document.createElement(t));
  assert.equal(runs, 1);
  const box = mount(document.createElement('div'));
  box.append(el);           // detach + reattach in the same task
  await tick();
  assert.equal(runs, 1);
  assert.equal(el.shadowRoot.querySelector('p').textContent, 'x');
});

test('removal disposes effects', async () => {
  const t = tag();
  const outside = signal(0);
  let reads = 0;
  define(t, () => html`<p>${() => { reads++; return outside(); }}</p>`);
  const el = mount(document.createElement(t));
  outside(1);
  assert.equal(reads, 2);
  el.remove();
  await tick();
  outside(2);
  assert.equal(reads, 2);
});

test('nested components compose and pass props down', () => {
  let bump;
  define('x-inner-leaf', { props: { n: 0 }, setup: p => html`<span>${p.n}</span>` });
  define('x-outer-leaf', () => {
    const c = signal(3);
    bump = () => c(c() + 1);
    return html`<x-inner-leaf .n=${c}></x-inner-leaf>`;
  });
  const el = mount(document.createElement('x-outer-leaf'));
  const child = el.shadowRoot.querySelector('x-inner-leaf');
  assert.equal(child.shadowRoot.querySelector('span').textContent, '3');
  bump();
  assert.equal(child.shadowRoot.querySelector('span').textContent, '4');
});
