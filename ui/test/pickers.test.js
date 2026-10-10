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
import '../src/components/ui-dialog.js';
import '../src/components/ui-side-sheet.js';

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
  // The listbox is the options container rather than the panel itself: a
  // panel that can also hold a filter field must not claim a role whose only
  // permitted children are options.
  const listbox = el.shadowRoot.querySelector('[role="listbox"]');
  assert.ok(listbox, 'the panel contains a listbox');
  assert.equal(listbox.id, field.getAttribute('aria-controls'));
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

test('ui-select close does not bubble to an enclosing dialog or side sheet', async () => {
  // close/open are also what overlays emit. A bubbling select-close looks like
  // the sheet dismissed itself — choosing a binder must not shut the card.
  const dialog = mount(`
    <ui-dialog open label="Add">
      <ui-select label="Flavor">
        <ui-option value="vanilla">Vanilla</ui-option>
        <ui-option value="mint">Mint</ui-option>
      </ui-select>
    </ui-dialog>`);
  await tick();
  let dialogClose = 0;
  dialog.addEventListener('close', () => dialogClose++);
  const select = dialog.querySelector('ui-select');
  let selectClose = 0;
  select.addEventListener('close', () => selectClose++);
  fire(select.shadowRoot.querySelector('[role="combobox"]'), 'click');
  fire(select.querySelector('ui-option'), 'click');
  await tick();
  await tick();
  assert.equal(selectClose, 1, 'the select still emits close on its host');
  assert.equal(dialogClose, 0, 'choosing an option must not close the dialog');
  assert.ok(dialog.shadowRoot.querySelector('.overlay'), 'dialog stays open');
  unmountAll();

  const sheet = mount(`
    <ui-side-sheet open label="Card">
      <ui-select label="Binder">
        <ui-option value="1">Inbox</ui-option>
        <ui-option value="2">Trades</ui-option>
      </ui-select>
    </ui-side-sheet>`);
  await tick();
  let sheetClose = 0;
  sheet.addEventListener('close', () => sheetClose++);
  const inner = sheet.querySelector('ui-select');
  fire(inner.shadowRoot.querySelector('[role="combobox"]'), 'click');
  fire(inner.querySelector('ui-option'), 'click');
  await tick();
  await tick();
  assert.equal(sheetClose, 0, 'choosing an option must not close the side sheet');
  assert.ok(sheet.shadowRoot.querySelector('.overlay'), 'side sheet stays open');
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

  const days = Array.from(panel.querySelectorAll('button[data-iso]:not([disabled])'));
  assert.ok(days.length >= 20, 'has days in current month');
  const firstDay = days[10];
  const secondDay = days[18];
  const firstIso = firstDay.getAttribute('data-iso');
  const secondIso = secondDay.getAttribute('data-iso');

  fire(firstDay, 'click');
  assert.equal(el.start, '', 'first click is a draft; parent start is unchanged');
  assert.equal(el.end, '');
  assert.equal(firstDay.getAttribute('aria-selected'), 'true');
  assert.ok(el.shadowRoot.querySelector('.panel'), 'first click keeps the panel open');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(secondDay, 'click');
  assert.equal(el.start, firstIso);
  assert.equal(el.end, secondIso);
  assert.equal(detail.start, firstIso);
  assert.equal(detail.end, secondIso);
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
    assert.equal(panel.style.transformOrigin, 'left bottom', 'grows from the anchor-facing start corner');
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

// ------------------------------------------------------- select: filtering

// Scrolling is not a way to find one set among nine hundred, so past a
// handful of options the panel grows a filter field.
const manyOptions = (n) =>
  Array.from({ length: n }, (_, i) => `<ui-option value="v${i}">Option ${i}</ui-option>`).join('');

test('ui-select shows a filter once there are enough options', async () => {
  const few = mount(`<ui-select label="Few">${manyOptions(3)}</ui-select>`);
  await tick();
  few.shadowRoot.querySelector('.field').click();
  await tick();
  assert.equal(few.shadowRoot.querySelector('.search'), null, 'three options need no filter');

  const many = mount(`<ui-select label="Many">${manyOptions(20)}</ui-select>`);
  await tick();
  many.shadowRoot.querySelector('.field').click();
  await tick();
  assert.ok(many.shadowRoot.querySelector('.search input'), 'twenty options get one');
  unmountAll();
});

test('ui-select search=always and never override the count', async () => {
  const always = mount(`<ui-select label="A" search="always">${manyOptions(2)}</ui-select>`);
  await tick();
  always.shadowRoot.querySelector('.field').click();
  await tick();
  assert.ok(always.shadowRoot.querySelector('.search input'), 'always means always');

  const never = mount(`<ui-select label="N" search="never">${manyOptions(40)}</ui-select>`);
  await tick();
  never.shadowRoot.querySelector('.field').click();
  await tick();
  assert.equal(never.shadowRoot.querySelector('.search'), null, 'never means never');
  unmountAll();
});

// The options are light-DOM children, so filtering marks them and they hide
// themselves. The keyboard has to skip them too — an arrow key that steps
// onto a hidden option looks broken.
test('ui-select filters options and keeps the keyboard on the visible ones', async () => {
  const el = mount(`
    <ui-select label="Set" search="always">
      <ui-option value="dom">Dominaria</ui-option>
      <ui-option value="mid">Innistrad: Midnight Hunt</ui-option>
      <ui-option value="neo">Kamigawa: Neon Dynasty</ui-option>
    </ui-select>`);
  await tick();
  el.shadowRoot.querySelector('.field').click();
  await tick();

  const input = el.shadowRoot.querySelector('.search input');
  input.value = 'innistrad';
  fire(input, 'input');
  await tick();

  const opts = [...el.querySelectorAll('ui-option')];
  const hidden = opts.filter((o) => o.hasAttribute('data-ui-filtered')).map((o) => o.value);
  assert.deepEqual(hidden.sort(), ['dom', 'neo'], 'only the match survives');

  // Enter commits the one still showing, not whatever index it used to be.
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  assert.deepEqual(detail, { value: 'mid' });
  unmountAll();
});

test('ui-select matching folds case and accents', async () => {
  const el = mount(`
    <ui-select label="Set" search="always">
      <ui-option value="a">Æther Revolt</ui-option>
      <ui-option value="b">Théros</ui-option>
    </ui-select>`);
  await tick();
  el.shadowRoot.querySelector('.field').click();
  await tick();
  const input = el.shadowRoot.querySelector('.search input');
  input.value = 'theros';
  fire(input, 'input');
  await tick();
  const shown = [...el.querySelectorAll('ui-option')].filter((o) => !o.hasAttribute('data-ui-filtered'));
  assert.deepEqual(shown.map((o) => o.value), ['b'], 'theros finds Théros');
  unmountAll();
});

// Reopening to a list still narrowed by last time's query reads as a select
// that has lost its options.
test('ui-select drops the query when the panel closes', async () => {
  const el = mount(`<ui-select label="Set" search="always">${manyOptions(12)}</ui-select>`);
  await tick();
  el.shadowRoot.querySelector('.field').click();
  await tick();
  const input = el.shadowRoot.querySelector('.search input');
  input.value = 'Option 11';
  fire(input, 'input');
  await tick();
  assert.equal(
    [...el.querySelectorAll('ui-option')].filter((o) => !o.hasAttribute('data-ui-filtered')).length,
    1);

  el.shadowRoot.querySelector('.field').click();  // close
  await tick();
  assert.equal(
    [...el.querySelectorAll('ui-option')].filter((o) => o.hasAttribute('data-ui-filtered')).length,
    0, 'every option is back');
  unmountAll();
});

test('ui-chip input variant shows a selected state without a check or toggling', async () => {
  const el = mount('<ui-chip variant="input" dismissible>Note</ui-chip>');
  await tick();
  const root = () => el.shadowRoot.querySelector('[part="control"]').parentElement;
  const control = el.shadowRoot.querySelector('[part="control"]');
  assert.ok(!root().classList.contains('selected'));
  el.selected = true;
  await tick();
  assert.ok(root().classList.contains('selected'), 'filled when selected');
  assert.equal(el.shadowRoot.querySelector('ui-icon[name="check"]'), null, 'no check icon');
  fire(control, 'click');
  assert.equal(el.selected, true, 'clicking does not toggle an input chip');
  assert.equal(el.getAttribute('aria-selected'), null, 'ARIA is left to the app');
  unmountAll();
  await tick();
});

// --- Date and time pickers: top layer, locale, keyboard, strings, typing ---

const keyOn = (el, k, init = {}) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true, ...init }));
const openIcon = (el) => fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
const focusedDay = (el) => el.shadowRoot.activeElement?.getAttribute('data-iso');

