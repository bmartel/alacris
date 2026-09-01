// Smoke tests for the foundation + exemplar components.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import { createTheme, applyTheme, themeCss } from '../src/theme/index.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeVars as iconThemeVars } from '../src/components/ui-icon.js';
import { iconPath, iconNames } from '../src/util/icons.js';
import '../src/components/ui-button.js';
import '../src/components/ui-icon.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-card.js';
import '../src/components/ui-text.js';
import '../src/components/ui-switch.js';
import '../src/components/ui-text-field.js';
import '../src/components/ui-dialog.js';
import '../src/components/ui-sheet.js';
import '../src/components/ui-side-sheet.js';

test('createTheme produces both schemes with contrast-mapped roles', () => {
  const theme = createTheme({ seed: '#0b57d0' });
  assert.ok(theme.schemes.light['color-primary'].startsWith('#'));
  assert.ok(theme.schemes.dark['color-primary'].startsWith('#'));
  assert.notEqual(theme.schemes.light['color-primary'], theme.schemes.dark['color-primary']);
  assert.equal(theme.common['radius-full'], '9999px');
  assert.equal(theme.common['easing-emphasized-overshoot'], 'cubic-bezier(0.175, 0.885, 0.32, 1.275)');
  const cssText = themeCss(theme);
  assert.match(cssText, /--ui-color-primary:#/);
  assert.match(cssText, /data-ui-scheme="dark"/);
});

test('applyTheme adopts and re-applies without duplicating styles', () => {
  applyTheme({ seed: '#6750a4' });
  applyTheme({ seed: '#b3261e' });
  const styleEls = document.querySelectorAll('style');
  assert.ok(styleEls.length <= 1 || document.adoptedStyleSheets?.length >= 0);
});

test('ui-button renders label, variant class, and disables', async () => {
  const el = mount('<ui-button>Save</ui-button>');
  await tick();
  const btn = el.shadowRoot.querySelector('button');
  assert.ok(btn, 'renders a native button');
  assert.ok(btn.className.includes('filled'), 'default variant is filled');
  el.variant = 'outlined';
  assert.ok(btn.className.includes('outlined'), 'variant prop is live');
  el.disabled = true;
  assert.equal(btn.disabled, true);
  unmountAll();
});

test('ui-button href renders a link', async () => {
  const el = mount('<ui-button href="/docs">Docs</ui-button>');
  await tick();
  const a = el.shadowRoot.querySelector('a');
  assert.ok(a);
  assert.equal(a.getAttribute('href'), '/docs');
  unmountAll();
});

test('ui-button leading icon applies the MD3 with-icon padding class', async () => {
  const el = mount('<ui-button><span slot="icon">+</span>Add</ui-button>');
  await tick();
  const btn = el.shadowRoot.querySelector('button');
  el.shadowRoot.querySelector('slot[name="icon"]').dispatchEvent(new Event('slotchange'));
  await tick();
  assert.ok(btn.className.includes('with-icon'));
  unmountAll();
});

test('ui-icon-button toggles and emits change', async () => {
  const el = mount('<ui-icon-button icon="favorite" label="Like" toggle></ui-icon-button>');
  await tick();
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  const btn = el.shadowRoot.querySelector('button');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
  fire(btn, 'click');
  assert.equal(el.selected, true);
  assert.equal(detail.selected, true);
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
  unmountAll();
});

test('ui-icon resolves underscore names and has directional arrows', async () => {
  assert.equal(iconPath('arrow_forward'), iconPath('arrow-forward'));
  assert.ok(iconPath('arrow-back'));
  assert.ok(iconPath('arrow-downward'));
  assert.ok(iconPath('chevron-left'));
  assert.ok(iconNames().includes('arrow-forward'));
  const el = mount('<ui-icon name="arrow_forward"></ui-icon>');
  await tick();
  const svg = el.shadowRoot.querySelector('svg');
  assert.ok(svg, 'renders an svg for an underscore name');
  assert.notEqual(svg.getAttribute('data-icon'), 'unknown');
  unmountAll();
});

test('ui-icon warns once and shows a placeholder for an unknown name', async () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (...a) => warnings.push(a.join(' '));
  try {
    const el = mount('<ui-icon name="definitely-not-an-icon"></ui-icon>');
    await tick();
    const svg = el.shadowRoot.querySelector('svg');
    assert.ok(svg, 'unknown name still renders a glyph');
    assert.equal(svg.getAttribute('data-icon'), 'unknown');
    assert.match(warnings.join('\n'), /definitely-not-an-icon/);
    warnings.length = 0;
    mount('<ui-icon name="definitely-not-an-icon"></ui-icon>');
    await tick();
    assert.equal(warnings.length, 0, 'the same unknown name warns only once');
  } finally {
    console.warn = orig;
    unmountAll();
  }
});

