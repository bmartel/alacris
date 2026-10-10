// ui-chip-field: a text field holding input chips, with a filtering listbox.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-chip-field.js';
import '../src/components/ui-text-field.js';
import { themeVars } from '../src/components/ui-chip-field.js';

const key = (el, k, init = {}) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true, ...init }));
const type = (input, text) => {
  input.value = text;
  fire(input, 'input');
};
const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => [...el.shadowRoot.querySelectorAll(sel)];
const chips = (el) => $$(el, '.chip-label').map((c) => c.textContent);
const options = (el) => $$(el, '[role="option"]');

const FRUIT = ['Apple', 'Apricot', 'Banana', { value: 'kiwi', label: 'Kiwi', color: 'tertiary' }];

test('ui-chip-field renders the outlined text-field container with a notched label and chips', async () => {
  const el = mount('<ui-chip-field label="Fruit" variant="outlined" multiple></ui-chip-field>');
  el.options = FRUIT;
  el.value = ['Apple', 'kiwi'];
  await tick();
  assert.ok($(el, '.root.outlined.floating'), 'chips float the label');
  assert.equal($(el, 'legend span').textContent, 'Fruit', 'the notch carries the label');
  assert.equal($(el, '.label').textContent, 'Fruit');
  assert.deepEqual(chips(el), ['Apple', 'Kiwi'], 'values show by their option label');
  // The remove button is the chip's sibling content, never nested in another button.
  for (const b of $$(el, '.chip-remove')) assert.equal(b.parentElement.closest('button'), null);
  assert.equal($$(el, '.chip-remove')[1].getAttribute('aria-label'), 'Remove Kiwi');
  const kiwi = $$(el, '.chip')[1];
  assert.ok(kiwi.classList.contains('tinted'), 'a coloured option tints its chip');
  assert.match(kiwi.getAttribute('style'), /--_tint-bg: var\(--ui-color-tertiary-container\)/);
  // The dropdown indicator is the trailing icon.
  const toggle = $(el, '.toggle');
  assert.equal(toggle.querySelector('ui-icon').getAttribute('name'), 'arrow-drop-down');
  assert.equal(toggle.getAttribute('aria-label'), 'Show options');
  unmountAll();
  await tick();
});

test('ui-chip-field is unfloated while empty and blurred, like ui-text-field', async () => {
  const el = mount('<ui-chip-field label="Tags" variant="outlined"></ui-chip-field>');
  await tick();
  assert.equal($(el, '.root.floating'), null);
  fire($(el, 'input'), 'focusin');
  assert.ok($(el, '.root.floating.focused'), 'focus floats it');
  unmountAll();
  await tick();
});

test('ui-chip-field shares ui-text-field geometry tokens', () => {
  assert.ok(themeVars.names.includes('--ui-chip-field-height'));
  const src = readFileSync(new URL('../src/components/ui-chip-field.js', import.meta.url), 'utf8');
  const tf = readFileSync(new URL('../src/components/ui-text-field.js', import.meta.url), 'utf8');
  for (const rule of ["height: '56px'", "chipHeight: '32px'", 'chipRadius: sys.radius.sm']) assert.ok(src.includes(rule), rule);
  // The outlined notch and label rules are the text field's own.
  for (const rule of ['inset: -6px 0 0;', '.outlined.floating .label {', '.filled.floating .label { translate: 0 calc(-50% - 16px); font-size: 0.75rem; }']) {
    assert.ok(tf.includes(rule) && src.includes(rule), rule);
  }
  assert.equal(/!important/.test(src.replace(/\/\/.*$/gm, '')), false);
});

