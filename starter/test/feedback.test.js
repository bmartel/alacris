// Smoke tests for the feedback family: alert, progress, spinner, skeleton,
// backdrop, snackbar (component + service).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-alert.js';
import '../src/components/ui-progress.js';
import '../src/components/ui-spinner.js';
import '../src/components/ui-loading-indicator.js';
import '../src/components/ui-skeleton.js';
import '../src/components/ui-backdrop.js';
import { showSnackbar } from '../src/components/ui-snackbar.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('ui-alert renders severity/variant, defaults role=status, swaps icon per severity', async () => {
  const el = mount('<ui-alert title="Heads up">Body text</ui-alert>');
  await tick();
  assert.equal(el.getAttribute('role'), 'status');
  const container = el.shadowRoot.querySelector('.container');
  assert.ok(container.className.includes('tonal'), 'default variant is tonal');
  assert.ok(container.className.includes('info'), 'default severity is info');
  assert.equal(el.shadowRoot.querySelector('.icon').name, 'info');
  assert.equal(el.shadowRoot.querySelector('.title').textContent.trim(), 'Heads up');

  el.severity = 'error';
  el.variant = 'filled';
  assert.ok(container.className.includes('filled'), 'variant prop is live');
  assert.ok(container.className.includes('error'));
  assert.equal(el.shadowRoot.querySelector('.icon').name, 'error', 'icon follows severity');
  el.icon = 'star';
  assert.equal(el.shadowRoot.querySelector('.icon').name, 'star', 'icon override wins');
  unmountAll();
});

test('ui-alert dismiss button collapses and emits dismiss', async () => {
  const el = mount('<ui-alert dismissible>Bye</ui-alert>');
  await tick();
  let dismissed = 0;
  el.addEventListener('dismiss', () => dismissed++);
  const close = el.shadowRoot.querySelector('.close');
  assert.ok(close, 'dismissible renders a close button');
  fire(close, 'click');
  await tick(); // happy-dom measures 0 height → immediate dismiss (still async-safe)
  assert.equal(dismissed, 1);
  unmountAll();
});

test('ui-progress exposes progressbar semantics and a live determinate width', async () => {
  const el = mount('<ui-progress label="Upload" value="30"></ui-progress>');
  await tick();
  const track = el.shadowRoot.querySelector('.track');
  assert.equal(track.getAttribute('role'), 'progressbar');
  assert.equal(track.getAttribute('aria-label'), 'Upload');
  assert.equal(track.getAttribute('aria-valuemin'), '0');
  assert.equal(track.getAttribute('aria-valuemax'), '100');
  assert.equal(track.getAttribute('aria-valuenow'), '30');
  assert.ok(!track.className.includes('indeterminate'));
  assert.equal(track.style.getPropertyValue('--ui-progress-pct'), '30%');

  el.value = 55;
  assert.equal(track.getAttribute('aria-valuenow'), '55');
  assert.equal(track.style.getPropertyValue('--ui-progress-pct'), '55%');

  el.value = -1;
  assert.ok(track.className.includes('indeterminate'));
  assert.equal(track.getAttribute('aria-valuenow'), null, 'indeterminate omits aria-valuenow');
  unmountAll();
});

test('ui-spinner draws the arc, binds dashoffset, and honors size', async () => {
  const el = mount('<ui-spinner label="Loading"></ui-spinner>');
  await tick();
  const wrap = el.shadowRoot.querySelector('.progress');
  assert.equal(wrap.getAttribute('role'), 'progressbar');
  assert.ok(wrap.className.includes('indeterminate'));
  assert.equal(wrap.getAttribute('aria-valuenow'), null);
  assert.ok(el.shadowRoot.querySelector('circle.arc'), 'renders the SVG arc');

  el.value = 50;
  assert.ok(!wrap.className.includes('indeterminate'));
  assert.equal(wrap.getAttribute('aria-valuenow'), '50');
  const offset = parseFloat(el.shadowRoot.querySelector('circle.arc').getAttribute('stroke-dashoffset'));
  assert.ok(Math.abs(offset - Math.PI * 20) < 0.1, 'half progress = half circumference offset');

  el.size = '24px';
  assert.equal(el.style.getPropertyValue('--ui-spinner-size'), '24px');
  unmountAll();
});

