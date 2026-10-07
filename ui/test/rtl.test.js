// Right-to-left: every part placed or moved from script, and every arrow key,
// follows the resolved writing direction, and the CSS-only parts carry their
// :dir(rtl) rules.
// happy-dom does not inherit `direction` from a `dir` attribute, so these
// tests set `direction` inline on the element whose direction is read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mount, unmountAll, tick } from './helpers.js';

import { position } from '../src/util/position.js';
import { isRtl, physicalEdge } from '../src/util/dir.js';
import { rovingTabindex } from '../src/util/keys.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-slider.js';
import '../src/components/ui-progress.js';
import '../src/components/ui-tabs.js';
import '../src/components/ui-menu.js';
import '../src/components/ui-tooltip.js';
import '../src/components/ui-swipe-row.js';
import '../src/components/ui-rating.js';

const DIRS = ['ltr', 'rtl'];

/** All CSS adopted into (or inlined in) a component's shadow root. */
function shadowCss(el) {
  const root = el.shadowRoot;
  const sheets = root.adoptedStyleSheets || [];
  let text = '';
  for (const s of sheets) {
    for (const r of s.cssRules || []) text += r.cssText + '\n';
  }
  for (const s of root.querySelectorAll('style')) text += s.textContent + '\n';
  return text.replace(/\s+/g, ' ');
}

/** Record keyframes passed to el.animate while `fn` runs. */
async function recordAnimations(fn) {
  const proto = window.HTMLElement.prototype;
  const had = Object.prototype.hasOwnProperty.call(proto, 'animate');
  const prev = proto.animate;
  const calls = [];
  proto.animate = function (frames) {
    calls.push({ el: this, frames });
    return {
      finished: Promise.resolve(), cancel() {}, finish() {}, play() {}, pause() {},
      playState: 'finished', pending: false,
    };
  };
  try {
    await fn();
  } finally {
    if (had) proto.animate = prev;
    else delete proto.animate;
  }
  return calls;
}

const swipe = (surface, fromX, toX) => {
  const ev = (type, x) => new PointerEvent(type, { clientX: x, clientY: 100, pointerId: 1, isPrimary: true, button: 0 });
  surface.dispatchEvent(ev('pointerdown', fromX));
  surface.dispatchEvent(ev('pointermove', fromX + (toX - fromX) / 2));
  surface.dispatchEvent(ev('pointerup', toX));
};

test('isRtl / physicalEdge read the computed direction', () => {
  const el = mount('<div></div>');
  assert.equal(isRtl(el), false);
  assert.equal(physicalEdge(el, 'start'), 'left');
  assert.equal(physicalEdge(el, 'end'), 'right');
  el.style.direction = 'rtl';
  assert.equal(isRtl(el), true);
  assert.equal(physicalEdge(el, 'start'), 'right');
  assert.equal(physicalEdge(el, 'end'), 'left');
  unmountAll();
});

for (const dir of DIRS) {
  test(`position(): start/end alignment follows the anchor's direction (${dir})`, () => {
    const anchor = mount(`<button style="direction: ${dir}">Anchor</button>`);
    const panel = document.createElement('div');
    document.body.append(panel);
    anchor.getBoundingClientRect = () => ({ left: 100, right: 200, top: 50, bottom: 80, width: 100, height: 30 });
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, get: () => 160 });
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, get: () => 120 });

    const rtl = dir === 'rtl';
    position(panel, anchor, { placement: 'bottom-start', offset: 4 });
    assert.equal(panel.style.left, rtl ? '40px' : '100px', 'start = leading edge');
    assert.equal(panel.style.top, '84px');
    assert.equal(panel.style.right, 'auto', 'a logical inset cannot pin the panel in RTL');
    assert.equal(panel.style.bottom, 'auto');

    position(panel, anchor, { placement: 'bottom-end', offset: 4 });
    assert.equal(panel.style.left, rtl ? '100px' : '40px', 'end = trailing edge');

    position(panel, anchor, { placement: 'top-center', offset: 4 });
    assert.equal(panel.style.left, '70px', 'center is direction-neutral');

    // Sides stay physical.
    position(panel, anchor, { placement: 'right-start', offset: 4, flip: false });
    assert.equal(panel.style.left, '204px');
    unmountAll();
  });
}

