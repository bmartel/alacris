// Smoke tests — ui-select / ui-option, ui-autocomplete, ui-chip, ui-chip-set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-select.js';
import '../src/components/ui-option.js';
import '../src/components/ui-autocomplete.js';
import '../src/components/ui-chip.js';
import '../src/components/ui-chip-set.js';
import '../src/components/ui-date-picker.js';
import '../src/components/ui-time-picker.js';

const key = (el, k) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

test('ui-option upgrades with role, part, and live selected state', async () => {
  const el = mount('<ui-option value="a">Alpha</ui-option>');
  await tick();
  assert.equal(el.getAttribute('role'), 'option');
  assert.ok(el.shadowRoot.querySelector('[part="control"]'), 'renders its control');
  assert.equal(el.getAttribute('aria-selected'), 'false');
  el.selected = true; // live prop write
  assert.equal(el.getAttribute('aria-selected'), 'true');
  el.disabled = true;
  assert.equal(el.getAttribute('aria-disabled'), 'true');
  unmountAll();
  await tick();
});

test('ui-select renders the combobox field and reflects a live value write', async () => {
  const el = mount(`
    <ui-select label="Flavor">
      <ui-option value="vanilla">Vanilla</ui-option>
      <ui-option value="mint">Mint chip</ui-option>
    </ui-select>`);
  await tick();
  const field = el.shadowRoot.querySelector('[role="combobox"]');
  assert.ok(field, 'renders a combobox field button');
  assert.equal(field.getAttribute('aria-expanded'), 'false');
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'closed = no panel');

  el.value = 'mint'; // live prop write
  await tick(); // option scan settles after the MutationObserver microtask
  assert.match(el.shadowRoot.querySelector('.value').textContent, /Mint chip/);
  const mint = el.querySelectorAll('ui-option')[1];
  assert.equal(mint.getAttribute('aria-selected'), 'true', 'selection mirrors onto the option');
  unmountAll();
  await tick();
});

test('ui-select opens on click, selects an option, emits change, and closes', async () => {
  const el = mount(`
    <ui-select label="Flavor">
      <ui-option value="vanilla">Vanilla</ui-option>
      <ui-option value="mint">Mint chip</ui-option>
    </ui-select>`);
  await tick();
  const field = el.shadowRoot.querySelector('[role="combobox"]');

  fire(field, 'click');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'panel opens synchronously');
  assert.equal(panel.getAttribute('role'), 'listbox');
  assert.equal(field.getAttribute('aria-expanded'), 'true');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(el.querySelectorAll('ui-option')[1], 'click');
  assert.equal(el.value, 'mint');
  assert.equal(detail.value, 'mint');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'selection closes the panel');
  unmountAll();
  await tick();
});

test('ui-select keyboard: ArrowDown opens, Escape closes, outside pointerdown closes', async () => {
  const el = mount(`
    <ui-select label="Flavor">
      <ui-option value="a">A</ui-option>
      <ui-option value="b">B</ui-option>
    </ui-select>`);
  await tick();
  const field = el.shadowRoot.querySelector('[role="combobox"]');

  key(field, 'ArrowDown');
  assert.ok(el.shadowRoot.querySelector('.panel'), 'ArrowDown opens');
  key(field, 'Escape');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'Escape closes');

  fire(field, 'click');
  assert.ok(el.shadowRoot.querySelector('.panel'));
  fire(document.body, 'pointerdown');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'outside pointerdown closes');
  unmountAll();
  await tick();
});

test('ui-autocomplete filters while typing, emits input, and commits on click', async () => {
  const el = mount('<ui-autocomplete label="Fruit"></ui-autocomplete>');
  el.options = ['Apple', 'Apricot', 'Banana'];
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(input.getAttribute('role'), 'combobox');

  let typed = null;
  el.addEventListener('input', (e) => { if (e.detail) typed = e.detail; });
  input.value = 'ap';
  fire(input, 'input');
  assert.equal(typed.value, 'ap');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'panel opens synchronously while matches exist');
  const opts = panel.querySelectorAll('[role="option"]');
  assert.equal(opts.length, 2, 'filters case-insensitively');

  let committed = null;
  el.addEventListener('change', (e) => (committed = e.detail));
  fire(opts[1], 'click');
  assert.equal(el.value, 'Apricot');
  assert.equal(committed.value, 'Apricot');
  assert.equal(input.value, 'Apricot');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'commit closes the panel');
  unmountAll();
  await tick();
});