test('parseDate reads ISO, the locale numeric order and month names', async () => {
  const { parseDate } = await import('../src/components/ui-date-picker.js');
  const now = new Date(2026, 5, 1);
  assert.equal(parseDate('2026-10-03', 'en-US', now), '2026-10-03');
  assert.equal(parseDate('10/3/2026', 'en-US', now), '2026-10-03');
  assert.equal(parseDate('3/10/2026', 'en-GB', now), '2026-10-03');
  assert.equal(parseDate('3.10.2026', 'de', now), '2026-10-03');
  assert.equal(parseDate('3.10.26', 'de', now), '2026-10-03');
  assert.equal(parseDate('2026/10/3', 'ja', now), '2026-10-03');
  assert.equal(parseDate('2026年10月3日', 'ja', now), '2026-10-03');
  assert.equal(parseDate('3/10', 'en-GB', now), '2026-10-03', 'no year: this year');
  assert.equal(parseDate('Oct 3, 2026', 'en-US', now), '2026-10-03');
  assert.equal(parseDate('3 Oct 2026', 'en-GB', now), '2026-10-03');
  assert.equal(parseDate('Saturday, October 3, 2026', 'en-US', now), '2026-10-03');
  assert.equal(parseDate('3 octobre 2026', 'fr', now), '2026-10-03');
  assert.equal(parseDate('3. Okt. 2026', 'de', now), '2026-10-03');
  assert.equal(parseDate('3 févr. 2026', 'fr', now), '2026-02-03');
  assert.equal(parseDate('3 FEVRIER 2026', 'fr', now), '2026-02-03', 'case and accents fold');
  assert.equal(parseDate('', 'en-US', now), '');
  assert.equal(parseDate('31/2/2026', 'en-GB', now), null, 'no 31 February');
  assert.equal(parseDate('nonsense', 'en-US', now), null);
});

