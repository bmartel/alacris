import test from 'node:test';
import assert from 'node:assert/strict';
import { html, svg, keyed, render } from '../src/html.js';
import { signal } from '../src/signal.js';

const host = () => document.createElement('div');
const norm = el => el.innerHTML.replace(/<!--[^>]*-->/g, '');

test('static markup', () => {
  const el = host();
  render(html`<p class="a">hi</p>`, el);
  assert.equal(norm(el), '<p class="a">hi</p>');
});

test('text interpolation', () => {
  const el = host();
  render(html`<p>${'a'} and ${2}</p>`, el);
  assert.equal(norm(el), '<p>a and 2</p>');
});

test('reactive text updates only its own node', () => {
  const el = host();
  const n = signal(1);
  render(html`<p>count: ${n}</p>`, el);
  const p = el.querySelector('p');
  assert.equal(p.textContent, 'count: 1');
  n(2);
  assert.equal(p.textContent, 'count: 2');
  assert.equal(el.querySelector('p'), p);   // node identity preserved
});

test('bare attribute binding', () => {
  const el = host();
  const c = signal('one');
  render(html`<p class=${c}></p>`, el);
  assert.equal(el.querySelector('p').getAttribute('class'), 'one');
  c('two');
  assert.equal(el.querySelector('p').getAttribute('class'), 'two');
});

test('attribute removed for null/false', () => {
  const el = host();
  const v = signal('x');
  render(html`<p title=${v}></p>`, el);
  assert.equal(el.querySelector('p').hasAttribute('title'), true);
  v(null);
  assert.equal(el.querySelector('p').hasAttribute('title'), false);
});

test('interpolated attribute value with statics', () => {
  const el = host();
  const active = signal('on');
  render(html`<p class="btn ${active} end"></p>`, el);
  assert.equal(el.querySelector('p').getAttribute('class'), 'btn on end');
  active('off');
  assert.equal(el.querySelector('p').getAttribute('class'), 'btn off end');
});

test('two holes in one attribute value', () => {
  const el = host();
  const a = signal(1), b = signal(2);
  render(html`<p data-x="${a}-${b}"></p>`, el);
  assert.equal(el.querySelector('p').dataset.x, '1-2');
  b(9);
  assert.equal(el.querySelector('p').dataset.x, '1-9');
});

test('property, boolean and event bindings', () => {
  const el = host();
  const val = signal('hello'), off = signal(true);
  let clicks = 0;
  render(html`<input .value=${val} ?disabled=${off} @click=${() => clicks++}>`, el);
  const input = el.querySelector('input');
  assert.equal(input.value, 'hello');
  assert.equal(input.hasAttribute('disabled'), true);
  off(false);
  assert.equal(input.hasAttribute('disabled'), false);
  input.click();
  input.click();
  assert.equal(clicks, 2);
});

test('event modifiers', () => {
  const el = host();
  let n = 0;
  render(html`<button @click.once=${() => n++}></button>`, el);
  const b = el.querySelector('button');
  b.click(); b.click();
  assert.equal(n, 1);
});

test('ref binding', () => {
  const el = host();
  let got = null;
  render(html`<p ref=${e => { got = e; }}></p>`, el);
  assert.equal(got, el.querySelector('p'));
});

test('nested templates swap when the template changes', () => {
  const el = host();
  const on = signal(true);
  render(html`<div>${() => (on() ? html`<a>yes</a>` : html`<b>no</b>`)}</div>`, el);
  assert.equal(norm(el), '<div><a>yes</a></div>');
  on(false);
  assert.equal(norm(el), '<div><b>no</b></div>');
});

test('same template reuses its DOM', () => {
  const el = host();
  const n = signal(1);
  render(html`<div>${() => html`<a>${n()}</a>`}</div>`, el);
  const a = el.querySelector('a');
  n(2);
  assert.equal(el.querySelector('a'), a);
  assert.equal(a.textContent, '2');
});

test('unkeyed lists grow and shrink', () => {
  const el = host();
  const items = signal(['a', 'b', 'c']);
  render(html`<ul>${() => items().map(i => html`<li>${i}</li>`)}</ul>`, el);
  assert.equal(norm(el), '<ul><li>a</li><li>b</li><li>c</li></ul>');
  items(['a', 'b']);
  assert.equal(norm(el), '<ul><li>a</li><li>b</li></ul>');
  items(['a', 'b', 'c', 'd']);
  assert.equal(norm(el), '<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>');
  items([]);
  assert.equal(norm(el), '<ul></ul>');
});

