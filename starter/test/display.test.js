// Smoke tests for the data-display family:
// ui-avatar, ui-badge, ui-divider, ui-list(-item), ui-table, ui-tooltip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

const key = (el, k) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

import '../src/components/ui-avatar.js';
import '../src/components/ui-badge.js';
import '../src/components/ui-divider.js';
import '../src/components/ui-list.js';
import '../src/components/ui-list-item.js';
import '../src/components/ui-table.js';
import '../src/components/ui-tooltip.js';
import '../src/components/ui-carousel.js';
import '../src/components/ui-carousel-item.js';

test('ui-avatar renders initials from name and labels itself', async () => {
  const el = mount('<ui-avatar name="Ada Lovelace"></ui-avatar>');
  await tick();
  const initials = el.shadowRoot.querySelector('.initials');
  assert.ok(initials, 'initials fallback renders without src');
  assert.equal(initials.textContent, 'AL');
  assert.equal(el.getAttribute('role'), 'img');
  assert.equal(el.getAttribute('aria-label'), 'Ada Lovelace');
  el.name = 'Grace';
  assert.equal(initials.textContent, 'G', 'single word gives one initial');
  el.label = 'Rear Admiral Grace Hopper';
  assert.equal(el.getAttribute('aria-label'), 'Rear Admiral Grace Hopper');
  unmountAll();
});

test('ui-avatar falls back to the icon, and size sets the host property', async () => {
  const el = mount('<ui-avatar icon="person" size="56px"></ui-avatar>');
  await tick();
  assert.ok(el.shadowRoot.querySelector('ui-icon'), 'icon fallback when no name');
  assert.equal(el.getAttribute('aria-hidden'), 'true', 'unlabeled avatar is decorative');
  assert.equal(el.style.getPropertyValue('--ui-avatar-size'), '56px');
  el.size = '';
  assert.equal(el.style.getPropertyValue('--ui-avatar-size'), '');
  unmountAll();
});

test('ui-badge shows the count, overflows at max, and hides', async () => {
  const el = mount('<ui-badge value="3" label="3 unread"><button>Inbox</button></ui-badge>');
  await tick();
  const badge = el.shadowRoot.querySelector('.badge');
  assert.ok(badge, 'badge renders for a non-zero value');
  assert.equal(badge.textContent, '3');
  assert.equal(badge.getAttribute('aria-label'), '3 unread');
  el.value = 1287;
  assert.equal(el.shadowRoot.querySelector('.badge').textContent, '99+', 'default max is 99');
  el.max = 999;
  assert.equal(el.shadowRoot.querySelector('.badge').textContent, '999+');
  el.show = false;
  await tick();
  assert.equal(el.shadowRoot.querySelector('.badge'), null, 'show=false removes the badge');
  unmountAll();
});

test('ui-badge hides at zero unless dot', async () => {
  const el = mount('<ui-badge><button>A</button></ui-badge>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.badge'), null, 'value 0 renders nothing');
  el.dot = true;
  const badge = el.shadowRoot.querySelector('.badge');
  assert.ok(badge, 'dot shows regardless of value');
  assert.ok(badge.className.includes('dot'));
  assert.equal(badge.textContent.trim(), '', 'dot carries no text');
  unmountAll();
});

test('ui-divider exposes separator semantics and reflects orientation', async () => {
  const el = mount('<ui-divider inset></ui-divider>');
  await tick();
  assert.equal(el.getAttribute('role'), 'separator');
  assert.equal(el.getAttribute('aria-orientation'), 'horizontal');
  assert.ok(el.hasAttribute('inset'));
  el.orientation = 'vertical';
  assert.equal(el.getAttribute('orientation'), 'vertical');
  assert.equal(el.getAttribute('aria-orientation'), 'vertical');
  el.middle = true;
  assert.ok(el.hasAttribute('middle'));
  unmountAll();
});