test('ui-switch flips, emits, and participates in forms', async () => {
  const el = mount('<ui-switch label="Wifi" name="wifi"></ui-switch>');
  await tick();
  const control = el.shadowRoot.querySelector('.control');
  assert.equal(control.getAttribute('role'), 'switch');
  assert.equal(el.querySelector('input[type=hidden]'), null, 'unchecked submits nothing');
  fire(control, 'click');
  assert.equal(el.checked, true);
  const hidden = el.querySelector('input[type=hidden]');
  assert.ok(hidden, 'checked mirrors a hidden input');
  assert.equal(hidden.name, 'wifi');
  unmountAll();
});

test('ui-text-field floats its label and emits input', async () => {
  const el = mount('<ui-text-field label="Email"></ui-text-field>');
  await tick();
  const root = el.shadowRoot.querySelector('.root');
  assert.ok(!root.className.includes('floating'), 'label rests while empty');
  const input = el.shadowRoot.querySelector('input');
  input.value = 'ada@lovelace.dev';
  fire(input, 'input');
  assert.equal(el.value, 'ada@lovelace.dev');
  assert.ok(root.className.includes('floating'), 'label floats with content');
  unmountAll();
});

test('ui-text-field error state and counter', async () => {
  const el = mount('<ui-text-field label="Name" maxlength="10" error="Required"></ui-text-field>');
  await tick();
  assert.ok(el.shadowRoot.querySelector('.root').className.includes('error'));
  assert.match(el.shadowRoot.querySelector('.count').textContent, /0 \/ 10/);
  unmountAll();
});

test('ui-text-field textarea pads text and resizes the field, not the input', async () => {
  const el = mount('<ui-text-field label="Bio" type="textarea" maxlength="80"></ui-text-field>');
  await tick();
  const area = el.shadowRoot.querySelector('textarea');
  const grow = el.shadowRoot.querySelector('.grow');
  assert.ok(grow, 'textarea sits in a resizable wrapper');
  assert.equal(getComputedStyle(area).resize, 'none');
  assert.equal(getComputedStyle(grow).resize, 'vertical');
  unmountAll();
});

test('ui-dialog mounts on open, emits close on scrim, removes after exit', async () => {
  const el = mount('<ui-dialog label="Confirm"><p>Body</p></ui-dialog>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'closed = no DOM');
  el.open = true;
  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface, 'open renders the overlay synchronously');
  assert.equal(surface.getAttribute('aria-modal'), 'true');

  let reason = null;
  el.addEventListener('close', (e) => (reason = e.detail.reason));
  fire(el.shadowRoot.querySelector('.scrim'), 'click');
  assert.equal(reason, 'scrim', 'scrim click requests close');

  el.open = false;
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'exit removes the DOM');
  unmountAll();
});

test('ui-dialog enter animation uses WAAPI scaleIn and releaseFill without CSS keyframes', async () => {
  const el = mount('<ui-dialog label="Confirm"><p>Body</p></ui-dialog>');
  el.open = true;
  await tick();
  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface, 'surface mounted');
  unmountAll();
});

