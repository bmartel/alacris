// Vue 3 keyed render-function, production build, rendered synchronously.
import { h, render } from 'vue';
import { buildData } from '../data.js';

export default function vue(container) {
  let rows = [];
  let selected = -1;

  const onSelect = (id) => { selected = id; paint(); };
  const onRemove = (id) => { rows = rows.filter((r) => r.id !== id); paint(); };

  function paint() {
    render(
      h('table', null,
        h('tbody', null, rows.map((row) =>
          h('tr', {
            key: row.id,
            class: row.id === selected ? 'danger' : '',
          }, [
            h('td', { class: 'col-md-1' }, row.id),
            h('td', { class: 'col-md-4' },
              h('a', { class: 'lbl', onClick: () => onSelect(row.id) }, row.label)),
            h('td', { class: 'col-md-1' },
              h('a', { class: 'remove', onClick: () => onRemove(row.id) }, '✕')),
            h('td', { class: 'col-md-6' }),
          ]),
        )),
      ),
      container,
    );
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
    dispose: () => render(null, container),
  };
}