test('ui-list is a labeled list of listitems', async () => {
  const el = mount(
    '<ui-list label="People"><ui-list-item headline="Ada"></ui-list-item></ui-list>');
  await tick();
  assert.equal(el.getAttribute('role'), 'list');
  assert.equal(el.getAttribute('aria-label'), 'People');
  const item = el.querySelector('ui-list-item');
  assert.equal(item.getAttribute('role'), 'listitem');
  assert.ok(item.shadowRoot.querySelector('.headline').textContent.includes('Ada'));
  el.label = 'Crew';
  assert.equal(el.getAttribute('aria-label'), 'Crew');
  unmountAll();
});

test('ui-list-item interactive/selected/two-line states and click', async () => {
  const el = mount('<ui-list-item headline="Grace" supporting="Compiler"></ui-list-item>');
  await tick();
  const control = el.shadowRoot.querySelector('.control');
  assert.ok(control.className.includes('two-line'), 'supporting prop makes it two lines');
  assert.equal(control.getAttribute('role'), null, 'non-interactive rows have no button role');
  el.interactive = true;
  assert.equal(control.getAttribute('role'), 'button');
  assert.equal(control.getAttribute('tabindex'), '0');
  el.selected = true;
  assert.ok(control.className.includes('selected'));
  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  fire(control, 'click');
  assert.equal(clicks, 1, 'native click bubbles to the host');
  el.disabled = true;
  assert.equal(control.getAttribute('tabindex'), null, 'disabled removes the tab stop');
  assert.equal(control.getAttribute('aria-disabled'), 'true');
  unmountAll();
});

test('ui-list-item href renders a link row', async () => {
  const el = mount('<ui-list-item headline="Docs" href="/docs"></ui-list-item>');
  await tick();
  const a = el.shadowRoot.querySelector('a.control');
  assert.ok(a, 'href renders an <a> control');
  assert.equal(a.getAttribute('href'), '/docs');
  unmountAll();
});

test('ui-table adopts the table into its shadow and reflects props', async () => {
  const el = mount(
    '<ui-table><table><thead><tr><th>Name</th></tr></thead>' +
    '<tbody><tr><td>Frozen yogurt</td></tr></tbody></table></ui-table>');
  await tick();
  assert.ok(el.shadowRoot, 'open shadow root');
  const table = el.shadowRoot.querySelector('table');
  assert.ok(table, 'table lives in the shadow tree');
  assert.equal(el.querySelector('table'), null, 'not left in the light DOM');
  assert.equal(table.querySelector('td').textContent, 'Frozen yogurt');
  el.dense = true;
  assert.ok(el.hasAttribute('dense'), 'dense reflects for CSS');
  el.stickyHeader = true;
  assert.ok(el.hasAttribute('sticky-header'), 'stickyHeader reflects kebab-cased');
  el.dense = false;
  assert.ok(!el.hasAttribute('dense'));
  unmountAll();
});

test('ui-table markup sort buttons reorder rows and set aria-sort', async () => {
  const el = mount(
    '<ui-table label="Nutrition"><table><thead><tr>' +
    '<th data-sortable data-key="name">Dessert</th>' +
    '<th data-sortable data-numeric data-key="cal">Calories</th>' +
    '</tr></thead><tbody>' +
    '<tr><td>Cupcake</td><td data-numeric>305</td></tr>' +
    '<tr><td>Yogurt</td><td data-numeric>159</td></tr>' +
    '</tbody></table></ui-table>');
  await tick();
  const table = el.shadowRoot.querySelector('table');
  assert.equal(table.getAttribute('aria-label'), 'Nutrition');
  const cal = table.querySelector('th[data-key="cal"]');
  assert.ok(cal.className.includes('numeric'));
  assert.ok(table.querySelector('td.numeric'), 'numeric header paints the column');
  const btn = cal.querySelector('button.sort');
  assert.ok(btn);
  let sort = null;
  el.addEventListener('sort', (e) => (sort = e.detail));
  fire(btn, 'click');
  assert.equal(sort.key, 'cal');
  assert.equal(sort.dir, 'asc');
  assert.equal(cal.getAttribute('aria-sort'), 'ascending');
  assert.equal(table.querySelector('tbody tr td').textContent, 'Yogurt', 'asc by calories');
  fire(btn, 'click');
  assert.equal(sort.dir, 'desc');
  assert.equal(cal.getAttribute('aria-sort'), 'descending');
  assert.equal(table.querySelector('tbody tr td').textContent, 'Cupcake');
  unmountAll();
});

