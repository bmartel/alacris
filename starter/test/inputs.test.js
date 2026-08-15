// Smoke tests for the inputs & actions family: ui-fab, ui-button-group,
// ui-toggle-button/-group, ui-checkbox, ui-radio/-group, ui-slider, ui-rating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-button.js';
import '../src/components/ui-fab.js';
import '../src/components/ui-button-group.js';
import '../src/components/ui-toggle-button.js';
import '../src/components/ui-toggle-group.js';
import '../src/components/ui-checkbox.js';
import '../src/components/ui-radio.js';
import '../src/components/ui-radio-group.js';
import '../src/components/ui-slider.js';
import '../src/components/ui-rating.js';

const key = (el, k) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));

// ---------------------------------------------------------------------- fab

test('ui-fab renders variant/size classes, extends with a label, disables', async () => {
  const el = mount('<ui-fab icon="add"></ui-fab>');
  await tick();
  const btn = el.shadowRoot.querySelector('button');
  assert.ok(btn, 'renders a native button');
  assert.ok(btn.className.includes('primary'), 'default variant is primary');
  assert.ok(btn.className.includes('md'), 'default size is md');
  assert.equal(btn.getAttribute('aria-label'), 'add', 'icon names an unlabeled FAB');
  assert.ok(el.shadowRoot.querySelector('ui-icon'), 'renders the icon');

  el.variant = 'tertiary';
  el.size = 'lg';
  assert.ok(btn.className.includes('tertiary'), 'variant prop is live');
  assert.ok(btn.className.includes('lg'), 'size prop is live');

  el.label = 'Compose';
  assert.ok(btn.className.includes('extended'), 'label makes it extended');
  assert.equal(btn.getAttribute('aria-label'), 'Compose');
  assert.equal(el.shadowRoot.querySelector('.text').textContent, 'Compose');

  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  fire(btn, 'click');
  assert.equal(clicks, 1, 'native click bubbles');

  el.disabled = true;
  assert.equal(btn.disabled, true);
  unmountAll();
});

// -------------------------------------------------------------- button group

test('ui-button-group joins slotted buttons and squares their corners', async () => {
  const el = mount(`
    <ui-button-group label="Playback">
      <ui-button>Play</ui-button>
      <ui-button>Stop</ui-button>
    </ui-button-group>`.trim());
  await tick();
  const group = el.shadowRoot.querySelector('.group');
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(group.getAttribute('aria-label'), 'Playback');

  el.label = 'Transport';
  assert.equal(group.getAttribute('aria-label'), 'Transport', 'label prop is live');

  const inner = el.querySelector('ui-button').shadowRoot.querySelector('button');
  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  fire(inner, 'click');
  assert.equal(clicks, 1, 'slotted button clicks bubble through the group');
  unmountAll();
});

// ------------------------------------------------------------ toggle button

test('ui-toggle-button reflects selection and emits ui-toggle', async () => {
  const el = mount('<ui-toggle-button value="left">Left</ui-toggle-button>');
  await tick();
  const btn = el.shadowRoot.querySelector('button');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
  assert.equal(el.shadowRoot.querySelector('ui-icon'), null, 'no check while unselected');

  el.selected = true;
  assert.equal(btn.getAttribute('aria-pressed'), 'true', 'selected prop is live');
  await tick();
  assert.ok(el.shadowRoot.querySelector('ui-icon'), 'check icon appears when selected');

  let detail = null;
  el.addEventListener('ui-toggle', (e) => (detail = e.detail));
  fire(btn, 'click');
  assert.deepEqual(detail, { value: 'left' }, 'click emits ui-toggle with the value');
  assert.equal(el.selected, true, 'button does not flip its own selection');
  unmountAll();
});

// ------------------------------------------------------------- toggle group