test('parseDateRange reads both ends in order', async () => {
  const { parseDateRange } = await import('../src/components/ui-date-picker.js');
  assert.deepEqual(parseDateRange('2026-08-01/2026-08-05', 'en-US'), { start: '2026-08-01', end: '2026-08-05' });
  assert.deepEqual(parseDateRange('Aug 5, 2026 – Aug 1, 2026', 'en-US'), { start: '2026-08-01', end: '2026-08-05' });
  assert.deepEqual(parseDateRange('1/8/2026 - 5/8/2026', 'en-GB'), { start: '2026-08-01', end: '2026-08-05' });
  assert.deepEqual(parseDateRange('2026-08-01 to 2026-08-05'), { start: '2026-08-01', end: '2026-08-05' });
  assert.deepEqual(parseDateRange('2026-08-01 → 2026-08-05'), { start: '2026-08-01', end: '2026-08-05' });
  assert.deepEqual(parseDateRange(''), { start: '', end: '' });
  assert.equal(parseDateRange('2026-08-01'), null);
  assert.equal(parseDateRange('2026-08-01 – soon'), null);
});

test('ui-date-picker starts the week on the locale first day, or firstDay', async () => {
  const { weekStart } = await import('../src/components/ui-date-picker.js');
  assert.equal(weekStart('en-US'), 0);
  assert.equal(weekStart('en-GB'), 1);
  // August 2026 starts on a Saturday.
  const gb = mount('<ui-date-picker label="D" locale="en-GB" value="2026-08-14"></ui-date-picker>');
  await tick();
  openIcon(gb);
  assert.equal(gb.shadowRoot.querySelector('.day').getAttribute('data-iso'), '2026-07-27', 'Monday first');
  assert.equal(gb.shadowRoot.querySelectorAll('.weekday')[0].textContent, 'M');
  unmountAll();
  await tick();
  const us = mount('<ui-date-picker label="D" locale="en-US" value="2026-08-14"></ui-date-picker>');
  await tick();
  openIcon(us);
  assert.equal(us.shadowRoot.querySelector('.day').getAttribute('data-iso'), '2026-07-26', 'Sunday first');
  unmountAll();
  await tick();
  const sat = mount('<ui-date-picker label="D" locale="en-US" first-day="6" value="2026-08-14"></ui-date-picker>');
  await tick();
  openIcon(sat);
  assert.equal(sat.shadowRoot.querySelector('.day').getAttribute('data-iso'), '2026-08-01', 'first-day overrides');
  unmountAll();
  await tick();
});

