// Alacris with each() + store. Mutating one row's label writes that one text node:
// there is no list diff, no row rebuild, and nothing else is consulted.
import { html, each, render, batch } from '../../dist/alacris.js';
import { store, unwrap, selector } from '../../dist/store.js';
import { buildData } from '../data.js';

export default function alacrisStore(container) {
  const state = store({ rows: [], selected: -1 });
  const isSelected = selector(() => state.selected);

  const dispose = render(
    html`<table>
      <tbody>
        ${each(
          () => state.rows,
          (row) => html`<tr class=${() => (isSelected(row().id) ? 'danger' : '')}>
            <td class="col-md-1">${() => row().id}</td>
            <td class="col-md-4">
              <a class="lbl" @click=${() => (state.selected = row().id)}>${() => row().label}</a>
            </td>
            <td class="col-md-1">
              <a class="remove" @click=${() => api.removeId(row().id)}>✕</a>
            </td>
            <td class="col-md-6"></td>
          </tr>`,
          (r) => r.id
        )}
      </tbody>
    </table>`,
    container
  );

  const api = {
    create(n) {
      state.rows = buildData(n);
    },
    append(n) {
      const extra = buildData(n);
      const list = state.rows;
      batch(() => { for (let i = 0; i < extra.length; i++) list[list.length] = extra[i]; });
    },
    update() {
      // The point of the store: an in-place write per changed row.
      const list = state.rows;
      batch(() => {
        for (let i = 0; i < list.length; i += 10) list[i].label += ' !!!';
      });
    },
    select(i) {
      const r = state.rows[i];
      if (r) state.selected = r.id;
    },
    swap() {
      const list = state.rows;
      if (list.length < 999) return;
      const a = unwrap(list[1]);
      const b = unwrap(list[998]);
      batch(() => { list[1] = b; list[998] = a; });
    },
    remove(i) {
      state.rows.splice(i, 1);
    },
    removeId(id) {
      const list = state.rows;
      for (let i = 0; i < list.length; i++) if (list[i].id === id) { list.splice(i, 1); return; }
    },
    clear() {
      batch(() => { state.rows = []; state.selected = -1; });
    },
    count: () => container.querySelectorAll('tbody > tr').length,
    firstLabel: () => container.querySelector('.lbl')?.textContent ?? '',
    dispose,
  };
  return api;
}
