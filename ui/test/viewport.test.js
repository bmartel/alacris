// Overlays must fit the VISIBLE viewport on phones and tablets: not `100vh`
// (the large viewport — taller than the screen while the URL bar shows), clear
// of the on-screen keyboard (visualViewport), and clear of notches
// (env(safe-area-inset-*)). happy-dom does no layout, so these tests check the
// rules and the visualViewport plumbing; test/chrome/run.mjs checks the
// resulting geometry in a real headless Chrome.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick } from './helpers.js';

import '../src/components/ui-dialog.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-sheet.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-date-picker.js';
import '../src/components/ui-menu.js';
import '../src/components/ui-select.js';
import '../src/components/ui-autocomplete.js';
import '../src/components/ui-search.js';
import '../src/components/ui-snackbar.js';
import {
  overlayOn, visiblePadding, viewportInsets, visibleBounds, trackViewport, fitToViewport,
} from '../src/util/viewport.js';
import { position } from '../src/util/position.js';

const rules = (el) => [...(el.shadowRoot.adoptedStyleSheets || [])]
  .flatMap((s) => [...s.cssRules].map((r) => r.cssText));

// A stand-in for window.visualViewport: `keyboard` px shorter than the
// layout viewport, like Chrome with interactive-widget=resizes-visual.
function fakeViewport({ keyboard = 0, scale = 1, offsetTop = 0 } = {}) {
  const vv = new window.EventTarget();
  const state = { keyboard, scale, offsetTop };
  let listeners = 0;
  const add = vv.addEventListener.bind(vv);
  const remove = vv.removeEventListener.bind(vv);
  vv.addEventListener = (...a) => { listeners++; add(...a); };
  vv.removeEventListener = (...a) => { listeners--; remove(...a); };
  Object.defineProperties(vv, {
    scale: { get: () => state.scale },
    offsetTop: { get: () => state.offsetTop },
    offsetLeft: { get: () => 0 },
    width: { get: () => window.innerWidth },
    height: { get: () => window.innerHeight - state.keyboard - state.offsetTop },
  });
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
  return {
    vv,
    get listeners() { return listeners; },
    set(next) {
      Object.assign(state, next);
      vv.dispatchEvent(new window.Event('resize'));
    },
  };
}
const realVV = Object.getOwnPropertyDescriptor(window, 'visualViewport');
afterEach(() => {
  if (realVV) Object.defineProperty(window, 'visualViewport', realVV);
  else delete window.visualViewport;
  unmountAll();
});

const OVERLAYS = {
  'ui-dialog': '<ui-dialog label="D"><p>Body</p></ui-dialog>',
  'ui-drawer': '<ui-drawer label="N"><a href="#">A</a></ui-drawer>',
  'ui-sheet': '<ui-sheet label="S"><p>Body</p></ui-sheet>',
  'ui-side-sheet': '<ui-side-sheet label="S"><p>Body</p></ui-side-sheet>',
  'ui-date-picker': '<ui-date-picker label="Due" presentation="modal"></ui-date-picker>',
};

