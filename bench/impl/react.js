// React 19 keyed, production build, flushed so the work lands in the timed window.
import { createElement as h, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { buildData } from '../data.js';

const Row = memo(function Row({ row, sel, onSelect, onRemove }) {
  return h('tr', { className: sel ? 'danger' : '' },
    h('td', { className: 'col-md-1' }, row.id),
    h('td', { className: 'col-md-4' },
      h('a', { className: 'lbl', onClick: () => onSelect(row.id) }, row.label)),
    h('td', { className: 'col-md-1' },
      h('a', { className: 'remove', onClick: () => onRemove(row.id) }, '✕')),
    h('td', { className: 'col-md-6' }),
  );
}, (a, b) => a.row === b.row && a.sel === b.sel);

export default function react(container) {
  let rows = [];
  let selected = -1;
  const root = createRoot(container);

  const onSelect = (id) => { selected = id; paint(); };
  const onRemove = (id) => { rows = rows.filter((r) => r.id !== id); paint(); };

  function paint() {
    flushSync(() => {
      root.render(
        h('table', null,
          h('tbody', null, rows.map((row) =>
            h(Row, {
              key: row.id,
              row,
              sel: row.id === selected,
              onSelect,
              onRemove,
            }),
          )),
        ),
      );
    });
  }

  paint();

  return {
    create(n) { rows = buildData(n); selected = -1; paint(); },
    append(n) { rows = rows.concat(buildData(n)); paint(); },
    update() {
      rows = rows.slice();
      for (let i = 0; i < rows.length; i += 10) {
        rows[i] = { ...rows[i], label: rows[i].label + ' !!!' };
      }
      paint();
    },
    select(i) { const r = rows[i]; if (r) { selected = r.id; paint(); } },
    swap() {
      if (rows.length < 999) return;
      rows = rows.slice();
      [rows[1], rows[998]] = [rows[998], rows[1]];
      paint();
    },
    remove(i) { rows = rows.slice(); rows.splice(i, 1); paint(); },
    clear() { rows = []; selected = -1; paint(); },
    count: () => container.querySelectorAll('tbody > tr').length,
    firstLabel: () => container.querySelector('.lbl')?.textContent ?? '',
    dispose: () => root.unmount(),
  };
}
