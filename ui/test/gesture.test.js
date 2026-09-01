import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import { createSwipeTracker, calculateVelocity, rubberBand } from '../src/motion/gesture.js';
import '../src/components/ui-sheet.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-swipe-row.js';
import '../src/components/ui-list-item.js';
import '../src/components/ui-icon-button.js';

test('calculateVelocity computes instantaneous velocity from recent history', () => {
  const now = 1000;
  const history = [
    { x: 0, y: 0, t: 850 },
    { x: 50, y: 100, t: 900 },
    { x: 150, y: 300, t: 1000 },
  ];
  const { vx, vy } = calculateVelocity(history, now, 120);
  assert.equal(vx, 1.0, '100px / 100ms = 1.0 px/ms');
  assert.equal(vy, 2.0, '200px / 100ms = 2.0 px/ms');
});

test('rubberBand applies damping factor', () => {
  assert.equal(rubberBand(100, 0.25), 25);
  assert.equal(rubberBand(-50, 0.2), -10);
});

test('createSwipeTracker locks horizontal axis and reports delta/velocity', () => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  let started = false;
  let lastMove = null;
  let lastEnd = null;

  const tracker = createSwipeTracker(div, {
    axis: 'x',
    threshold: 5,
    onStart: () => { started = true; },
    onMove: (info) => { lastMove = info; },
    onEnd: (info) => { lastEnd = info; },
  });

  // Pointer down
  const down = new PointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, isPrimary: true, button: 0 });
  div.dispatchEvent(down);

  // Small move below threshold
  const move1 = new PointerEvent('pointermove', { clientX: 103, clientY: 100, pointerId: 1, isPrimary: true });
  div.dispatchEvent(move1);
  assert.equal(started, false, 'below threshold does not lock');

  // Move past threshold
  const move2 = new PointerEvent('pointermove', { clientX: 120, clientY: 100, pointerId: 1, isPrimary: true });
  div.dispatchEvent(move2);
  assert.equal(started, true, 'locks after threshold');
  assert.equal(lastMove.dx, 20);

  // Pointer up
  const up = new PointerEvent('pointerup', { clientX: 150, clientY: 100, pointerId: 1, isPrimary: true });
  div.dispatchEvent(up);
  assert.ok(lastEnd);
  assert.equal(lastEnd.dx, 50);

  tracker.destroy();
  div.remove();
});

test('ui-sheet swipe down emits close with reason "swipe"', async () => {
  const el = mount('<ui-sheet><p>Body</p></ui-sheet>');
  await tick();
  el.open = true;
  await tick();

  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface, 'surface is mounted');

  let closeReason = null;
  el.addEventListener('close', (e) => { closeReason = e.detail.reason; });

  // Simulate dragging down past threshold with high velocity
  surface.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, isPrimary: true, button: 0 }));
  surface.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 250, pointerId: 1, isPrimary: true }));
  surface.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 350, pointerId: 1, isPrimary: true }));

  await tick();
  await tick();
  assert.equal(closeReason, 'swipe');
  unmountAll();
});

test('ui-side-sheet swipe in anchor direction emits close with reason "swipe"', async () => {
  const el = mount('<ui-side-sheet anchor="end"><p>Side body</p></ui-side-sheet>');
  await tick();
  el.open = true;
  await tick();

  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface);

  let closeReason = null;
  el.addEventListener('close', (e) => { closeReason = e.detail.reason; });

  // Dragging right for anchor="end"
  surface.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, isPrimary: true, button: 0 }));
  surface.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 100, pointerId: 1, isPrimary: true }));
  surface.dispatchEvent(new PointerEvent('pointerup', { clientX: 300, clientY: 100, pointerId: 1, isPrimary: true }));

  await tick();
  await tick();
  assert.equal(closeReason, 'swipe');
  unmountAll();
});

test('ui-swipe-row reveals end and start actions on horizontal swipe', async () => {
  const el = mount(`
    <ui-swipe-row style="width: 300px">
      <ui-icon-button slot="start" icon="star" label="Star"></ui-icon-button>
      <ui-icon-button slot="end" icon="delete" label="Delete"></ui-icon-button>
      <ui-list-item headline="Row item"></ui-list-item>
    </ui-swipe-row>
  `);
  await tick();

  const content = el.shadowRoot.querySelector('.content');
  assert.ok(content);

  let openSide = null;
  let closed = false;
  el.addEventListener('open', (e) => { openSide = e.detail.side; });
  el.addEventListener('close', () => { closed = true; });

  // Swipe left to reveal end actions
  content.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, clientY: 50, pointerId: 1, isPrimary: true, button: 0 }));
  content.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 50, pointerId: 1, isPrimary: true }));
  content.dispatchEvent(new PointerEvent('pointerup', { clientX: 80, clientY: 50, pointerId: 1, isPrimary: true }));

  await tick();
  assert.equal(openSide, 'end');

  // Clicking content when open closes it
  fire(content, 'click');
  await tick();
  assert.equal(closed, true);

  unmountAll();
});

test('ui-swipe-row controlled open property snaps correctly', async () => {
  const el = mount(`
    <ui-swipe-row>
      <ui-icon-button slot="end" icon="delete" label="Delete"></ui-icon-button>
      <div>Content</div>
    </ui-swipe-row>
  `);
  await tick();

  const content = el.shadowRoot.querySelector('.content');
  el.open = 'end';
  await tick();
  // Target position applied
  assert.ok(content.style.transform.includes('translateX'));

  el.open = '';
  await tick();
  assert.ok(content.style.transform.includes('0px'));
  unmountAll();
});