test('ui-date-picker panel is a top-layer popover with one tab stop and full-date names', async () => {
  const el = mount('<ui-date-picker label="D" locale="en-US" value="2026-08-14"></ui-date-picker>');
  await tick();
  openIcon(el);
  const panel = el.shadowRoot.querySelector('.panel');
  assert.equal(panel.getAttribute('popover'), 'manual');
  const stops = [...panel.querySelectorAll('.day')].filter((b) => b.tabIndex === 0);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].getAttribute('data-iso'), '2026-08-14');
  assert.equal(stops[0].getAttribute('aria-label'), 'Friday, August 14, 2026');
  unmountAll();
  await tick();
});

test('ui-date-picker keyboard: Alt+ArrowDown into the grid, arrows, Home/End, PageDown, Escape', async () => {
  const el = mount('<ui-date-picker label="D" locale="en-US" value="2026-08-14"></ui-date-picker>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  input.focus();
  keyOn(input, 'ArrowDown', { altKey: true });
  await tick();
  assert.ok(el.shadowRoot.querySelector('.panel'), 'opens');
  assert.equal(focusedDay(el), '2026-08-14', 'focus on the selected day');
  const grid = () => el.shadowRoot.activeElement;
  keyOn(grid(), 'ArrowRight');
  assert.equal(focusedDay(el), '2026-08-15');
  keyOn(grid(), 'ArrowDown');
  assert.equal(focusedDay(el), '2026-08-22');
  keyOn(grid(), 'ArrowUp');
  keyOn(grid(), 'ArrowLeft');
  assert.equal(focusedDay(el), '2026-08-14');
  keyOn(grid(), 'Home');
  assert.equal(focusedDay(el), '2026-08-09', 'Sunday: the en-US week start');
  keyOn(grid(), 'End');
  assert.equal(focusedDay(el), '2026-08-15');
  keyOn(grid(), 'PageDown');
  assert.equal(focusedDay(el), '2026-09-15', 'next month, same day');
  assert.match(el.shadowRoot.querySelector('.month').textContent, /September 2026/);
  keyOn(grid(), 'PageUp', { shiftKey: true });
  assert.equal(focusedDay(el), '2025-09-15', 'Shift: a year');
  keyOn(grid(), 'ArrowDown');
  keyOn(grid(), 'ArrowDown');
  keyOn(grid(), 'ArrowDown');
  assert.equal(focusedDay(el), '2025-10-06', 'leaving the month shows the next one');
  assert.equal(grid().tabIndex, 0);
  keyOn(grid(), 'Escape');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'Escape closes');
  assert.equal(el.shadowRoot.activeElement, input, 'focus back in the field');
  unmountAll();
  await tick();
});