test('ui-autocomplete live value write and freeSolo Enter commit', async () => {
  const el = mount('<ui-autocomplete label="Tag" free-solo></ui-autocomplete>');
  el.options = ['alpha', 'beta'];
  await tick();
  const input = el.shadowRoot.querySelector('input');

  el.value = 'beta'; // live prop write syncs the visible text
  assert.equal(input.value, 'beta');

  input.value = 'brand-new';
  fire(input, 'input');
  let committed = null;
  el.addEventListener('change', (e) => (committed = e.detail));
  key(input, 'Enter');
  assert.equal(el.value, 'brand-new', 'freeSolo commits raw text');
  assert.equal(committed.value, 'brand-new');
  unmountAll();
  await tick();
});

test('ui-chip filter variant toggles, emits change, and animates its check in', async () => {
  const el = mount('<ui-chip variant="filter">Small</ui-chip>');
  await tick();
  assert.equal(el.getAttribute('role'), 'option');
  const control = el.shadowRoot.querySelector('[part="control"]');
  assert.ok(control);

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(control, 'click');
  assert.equal(el.selected, true);
  assert.equal(detail.selected, true);
  assert.equal(el.getAttribute('aria-selected'), 'true');
  assert.ok(el.shadowRoot.querySelector('ui-icon[name="check"]'), 'check icon mounts on select');

  el.selected = false; // live prop write
  assert.equal(el.getAttribute('aria-selected'), 'false');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('ui-icon[name="check"]'), null, 'check icon exits');
  unmountAll();
  await tick();
});

test('ui-chip dismissible emits dismiss after the collapse animation', async () => {
  const el = mount('<ui-chip variant="input" dismissible>Ada</ui-chip>');
  await tick();
  const closeBtn = el.shadowRoot.querySelector('ui-icon-button');
  assert.ok(closeBtn, 'renders the remove button');
  let dismissed = false;
  el.addEventListener('dismiss', () => (dismissed = true));
  fire(closeBtn.shadowRoot.querySelector('button'), 'click');
  await tick();
  assert.equal(dismissed, true, 'dismiss fires; the parent removes the chip');
  unmountAll();
  await tick();
});

test('ui-chip-set coordinates single-select filter chips and emits the value', async () => {
  const el = mount(`
    <ui-chip-set label="Size">
      <ui-chip variant="filter" value="s">Small</ui-chip>
      <ui-chip variant="filter" value="m" selected>Medium</ui-chip>
    </ui-chip-set>`);
  await tick();
  assert.equal(el.getAttribute('role'), 'listbox');
  assert.equal(el.getAttribute('aria-multiselectable'), 'false');
  const [small, medium] = el.querySelectorAll('ui-chip');
  assert.equal(medium.selected, true);

  el.multi = true; // live prop write
  assert.equal(el.getAttribute('aria-multiselectable'), 'true');
  el.multi = false;

  let detail = null;
  el.addEventListener('change', (e) => { if (e.target === el) detail = e.detail; });
  fire(small.shadowRoot.querySelector('[part="control"]'), 'click');
  assert.equal(small.selected, true);
  assert.equal(medium.selected, false, 'single-select deselects siblings');
  assert.equal(detail.value, 's');
  unmountAll();
  await tick();
});

test('ui-select outlined fieldset is not inside the combobox button', async () => {
  const el = mount(`
    <ui-select label="Flavor" variant="outlined">
      <ui-option value="vanilla">Vanilla</ui-option>
    </ui-select>`);
  await tick();
  const field = el.shadowRoot.querySelector('[role="combobox"]');
  assert.equal(field.querySelector('fieldset'), null, 'fieldset is a sibling, not a button descendant');
  assert.ok(el.shadowRoot.querySelector('fieldset'), 'outlined still draws a fieldset');
  unmountAll();
  await tick();
});

