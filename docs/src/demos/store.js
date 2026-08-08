import { define, html, each } from 'alacris';
import { store, selector } from 'alacris/store';

define('demo-store', {
  styles: `
    :host { display: grid; gap: .6rem; font: inherit; max-width: 30rem }
    table { border-collapse: collapse; width: 100% }
    td { padding: .3rem .5rem; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent) }
    tr[data-sel] { background: color-mix(in srgb, currentColor 10%, transparent) }
    .n { opacity: .5; width: 2rem; font-variant-numeric: tabular-nums }
    button { font: inherit; padding: .3rem .65rem; border-radius: 6px; cursor: pointer;
      border: 1px solid currentColor; background: transparent; color: inherit }
    .row { display: flex; gap: .5rem; flex-wrap: wrap }
    .paints { opacity: .7; font-size: .85rem }
  `,
  setup() {
    const state = store({
      rows: [
        { id: 1, label: 'alpha' },
        { id: 2, label: 'bravo' },
        { id: 3, label: 'charlie' },
      ],
      selected: -1,
      paints: 0,
    });

    // O(1) selection: only the row losing and the row gaining it re-run.
    const isSelected = selector(() => state.selected);

    // Mutating one path wakes only the bindings that read it.
    const renameSecond = () => { state.rows[1].label += '!'; };
    const addRow = () => {
      const id = state.rows.length + 1;
      state.rows.push({ id, label: 'row ' + id });
    };

    return html`
      <table>
        <tbody>
          ${each(
            () => state.rows,
            (row) => html`
              <tr ?data-sel=${() => isSelected(row().id)}>
                <td class="n">${() => row().id}</td>
                <td>${() => { state.paints; return row().label; }}</td>
                <td><button @click=${() => (state.selected = row().id)}>select</button></td>
              </tr>`,
            (row) => row.id
          )}
        </tbody>
      </table>
      <div class="row">
        <button @click=${renameSecond}>rename row 2</button>
        <button @click=${addRow}>add a row</button>
        <button @click=${() => (state.selected = -1)}>clear selection</button>
      </div>
      <p class="paints">
        Renaming row 2 writes to one text node. The list is not re-diffed, the
        other rows are not consulted, and no row is rebuilt.
      </p>`;
  },
});
