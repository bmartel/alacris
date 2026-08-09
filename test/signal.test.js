import test from 'node:test';
import assert from 'node:assert/strict';
import { signal, computed, effect, batch, untrack, root, onCleanup, flush } from '../src/signal.js';

test('signal reads and writes', () => {
  const a = signal(1);
  assert.equal(a(), 1);
  a(2);
  assert.equal(a(), 2);
  a.set(3);
  assert.equal(a(), 3);
  a.update(v => v + 1);
  assert.equal(a(), 4);
  assert.equal(a.peek(), 4);
});

test('computed is lazy and memoized', () => {
  let runs = 0;
  const a = signal(1);
  const b = computed(() => (runs++, a() * 2));
  assert.equal(runs, 0);
  assert.equal(b(), 2);
  assert.equal(b(), 2);
  assert.equal(runs, 1);
  a(5);
  assert.equal(runs, 1);      // still lazy: nothing has read it
  assert.equal(b(), 10);
  assert.equal(runs, 2);
});

test('effect runs immediately and on change', () => {
  const a = signal(0);
  const seen = [];
  const stop = effect(() => seen.push(a()));
  assert.deepEqual(seen, [0]);
  a(1);
  a(2);
  assert.deepEqual(seen, [0, 1, 2]);
  stop();
  a(3);
  assert.deepEqual(seen, [0, 1, 2]);
});

test('flush drains the queue a batch is holding', () => {
  const a = signal(0);
  const seen = [];
  const stop = effect(() => seen.push(a()));
  assert.deepEqual(seen, [0]);

  batch(() => {
    a(1);
    assert.deepEqual(seen, [0]);        // batching queues the effect instead of running it
    flush();
    assert.deepEqual(seen, [0, 1]);     // ...until something asks for it
    a(2);
  });
  assert.deepEqual(seen, [0, 1, 2]);    // and the batch still flushes what is left

  flush();                              // nothing queued: a no-op, not a re-run
  assert.deepEqual(seen, [0, 1, 2]);
  stop();
});

test('no re-run when the value is unchanged', () => {
  const a = signal(1);
  let runs = 0;
  effect(() => { a(); runs++; });
  a(1);
  assert.equal(runs, 1);
});

test('diamond: effect runs once per change, no glitches', () => {
  const a = signal(1);
  const b = computed(() => a() + 1);
  const c = computed(() => a() * 10);
  const seen = [];
  effect(() => seen.push(b() + c()));
  assert.deepEqual(seen, [12]);
  a(2);
  assert.deepEqual(seen, [12, 23]);
});

test('computed does not propagate when its value is stable', () => {
  const a = signal(2);
  const even = computed(() => a() % 2 === 0);
  let runs = 0;
  effect(() => { even(); runs++; });
  assert.equal(runs, 1);
  a(4);                       // still even → downstream must not re-run
  assert.equal(runs, 1);
  a(5);
  assert.equal(runs, 2);
});

test('batch coalesces writes', () => {
  const a = signal(0), b = signal(0);
  let runs = 0;
  effect(() => { a(); b(); runs++; });
  assert.equal(runs, 1);
  batch(() => { a(1); b(1); a(2); });
  assert.equal(runs, 2);
});

test('untrack does not subscribe', () => {
  const a = signal(0), b = signal(0);
  let runs = 0;
  effect(() => { a(); untrack(() => b()); runs++; });
  b(1);
  assert.equal(runs, 1);
  a(1);
  assert.equal(runs, 2);
});

test('dynamic dependencies unsubscribe', () => {
  const on = signal(true), a = signal('a'), b = signal('b');
  const seen = [];
  effect(() => seen.push(on() ? a() : b()));
  assert.deepEqual(seen, ['a']);
  b('B');                       // not a dependency yet
  assert.deepEqual(seen, ['a']);
  on(false);
  assert.deepEqual(seen, ['a', 'B']);
  a('A');                       // no longer a dependency
  assert.deepEqual(seen, ['a', 'B']);
  b('BB');
  assert.deepEqual(seen, ['a', 'B', 'BB']);
});

test('effects clean up before re-running and on dispose', () => {
  const a = signal(0);
  const log = [];
  const stop = effect(() => {
    const v = a();
    log.push('run' + v);
    return () => log.push('clean' + v);
  });
  a(1);
  a(2);
  stop();
  assert.deepEqual(log, ['run0', 'clean0', 'run1', 'clean1', 'run2', 'clean2']);
});

test('onCleanup registers with the enclosing effect', () => {
  const a = signal(0);
  const log = [];
  const stop = effect(() => { const v = a(); onCleanup(() => log.push(v)); });
  a(1);
  stop();
  assert.deepEqual(log, [0, 1]);
});

test('root disposes nested effects', () => {
  const a = signal(0);
  let runs = 0;
  const dispose = root(() => { effect(() => { a(); runs++; }); });
  a(1);
  assert.equal(runs, 2);
  dispose();
  a(2);
  assert.equal(runs, 2);
});

test('nested effects are disposed by their parent re-running', () => {
  const outer = signal(0), inner = signal(0);
  let innerRuns = 0;
  effect(() => { outer(); effect(() => { inner(); innerRuns++; }); });
  assert.equal(innerRuns, 1);
  inner(1);
  assert.equal(innerRuns, 2);
  outer(1);                     // re-run: old inner effect disposed, new one created
  assert.equal(innerRuns, 3);
  inner(2);
  assert.equal(innerRuns, 4);   // only one live inner effect
});

test('writes inside an effect propagate', () => {
  const a = signal(0), b = signal(0);
  effect(() => b(a() * 2));
  const seen = [];
  effect(() => seen.push(b()));
  a(3);
  assert.deepEqual(seen, [0, 6]);
});

test('custom equality', () => {
  const a = signal({ n: 1 }, (x, y) => x.n === y.n);
  let runs = 0;
  effect(() => { a(); runs++; });
  a({ n: 1 });
  assert.equal(runs, 1);
  a({ n: 2 });
  assert.equal(runs, 2);
});

test('deep chains stay consistent', () => {
  const a = signal(0);
  let c = computed(() => a());
  for (let i = 0; i < 50; i++) { const p = c; c = computed(() => p() + 1); }
  assert.equal(c(), 50);
  a(10);
  assert.equal(c(), 60);
});

test('repeated reads of the same source link once', () => {
  const a = signal(1);
  let runs = 0;
  effect(() => { a(); a(); a(); runs++; });
  a(2);
  assert.equal(runs, 2);
  a(3);
  assert.equal(runs, 3);
});
