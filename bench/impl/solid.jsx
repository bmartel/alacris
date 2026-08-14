// Solid keyed — compiled JSX, createSelector, per-row label signals.
// This is the official js-framework-benchmark pattern and the line we want
// Alacris to sit next to.
import { createSignal, createSelector, For, batch } from 'solid-js';
import { render } from 'solid-js/web';
import { buildData } from '../data.js';

function wrap(rows) {
  return rows.map((r) => {
    const [label, setLabel] = createSignal(r.label);
    return { id: r.id, label, setLabel };
  });
}

export default function solid(container) {
  let data, setData, selected, setSelected;

  const dispose = render(() => {
    [data, setData] = createSignal([]);
    [selected, setSelected] = createSignal(-1);
    const isSelected = createSelector(selected);

    return (
      <table>
        <tbody>
          <For each={data()}>
            {(row) => {
              const id = row.id;
              return (
                <tr class={isSelected(id) ? 'danger' : ''}>
                  <td class="col-md-1">{id}</td>
                  <td class="col-md-4">
                    <a class="lbl" onClick={() => setSelected(id)}>
                      {row.label()}
                    </a>
                  </td>
                  <td class="col-md-1">
                    <a class="remove" onClick={() => setData((d) => d.filter((x) => x.id !== id))}>
                      ✕
                    </a>
                  </td>
                  <td class="col-md-6" />
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    );
  }, container);

  return {
    create(n) { setData(wrap(buildData(n))); setSelected(-1); },
    append(n) { setData((d) => [...d, ...wrap(buildData(n))]); },
    update() {
      batch(() => {
        const d = data();
        for (let i = 0; i < d.length; i += 10) d[i].setLabel((l) => l + ' !!!');
      });
    },
    select(i) { const r = data()[i]; if (r) setSelected(r.id); },
    swap() {
      const list = data().slice();
      if (list.length < 999) return;
      [list[1], list[998]] = [list[998], list[1]];
      setData(list);
    },
    remove(i) { setData((d) => d.toSpliced(i, 1)); },
    clear() { setData([]); setSelected(-1); },
    count: () => container.querySelectorAll('tbody > tr').length,
    firstLabel: () => container.querySelector('.lbl')?.textContent ?? '',
    dispose,
  };
}