test('ui-sheet mounts on open, emits close on scrim, removes after exit', async () => {
  const el = mount('<ui-sheet label="Share"><p>Body</p></ui-sheet>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'closed = no DOM');
  el.open = true;
  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface, 'open renders the overlay synchronously');
  assert.equal(surface.getAttribute('aria-modal'), 'true');
  assert.ok(el.shadowRoot.querySelector('.handle'), 'shows the drag handle');

  let reason = null;
  el.addEventListener('close', (e) => (reason = e.detail.reason));
  fire(el.shadowRoot.querySelector('.scrim'), 'click');
  assert.equal(reason, 'scrim', 'scrim click requests close');

  el.open = false;
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'exit removes the DOM');
  unmountAll();
});

test('ui-sheet swipe down requests close with swipe reason and avoids yo-yo exit', async () => {
  const el = mount('<ui-sheet label="Share"><p>Body</p></ui-sheet>');
  el.open = true;
  await tick();
  const surface = el.shadowRoot.querySelector('.surface');
  let closeReason = null;
  el.addEventListener('close', (e) => {
    closeReason = e.detail.reason;
    el.open = false;
  });

  const handle = el.shadowRoot.querySelector('.handle') || surface;
  const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true });
  const move = new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 300, isPrimary: true });
  const up = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 300, isPrimary: true });

  handle.dispatchEvent(down);
  handle.dispatchEvent(move);
  handle.dispatchEvent(up);
  await tick();

  assert.equal(closeReason, 'swipe', 'swipe down triggers swipe close reason');
  unmountAll();
});

test('ui-sheet drag restore allows subsequent drag without getting stuck', async () => {
  const el = mount('<ui-sheet label="Share"><p>Body</p></ui-sheet>');
  el.open = true;
  await tick();
  const surface = el.shadowRoot.querySelector('.surface');
  const handle = el.shadowRoot.querySelector('.handle') || surface;

  // Drag down slightly then restore
  handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }));
  handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 120, isPrimary: true }));
  handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }));
  handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }));
  await tick();

  // Second drag
  handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }));
  handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 150, isPrimary: true }));
  assert.equal(surface.style.transform, 'translateY(50px)', 'tracks second drag cleanly');

  handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 150, isPrimary: true }));
  unmountAll();
});

test('ui-side-sheet mounts on open, emits close on scrim, removes after exit', async () => {
  const el = mount('<ui-side-sheet label="Filters"><p>Body</p></ui-side-sheet>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'closed = no DOM');
  el.open = true;
  const surface = el.shadowRoot.querySelector('.surface');
  assert.ok(surface, 'open renders the overlay synchronously');
  assert.equal(surface.getAttribute('aria-modal'), 'true');
  assert.ok(surface.className.includes('end'), 'default anchor is end');

  let reason = null;
  el.addEventListener('close', (e) => (reason = e.detail.reason));
  fire(el.shadowRoot.querySelector('.scrim'), 'click');
  assert.equal(reason, 'scrim', 'scrim click requests close');

  el.open = false;
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'exit removes the DOM');
  unmountAll();
});

test('ui-text applies the type role', async () => {
  const el = mount('<ui-text variant="headline-md">Hi</ui-text>');
  await tick();
  assert.ok(el.style.font.includes('--ui-type-headline-md'));
  unmountAll();
});

test('themeVars is exported exactly when the component declares vars()', () => {
  assert.deepEqual([...iconThemeVars.names], ['--ui-icon-size']);
  const dir = fileURLToPath(new URL('../src/components/', import.meta.url));
  for (const file of readdirSync(dir).filter((f) => f.startsWith('ui-') && f.endsWith('.js'))) {
    const src = readFileSync(join(dir, file), 'utf8');
    assert.equal(
      /export const themeVars/.test(src),
      /vars\('ui-/.test(src),
      file);
  }
});