test('ui-table data mode sorts, selects, paginates, and filters', async () => {
  const el = mount('<ui-table></ui-table>');
  el.headline = 'Nutrition';
  el.columns = [
    { key: 'name', label: 'Dessert', sortable: true },
    { key: 'calories', label: 'Calories', numeric: true, sortable: true },
  ];
  el.rows = [
    { id: 'yogurt', name: 'Frozen yogurt', calories: 159 },
    { id: 'eclair', name: 'Eclair', calories: 262 },
    { id: 'cupcake', name: 'Cupcake', calories: 305 },
  ];
  el.selectable = 'multiple';
  el.pageSize = 2;
  await tick();

  const table = el.shadowRoot.querySelector('[role=table]');
  assert.ok(table, 'data mode renders a table');
  assert.equal(table.getAttribute('aria-label'), 'Nutrition');
  assert.equal(table.querySelectorAll('.tbody [role=row]').length, 2, 'pageSize slices rows');
  assert.ok(table.querySelector('.th.numeric'), 'numeric column class');
  assert.match(
    el.shadowRoot.querySelector('ui-table-footer').shadowRoot.querySelector('.range').textContent,
    /1–2 of 3/,
  );

  let sort = null;
  el.addEventListener('sort', (e) => (sort = e.detail));
  const nameBtn = [...table.querySelectorAll('button.sort')]
    .find((b) => b.textContent.includes('Dessert'));
  fire(nameBtn, 'click');
  assert.equal(sort.key, 'name');
  assert.equal(sort.dir, 'asc');
  assert.equal(nameBtn.closest('[role=columnheader]').getAttribute('aria-sort'), 'ascending');
  const firstData = table.querySelector('.tbody [role=row] [role=cell]:nth-child(2), .tbody [role=row] .td:nth-child(2)');
  assert.equal(firstData.textContent.trim(), 'Cupcake');

  let changed = null;
  el.addEventListener('change', (e) => (changed = e.detail));
  const rowBox = table.querySelector('.tbody ui-checkbox').shadowRoot.querySelector('[role=checkbox]');
  fire(rowBox, 'click');
  assert.deepEqual(changed.selected, ['cupcake']);
  assert.equal(table.querySelector('.tbody [role=row]').getAttribute('aria-selected'), 'true');
  assert.ok(el.shadowRoot.querySelector('ui-table-toolbar').shadowRoot.querySelector('.bar.picking'));
  assert.match(
    el.shadowRoot.querySelector('ui-table-toolbar').shadowRoot.getElementById('table-title').textContent,
    /1 selected/,
  );

  let page = null;
  el.addEventListener('page', (e) => (page = e.detail));
  const pager = el.shadowRoot.querySelector('ui-table-footer').shadowRoot.querySelector('ui-pagination');
  const next = [...pager.shadowRoot.querySelectorAll('button')]
    .find((b) => (b.getAttribute('aria-label') || '').match(/next/i));
  fire(next, 'click');
  assert.equal(page.page, 2);
  assert.equal(table.querySelectorAll('.tbody [role=row]').length, 1);

  el.filter = 'yogurt';
  el.page = 1;
  assert.equal(table.querySelectorAll('.tbody [role=row]').length, 1);
  assert.match(table.querySelector('.tbody [role=row]').textContent, /Frozen yogurt/);

  el.rows = [];
  assert.ok(table.querySelector('.empty'));
  assert.match(table.querySelector('.empty').textContent, /No results/);

  el.loading = true;
  assert.equal(table.getAttribute('aria-busy'), 'true');
  assert.ok(el.shadowRoot.querySelector('ui-progress'));
  unmountAll();
});