test('ui-date-picker opens a calendar, selects a day, emits change', async () => {
  const el = mount('<ui-date-picker label="Event" value="2026-08-14"></ui-date-picker>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'closed = no panel');
  const iconBtn = el.shadowRoot.querySelector('ui-icon-button');
  fire(iconBtn.shadowRoot.querySelector('button'), 'click');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'calendar opens');
  const selected = panel.querySelector('[data-iso="2026-08-14"]');
  assert.ok(selected, 'selected day is in the grid');
  assert.equal(selected.getAttribute('aria-selected'), 'true');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  const next = panel.querySelector('[data-iso="2026-08-20"]');
  fire(next, 'click');
  assert.equal(el.value, '2026-08-20');
  assert.equal(detail.value, '2026-08-20');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'day click closes the docked panel');
  unmountAll();
  await tick();
});

test('ui-date-picker live value write and modal OK commit', async () => {
  const el = mount('<ui-date-picker label="Deadline" presentation="modal"></ui-date-picker>');
  await tick();
  el.value = '2026-01-01';
  assert.match(el.shadowRoot.querySelector('input').value, /2026|Jan/);

  fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
  const overlay = el.shadowRoot.querySelector('.overlay');
  assert.ok(overlay, 'modal opens an overlay');
  fire(overlay.querySelector('[data-iso="2026-01-15"]'), 'click');
  assert.equal(el.value, '2026-01-01', 'modal day click is a draft until OK');
  const ok = [...overlay.querySelectorAll('ui-button')].find((b) => b.textContent.includes('OK'));
  fire(ok.shadowRoot.querySelector('button'), 'click');
  assert.equal(el.value, '2026-01-15');
  unmountAll();
  await tick();
});

test('ui-time-picker opens, picks a minute, emits HH:mm', async () => {
  const el = mount('<ui-time-picker label="Alarm" value="07:30"></ui-time-picker>');
  await tick();
  fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'time panel opens');
  fire(panel.querySelector('[data-hour="8"]'), 'click');
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(panel.querySelector('[data-minute="45"]'), 'click');
  assert.equal(el.value, '08:45');
  assert.equal(detail.value, '08:45');
  unmountAll();
  await tick();
});

test('ui-date-picker range selects start then end', async () => {
  const el = mount('<ui-date-picker label="Trip" range></ui-date-picker>');
  await tick();
  fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel);

  fire(panel.querySelector('[data-iso="2026-08-14"]'), 'click');
  assert.equal(el.start, '', 'first click is a draft; parent start is unchanged');
  assert.equal(el.end, '');
  assert.equal(panel.querySelector('[data-iso="2026-08-14"]').getAttribute('aria-selected'), 'true');
  assert.ok(el.shadowRoot.querySelector('.panel'), 'first click keeps the panel open');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(el.shadowRoot.querySelector('[data-iso="2026-08-20"]'), 'click');
  assert.equal(el.start, '2026-08-14');
  assert.equal(el.end, '2026-08-20');
  assert.equal(detail.start, '2026-08-14');
  assert.equal(detail.end, '2026-08-20');
  unmountAll();
  await tick();
});

test('position flips above the anchor without covering it', async () => {
  const { position } = await import('../src/util/position.js');
  const panel = document.createElement('div');
  const anchor = document.createElement('div');
  document.body.append(anchor, panel);
  Object.defineProperty(panel, 'offsetWidth', { configurable: true, get: () => 240 });
  Object.defineProperty(panel, 'offsetHeight', { configurable: true, get: () => 280 });
  anchor.getBoundingClientRect = () => ({
    top: 400, bottom: 456, left: 16, right: 256, width: 240, height: 56,
  });
  const prevH = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const prevW = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
  try {
    const result = position(panel, anchor, { placement: 'bottom-start', offset: 4, padding: 8 });
    assert.match(result.placement, /^top/);
    const y = parseFloat(panel.style.top);
    assert.ok(y + 280 <= 400 - 4 + 0.5, 'panel stays above the field');
    assert.equal(panel.style.transformOrigin, 'bottom center');
  } finally {
    if (prevH) Object.defineProperty(window, 'innerHeight', prevH);
    if (prevW) Object.defineProperty(window, 'innerWidth', prevW);
    unmountAll();
  }
});

