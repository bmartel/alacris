// Accessibility contracts: accessible names, APG structure, and keyboard
// roving. Assert the DOM the user-agent exposes — not source text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-dialog.js';
import '../src/components/ui-sheet.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-date-picker.js';
import '../src/components/ui-time-picker.js';
import '../src/components/ui-search.js';
import '../src/components/ui-menu.js';
import '../src/components/ui-menu-item.js';
import '../src/components/ui-split-button.js';
import '../src/components/ui-fab-menu.js';
import '../src/components/ui-fab.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-bottom-app-bar.js';
import '../src/components/ui-card.js';
import '../src/components/ui-list-item.js';
import '../src/components/ui-checkbox.js';
import '../src/components/ui-switch.js';
import '../src/components/ui-radio.js';
import '../src/components/ui-table.js';

const key = (el, keyName) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: keyName, bubbles: true, composed: true }));

test('ui-dialog names itself from the headline slot via aria-labelledby', async () => {
  const el = mount(`
    <ui-dialog open>
      <span slot="headline">Discard draft?</span>
      Body
    </ui-dialog>`);
  await tick();
  const surface = el.shadowRoot.querySelector('[role=dialog]');
  assert.equal(surface.getAttribute('aria-labelledby'), 'headline');
  assert.equal(surface.hasAttribute('aria-label'), false);
  assert.ok(el.shadowRoot.getElementById('headline'));
  assert.equal(el.querySelector('[slot=headline]').textContent.trim(), 'Discard draft?');
  unmountAll();
});

test('ui-dialog falls back to the label prop when the headline is empty', async () => {
  const el = mount('<ui-dialog open label="Confirm"><p>Body</p></ui-dialog>');
  await tick();
  const surface = el.shadowRoot.querySelector('[role=dialog]');
  assert.equal(surface.getAttribute('aria-label'), 'Confirm');
  assert.equal(surface.hasAttribute('aria-labelledby'), false);
  unmountAll();
});

test('ui-sheet and ui-side-sheet name themselves from a slotted headline', async () => {
  const sheet = mount(`
    <ui-sheet open>
      <span slot="headline">Share</span>
      Body
    </ui-sheet>`);
  await tick();
  const sheetSurface = sheet.shadowRoot.querySelector('[role=dialog]');
  assert.equal(sheetSurface.getAttribute('aria-labelledby'), 'headline');
  assert.equal(sheetSurface.hasAttribute('aria-label'), false);

  const side = mount(`
    <ui-side-sheet open>
      <span slot="headline">Filters</span>
      Body
    </ui-side-sheet>`);
  await tick();
  const sideSurface = side.shadowRoot.querySelector('[role=dialog]');
  assert.equal(sideSurface.getAttribute('aria-labelledby'), 'headline');
  unmountAll();
});

test('ui-drawer modal dialog has a fallback accessible name', async () => {
  const el = mount('<ui-drawer open></ui-drawer>');
  await tick();
  const surface = el.shadowRoot.querySelector('[role=dialog]');
  assert.equal(surface.getAttribute('aria-label'), 'Navigation');
  unmountAll();
});