for (const dir of DIRS) {
  for (const [name, anchor] of [['ui-drawer', 'start'], ['ui-drawer', 'end'], ['ui-side-sheet', 'start'], ['ui-side-sheet', 'end']]) {
    test(`${name} anchor="${anchor}" slides in from and swipes toward its own edge (${dir})`, async () => {
      // The surface's physical edge: start is left in LTR and right in RTL.
      const right = (anchor === 'end') !== (dir === 'rtl');
      const el = mount(`<${name} anchor="${anchor}" style="direction: ${dir}"><p>Body</p></${name}>`);
      await tick();

      const calls = await recordAnimations(async () => {
        el.open = true;
        await tick();
        await new Promise((r) => setTimeout(r, 20)); // ref animations start next frame
      });
      const surface = el.shadowRoot.querySelector('.surface');
      assert.ok(surface, 'surface is mounted');
      const slide = calls.find((c) => c.el === surface);
      assert.ok(slide, 'surface animates in');
      assert.equal(slide.frames[0].transform, right ? 'translateX(100%)' : 'translateX(-100%)',
        'enters from its edge');

      let reason = null;
      el.addEventListener('close', (e) => { reason = e.detail.reason; });

      // Toward the centre of the screen: snaps back, no close.
      swipe(surface, 300, right ? 100 : 500);
      await tick();
      assert.equal(reason, null, 'swiping away from its edge does not dismiss');

      // Toward its edge: dismisses.
      swipe(surface, 300, right ? 500 : 100);
      await tick();
      assert.equal(reason, 'swipe', 'swiping toward its edge dismisses');
      unmountAll();
    });
  }
}

test('ui-slider paints the active track and places the bubble from the inline start in RTL', async () => {
  const el = mount('<ui-slider label="Volume" value="30"></ui-slider>');
  await tick();
  const cssText = shadowCss(el);
  // happy-dom drops `background` declarations it cannot parse, so check the
  // track gradient in the source.
  const src = readFileSync(new URL('../src/components/ui-slider.js', import.meta.url), 'utf8');
  assert.match(src, /linear-gradient\(to var\(--_ui-slider-to, right\),/, 'gradient direction is a variable');
  assert.match(cssText, /:host\(:dir\(rtl\)\)\s*\{\s*--_ui-slider-to: left;?\s*\}/, 'RTL paints right to left');
  assert.match(cssText, /:host\(:dir\(rtl\)\) \.bubble\s*\{\s*translate: 50% -100%;?\s*\}/, 'RTL bubble centres from the right');
  unmountAll();
});

test('ui-progress mirrors only the indeterminate sweep in RTL', async () => {
  const el = mount('<ui-progress label="Loading"></ui-progress>');
  await tick();
  assert.ok(el.shadowRoot.querySelector('.track.indeterminate'));
  const cssText = shadowCss(el);
  assert.match(cssText, /:host\(:dir\(rtl\)\) \.indeterminate\s*\{\s*scale: -1 1;?\s*\}/);
  // The determinate bar stays logical (no mirroring needed).
  assert.match(cssText, /\.bar\s*\{[^}]*inset-inline-start: 0/);
  unmountAll();
});

test('ui-tabs anchors its indicator at the physical left, where its x offset is measured from', async () => {
  const el = mount(`<ui-tabs value="one" label="Demo" style="direction: rtl">
    <ui-tab value="one">One</ui-tab><ui-tab value="two">Two</ui-tab></ui-tabs>`);
  await tick();
  const cssText = shadowCss(el);
  const rule = cssText.match(/\.indicator\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /(^|[\s;])left: 0/);
  assert.doesNotMatch(rule, /inset-inline-start/);
  unmountAll();
});

for (const tag of ['ui-menu', 'ui-tooltip']) {
  test(`${tag} panel uses physical insets, matching what position() writes`, async () => {
    const el = mount(`<${tag}></${tag}>`);
    await tick();
    const cssText = shadowCss(el);
    const rule = cssText.match(/\.panel\s*\{([^}]*)\}/)?.[1] || '';
    assert.match(rule, /(^|[\s;])left: 0/);
    assert.match(rule, /(^|[\s;])top: 0/);
    assert.doesNotMatch(rule, /inset-inline-start/);
    unmountAll();
  });
}

// --- Keyboard, swipe row, popup transform-origin ---------------------------

const key = (el, k) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

