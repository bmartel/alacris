// Smoke tests for the inputs & actions family: ui-fab, ui-button-group,
// ui-toggle-button/-group, ui-checkbox, ui-radio/-group, ui-slider, ui-rating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';
import { define, html, signal } from '@alacris/core';

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
import '../src/components/ui-search.js';
import '../src/components/ui-split-button.js';
import '../src/components/ui-menu-item.js';
import '../src/components/ui-fab-menu.js';

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
  assert.equal(el.shadowRoot.querySelector('.lead.on'), null, 'lead check is off while unselected (no dead space)');

  el.selected = true;
  assert.equal(btn.getAttribute('aria-pressed'), 'true', 'selected prop is live');
  await tick();
  assert.ok(el.shadowRoot.querySelector('.lead.on'), 'check icon appears when selected');

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
  assert.ok(el.shadowRoot.querySelector('.box svg'), 'check mark rendered');
  const hidden = el.querySelector('input[type=hidden]');
  assert.ok(hidden, 'checked mirrors a hidden input');
  assert.equal(hidden.name, 'terms');

  el.indeterminate = true;
  assert.equal(control.getAttribute('aria-checked'), 'mixed', 'indeterminate prop is live');
  assert.equal(el.shadowRoot.querySelector('.box svg path').getAttribute('d'), 'M4 9h10');
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
  assert.equal(el.value, '55');
  assert.equal(el.getAttribute('value'), '55', 'value is reflected');

  const events = [];
  el.addEventListener('input', (e) => events.push(['input', e.detail.value]));
  el.addEventListener('change', (e) => events.push(['change', e.detail.value]));
  input.value = '42';
  fire(input, 'input');
  fire(input, 'change');
  assert.equal(el.value, '42');
  assert.equal(typeof el.value, 'string');
  assert.deepEqual(events, [['input', 42], ['change', 42]]);
  const hidden = el.querySelector('input[type=hidden]');
  assert.ok(hidden, 'named slider mirrors a hidden input');
  assert.equal(hidden.value, '42');
  unmountAll();
});

