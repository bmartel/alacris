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