test('ui-toggle-group single select: click selects, reflects down, deselects', async () => {
  const el = mount(`
    <ui-toggle-group label="Align">
      <ui-toggle-button value="a">A</ui-toggle-button>
      <ui-toggle-button value="b">B</ui-toggle-button>
    </ui-toggle-group>`.trim());
  await tick();
  const [a, b] = el.querySelectorAll('ui-toggle-button');
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));

  fire(b.shadowRoot.querySelector('button'), 'click');
  assert.equal(el.value, 'b');
  assert.deepEqual(detail, { value: 'b' });
  assert.equal(b.selected, true, 'selection reflected down');
  assert.equal(a.selected, false);

  fire(b.shadowRoot.querySelector('button'), 'click');
  assert.equal(el.value, '', 'pressing the selected segment deselects');
  assert.equal(b.selected, false);
  unmountAll();
});

test('ui-toggle-group multi select accumulates values', async () => {
  const el = mount(`
    <ui-toggle-group label="Toppings" multi value='["a"]'>
      <ui-toggle-button value="a">A</ui-toggle-button>
      <ui-toggle-button value="b">B</ui-toggle-button>
    </ui-toggle-group>`.trim());
  await tick();
  const [a, b] = el.querySelectorAll('ui-toggle-button');
  assert.equal(a.selected, true, 'JSON attribute value selects initially');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(b.shadowRoot.querySelector('button'), 'click');
  assert.deepEqual(detail.value, ['a', 'b']);
  assert.equal(b.selected, true);

  fire(a.shadowRoot.querySelector('button'), 'click');
  assert.deepEqual(detail.value, ['b'], 'clicking a selected segment removes it');
  assert.equal(a.selected, false);
  unmountAll();
});

// ----------------------------------------------------------------- checkbox

test('ui-checkbox toggles, clears indeterminate, and participates in forms', async () => {
  const el = mount('<ui-checkbox label="Terms" name="terms" indeterminate></ui-checkbox>');
  await tick();
  const control = el.shadowRoot.querySelector('.control');
  assert.equal(control.getAttribute('role'), 'checkbox');
  assert.equal(control.getAttribute('aria-checked'), 'mixed', 'indeterminate is mixed');
  assert.equal(el.querySelector('input[type=hidden]'), null, 'unchecked submits nothing');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(control, 'click');
  assert.deepEqual(detail, { checked: true, indeterminate: false });
  assert.equal(el.checked, true);
  assert.equal(el.indeterminate, false);
  assert.equal(control.getAttribute('aria-checked'), 'true');
  await tick();
  assert.ok(el.shadowRoot.querySelector('ui-icon'), 'check mark rendered');
  const hidden = el.querySelector('input[type=hidden]');
  assert.ok(hidden, 'checked mirrors a hidden input');
  assert.equal(hidden.name, 'terms');

  el.indeterminate = true;
  assert.equal(control.getAttribute('aria-checked'), 'mixed', 'indeterminate prop is live');
  unmountAll();
});

// -------------------------------------------------------------- radio group

test('ui-radio renders role=radio and emits ui-radio-select', async () => {
  const el = mount('<ui-radio value="x" label="X"></ui-radio>');
  await tick();
  const btn = el.shadowRoot.querySelector('.control');
  assert.equal(btn.getAttribute('role'), 'radio');
  assert.equal(btn.getAttribute('aria-checked'), 'false');

  el.checked = true;
  assert.equal(btn.getAttribute('aria-checked'), 'true', 'checked prop is live');
  await tick();
  assert.ok(el.shadowRoot.querySelector('.dot'), 'dot rendered while checked');

  let detail = null;
  el.addEventListener('ui-radio-select', (e) => (detail = e.detail));
  fire(btn, 'click');
  assert.deepEqual(detail, { value: 'x' });
  unmountAll();
});

test('ui-radio-group selects on click, reflects down, and binds the form', async () => {
  const el = mount(`
    <ui-radio-group label="Size" name="size" value="m">
      <ui-radio value="s" label="Small"></ui-radio>
      <ui-radio value="m" label="Medium"></ui-radio>
    </ui-radio-group>`.trim());
  await tick();
  const [s, m] = el.querySelectorAll('ui-radio');
  assert.equal(m.checked, true, 'initial value reflected down');
  assert.equal(s.checked, false);
  assert.equal(m.tabIndex, 0, 'checked radio is the tab stop');
  assert.equal(s.tabIndex, -1);
  const hidden = el.querySelector('input[type=hidden]');
  assert.ok(hidden, 'named group mirrors a hidden input');
  assert.equal(hidden.value, 'm');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(s.shadowRoot.querySelector('.control'), 'click');
  assert.deepEqual(detail, { value: 's' });
  assert.equal(el.value, 's');
  assert.equal(s.checked, true);
  assert.equal(m.checked, false);
  unmountAll();
});