for (const dir of DIRS) {
  test(`rovingTabindex: ArrowLeft/ArrowRight follow the writing direction (${dir})`, () => {
    const group = mount(`<div style="direction: ${dir}"><button>a</button><button>b</button><button>c</button></div>`);
    const [a, b, c] = group.querySelectorAll('button');
    const r = rovingTabindex(group, { selector: 'button', orientation: 'horizontal' });
    const fwd = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    a.focus();
    key(a, fwd);
    assert.ok(document.activeElement === b, `${fwd} moves to the next item`);
    key(b, back);
    assert.ok(document.activeElement === a, `${back} moves to the previous item`);
    key(a, back);
    assert.ok(document.activeElement === c, 'wraps');
    // Vertical keys never depend on direction.
    key(c, 'ArrowDown');
    assert.ok(document.activeElement === c, 'horizontal group ignores ArrowDown');
    r.destroy();

    const both = rovingTabindex(group, { selector: 'button', orientation: 'both' });
    a.focus();
    key(a, 'ArrowDown');
    assert.ok(document.activeElement === b, 'ArrowDown is always next');
    key(b, fwd);
    assert.ok(document.activeElement === c, `${fwd} is next in a two-axis group too`);
    both.destroy();
    unmountAll();
  });

  test(`ui-tabs arrow keys select the visually adjacent tab (${dir})`, async () => {
    const el = mount(`<ui-tabs value="one" label="Demo" style="direction: ${dir}">
      <ui-tab value="one">One</ui-tab><ui-tab value="two">Two</ui-tab><ui-tab value="three">Three</ui-tab></ui-tabs>`);
    await tick();
    const [one] = el.querySelectorAll('ui-tab');
    one.focus();
    key(one, dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
    await tick();
    assert.equal(el.value, 'two');
    unmountAll();
  });

  test(`ui-rating arrow keys raise toward the inline end (${dir})`, async () => {
    const el = mount(`<ui-rating label="Stars" value="2" style="direction: ${dir}"></ui-rating>`);
    await tick();
    const target = el.shadowRoot.querySelector('[role="slider"], [tabindex], .stars') || el;
    key(target, dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
    await tick();
    assert.equal(Number(el.value), 3);
    key(target, dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
    await tick();
    assert.equal(Number(el.value), 2);
    unmountAll();
  });

  test(`ui-swipe-row reveals leading/trailing actions by writing direction (${dir})`, async () => {
    const el = mount(`
      <ui-swipe-row style="direction: ${dir}">
        <button slot="start">Star</button>
        <button slot="end">Delete</button>
        <div>Row</div>
      </ui-swipe-row>`);
    await tick();
    const content = el.shadowRoot.querySelector('.content');
    for (const a of el.shadowRoot.querySelectorAll('.actions')) {
      Object.defineProperty(a, 'offsetWidth', { configurable: true, get: () => 80 });
    }
    const sides = [];
    el.addEventListener('open', (e) => sides.push(e.detail.side));
    const s = dir === 'rtl' ? -1 : 1;

    // Toward the inline start (left in LTR): reveals the end actions.
    swipe(content, 200, 200 - 120 * s);
    await tick();
    assert.equal(sides.at(-1), 'end');
    assert.equal(content.style.transform, `translateX(${-80 * s}px)`, 'content moves off the end actions');

    el.open = '';
    await tick();
    // Toward the inline end: reveals the start actions.
    swipe(content, 200, 200 + 120 * s);
    await tick();
    assert.equal(sides.at(-1), 'start');
    assert.equal(content.style.transform, `translateX(${80 * s}px)`);

    el.open = 'end';
    await tick();
    assert.equal(content.style.transform, `translateX(${-80 * s}px)`, 'controlled open follows direction');
    unmountAll();
  });

  test(`position() sets transform-origin at the aligned anchor-facing corner (${dir})`, () => {
    const anchor = mount(`<button style="direction: ${dir}">Anchor</button>`);
    const panel = document.createElement('div');
    document.body.append(panel);
    anchor.getBoundingClientRect = () => ({ left: 100, right: 200, top: 50, bottom: 80, width: 100, height: 30 });
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, get: () => 160 });
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, get: () => 120 });
    const rtl = dir === 'rtl';
    const at = (placement) => {
      position(panel, anchor, { placement, flip: false });
      return panel.style.transformOrigin;
    };
    assert.equal(at('bottom-start'), rtl ? 'right top' : 'left top');
    assert.equal(at('bottom-end'), rtl ? 'left top' : 'right top');
    assert.equal(at('top-start'), rtl ? 'right bottom' : 'left bottom');
    assert.equal(at('top-center'), 'center bottom');
    assert.equal(at('right-start'), 'left top');
    assert.equal(at('left-end'), 'right bottom');
    unmountAll();
  });

  test(`ui-menu panel scales from the anchor's leading corner (${dir})`, async () => {
    const el = mount(`<ui-menu style="direction: ${dir}"><button slot="anchor" style="direction: ${dir}">Open</button>
      <ui-menu-item value="a">A</ui-menu-item></ui-menu>`);
    await tick();
    el.open = true;
    await tick();
    const panel = el.shadowRoot.querySelector('.panel');
    assert.ok(panel);
    assert.equal(panel.style.transformOrigin, dir === 'rtl' ? 'right top' : 'left top');
    unmountAll();
  });
}