test('ui-date-picker keyboard stays within min/max and disables months outside them', async () => {
  const el = mount('<ui-date-picker label="D" locale="en-US" value="2026-08-14" min="2026-08-10" max="2026-08-20"></ui-date-picker>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  input.focus();
  keyOn(input, 'F4');
  await tick();
  keyOn(el.shadowRoot.activeElement, 'PageDown');
  assert.equal(focusedDay(el), '2026-08-20', 'clamped to max');
  keyOn(el.shadowRoot.activeElement, 'PageUp');
  assert.equal(focusedDay(el), '2026-08-10', 'clamped to min');
  const [prev, next] = el.shadowRoot.querySelectorAll('.cal-header ui-icon-button');
  assert.equal(prev.disabled, true);
  assert.equal(next.disabled, true);
  unmountAll();
  await tick();
});

test('ui-date-picker mirrors arrows and month chevrons right to left', async () => {
  const holder = mount('<div dir="rtl" style="direction: rtl"><ui-date-picker label="D" locale="en-US" value="2026-08-14"></ui-date-picker></div>');
  const el = holder.querySelector('ui-date-picker');
  await tick();
  if (getComputedStyle(el).direction !== 'rtl') {
    unmountAll();
    return; // the simulated DOM cannot resolve direction
  }
  const input = el.shadowRoot.querySelector('input');
  input.focus();
  keyOn(input, 'ArrowDown', { altKey: true });
  await tick();
  keyOn(el.shadowRoot.activeElement, 'ArrowLeft');
  assert.equal(focusedDay(el), '2026-08-15', 'left is forward in RTL');
  const [prev, next] = el.shadowRoot.querySelectorAll('.cal-header ui-icon-button');
  assert.equal(prev.icon, 'chevron-right');
  assert.equal(next.icon, 'chevron-left');
  unmountAll();
  await tick();
});

test('ui-date-picker strings, aria-label from the host, showPicker and focus', async () => {
  const el = mount('<ui-date-picker aria-label="Started" locale="fr"></ui-date-picker>');
  el.strings = { previousMonth: 'Mois précédent', nextMonth: 'Mois suivant', openCalendar: 'Ouvrir le calendrier', chooseDate: 'Choisir une date' };
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(input.getAttribute('aria-label'), 'Started', 'the host label names the input');
  assert.equal(el.hasAttribute('aria-label'), false, 'and leaves the role-less host');
  assert.equal(el.shadowRoot.querySelector('ui-icon-button').label, 'Ouvrir le calendrier');
  el.focus();
  assert.equal(el.shadowRoot.activeElement, input, 'focus() focuses the field');
  el.showPicker();
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'showPicker opens');
  assert.equal(el.shadowRoot.activeElement, input, 'focus stays in the field');
  assert.equal(panel.getAttribute('aria-label'), 'Started');
  const [prev, next] = panel.querySelectorAll('.cal-header ui-icon-button');
  assert.equal(prev.label, 'Mois précédent');
  assert.equal(next.label, 'Mois suivant');
  unmountAll();
  await tick();
  const plain = mount('<ui-date-picker></ui-date-picker>');
  plain.strings = { date: 'Datum' };
  await tick();
  assert.equal(plain.shadowRoot.querySelector('input').getAttribute('aria-label'), 'Datum');
  unmountAll();
  await tick();
});

test('ui-date-picker commits a typed localized date on Enter', async () => {
  const el = mount('<ui-date-picker label="D" locale="en-GB"></ui-date-picker>');
  await tick();
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  const input = el.shadowRoot.querySelector('input');
  input.value = '3/10/2026';
  fire(input, 'input');
  keyOn(input, 'Enter');
  assert.equal(el.value, '2026-10-03');
  assert.equal(detail.value, '2026-10-03');
  unmountAll();
  await tick();
});

