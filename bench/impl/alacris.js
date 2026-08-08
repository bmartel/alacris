// Alacris, written the way the README tells you to write it.
import { html, keyed, render, signal, batch } from '../../dist/alacris.js';
import { buildData } from '../data.js';

export default function alacris(container) {
  const rows = signal([]);
  const selected = signal(-1);

  const dispose = render(
    html`<table>
      <tbody>
        ${() =>
          rows().map((r) =>
            keyed(
              r.id,
              html`<tr class=${r.id === selected() ? 'danger' : ''}>
                <td class="col-md-1">${r.id}</td>
                <td class="col-md-4">
                  <a class="lbl" @click=${() => selected(r.id)}>${r.label}</a>
                </td>
                <td class="col-md-1">
                  <a class="remove" @click=${() => api.removeId(r.id)}>✕</a>
                </td>
                <td class="col-md-6"></td>
              </tr>`
            )
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