test('ui-table infers columns from rows and names checkboxes', async () => {
  const el = mount('<ui-table></ui-table>');
  el.rows = [{ id: 1, name: 'Ada', age: 36 }];
  el.selectable = 'single';
  await tick();
  const headers = [...el.shadowRoot.querySelectorAll('[role=columnheader]')];
  assert.ok(headers.some((th) => th.textContent.includes('Name')));
  assert.ok(headers.some((th) => th.textContent.includes('Age')));
  const box = el.shadowRoot.querySelector('.tbody ui-checkbox');
  assert.equal(box.label, 'Select Ada');
  unmountAll();
});

test('ui-tooltip shows on focus, renders the text, hides on blur', async () => {
  const el = mount('<ui-tooltip text="Save changes" delay="0"><button>Save</button></ui-tooltip>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'closed by default');
  fire(el, 'focusin');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'focus shows immediately');
  assert.equal(panel.getAttribute('role'), 'tooltip');
  assert.ok(panel.className.includes('plain'));
  assert.ok(panel.textContent.includes('Save changes'));
  fire(el, 'focusout');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'blur hides');
  unmountAll();
});

test('ui-tooltip hides on Escape and supports rich content', async () => {
  const el = mount(
    '<ui-tooltip rich delay="0"><span slot="content">Details</span><button>More</button></ui-tooltip>');
  await tick();
  fire(el, 'focusin');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel.className.includes('rich'));
  assert.ok(panel.querySelector('slot[name="content"]'), 'rich mode renders the content slot');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'Escape hides');
  unmountAll();
});

test('ui-carousel next/prev move index and emit change', async () => {
  const el = mount(`
    <ui-carousel label="Photos">
      <ui-carousel-item>One</ui-carousel-item>
      <ui-carousel-item>Two</ui-carousel-item>
      <ui-carousel-item>Three</ui-carousel-item>
    </ui-carousel>`);
  await tick();
  const items = [...el.querySelectorAll('ui-carousel-item')];
  assert.equal(items[0].selected, true);
  assert.equal(items[0].hasAttribute('selected'), true);
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(el.shadowRoot.querySelector('[part=next]').shadowRoot.querySelector('button'), 'click');
  assert.equal(el.index, 1);
  assert.equal(detail.index, 1);
  assert.equal(items[1].selected, true);
  assert.equal(items[1].hasAttribute('selected'), true);
  assert.equal(items[0].hasAttribute('selected'), false);
  fire(el.shadowRoot.querySelector('[part=prev]').shadowRoot.querySelector('button'), 'click');
  assert.equal(el.index, 0);
  key(el.shadowRoot.querySelector('.root'), 'ArrowRight');
  assert.equal(el.index, 1);
  unmountAll();
});

test('ui-carousel hero next reaches the last item', async () => {
  const el = mount(`
    <ui-carousel label="Hero photos" variant="hero">
      <ui-carousel-item>Hero</ui-carousel-item>
      <ui-carousel-item>Next</ui-carousel-item>
      <ui-carousel-item>After</ui-carousel-item>
    </ui-carousel>`);
  await tick();
  const next = el.shadowRoot.querySelector('[part=next]').shadowRoot.querySelector('button');
  fire(next, 'click');
  fire(next, 'click');
  assert.equal(el.index, 2, 'hero carousel can select the last slide');
  const items = [...el.querySelectorAll('ui-carousel-item')];
  assert.equal(items[2].selected, true);
  assert.equal(items[2].hasAttribute('selected'), true);
  key(el.shadowRoot.querySelector('.root'), 'End');
  assert.equal(el.index, 2);
  unmountAll();
});