test('ui-slider value and @input bind from a parent template', async () => {
  const heard = [];
  if (!customElements.get('x-slider-host')) {
    define('x-slider-host', {
      setup() {
        const scale = signal(1.7);
        return html`<ui-slider min="0.5" max="2.5" step="0.005" label="Card size"
          .value=${scale}
          @input=${(e) => { heard.push(e.detail.value); scale.set(e.detail.value); }}></ui-slider>`;
      },
    });
  }
  const el = mount('<x-slider-host></x-slider-host>');
  await tick();
  const slider = el.shadowRoot.querySelector('ui-slider');
  const input = slider.shadowRoot.querySelector('input');
  assert.equal(slider.value, '1.7');
  assert.equal(String(input.value), '1.7');
  assert.equal(typeof slider.value, 'string');

  input.value = '2.1';
  fire(input, 'input');
  assert.equal(slider.value, '2.1');
  assert.deepEqual(heard, [2.1]);
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

test('ui-search types, emits input, clears, and submits on Enter', async () => {
  const el = mount('<ui-search label="Search mail"></ui-search>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(input.getAttribute('aria-label'), 'Search mail');
  const typed = [];
  el.addEventListener('input', (e) => typed.push(e.detail));
  input.value = 'ada';
  fire(input, 'input');
  assert.equal(el.value, 'ada');
  assert.equal(typed.length, 1, 'native input must not leak to the host');
  assert.equal(typed[0].value, 'ada');

  let submitted = null;
  el.addEventListener('submit', (e) => (submitted = e.detail));
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  assert.equal(submitted.value, 'ada');

  let cleared = false;
  el.addEventListener('clear', () => (cleared = true));
  fire(el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button'), 'click');
  assert.equal(el.value, '');
  assert.equal(cleared, true);
  unmountAll();
});

test('ui-slider range emits start/end and keeps thumbs from crossing', async () => {
  const el = mount('<ui-slider label="Price" range value-start="20" value-end="80" name="price"></ui-slider>');
  await tick();
  const inputs = el.shadowRoot.querySelectorAll('input[type=range]');
  assert.equal(inputs.length, 2);
  let detail = null;
  el.addEventListener('input', (e) => { if (e.detail && 'start' in e.detail) detail = e.detail; });
  inputs[0].value = '30';
  fire(inputs[0], 'input');
  assert.equal(el.valueStart, 30);
  assert.equal(detail.start, 30);
  assert.equal(detail.end, 80);
  inputs[1].value = '10';
  fire(inputs[1], 'input');
  assert.equal(el.valueEnd, 30, 'end cannot cross below start');
  unmountAll();
});

test('ui-search view opens suggestions on focus', async () => {
  const el = mount('<ui-search presentation="view" label="Search files"><span>Ada</span></ui-search>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null);
  fire(el.shadowRoot.querySelector('input'), 'focus');
  assert.equal(el.open, true);
  assert.ok(el.shadowRoot.querySelector('.panel'), 'view opens a suggestions panel');
  const back = [...el.shadowRoot.querySelectorAll('ui-icon-button')]
    .find((b) => b.label === 'Back' || b.getAttribute('label') === 'Back')
    || el.shadowRoot.querySelector('ui-icon-button');
  fire(back.shadowRoot.querySelector('button'), 'click');
  assert.equal(el.open, false);
  unmountAll();
});

test('ui-search view closes when the query is cleared', async () => {
  const el = mount('<ui-search presentation="view" label="Search files"><span>Ada</span></ui-search>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  input.value = 'ada';
  fire(input, 'input');
  assert.equal(el.open, true, 'typing opens the view');
  assert.ok(el.shadowRoot.querySelector('.panel'));

  const clearBtn = [...el.shadowRoot.querySelectorAll('ui-icon-button')]
    .find((b) => b.label === 'Clear');
  fire(clearBtn.shadowRoot.querySelector('button'), 'click');
  assert.equal(el.value, '');
  assert.equal(el.open, false, 'clear returns to the bar');
  unmountAll();
});

test('ui-search view uses a single extra-large surface while open', async () => {
  const el = mount('<ui-search presentation="view" label="Search files" open><span>Ada</span></ui-search>');
  await tick();
  const root = el.shadowRoot.querySelector('.open');
  assert.ok(root, 'open view wraps bar and panel in one surface');
  assert.ok(root.className.includes('open'));
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'suggestions sit inside the surface');
  assert.equal(el.shadowRoot.querySelector('.bar').parentElement, root);
  assert.equal(getComputedStyle(panel).position, 'absolute', 'panel overlays instead of growing the layout');
  unmountAll();
});

test('ui-search height token sizes the bar and leading well', async () => {
  const el = mount('<ui-search presentation="view" label="Q" style="--ui-search-height:40px"></ui-search>');
  await tick();
  const bar = el.shadowRoot.querySelector('.bar');
  const leads = el.shadowRoot.querySelector('.leads');
  assert.match(getComputedStyle(bar).minBlockSize, /40px/);
  assert.match(getComputedStyle(leads).inlineSize, /40px/);
  unmountAll();
});

test('ui-split-button menu select emits the item value', async () => {
  const el = mount(`
    <ui-split-button>
      Save
      <ui-menu-item slot="menu" value="draft">Save draft</ui-menu-item>
    </ui-split-button>`);
  await tick();
  const menu = el.shadowRoot.querySelector('ui-menu');
  menu.open = true;
  assert.equal(menu.open, true);
  let detail = null;
  el.addEventListener('select', (e) => (detail = e.detail));
  fire(el.querySelector('ui-menu-item'), 'click');
  assert.equal(detail.value, 'draft');
  unmountAll();
});

test('ui-fab-menu toggles related actions from the trigger', async () => {
  const el = mount(`
    <ui-fab-menu>
      <ui-fab slot="trigger" icon="add"></ui-fab>
      <ui-fab icon="edit" label="Edit"></ui-fab>
    </ui-fab-menu>`);
  await tick();
  assert.equal(el.shadowRoot.querySelector('.actions'), null);
  fire(el.querySelector('[slot="trigger"]'), 'click');
  assert.equal(el.open, true);
  assert.ok(el.shadowRoot.querySelector('.actions'));
  fire(el.querySelector('ui-fab[icon="edit"]'), 'click');
  assert.equal(el.open, false);
  unmountAll();
});
