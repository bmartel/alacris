import { define, html, each, signal, batch } from '@alacris/core';
import { selector } from '@alacris/core/store';

const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'plain'];
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown'];
const N = ['table', 'chair', 'house', 'desk', 'car', 'cookie'];
let nextId = 1;
const rnd = (max) => (Math.random() * max) | 0;
const make = (n) => Array.from({ length: n }, () => ({
  id: nextId++,
  label: `${A[rnd(A.length)]} ${C[rnd(C.length)]} ${N[rnd(N.length)]}`,
}));

define('demo-bench', {
  styles: `
    :host { display: grid; gap: .75rem; font: inherit }
    .ctl { display: flex; gap: .45rem; flex-wrap: wrap; align-items: center }
    button { font: inherit; padding: .35rem .7rem; border-radius: 6px; cursor: pointer;
      border: 1px solid currentColor; background: transparent; color: inherit }
    .ms { opacity: .7; font-variant-numeric: tabular-nums; font-size: .85rem }
    table { width: 100%; border-collapse: collapse; font-size: .8rem;
      font-variant-numeric: tabular-nums }
    th, td { text-align: left; padding: .25rem .4rem; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent) }
    th:not(:first-child), td:not(:first-child) { text-align: right }
    tr.danger td { color: var(--sl-color-accent-high, #f5b719) }
    tbody { display: block; max-height: 12rem; overflow: auto }
    thead, tbody tr { display: table; width: 100%; table-layout: fixed }
  `,
  setup() {
    const rows = signal(make(200));
    const selected = signal(-1);
    const isSelected = selector(selected);
    const last = signal('idle — run an operation');

    const time = (name, fn) => {
      const t0 = performance.now();
      fn();
      last(`${name}: ${(performance.now() - t0).toFixed(2)} ms`);
    };

    return html`
      <div class="ctl">
        <button @click=${() => time('create 1,000', () => { selected(-1); rows(make(1000)); })}>create 1k</button>
        <button @click=${() => time('update every 10th', () => {
          const list = rows.peek().slice();
          for (let i = 0; i < list.length; i += 10) list[i] = { ...list[i], label: list[i].label + ' !!!' };
          rows(list);
        })}>update every 10th</button>
        <button @click=${() => time('select', () => {
          const r = rows.peek()[100];
          if (r) selected(r.id);
        })}>select</button>
        <button @click=${() => time('swap', () => {
          const list = rows.peek().slice();
          if (list.length < 999) return;
          [list[1], list[998]] = [list[998], list[1]];
          rows(list);
        })}>swap</button>
        <button @click=${() => time('clear', () => batch(() => { rows([]); selected(-1); }))}>clear</button>
        <span class="ms">${last}</span>
      </div>
      <table>
        <thead><tr><th>id</th><th>label</th></tr></thead>
        <tbody>
          ${each(
            rows,
            (row) => {
              const id = row().id;
              return html`<tr class=${() => (isSelected(id) ? 'danger' : '')}>
                <td>${id}</td>
                <td class="lbl">${() => row().label}</td>
              </tr>`;
            },
            (r) => r.id
          )}
        </tbody>
      </table>`;
  },
});