test('ui-date-picker range commits a typed range on blur, and restores what it cannot read', async () => {
  const el = mount('<ui-date-picker label="Trip" range locale="en-US"></ui-date-picker>');
  await tick();
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  const input = el.shadowRoot.querySelector('input');
  input.value = 'Aug 5, 2026 – Aug 1, 2026';
  fire(input, 'input');
  fire(input, 'blur', { bubbles: false });
  assert.equal(el.start, '2026-08-01');
  assert.equal(el.end, '2026-08-05');
  assert.deepEqual(detail, { start: '2026-08-01', end: '2026-08-05', value: '2026-08-01/2026-08-05' });
  input.value = 'whenever';
  fire(input, 'input');
  fire(input, 'blur', { bubbles: false });
  assert.equal(el.start, '2026-08-01', 'unchanged');
  assert.match(input.value, /Aug 1, 2026/);
  unmountAll();
  await tick();
});

test('parseTypedTime reads 12- and 24-hour forms', async () => {
  const { parseTypedTime } = await import('../src/components/ui-time-picker.js');
  assert.equal(parseTypedTime('21:30'), '21:30');
  assert.equal(parseTypedTime('9:30 pm', 'en-US'), '21:30');
  assert.equal(parseTypedTime('9:30 PM', 'en-US'), '21:30');
  assert.equal(parseTypedTime('12 am', 'en-US'), '00:00');
  assert.equal(parseTypedTime('12pm', 'en-US'), '12:00');
  assert.equal(parseTypedTime('9 p.m.', 'en-US'), '21:00');
  assert.equal(parseTypedTime('9.30'), '09:30');
  assert.equal(parseTypedTime('21h30', 'fr'), '21:30');
  assert.equal(parseTypedTime('21h', 'fr'), '21:00');
  assert.equal(parseTypedTime('930'), '09:30');
  assert.equal(parseTypedTime('0930'), '09:30');
  assert.equal(parseTypedTime('午後9:30', 'ja'), '21:30');
  assert.equal(parseTypedTime(''), '');
  assert.equal(parseTypedTime('25:00'), null);
  assert.equal(parseTypedTime('13 pm'), null);
  assert.equal(parseTypedTime('soon'), null);
});

test('ui-time-picker: top-layer panel, strings, host aria-label, showPicker, typed time', async () => {
  const el = mount('<ui-time-picker aria-label="Run at" locale="en-US"></ui-time-picker>');
  el.strings = { openTimePicker: 'Ouvrir', hours: 'Heures', minuteValue: '{minute} min' };
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(input.getAttribute('aria-label'), 'Run at');
  assert.equal(el.hasAttribute('aria-label'), false);
  assert.equal(el.shadowRoot.querySelector('ui-icon-button').label, 'Ouvrir');
  el.focus();
  assert.equal(el.shadowRoot.activeElement, input);
  el.showPicker();
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel);
  assert.equal(panel.getAttribute('popover'), 'manual');
  assert.equal(panel.getAttribute('aria-label'), 'Run at');
  assert.equal(panel.querySelector('.digit').getAttribute('aria-label'), 'Heures');
  assert.equal(panel.querySelector('[data-minute="5"]').getAttribute('aria-label'), '5 min');
  unmountAll();
  await tick();
  const t2 = mount('<ui-time-picker label="At" locale="en-US"></ui-time-picker>');
  await tick();
  let detail = null;
  t2.addEventListener('change', (e) => (detail = e.detail));
  const i2 = t2.shadowRoot.querySelector('input');
  i2.value = '9:30 pm';
  fire(i2, 'input');
  keyOn(i2, 'Enter');
  assert.equal(t2.value, '21:30');
  assert.equal(detail.value, '21:30');
  unmountAll();
  await tick();
});