test('ui-chip-field: typing filters a combobox listbox; arrows and Enter pick (multiple toggles and stays open)', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.options = FRUIT;
  await tick();
  const input = $(el, 'input');
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.getAttribute('aria-controls'), 'listbox');

  let typed = null;
  el.addEventListener('input', (e) => { if (e.detail) typed = e.detail.value; });
  fire(input, 'focusin');
  type(input, 'ap');
  assert.equal(typed, 'ap');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal($(el, '[role="listbox"]').getAttribute('aria-multiselectable'), 'true');
  assert.deepEqual(options(el).map((o) => o.textContent.trim()), ['Apple', 'Apricot']);

  // While typing, the first match is active (Enter would take it); ArrowDown moves on.
  assert.equal(input.getAttribute('aria-activedescendant'), 'opt-0');
  let changed = null;
  el.addEventListener('change', (e) => (changed = e.detail));
  key(input, 'ArrowDown');
  const active = input.getAttribute('aria-activedescendant');
  assert.equal(active, 'opt-1');
  assert.ok($(el, `#${active}`).classList.contains('active'));
  key(input, 'Enter');
  assert.deepEqual(changed.value, ['Apricot']);
  assert.deepEqual(el.value, ['Apricot']);
  assert.equal(input.value, '', 'the text clears after a pick');
  assert.ok($(el, '[role="listbox"]'), 'multiple keeps the listbox open');
  const apricot = options(el).find((o) => o.textContent.trim() === 'Apricot');
  assert.equal(apricot.getAttribute('aria-selected'), 'true');
  // Picking again toggles it off.
  fire(apricot, 'click');
  assert.deepEqual(el.value, []);
  assert.equal($(el, '.sr[aria-live]').textContent, 'Apricot removed', 'removal is announced');
  unmountAll();
  await tick();
});

test('ui-chip-field: Enter on text with no match creates it (and offers Create)', async () => {
  const el = mount('<ui-chip-field label="Tags" multiple allow-create></ui-chip-field>');
  el.options = ['work'];
  await tick();
  const input = $(el, 'input');
  const created = [];
  el.addEventListener('create', (e) => e.detail && created.push(e.detail.value));
  type(input, 'Garden');
  const last = options(el).at(-1);
  assert.equal(last.textContent.trim(), 'Create “Garden”');
  assert.equal(last.hasAttribute('aria-selected'), false);
  key(input, 'Enter');
  assert.deepEqual(created, ['Garden']);
  assert.deepEqual(el.value, ['Garden']);
  assert.deepEqual(chips(el), ['Garden']);
  // A comma ends a value too (typed or pasted): an exact match is picked, not created.
  type(input, 'work,');
  assert.deepEqual(el.value, ['Garden', 'work']);
  assert.deepEqual(created, ['Garden']);
  assert.equal(input.value, '');
  type(input, 'one, two, thr');
  assert.deepEqual(el.value, ['Garden', 'work', 'one', 'two']);
  assert.equal(input.value, 'thr', 'the text after the last comma stays to be typed on');
  // A partial match: Enter takes the first match listed, not the text.
  type(input, 'wor');
  key(input, 'Enter');
  assert.deepEqual(el.value, ['Garden', 'work', 'one', 'two'], 'typed text never takes a chosen value away');
  assert.equal(input.value, '');
  unmountAll();
  await tick();
});

test('ui-chip-field: without allowCreate, Enter on unknown text does nothing', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.options = FRUIT;
  await tick();
  const input = $(el, 'input');
  type(input, 'zzz');
  assert.equal($(el, '[role="listbox"]'), null, 'no matches, no listbox');
  key(input, 'Enter');
  assert.deepEqual(el.value, '');
  unmountAll();
  await tick();
});

test('ui-chip-field single mode: one chip, a pick replaces it and closes', async () => {
  const el = mount('<ui-chip-field label="Status"></ui-chip-field>');
  el.options = ['Todo', 'Doing', 'Done'];
  el.value = 'Todo';
  await tick();
  assert.deepEqual(chips(el), ['Todo']);
  assert.equal($(el, '[role="listbox"]')?.getAttribute('aria-multiselectable') ?? null, null);
  fire($(el, '.field'), 'click');
  assert.ok($(el, '[role="listbox"]'), 'a click on the field opens the listbox');
  const done = options(el).find((o) => o.textContent.trim() === 'Done');
  let changed = null;
  el.addEventListener('change', (e) => (changed = e.detail));
  fire(done, 'click');
  assert.equal(changed.value, 'Done');
  assert.equal(el.value, 'Done');
  assert.deepEqual(chips(el), ['Done']);
  assert.equal($(el, 'input').getAttribute('aria-expanded'), 'false', 'single closes on pick');
  unmountAll();
  await tick();
});