for (const [tag, markup] of Object.entries(OVERLAYS)) {
  test(`${tag}: overlay is inset-sized, never 100vh`, async () => {
    const el = mount(markup);
    await tick();
    const all = rules(el);
    const overlay = all.filter((r) => /^\.overlay\s*\{/.test(r)).join('\n');
    assert.match(overlay, /position: fixed/);
    assert.match(overlay, /inset: 0/);
    assert.match(overlay, /block-size: auto/, 'no explicit block size: the insets track the visible viewport');
    assert.match(overlay, /max-block-size: none/);
    for (const r of all) {
      assert.doesNotMatch(r, /\b100vh\b|calc\(100vh/, `${tag} sizes nothing with 100vh: ${r}`);
    }
  });
}

test('menu, select, autocomplete and search cap panels with dvh', async () => {
  for (const markup of [
    '<ui-menu><button slot="anchor">M</button></ui-menu>',
    '<ui-select label="S"></ui-select>',
    '<ui-autocomplete label="A"></ui-autocomplete>',
    '<ui-search></ui-search>',
  ]) {
    const el = mount(markup);
    await tick();
    const text = rules(el).join('\n');
    assert.match(text, /max-block-size: [^;]*\d+dvh/, `${el.localName} has a dvh max-block-size`);
  }
});

test('overlayOn / visiblePadding: safe areas and the keyboard inset', () => {
  const o = overlayOn('.x');
  assert.match(o, /\.x \{[^}]*position: fixed;[^}]*inset: 0;[^}]*block-size: auto;/);
  assert.match(o, /\.x::backdrop \{ display: none; \}/);
  assert.doesNotMatch(o, /vh/);
  const p = visiblePadding('24px');
  for (const side of ['top', 'bottom', 'left', 'right']) {
    assert.match(p, new RegExp(`padding-${side}: [^;]*env\\(safe-area-inset-${side}, 0px\\)`));
  }
  assert.match(p, /padding-bottom: calc\(var\(--ui-vv-bottom, 0px\)/);
  assert.match(p, /padding-top: calc\(var\(--ui-vv-top, 0px\)/);
});

test('ui-dialog: only the body scrolls; headline and actions keep their size', async () => {
  const el = mount(`<ui-dialog open label="D"><span slot="headline">H</span><p>Body</p>
    <button slot="actions">OK</button></ui-dialog>`);
  await tick();
  const sr = el.shadowRoot;
  const surface = getComputedStyle(sr.querySelector('.surface'));
  assert.equal(surface.maxBlockSize, '100%', 'surface is capped by the padded overlay, not by vh');
  const body = getComputedStyle(sr.querySelector('.body'));
  assert.equal(body.flexGrow, '1');
  assert.equal(body.flexShrink, '1');
  assert.equal(body.minBlockSize, '0');
  assert.equal(body.overflow, 'auto');
  assert.equal(getComputedStyle(sr.querySelector('.actions')).flexShrink, '0');
  assert.equal(getComputedStyle(sr.querySelector('.headline')).flexShrink, '0');
  el.open = false;
  await tick();
});

test('ui-drawer: content scrolls, footer slot is pinned and reachable', async () => {
  const el = mount(`<ui-drawer open label="N"><a href="#">A</a>
    <a slot="footer" href="#settings">Settings</a></ui-drawer>`);
  await tick();
  const sr = el.shadowRoot;
  const content = sr.querySelector('.surface > .content');
  const footer = sr.querySelector('.surface > .footer');
  assert.ok(content && footer, 'surface = scrolling content + footer');
  assert.equal(getComputedStyle(content).overflowY, 'auto');
  assert.equal(getComputedStyle(content).minBlockSize, '0');
  assert.equal(getComputedStyle(footer).flexShrink, '0');
  assert.ok(footer.classList.contains('has'), 'footer shows when slotted');
  assert.equal(footer.querySelector('slot').assignedElements()[0].getAttribute('href'), '#settings');
  assert.equal(getComputedStyle(sr.querySelector('.surface')).display, 'flex');
  el.open = false;
  await tick();

  const bare = mount('<ui-drawer open label="N"><a href="#">A</a></ui-drawer>');
  await tick();
  assert.ok(!bare.shadowRoot.querySelector('.footer').classList.contains('has'), 'empty footer collapses');
  bare.open = false;
  await tick();
});

test('ui-drawer standard variant has the same content/footer split', async () => {
  const el = mount('<ui-drawer variant="standard" open label="N"><a href="#">A</a><a slot="footer" href="#">F</a></ui-drawer>');
  await tick();
  const inner = el.shadowRoot.querySelector('.std .inner');
  assert.ok(inner.querySelector('.content') && inner.querySelector('.footer.has'));
});

test('viewportInsets: 0 without visualViewport, the keyboard height with one', () => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => undefined });
  assert.deepEqual(viewportInsets(), { top: 0, bottom: 0 });
  assert.deepEqual(visibleBounds(), { top: 0, bottom: window.innerHeight });

  const vv = fakeViewport({ keyboard: 300 });
  assert.deepEqual(viewportInsets(), { top: 0, bottom: 300 });
  assert.deepEqual(visibleBounds(), { top: 0, bottom: window.innerHeight - 300 });

  vv.set({ keyboard: 300, offsetTop: 40 });
  assert.deepEqual(viewportInsets(), { top: 40, bottom: 300 }, 'panned visual viewport');

  vv.set({ keyboard: 0, offsetTop: 0, scale: 2 });
  assert.deepEqual(viewportInsets(), { top: 0, bottom: 0 }, 'pinch-zoom is not lost room');
});

