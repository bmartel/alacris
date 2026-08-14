import test from 'node:test';
import assert from 'node:assert/strict';
import { store, unwrap, update, selector, peek } from '../src/store.js';
import { effect, computed } from '../src/signal.js';
import { html, each, render } from '../src/html.js';

test('peek reads a path without subscribing to it', () => {
  const s = store({ shown: 'a', hidden: 1 });
  const seen = [];
  const stop = effect(() => seen.push(s.shown + peek(() => s.hidden)));
  assert.deepEqual(seen, ['a1']);

  s.hidden = 2;                       // read through peek: no dependency, no re-run
  assert.deepEqual(seen, ['a1']);

  s.shown = 'b';                      // a tracked read re-runs, and sees the fresh value
  assert.deepEqual(seen, ['a1', 'b2']);
  stop();
});

test('reads and writes like a normal object', () => {
  const s = store({ a: 1, nested: { b: 2 } });
  assert.equal(s.a, 1);
  assert.equal(s.nested.b, 2);
  s.a = 5;
  assert.equal(s.a, 5);
  s.nested.b = 9;
  assert.equal(s.nested.b, 9);
});

test('only the readers of a changed path re-run', () => {
  const s = store({ a: 1, b: 1 });
  let ra = 0, rb = 0;
  effect(() => { s.a; ra++; });
  effect(() => { s.b; rb++; });
  assert.deepEqual([ra, rb], [1, 1]);
  s.a = 2;
  assert.deepEqual([ra, rb], [2, 1]);
  s.b = 2;
  assert.deepEqual([ra, rb], [2, 2]);
});

test('writing the same value changes nothing', () => {
  const s = store({ a: 1 });
  let runs = 0;
  effect(() => { s.a; runs++; });
  s.a = 1;
  assert.equal(runs, 1);
});

test('nested paths are independent', () => {
  const s = store({ rows: [{ id: 1, label: 'x' }, { id: 2, label: 'y' }] });
  let outer = 0, row0 = 0, row1 = 0;
  effect(() => { s.rows.length; outer++; });
  effect(() => { s.rows[0].label; row0++; });
  effect(() => { s.rows[1].label; row1++; });
  assert.deepEqual([outer, row0, row1], [1, 1, 1]);

  s.rows[0].label = 'X';
  assert.deepEqual([outer, row0, row1], [1, 2, 1], 'only row 0 wakes');

  s.rows[1].label = 'Y';
  assert.deepEqual([outer, row0, row1], [1, 2, 2]);
});

test('arrays: push, pop, splice and length', () => {
  const s = store({ list: [1, 2, 3] });
  let len = 0;
  effect(() => { s.list.length; len++; });
  assert.equal(len, 1);

  s.list.push(4);
  assert.deepEqual(unwrap(s.list), [1, 2, 3, 4]);
  assert.equal(len, 2);

  s.list.pop();
  assert.deepEqual(unwrap(s.list), [1, 2, 3]);

  s.list.splice(1, 1);
  assert.deepEqual(unwrap(s.list), [1, 3]);

  s.list = [9];
  assert.deepEqual(unwrap(s.list), [9]);
});

test('adding and deleting keys wakes key readers', () => {
  const s = store({ a: 1 });
  let keys = 0;
  effect(() => { Object.keys(s); keys++; });
  assert.equal(keys, 1);
  s.b = 2;
  assert.equal(keys, 2);
  delete s.b;
  assert.equal(keys, 3);
  assert.deepEqual(Object.keys(unwrap(s)), ['a']);
});

test('computed over a store', () => {
  const s = store({ items: [{ done: true }, { done: false }] });
  const left = computed(() => s.items.filter((i) => !i.done).length);
  assert.equal(left(), 1);
  s.items[0].done = false;
  assert.equal(left(), 2);
});

test('update() batches many mutations into one pass', () => {
  const s = store({ a: 1, b: 1 });
  let runs = 0;
  effect(() => { s.a; s.b; runs++; });
  update(s, (d) => { d.a = 2; d.b = 3; });
  assert.equal(runs, 2);
});

test('unwrap returns the raw object', () => {
  const raw = { a: 1, deep: { b: 2 } };
  const s = store(raw);
  assert.equal(unwrap(s), raw);
  assert.equal(unwrap(s.deep), raw.deep);
  assert.equal(JSON.stringify(s), '{"a":1,"deep":{"b":2}}');
});

test('non-plain values pass through untouched', () => {
  const d = new Date(0);
  const s = store({ when: d, node: null });
  assert.equal(s.when, d);
  assert.equal(s.node, null);
});

test('the same object always yields the same proxy', () => {
  const s = store({ deep: { a: 1 } });
  assert.equal(s.deep, s.deep);
});