test('ui-skeleton is decorative and reflects variant/animation/dimensions', async () => {
  const el = mount('<ui-skeleton width="60%"></ui-skeleton>');
  await tick();
  assert.equal(el.getAttribute('aria-hidden'), 'true');
  const shape = el.shadowRoot.querySelector('.shape');
  assert.ok(shape.className.includes('text'), 'default variant is text');
  assert.ok(shape.className.includes('pulse'), 'default animation is pulse');
  assert.equal(shape.style.width, '60%');

  el.variant = 'circular';
  el.animation = 'wave';
  el.height = '40px';
  assert.ok(shape.className.includes('circular'));
  assert.ok(shape.className.includes('wave'));
  assert.ok(!shape.className.includes('pulse'));
  assert.equal(shape.style.height, '40px');

  el.animation = 'none';
  assert.ok(!shape.className.includes('wave'));
  unmountAll();
});

test('ui-backdrop mounts on open, emits close on click, animates out', async () => {
  const el = mount('<ui-backdrop></ui-backdrop>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.scrim'), null, 'closed = no DOM');

  el.open = true;
  const scrim = el.shadowRoot.querySelector('.scrim');
  assert.ok(scrim, 'open renders the scrim synchronously');
  el.invisible = true;
  assert.ok(scrim.className.includes('invisible'), 'invisible prop is live');

  let reason = null;
  el.addEventListener('close', (e) => (reason = e.detail.reason));
  fire(scrim, 'click');
  assert.equal(reason, 'scrim');

  el.open = false;
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.scrim'), null, 'exit removes the DOM');
  unmountAll();
});

test('ui-snackbar shows, fires action, and reports closed after exit', async () => {
  const el = mount('<ui-snackbar message="Saved" action="Undo" duration="0"></ui-snackbar>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.surface'), null, 'closed = no DOM');

  el.open = true;
  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface);
  assert.equal(surface.getAttribute('role'), 'status');
  assert.equal(el.shadowRoot.querySelector('.message').textContent.trim(), 'Saved');

  let acted = 0;
  let reason = null;
  let closedFired = 0;
  el.addEventListener('action', () => acted++);
  el.addEventListener('close', (e) => (reason = e.detail.reason));
  el.addEventListener('closed', () => closedFired++);
  fire(el.shadowRoot.querySelector('.action'), 'click');
  assert.equal(acted, 1);
  assert.equal(reason, 'action', 'action requests close');

  el.open = false; // the parent flips open in response to `close`
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.surface'), null, 'exit removes the DOM');
  assert.equal(closedFired, 1);
  unmountAll();
});

test('ui-snackbar auto-dismisses after `duration` and close button emits reason', async () => {
  const el = mount('<ui-snackbar message="Hi" duration="20" close-button></ui-snackbar>');
  await tick();
  let reason = null;
  el.addEventListener('close', (e) => (reason = e.detail.reason));

  el.open = true;
  assert.ok(el.shadowRoot.querySelector('.close'), 'closeButton renders');
  fire(el.shadowRoot.querySelector('.close'), 'click');
  assert.equal(reason, 'close');

  reason = null;
  await sleep(50); // real timer: still open (parent never flipped), so timeout fires
  assert.equal(reason, 'timeout');
  unmountAll();
});

test('showSnackbar queues FIFO and shows the next after the previous exits', async () => {
  const first = showSnackbar('one', { duration: 0 });
  const second = showSnackbar('two', { duration: 0 });
  await tick();

  const el = document.querySelector('ui-snackbar');
  assert.ok(el, 'service appends a singleton host to body');
  assert.equal(el.message, 'one');
  assert.equal(el.open, true);
  assert.equal(document.querySelectorAll('ui-snackbar').length, 1, 'one host for the whole queue');

  first.close();
  await first.closed;
  await tick();
  assert.equal(el.message, 'two', 'second shows only after the first fully exits');
  assert.equal(el.open, true);

  second.close();
  await second.closed;
  await tick();
  assert.equal(el.open, false);
  unmountAll();
});

test('showSnackbar auto-dismiss chains the queue with real timers', async () => {
  const a = showSnackbar('quick one', { duration: 20 });
  const b = showSnackbar('quick two', { duration: 20, action: 'Ok' });
  const el = document.querySelector('ui-snackbar');
  assert.equal(el.message, 'quick one');

  await sleep(60);
  assert.equal(el.message, 'quick two');
  await a.closed;

  await sleep(60);
  await b.closed;
  assert.equal(el.open, false);
  unmountAll();
});

test('ui-loading-indicator is a busy progressbar with contained variant', async () => {
  const el = mount('<ui-loading-indicator label="Loading"></ui-loading-indicator>');
  await tick();
  const track = el.shadowRoot.querySelector('[part=track]');
  assert.equal(track.getAttribute('role'), 'progressbar');
  assert.equal(track.getAttribute('aria-busy'), 'true');
  assert.equal(track.getAttribute('aria-label'), 'Loading');
  assert.equal(el.shadowRoot.querySelectorAll('.dot').length, 4);
  el.variant = 'contained';
  assert.ok(track.className.includes('contained'));
  unmountAll();
});