test('ui-date-picker input is named and the calendar is a grid of rows', async () => {
  const el = mount('<ui-date-picker label="Event" value="2026-08-14"></ui-date-picker>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(input.getAttribute('aria-labelledby'), 'field-label');
  assert.equal(el.shadowRoot.getElementById('field-label').textContent.trim(), 'Event');

  el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button').click();
  await tick();
  const grid = el.shadowRoot.querySelector('[role=grid]');
  assert.ok(grid);
  assert.ok(grid.querySelector('[role=columnheader]'));
  assert.ok(grid.querySelectorAll('[role=row]').length >= 2);
  assert.ok(grid.querySelector('[role=gridcell]'));
  unmountAll();
});

test('ui-time-picker input is named and the clock has a single tab stop', async () => {
  const el = mount('<ui-time-picker label="Alarm" value="07:30"></ui-time-picker>');
  await tick();
  const input = el.shadowRoot.querySelector('input');
  assert.equal(input.getAttribute('aria-labelledby'), 'field-label');

  el.shadowRoot.querySelector('ui-icon-button').shadowRoot.querySelector('button').click();
  await tick();
  const ticks = [...el.shadowRoot.querySelectorAll('.ticks.on .tick')];
  assert.ok(ticks.length > 1);
  assert.equal(ticks.filter((t) => t.tabIndex === 0).length, 1);
  unmountAll();
});

test('ui-search suggestions are a list (matching ui-list-item) and the field discloses it', async () => {
  const el = mount(`
    <ui-search presentation="view" label="Search files" open>
      <ui-list-item headline="Ada"></ui-list-item>
    </ui-search>`);
  await tick();
  const input = el.shadowRoot.querySelector('input');
  const panel = el.shadowRoot.querySelector('[part=panel]');
  assert.equal(panel.getAttribute('role'), 'list');
  assert.equal(el.querySelector('ui-list-item').getAttribute('role'), 'listitem');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal(input.getAttribute('aria-controls'), 'suggestions');
  unmountAll();
});

test('ui-menu reflects aria-expanded / aria-haspopup on the trigger', async () => {
  const el = mount(`
    <ui-menu>
      <button slot="anchor">More</button>
      <ui-menu-item value="a">Alpha</ui-menu-item>
    </ui-menu>`);
  await tick();
  const btn = el.querySelector('[slot=anchor]');
  assert.equal(btn.getAttribute('aria-haspopup'), 'menu');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  el.open = true;
  await tick();
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  unmountAll();
});

test('ui-split-button projected menu items rove with arrow keys', async () => {
  const el = mount(`
    <ui-split-button>
      Save
      <ui-menu-item slot="menu" value="a">A</ui-menu-item>
      <ui-menu-item slot="menu" value="b">B</ui-menu-item>
    </ui-split-button>`);
  await tick();
  const menu = el.shadowRoot.querySelector('ui-menu');
  menu.open = true;
  await tick();
  const items = [...el.querySelectorAll('ui-menu-item')];
  assert.equal(items.length, 2);
  items[0].focus();
  key(items[0], 'ArrowDown');
  await tick();
  assert.equal(items[0].tabIndex, -1);
  assert.equal(items[1].tabIndex, 0);
  unmountAll();
});

test('ui-fab-menu is a labeled group; Escape closes; trigger reflects expanded', async () => {
  const el = mount(`
    <ui-fab-menu>
      <ui-fab slot="trigger" icon="add" label="Add"></ui-fab>
      <ui-fab icon="edit" label="Edit"></ui-fab>
    </ui-fab-menu>`);
  await tick();
  const triggerBtn = el.querySelector('[slot=trigger]').shadowRoot.querySelector('button');
  assert.equal(triggerBtn.getAttribute('aria-haspopup'), 'true');
  assert.equal(triggerBtn.getAttribute('aria-expanded'), 'false');
  el.open = true;
  await tick();
  assert.equal(triggerBtn.getAttribute('aria-expanded'), 'true');
  assert.equal(el.shadowRoot.querySelector('.actions').getAttribute('role'), 'group');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
  await tick();
  assert.equal(el.open, false);
  unmountAll();
});

test('ui-icon-button never sets an empty aria-label', async () => {
  const named = mount('<ui-icon-button icon="menu"></ui-icon-button>');
  await tick();
  assert.equal(named.shadowRoot.querySelector('button').getAttribute('aria-label'), 'menu');

  const blank = mount('<ui-icon-button></ui-icon-button>');
  await tick();
  assert.equal(blank.shadowRoot.querySelector('button').hasAttribute('aria-label'), false);
  unmountAll();
});

test('ui-bottom-app-bar toolbar has an accessible name', async () => {
  const el = mount('<ui-bottom-app-bar></ui-bottom-app-bar>');
  await tick();
  const bar = el.shadowRoot.querySelector('[role=toolbar]');
  assert.equal(bar.getAttribute('aria-label'), 'Bottom app bar');
  unmountAll();
});

test('ui-checkbox, ui-switch, and ui-radio take their name from the visible label', async () => {
  for (const [tag, role, html] of [
    ['ui-checkbox', 'checkbox', '<ui-checkbox label="Terms"></ui-checkbox>'],
    ['ui-switch', 'switch', '<ui-switch label="Terms"></ui-switch>'],
    ['ui-radio', 'radio', '<ui-radio value="t" label="Terms"></ui-radio>'],
  ]) {
    const el = mount(html);
    await tick();
    const control = el.shadowRoot.querySelector(`[role=${role}]`);
    assert.equal(control.getAttribute('aria-labelledby'), 'label', `${tag} points at the visible text`);
    assert.equal(el.shadowRoot.getElementById('label').textContent, 'Terms');
    assert.equal(control.hasAttribute('aria-label'), false, `${tag} does not invent an aria-label`);
    unmountAll();
  }

  for (const [tag, role, html] of [
    ['ui-checkbox', 'checkbox', '<ui-checkbox></ui-checkbox>'],
    ['ui-switch', 'switch', '<ui-switch></ui-switch>'],
    ['ui-radio', 'radio', '<ui-radio value="t"></ui-radio>'],
  ]) {
    const el = mount(html);
    await tick();
    const control = el.shadowRoot.querySelector(`[role=${role}]`);
    assert.equal(control.hasAttribute('aria-labelledby'), false);
    assert.equal(control.hasAttribute('aria-label'), false, `${tag} does not invent a name when label is empty`);
    assert.equal(el.shadowRoot.getElementById('label'), null);
    unmountAll();
  }
});

test('ui-card documents the body part', async () => {
  const el = mount('<ui-card>Hello</ui-card>');
  await tick();
  assert.ok(el.shadowRoot.querySelector('[part=body]'));
  unmountAll();
});

test('ui-table is a named native table with sort and selection semantics', async () => {
  const el = mount('<ui-table></ui-table>');
  el.headline = 'Nutrition';
  el.columns = [
    { key: 'name', label: 'Dessert', sortable: true },
    { key: 'calories', label: 'Calories', numeric: true, sortable: true },
  ];
  el.rows = [
    { id: 'yogurt', name: 'Frozen yogurt', calories: 159 },
    { id: 'eclair', name: 'Eclair', calories: 262 },
  ];
  el.selectable = 'multiple';
  await tick();

  const table = el.shadowRoot.querySelector('[role=table]');
  assert.equal(table.getAttribute('role'), 'table');
  assert.equal(table.getAttribute('aria-label'), 'Nutrition');
  assert.ok(table.querySelector('[role=columnheader]'));

  const sortBtn = [...table.querySelectorAll('button.sort')]
    .find((b) => b.textContent.includes('Calories'));
  assert.match(sortBtn.getAttribute('aria-label'), /Sort by Calories/);
  fire(sortBtn, 'click');
  assert.equal(sortBtn.closest('[role=columnheader]').getAttribute('aria-sort'), 'ascending');
  assert.match(sortBtn.getAttribute('aria-label'), /sorted ascending/);

  const selectAll = table.querySelector('.thead ui-checkbox');
  assert.equal(selectAll.label, 'Select all rows on this page');
  const rowBox = table.querySelector('.tbody ui-checkbox');
  assert.equal(rowBox.label, 'Select Frozen yogurt');
  fire(rowBox.shadowRoot.querySelector('[role=checkbox]'), 'click');
  assert.equal(table.querySelector('.tbody [role=row]').getAttribute('aria-selected'), 'true');
  unmountAll();
});
