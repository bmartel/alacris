// Table pipeline (util/table.js) and DataGrid behaviour on <ui-table>.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterRows, sortRows, groupRows, aggregateRow, formatAgg, toCsv, processTable,
  inferColumns, visibleColumns,
} from '../src/util/table.js';
import { mount, unmountAll, tick, fire } from './helpers.js';
import '../src/components/ui-table.js';

const rows = [
  { id: 'a', name: 'Adzuki', quantity: 10, status: 'Open' },
  { id: 'b', name: 'Cocoa', quantity: 5, status: 'Filled' },
  { id: 'c', name: 'Adzuki', quantity: 7, status: 'Open' },
];
const cols = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'quantity', label: 'Qty', numeric: true, sortable: true, aggregate: 'sum' },
  { key: 'status', label: 'Status' },
];

test('filterRows, sortRows, and inferColumns', () => {
  assert.equal(filterRows(rows, cols, 'Adz').length, 2);
  assert.deepEqual(sortRows(rows, cols, 'quantity', 'desc').map((r) => r.id), ['a', 'c', 'b']);
  const inferred = inferColumns([{ id: 1, name: 'Ada', age: 36 }]);
  assert.deepEqual(inferred.map((c) => c.key), ['name', 'age']);
  assert.equal(inferred[1].numeric, true);
});

test('visibleColumns respects hidden keys but keeps one column', () => {
  const shown = visibleColumns(cols, rows, ['name', 'quantity', 'status']);
  assert.equal(shown.length, 1);
  assert.equal(visibleColumns(cols, rows, ['status']).map((c) => c.key).join(), 'name,quantity');
});

test('groupRows expands by default and aggregates per group', () => {
  const grouped = groupRows(rows, 'name', { cols });
  const adzuki = grouped.find((it) => it.type === 'group' && it.key === 'Adzuki');
  assert.equal(adzuki.count, 2);
  assert.equal(adzuki.aggregates.quantity, 17);
  assert.equal(adzuki.expanded, true);
  assert.equal(grouped.filter((it) => it.type === 'row' && it.group === 'Adzuki').length, 2);

  const collapsed = groupRows(rows, 'name', { cols, expanded: new Set() });
  assert.equal(collapsed.filter((it) => it.type === 'row').length, 0);
});

test('aggregateRow and toCsv', () => {
  assert.equal(aggregateRow(rows, cols).quantity, 22);
  assert.equal(formatAgg(22), '22');
  const csv = toCsv(rows, cols);
  assert.match(csv, /^Name,Qty,Status/);
  assert.match(csv, /Adzuki,10,Open/);
});

test('processTable filters, sorts, groups, and paginates', () => {
  const out = processTable({
    rows, columns: cols, sortBy: 'quantity', sortDir: 'asc',
    groupBy: 'name', pageSize: 10,
  });
  assert.equal(out.filteredCount, 3);
  assert.equal(out.totals.quantity, 22);
  assert.ok(out.visible.some((it) => it.type === 'group'));
});

test('ui-table-toolbar and footer compose kit controls', async () => {
  const el = mount('<ui-table></ui-table>');
  el.headline = 'Trades';
  el.columns = cols;
  el.rows = rows;
  el.quickFilter = true;
  el.columnMenu = true;
  el.densityMenu = true;
  el.csvExport = true;
  el.pageSize = 2;
  await tick();

  const bar = el.shadowRoot.querySelector('ui-table-toolbar');
  assert.ok(bar, 'default toolbar is composed');
  assert.ok(bar.shadowRoot.querySelector('ui-search'), 'quick filter reuses ui-search');
  assert.ok(bar.shadowRoot.querySelector('ui-menu'), 'density reuses ui-menu');
  assert.ok(bar.shadowRoot.querySelector('ui-icon-button[label="Export CSV"]') ||
    [...bar.shadowRoot.querySelectorAll('ui-icon-button')].some((b) => b.label === 'Export CSV'));

  const foot = el.shadowRoot.querySelector('ui-table-footer');
  assert.ok(foot, 'default footer is composed');
  assert.ok(foot.shadowRoot.querySelector('ui-pagination'), 'pager reuses ui-pagination');
  assert.match(foot.shadowRoot.querySelector('.range').textContent, /1–2 of 3/);
  unmountAll();
});

test('ui-table groups rows, shows sums, and toggles a group', async () => {
  const el = mount('<ui-table></ui-table>');
  el.columns = cols;
  el.rows = rows;
  el.groupBy = 'name';
  await tick();
  const grid = el.shadowRoot.querySelector('[role=table]');
  const groups = [...grid.querySelectorAll('[role=row][aria-expanded]')];
  assert.ok(groups.length >= 2);
  assert.match(groups[0].textContent, /Adzuki \(2\)/);
  assert.match(grid.querySelector('.tfoot')?.textContent || grid.textContent, /22|Total/);

  let grouped = null;
  el.addEventListener('group', (e) => (grouped = e.detail));
  const toggle = groups[0].querySelector('button.group-toggle');
  fire(toggle, 'click');
  assert.equal(grouped.key, 'Adzuki');
  assert.equal(grouped.expanded, false);
  unmountAll();
});