test('mutating one row does not rebuild the list', () => {
  const el = document.createElement('div');
  const s = store({
    rows: [
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
      { id: 3, label: 'three' },
    ],
  });
  let builds = 0;
  render(
    html`<ul>${each(
      () => s.rows,
      (row) => { builds++; return html`<li>${() => row().label}</li>`; },
      (r) => r.id
    )}</ul>`,
    el
  );
  const before = [...el.querySelectorAll('li')];
  assert.equal(builds, 3);

  s.rows[1].label = 'TWO';

  assert.deepEqual([...el.querySelectorAll('li')].map((n) => n.textContent), ['one', 'TWO', 'three']);
  assert.equal(builds, 3, 'no row was rebuilt');
  assert.deepEqual([...el.querySelectorAll('li')], before, 'no node was replaced');
});

test('pushing a row appends without touching the others', () => {
  const el = document.createElement('div');
  const s = store({ rows: [{ id: 1 }, { id: 2 }] });
  let builds = 0;
  render(
    html`<ul>${each(() => s.rows, (row) => { builds++; return html`<li>${() => row().id}</li>`; }, (r) => r.id)}</ul>`,
    el
  );
  const before = [...el.querySelectorAll('li')];
  builds = 0;
  s.rows.push({ id: 3 });
  assert.equal(builds, 1);
  assert.deepEqual([...el.querySelectorAll('li')].map((n) => n.textContent), ['1', '2', '3']);
  assert.deepEqual([...el.querySelectorAll('li')].slice(0, 2), before);
});

test('array mutators apply atomically', () => {
  // splice shifts every later element one assignment at a time; an observer
  // must never see the half-shifted array.
  const s = store({ list: [1, 2, 3, 4, 5] });
  const seen = [];
  effect(() => seen.push(s.list.map((x) => x).join(',')));
  assert.deepEqual(seen, ['1,2,3,4,5']);

  s.list.splice(1, 2);
  assert.deepEqual(unwrap(s.list), [1, 4, 5]);
  assert.deepEqual(seen, ['1,2,3,4,5', '1,4,5'], 'one consistent update, no intermediates');

  s.list.reverse();
  assert.deepEqual(unwrap(s.list), [5, 4, 1]);
  assert.equal(seen.length, 3);

  s.list.unshift(9);
  assert.deepEqual(unwrap(s.list), [9, 5, 4, 1]);
  assert.equal(seen.length, 4);
});

test('splice through a rendered list never sees a hole', () => {
  const el = document.createElement('div');
  const s = store({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
  render(
    html`<ul>${each(() => s.rows, (row) => html`<li>${() => row().id}</li>`, (r) => r.id)}</ul>`,
    el
  );
  s.rows.splice(1, 2);
  assert.deepEqual([...el.querySelectorAll('li')].map((n) => n.textContent), ['1', '4']);
  s.rows.splice(0, 1);
  assert.deepEqual([...el.querySelectorAll('li')].map((n) => n.textContent), ['4']);
});

test('selector flips only the two rows that changed', () => {
  const el = document.createElement('div');
  const s = store({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }], selected: -1 });
  const isSel = selector(() => s.selected);
  let paints = 0;
  render(
    html`<ul>${each(
      () => s.rows,
      (row) => html`<li class=${() => { paints++; return isSel(row().id) ? 'on' : ''; }}></li>`,
      (r) => r.id
    )}</ul>`,
    el
  );
  assert.equal(paints, 3);
  const cls = () => [...el.querySelectorAll('li')].map((n) => n.getAttribute('class') || '');

  s.selected = 2;
  assert.deepEqual(cls(), ['', 'on', '']);
  assert.equal(paints, 4, 'only the newly selected row repaints');

  s.selected = 3;
  assert.deepEqual(cls(), ['', '', 'on']);
  assert.equal(paints, 6, 'the old and the new row, and nothing else');
});

test('selector entries are released with their rows', () => {
  const s = store({ rows: [{ id: 1 }, { id: 2 }], selected: 1 });
  const isSel = selector(() => s.selected);
  const el = document.createElement('div');
  render(
    html`<ul>${each(() => s.rows, (row) => html`<li>${() => (isSel(row().id) ? 'y' : 'n')}</li>`, (r) => r.id)}</ul>`,
    el
  );
  assert.deepEqual([...el.querySelectorAll('li')].map((n) => n.textContent), ['y', 'n']);
  s.rows.splice(0, 1);
  s.selected = 2;
  assert.deepEqual([...el.querySelectorAll('li')].map((n) => n.textContent), ['y']);
});

test('array mutators do not subscribe the calling effect', () => {
  const s = store({ list: [3, 1], other: 0 });
  let runs = 0;
  const stop = effect(() => {
    runs++;
    if (runs > 3) throw new Error('mutator subscribed its own effect');
    s.other;           // the only intended dependency
    s.list.push(runs); // reads length internally — must stay untracked
    s.list.sort();     // reads every index internally — must stay untracked
  });
  assert.equal(runs, 1);
  s.other = 1;         // the intended dependency still works
  assert.equal(runs, 2);
  stop();
});