test('ui-radio-group arrows move and select (APG)', async () => {
  const el = mount(`
    <ui-radio-group label="Speed">
      <ui-radio value="slow" label="Slow"></ui-radio>
      <ui-radio value="fast" label="Fast"></ui-radio>
    </ui-radio-group>`.trim());
  await tick();
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  key(el, 'ArrowDown');
  assert.ok(detail, 'arrow key selected a radio');
  assert.equal(el.value, detail.value);
  assert.equal(el.querySelector(`ui-radio[value="${detail.value}"]`).checked, true);
  unmountAll();
});

// ------------------------------------------------------------------- slider

test('ui-slider wraps a native range input and emits input/change', async () => {
  const el = mount('<ui-slider label="Volume" name="vol" value="30"></ui-slider>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.ok(input, 'renders a native input');
  assert.equal(input.getAttribute('type'), 'range');
  assert.equal(input.getAttribute('aria-label'), 'Volume');
  assert.equal(String(input.value), '30');

  el.value = 55;
  assert.equal(String(input.value), '55', 'value prop is live');

  const events = [];
  el.addEventListener('input', (e) => events.push(['input', e.detail.value]));
  el.addEventListener('change', (e) => events.push(['change', e.detail.value]));
  input.value = '42';
  fire(input, 'input');
  fire(input, 'change');
  assert.equal(el.value, 42);
  assert.deepEqual(events, [['input', 42], ['change', 42]]);
  const hidden = el.querySelector('input[type=hidden]');
  assert.ok(hidden, 'named slider mirrors a hidden input');
  assert.equal(hidden.value, '42');
  unmountAll();
});

test('ui-slider shows the value bubble while focused (and hides it after)', async () => {
  const el = mount('<ui-slider label="Volume" show-value value="30"></ui-slider>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(el.shadowRoot.querySelector('.bubble'), null, 'no bubble at rest');
  fire(input, 'focus');
  assert.ok(el.shadowRoot.querySelector('.bubble'), 'bubble appears on focus');
  assert.match(el.shadowRoot.querySelector('.bubble').textContent, /30/);
  fire(input, 'blur');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.bubble'), null, 'bubble exits on blur');
  unmountAll();
});

// ------------------------------------------------------------------- rating

test('ui-rating renders stars, fills to the value, commits on click', async () => {
  const el = mount('<ui-rating label="Score" value="3"></ui-rating>');
  await tick();
  const root = el.shadowRoot.querySelector('.root');
  assert.equal(root.getAttribute('role'), 'slider');
  assert.equal(root.getAttribute('aria-valuenow'), '3');
  assert.equal(root.getAttribute('aria-valuemax'), '5');
  const stars = el.shadowRoot.querySelectorAll('.star');
  assert.equal(stars.length, 5);
  assert.equal(el.shadowRoot.querySelectorAll('.star.filled').length, 3);

  el.value = 4;
  assert.equal(el.shadowRoot.querySelectorAll('.star.filled').length, 4, 'value prop is live');
  assert.equal(root.getAttribute('aria-valuenow'), '4');

  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(el.shadowRoot.querySelectorAll('.star')[1], 'click');
  assert.deepEqual(detail, { value: 2 });
  assert.equal(el.value, 2);

  key(root, 'ArrowRight');
  assert.equal(el.value, 3, 'arrow key raises the value');
  unmountAll();
});

test('ui-rating readonly ignores interaction', async () => {
  const el = mount('<ui-rating label="Avg" value="4" readonly></ui-rating>');
  await tick();
  const root = el.shadowRoot.querySelector('.root');
  assert.equal(root.getAttribute('aria-readonly'), 'true');
  let changed = false;
  el.addEventListener('change', () => (changed = true));
  fire(el.shadowRoot.querySelectorAll('.star')[0], 'click');
  key(root, 'ArrowRight');
  assert.equal(changed, false);
  assert.equal(el.value, 4);
  unmountAll();
});
