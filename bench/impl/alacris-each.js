// Alacris using each() — every row gets its own reactive scope, created once.
// Reordering is pure insertBefore; changing one row wakes one binding.
// selector() keeps "which row is selected?" at O(1), matching Solid's createSelector.
import { html, each, render, signal, batch } from '../../dist/alacris.js';
import { selector } from '../../dist/store.js';
import { buildData } from '../data.js';

export default function alacrisEach(container) {
  const rows = signal([]);
  const selected = signal(-1);
  const isSelected = selector(selected);

  const dispose = render(
    html`<table>
      <tbody>
        ${each(
          rows,
          (row) => {
            const id = row().id;
            return html`<tr class=${() => (isSelected(id) ? 'danger' : '')}>
              <td class="col-md-1">${id}</td>
              <td class="col-md-4">
                <a class="lbl" @click=${() => selected(id)}>${() => row().label}</a>
              </td>
              <td class="col-md-1">
                <a class="remove" @click=${() => api.removeId(id)}>✕</a>
              </td>
              <td class="col-md-6"></td>
            </tr>`;
          },
          (r) => r.id
        )}
      </tbody>
    </table>`,
    container
  );

  const api = {
    create(n) {
      rows(buildData(n));
    },
    append(n) {
      rows([...rows.peek(), ...buildData(n)]);
    },
    update() {
      const list = rows.peek().slice();
      for (let i = 0; i < list.length; i += 10) {
        list[i] = { ...list[i], label: list[i].label + ' !!!' };
      }
      rows(list);
    },
    select(i) {
      const r = rows.peek()[i];
      if (r) selected(r.id);
    },
    swap() {
      const list = rows.peek().slice();
      if (list.length < 999) return;
      [list[1], list[998]] = [list[998], list[1]];
      rows(list);
    },
    remove(i) {
      const list = rows.peek().slice();
      list.splice(i, 1);
      rows(list);
    },
    removeId(id) {
      rows(rows.peek().filter((r) => r.id !== id));
    },
    clear() {
      batch(() => {
        rows([]);
        selected(-1);
      });
    },
    count: () => container.querySelectorAll('tbody > tr').length,
    firstLabel: () => container.querySelector('.lbl')?.textContent ?? '',
    dispose,
  };
  return api;
}