test('ui-chip-field: Backspace in an empty input focuses the last chip, then removes it', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.options = FRUIT;
  el.value = ['Apple', 'Banana'];
  await tick();
  const input = $(el, 'input');
  input.focus();
  key(input, 'Backspace');
  const buttons = $$(el, '.chip-remove');
  assert.equal(el.shadowRoot.activeElement, buttons[1], 'the last chip takes focus');
  assert.deepEqual(el.value, ['Apple', 'Banana'], 'nothing removed on the first press');
  key(buttons[1], 'Backspace');
  assert.deepEqual(el.value, ['Apple']);
  assert.deepEqual(chips(el), ['Apple']);
  await tick();
  assert.equal(el.shadowRoot.activeElement, $$(el, '.chip-remove')[0], 'focus moves to the previous chip');
  key($$(el, '.chip-remove')[0], 'Escape');
  assert.equal(el.shadowRoot.activeElement, input, 'Escape goes back to the input');
  unmountAll();
  await tick();
});

test('ui-chip-field: a chip remove button removes that value', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.value = ['Apple', 'Banana'];
  await tick();
  let changed = null;
  el.addEventListener('change', (e) => (changed = e.detail));
  fire($$(el, '.chip-remove')[0], 'click');
  assert.deepEqual(changed.value, ['Banana']);
  assert.deepEqual(chips(el), ['Banana']);
  unmountAll();
  await tick();
});

test('ui-chip-field: the trailing indicator toggles the listbox; Escape closes it', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.options = FRUIT;
  await tick();
  const toggle = $(el, '.toggle');
  fire(toggle, 'click');
  assert.ok($(el, '[role="listbox"]'));
  assert.ok($(el, '.root.expanded'), 'the indicator turns while open');
  assert.equal(toggle.getAttribute('aria-label'), 'Hide options');
  key(window, 'Escape');
  assert.equal($(el, 'input').getAttribute('aria-expanded'), 'false');
  fire(toggle, 'click');
  fire(toggle, 'click');
  assert.equal($(el, 'input').getAttribute('aria-expanded'), 'false', 'a second press closes it');
  unmountAll();
  await tick();
});

test('ui-chip-field: helper, error, disabled and strings', async () => {
  const el = mount('<ui-chip-field label="Tags" helper="Pick a few" multiple></ui-chip-field>');
  el.value = ['a'];
  await tick();
  assert.equal($(el, '.below .msg').textContent, 'Pick a few');
  el.error = 'Required';
  assert.ok($(el, '.root.error'));
  assert.equal($(el, '.below .msg').getAttribute('role'), 'alert');
  assert.equal($(el, 'input').getAttribute('aria-invalid'), 'true');
  el.strings = { remove: 'Quitar {label}' };
  assert.equal($(el, '.chip-remove').getAttribute('aria-label'), 'Quitar a');
  el.disabled = true;
  assert.ok($(el, '.root.disabled'));
  assert.equal($(el, 'input').disabled, true);
  unmountAll();
  await tick();
});

test('ui-chip-field describes the chips it holds to the input', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.options = FRUIT;
  el.value = ['Apple', 'kiwi'];
  await tick();
  const input = $(el, 'input');
  assert.equal(input.getAttribute('aria-labelledby'), 'label');
  assert.match(input.getAttribute('aria-describedby'), /selected/);
  assert.equal($(el, '#selected').textContent, 'Apple, Kiwi');
  unmountAll();
  await tick();
});

test('ui-chip-field leaving the field picks an exact match and drops other text', async () => {
  const el = mount('<ui-chip-field label="Fruit" multiple></ui-chip-field>');
  el.options = FRUIT;
  await tick();
  const input = $(el, 'input');
  fire(input, 'focusin');
  type(input, 'banana');
  fire(input, 'focusout');
  assert.deepEqual(el.value, ['Banana']);
  type(input, 'nope');
  fire(input, 'focusout');
  assert.deepEqual(el.value, ['Banana']);
  assert.equal(input.value, '');
  unmountAll();
  await tick();
});