test('keyed lists reorder without recreating nodes', () => {
  const el = host();
  const items = signal([1, 2, 3]);
  render(html`<ul>${() => items().map(i => keyed(i, html`<li>${i}</li>`))}</ul>`, el);
  const before = [...el.querySelectorAll('li')];
  assert.deepEqual(before.map(n => n.textContent), ['1', '2', '3']);

  items([3, 1, 2]);
  const after = [...el.querySelectorAll('li')];
  assert.deepEqual(after.map(n => n.textContent), ['3', '1', '2']);
  assert.equal(after[0], before[2]);   // same DOM nodes, moved
  assert.equal(after[1], before[0]);
  assert.equal(after[2], before[1]);

  items([2, 3]);
  assert.deepEqual([...el.querySelectorAll('li')].map(n => n.textContent), ['2', '3']);
});

test('keyed insert in the middle', () => {
  const el = host();
  const items = signal(['a', 'c']);
  render(html`<ul>${() => items().map(i => keyed(i, html`<li>${i}</li>`))}</ul>`, el);
  const a = el.querySelector('li');
  items(['a', 'b', 'c']);
  assert.deepEqual([...el.querySelectorAll('li')].map(n => n.textContent), ['a', 'b', 'c']);
  assert.equal(el.querySelector('li'), a);
});

test('nested lists', () => {
  const el = host();
  const rows = signal([['a', 'b'], ['c']]);
  render(html`<div>${() => rows().map(r => html`<p>${r.map(c => html`<i>${c}</i>`)}</p>`)}</div>`, el);
  assert.equal(norm(el), '<div><p><i>a</i><i>b</i></p><p><i>c</i></p></div>');
  rows([['x']]);
  assert.equal(norm(el), '<div><p><i>x</i></p></div>');
});

test('null, false and empty string render nothing', () => {
  const el = host();
  const v = signal('x');
  render(html`<p>${v}</p>`, el);
  assert.equal(el.querySelector('p').textContent, 'x');
  for (const empty of [null, undefined, false, '']) {
    v(empty);
    assert.equal(el.querySelector('p').textContent, '');
  }
});

test('raw nodes can be interpolated', () => {
  const el = host();
  const n = document.createElement('span');
  n.textContent = 'raw';
  render(html`<div>${n}</div>`, el);
  assert.equal(el.querySelector('span'), n);
});

test('multiple bindings on one element keep their order', () => {
  const el = host();
  render(html`<p id=${'a'} class=${'b'} title=${'c'}>${'d'}</p>`, el);
  const p = el.querySelector('p');
  assert.equal(p.id, 'a');
  assert.equal(p.getAttribute('class'), 'b');
  assert.equal(p.title, 'c');
  assert.equal(p.textContent, 'd');
});

test('comments in the template survive', () => {
  const el = host();
  render(html`<p><!-- keep --> ${'x'}</p>`, el);
  assert.match(el.innerHTML, /<!-- keep -->/);
});

test('svg keeps the right namespace', () => {
  const el = host();
  render(svg`<circle r=${5}></circle>`, el);
  const c = el.querySelector('circle');
  assert.equal(c.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(c.getAttribute('r'), '5');
});

test('render disposer removes everything', () => {
  const el = host();
  const n = signal(1);
  const stop = render(html`<p>${n}</p>`, el);
  stop();
  assert.equal(el.innerHTML, '');
  n(2);   // no throw: bindings are gone
});

test('disposing stops nested effects', () => {
  const el = host();
  const n = signal(0);
  let reads = 0;
  const stop = render(html`<p>${() => { reads++; return n(); }}</p>`, el);
  n(1);
  assert.equal(reads, 2);
  stop();
  n(2);
  assert.equal(reads, 2);
});

test('removing keyed items disposes their effects', () => {
  const el = host();
  const items = signal([1, 2]);
  const tick = signal(0);
  let reads = 0;
  render(html`<ul>${() => items().map(i => keyed(i, html`<li>${() => { reads++; return i + tick(); }}</li>`))}</ul>`, el);
  reads = 0;
  tick(1);
  assert.equal(reads, 2);
  items([1]);
  reads = 0;
  tick(2);
  assert.equal(reads, 1);
});

test('delegated handlers need the event to bubble', () => {
  // Delegation moves the listener to the render root, so a synthetic event
  // dispatched with the default `bubbles: false` never reaches it. Real
  // user-generated events all bubble; hand-made ones in tests must say so.
  const el = host();
  document.body.append(el);
  let hits = 0;
  render(html`<button @click=${() => hits++}></button>`, el);
  const b = el.querySelector('button');

  b.dispatchEvent(new Event('click'));
  assert.equal(hits, 0, 'a non-bubbling synthetic event is not delegated');

  b.dispatchEvent(new Event('click', { bubbles: true }));
  assert.equal(hits, 1);
  b.click();
  assert.equal(hits, 2);
  el.remove();
});

test('a modifier opts out of delegation and attaches a real listener', () => {
  const el = host();
  let hits = 0;
  render(html`<button @click.once=${() => hits++}></button>`, el);
  const b = el.querySelector('button');
  // Direct listener: fires even detached and even without bubbling.
  b.dispatchEvent(new Event('click'));
  b.dispatchEvent(new Event('click'));
  assert.equal(hits, 1);
});
