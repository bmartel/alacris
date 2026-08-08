import test from 'node:test';
import assert from 'node:assert/strict';
import { html, each, render } from '../src/html.js';
import { signal } from '../src/signal.js';

const host = () => document.createElement('div');
const texts = (el, sel = 'li') => [...el.querySelectorAll(sel)].map((n) => n.textContent);

test('renders a list and tracks the source', () => {
  const el = host();
  const items = signal(['a', 'b', 'c']);
  render(html`<ul>${each(items, (it) => html`<li>${it}</li>`)}</ul>`, el);
  assert.deepEqual(texts(el), ['a', 'b', 'c']);
  items(['a', 'b', 'c', 'd']);
  assert.deepEqual(texts(el), ['a', 'b', 'c', 'd']);
  items(['d']);
  assert.deepEqual(texts(el), ['d']);
  items([]);
  assert.deepEqual(texts(el), []);
});

test('a row is built once and survives reordering', () => {
  const el = host();
  let builds = 0;
  const items = signal([1, 2, 3]);
  render(
    html`<ul>${each(items, (it) => { builds++; return html`<li>${() => it()}</li>`; })}</ul>`,
    el
  );
  assert.equal(builds, 3);
  const before = [...el.querySelectorAll('li')];

  items([3, 1, 2]);
  assert.equal(builds, 3, 'reordering must not rebuild rows');
  const after = [...el.querySelectorAll('li')];
  assert.deepEqual(texts(el), ['3', '1', '2']);
  assert.equal(after[0], before[2]);
  assert.equal(after[1], before[0]);
  assert.equal(after[2], before[1]);
});

test('reordering keeps live DOM state', () => {
  const el = host();
  const items = signal([1, 2, 3]);
  render(html`<ul>${each(items, (it) => html`<li><input /></li>`)}</ul>`, el);
  const inputs = [...el.querySelectorAll('input')];
  inputs[0].value = 'typed';
  items([3, 1, 2]);
  const after = [...el.querySelectorAll('input')];
  assert.equal(after[1], inputs[0]);
  assert.equal(after[1].value, 'typed');
});

test('changing one row wakes only that row', () => {
  const el = host();
  const rows = signal([
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
    { id: 3, label: 'three' },
  ]);
  let paints = 0;
  render(
    html`<ul>${each(
      rows,
      (r) => html`<li>${() => { paints++; return r().label; }}</li>`,
      (r) => r.id
    )}</ul>`,
    el
  );
  assert.equal(paints, 3);

  const before = [...el.querySelectorAll('li')];
  const next = rows.peek().slice();
  next[1] = { id: 2, label: 'TWO' };
  rows(next);

  assert.deepEqual(texts(el), ['one', 'TWO', 'three']);
  assert.equal(paints, 4, 'only the changed row repaints');
  assert.deepEqual([...el.querySelectorAll('li')], before, 'no nodes recreated');
});

test('append does not touch existing rows', () => {
  const el = host();
  let builds = 0;
  const items = signal([1, 2, 3]);
  render(html`<ul>${each(items, (it) => { builds++; return html`<li>${it}</li>`; })}</ul>`, el);
  const before = [...el.querySelectorAll('li')];
  builds = 0;

  items([1, 2, 3, 4, 5]);
  assert.equal(builds, 2, 'only the new rows are built');
  assert.deepEqual(texts(el), ['1', '2', '3', '4', '5']);
  assert.deepEqual([...el.querySelectorAll('li')].slice(0, 3), before);
});

test('prepend does not touch existing rows', () => {
  const el = host();
  let builds = 0;
  const items = signal([3, 4]);
  render(html`<ul>${each(items, (it) => { builds++; return html`<li>${it}</li>`; })}</ul>`, el);
  const before = [...el.querySelectorAll('li')];
  builds = 0;

  items([1, 2, 3, 4]);
  assert.equal(builds, 2);
  assert.deepEqual(texts(el), ['1', '2', '3', '4']);
  assert.deepEqual([...el.querySelectorAll('li')].slice(2), before);
});

test('removal from the middle keeps the survivors', () => {
  const el = host();
  const items = signal([1, 2, 3, 4, 5]);
  render(html`<ul>${each(items, (it) => html`<li>${it}</li>`)}</ul>`, el);
  const before = [...el.querySelectorAll('li')];
  items([1, 2, 4, 5]);
  assert.deepEqual(texts(el), ['1', '2', '4', '5']);
  const after = [...el.querySelectorAll('li')];
  assert.equal(after[0], before[0]);
  assert.equal(after[2], before[3]);
});

