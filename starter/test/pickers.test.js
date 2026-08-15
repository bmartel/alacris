// Smoke tests — ui-select / ui-option, ui-autocomplete, ui-chip, ui-chip-set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-select.js';
import '../src/components/ui-option.js';
import '../src/components/ui-autocomplete.js';
import '../src/components/ui-chip.js';
import '../src/components/ui-chip-set.js';

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