test('trackViewport reports changes and detaches on stop', () => {
  const vv = fakeViewport();
  const seen = [];
  const stop = trackViewport((i) => seen.push(i.bottom));
  vv.set({ keyboard: 250 });
  vv.set({ keyboard: 250 }); // unchanged: no duplicate report
  vv.set({ keyboard: 0 });
  assert.deepEqual(seen, [0, 250, 0]);
  stop();
  assert.equal(vv.listeners, 0, 'all visualViewport listeners removed');
  vv.set({ keyboard: 100 });
  assert.deepEqual(seen, [0, 250, 0]);
});

test('fitToViewport writes --ui-vv-* and data-keyboard, and reveals the focused field', async () => {
  const vv = fakeViewport();
  const host = mount('<div><input id="f"></div>');
  const overlay = document.createElement('div');
  const input = host.querySelector('#f');
  let revealed = 0;
  input.scrollIntoView = () => { revealed++; };
  input.focus();

  const stop = fitToViewport(overlay, host);
  assert.equal(overlay.style.getPropertyValue('--ui-vv-bottom'), '');
  assert.ok(!overlay.hasAttribute('data-keyboard'));

  vv.set({ keyboard: 280 });
  assert.equal(overlay.style.getPropertyValue('--ui-vv-bottom'), '280px');
  assert.ok(overlay.hasAttribute('data-keyboard'));
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(revealed, 1, 'focused field scrolled back into view when the keyboard opened');

  vv.set({ keyboard: 0 });
  assert.equal(overlay.style.getPropertyValue('--ui-vv-bottom'), '');
  assert.ok(!overlay.hasAttribute('data-keyboard'));
  stop();
  assert.equal(vv.listeners, 0);
});

test('ui-dialog follows the keyboard while open and stops when closed', async () => {
  const vv = fakeViewport();
  const el = mount('<ui-dialog label="D"><input></ui-dialog>');
  await tick();
  el.open = true;
  await tick();
  const overlay = el.shadowRoot.querySelector('.overlay');
  vv.set({ keyboard: 240 });
  assert.equal(overlay.style.getPropertyValue('--ui-vv-bottom'), '240px');
  assert.ok(overlay.hasAttribute('data-keyboard'));
  const css = rules(el).join('\n');
  assert.match(css, /\.overlay\[data-keyboard\]/, 'tighter margins while the keyboard is up');
  el.open = false;
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(vv.listeners, 0, 'listeners released after the exit');
});

test('drawer, sheets and snackbar track the keyboard too', async () => {
  for (const [markup, sel] of [
    ['<ui-drawer label="N"></ui-drawer>', '.overlay'],
    ['<ui-sheet label="S"></ui-sheet>', '.overlay'],
    ['<ui-side-sheet label="S"></ui-side-sheet>', '.overlay'],
    ['<ui-snackbar message="Hi" duration="0"></ui-snackbar>', '.region'],
  ]) {
    const vv = fakeViewport({ keyboard: 200 });
    const el = mount(markup);
    await tick();
    el.open = true;
    await tick();
    const node = el.shadowRoot.querySelector(sel);
    assert.equal(node.style.getPropertyValue('--ui-vv-bottom'), '200px', el.localName);
    el.open = false;
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(vv.listeners, 0, `${el.localName} released its listeners`);
    unmountAll();
  }
});

test('position() keeps an anchored panel above the keyboard', () => {
  fakeViewport({ keyboard: 300 });
  const vh = window.innerHeight;
  const anchor = mount('<button>A</button>');
  anchor.getBoundingClientRect = () => ({
    top: vh - 360, bottom: vh - 320, left: 20, right: 120, width: 100, height: 40,
  });
  const panel = document.createElement('div');
  document.body.append(panel);
  Object.defineProperty(panel, 'offsetHeight', { get: () => 200 });
  Object.defineProperty(panel, 'offsetWidth', { get: () => 160 });
  const { placement } = position(panel, anchor, { placement: 'bottom-start' });
  assert.equal(placement, 'top-start', 'flips up: below the anchor is under the keyboard');
  assert.ok(parseFloat(panel.style.top) + 200 <= vh - 300);
});