test('index signal is supplied and kept current', () => {
  const el = host();
  const items = signal(['a', 'b', 'c']);
  render(
    html`<ul>${each(items, (it, i) => html`<li>${() => `${i()}:${it()}`}</li>`)}</ul>`,
    el
  );
  assert.deepEqual(texts(el), ['0:a', '1:b', '2:c']);
  items(['c', 'a', 'b']);
  assert.deepEqual(texts(el), ['0:c', '1:a', '2:b']);
});

test('key function decides identity', () => {
  const el = host();
  const rows = signal([{ id: 1 }, { id: 2 }]);
  let builds = 0;
  render(
    html`<ul>${each(rows, (r) => { builds++; return html`<li>${() => r().id}</li>`; }, (r) => r.id)}</ul>`,
    el
  );
  assert.equal(builds, 2);
  // fresh objects, same ids: rows must be reused
  rows([{ id: 1 }, { id: 2 }]);
  assert.equal(builds, 2);
  rows([{ id: 3 }, { id: 1 }, { id: 2 }]);
  assert.equal(builds, 3);
  assert.deepEqual(texts(el), ['3', '1', '2']);
});

test('multi-root rows move as a unit', () => {
  const el = host();
  const items = signal(['a', 'b']);
  render(html`<div>${each(items, (it) => html`<b>${it}</b><i>${it}</i>`)}</div>`, el);
  const tag = () => [...el.querySelectorAll('b,i')].map((n) => n.tagName.toLowerCase() + n.textContent);
  assert.deepEqual(tag(), ['ba', 'ia', 'bb', 'ib']);
  items(['b', 'a']);
  assert.deepEqual(tag(), ['bb', 'ib', 'ba', 'ia']);
});

test('nested each', () => {
  const el = host();
  const groups = signal([{ id: 1, kids: ['a', 'b'] }, { id: 2, kids: ['c'] }]);
  render(
    html`<div>${each(
      groups,
      (g) => html`<section>${each(() => g().kids, (k) => html`<i>${k}</i>`)}</section>`,
      (g) => g.id
    )}</div>`,
    el
  );
  assert.deepEqual(texts(el, 'i'), ['a', 'b', 'c']);
  groups([{ id: 2, kids: ['c', 'd'] }, { id: 1, kids: ['a'] }]);
  assert.deepEqual(texts(el, 'i'), ['c', 'd', 'a']);
});

test('rows are disposed with the render', () => {
  const el = host();
  const tick = signal(0);
  let reads = 0;
  const items = signal([1, 2]);
  const stop = render(
    html`<ul>${each(items, () => html`<li>${() => { reads++; return tick(); }}</li>`)}</ul>`,
    el
  );
  assert.equal(reads, 2);
  tick(1);
  assert.equal(reads, 4);
  stop();
  tick(2);
  assert.equal(reads, 4, 'row effects are torn down');
  assert.equal(el.querySelectorAll('li').length, 0);
});

test('removed rows stop reacting', () => {
  const el = host();
  const tick = signal(0);
  let reads = 0;
  const items = signal([1, 2, 3]);
  render(html`<ul>${each(items, () => html`<li>${() => { reads++; return tick(); }}</li>`)}</ul>`, el);
  reads = 0;
  items([1]);
  tick(1);
  assert.equal(reads, 1, 'only the surviving row re-reads');
});

// The sole-content case is where the SOLE fast path has to hand off to a real
// Child. (The <tbody> shape is covered in demo/test.html — happy-dom drops
// table sections from a <template>, where real browsers keep them.)
test('each works as the sole content of an element', () => {
  const el = host();
  const items = signal(['a']);
  render(html`<ul>${each(items, (it) => html`<li>${it}</li>`)}</ul>`, el);
  assert.deepEqual(texts(el), ['a']);
  items(['a', 'b']);
  assert.deepEqual(texts(el), ['a', 'b']);
  items([]);
  assert.deepEqual(texts(el), []);
});

test('a sole-content hole renders 0 and empty string correctly', () => {
  const el = host();
  const v = signal(0);
  render(html`<p>${v}</p>`, el);
  assert.equal(el.querySelector('p').textContent, '0');
  v('');
  assert.equal(el.querySelector('p').textContent, '');
  v(42);
  assert.equal(el.querySelector('p').textContent, '42');
  v(null);
  assert.equal(el.querySelector('p').textContent, '');
});

test('a plain function source works', () => {
  const el = host();
  const n = signal(2);
  render(html`<ul>${each(() => Array.from({ length: n() }, (_, i) => i), (it) => html`<li>${it}</li>`)}</ul>`, el);
  assert.deepEqual(texts(el), ['0', '1']);
  n(4);
  assert.deepEqual(texts(el), ['0', '1', '2', '3']);
});