test('position constrains height instead of overlapping the anchor', async () => {
  const { position } = await import('../src/util/position.js');
  const panel = document.createElement('div');
  const anchor = document.createElement('div');
  document.body.append(anchor, panel);
  Object.defineProperty(panel, 'offsetWidth', { configurable: true, get: () => 240 });
  Object.defineProperty(panel, 'offsetHeight', { configurable: true, get: () => 280 });
  anchor.getBoundingClientRect = () => ({
    top: 100, bottom: 156, left: 16, right: 256, width: 240, height: 56,
  });
  const prevH = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const prevW = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
  try {
    position(panel, anchor, { placement: 'bottom-start', offset: 4, padding: 8 });
    // More room above (100-4-8=88) than below (200-156-4-8=32).
    assert.equal(panel.style.maxHeight, '88px');
    const y = parseFloat(panel.style.top);
    assert.ok(y + 280 > 156 || parseFloat(panel.style.maxHeight) <= 88,
      'does not clamp a full-height panel over the field');
  } finally {
    if (prevH) Object.defineProperty(window, 'innerHeight', prevH);
    if (prevW) Object.defineProperty(window, 'innerWidth', prevW);
    unmountAll();
  }
});

test('ui-time-picker input view still uses the hour/minute grids', async () => {
  const el = mount('<ui-time-picker label="Alarm" view="input" value="07:30"></ui-time-picker>');
  await tick();
  fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel.querySelector('.grid'), 'digital grid is used when view=input');
  fire(panel.querySelector('[data-hour="8"]'), 'click');
  fire(panel.querySelector('[data-minute="45"]'), 'click');
  assert.equal(el.value, '08:45');
  unmountAll();
  await tick();
});

test('ui-time-picker keyboard button toggles dial and input faces', async () => {
  const el = mount('<ui-time-picker label="Alarm" value="07:30"></ui-time-picker>');
  await tick();
  fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel.querySelector('.dial:not(.off)'), 'opens on the analog dial');
  const toggle = [...panel.querySelectorAll('ui-icon-button')]
    .find((b) => (b.label || '').includes('text input') || (b.getAttribute('label') || '').includes('text input'));
  assert.ok(toggle, 'input-method toggle is present');
  fire(toggle.shadowRoot.querySelector('button'), 'click');
  assert.ok(panel.querySelector('.grids:not(.off)'), 'keyboard switches to the digital grid');
  assert.ok(panel.querySelector('.dial.off'), 'dial is hidden, not destroyed');
  fire(toggle.shadowRoot.querySelector('button'), 'click');
  assert.ok(panel.querySelector('.dial:not(.off)'), 'clock icon switches back to the dial');
  unmountAll();
  await tick();
});


// A dialog listens for Escape in the capture phase at the document, so that
// the key works wherever focus is. A select opened inside one therefore has to
// claim the key first, or a single press dismisses the panel and the dialog
// together — which reads as the dialog being broken.
test('ui-select takes Escape from an enclosing capture-phase listener', async () => {
  const el = mount(`
    <ui-select label="Flavor">
      <ui-option value="vanilla">Vanilla</ui-option>
      <ui-option value="mint">Mint</ui-option>
    </ui-select>`);
  await tick();

  // Stands in for ui-dialog: document, capture, registered first.
  let enclosingSawEscape = 0;
  const enclosing = (e) => { if (e.key === 'Escape') enclosingSawEscape++; };
  document.addEventListener('keydown', enclosing, true);

  try {
    const control = el.shadowRoot.querySelector('[part=control]');
    control.click();
    await tick();
    assert.equal(el.shadowRoot.querySelector('.panel') != null, true, 'panel should be open');

    document.body.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
    );
    await tick();

    assert.equal(el.shadowRoot.querySelector('.panel'), null, 'Escape should close the panel');
    assert.equal(enclosingSawEscape, 0, 'the enclosing listener must never see the key');
  } finally {
    document.removeEventListener('keydown', enclosing, true);
  }
});

// With nothing open the key is nobody's, and a dialog must still get it.
test('ui-select leaves Escape alone while its panel is closed', async () => {
  mount(`<ui-select label="Flavor"><ui-option value="a">A</ui-option></ui-select>`);
  await tick();

  let seen = 0;
  const enclosing = (e) => { if (e.key === 'Escape') seen++; };
  document.addEventListener('keydown', enclosing, true);
  try {
    document.body.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await tick();
    assert.equal(seen, 1, 'a closed select must not swallow Escape');
  } finally {
    document.removeEventListener('keydown', enclosing, true);
  }
});
