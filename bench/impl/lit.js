// Lit 3 LitElement + keyed `repeat`, flushed so the work lands in the timed window.
import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { buildData } from '../data.js';

class BenchLit extends LitElement {
  static properties = {
    rows: { type: Array },
    selected: { type: Number },
  };

  constructor() {
    super();
    this.rows = [];
    this.selected = -1;
  }

  // Light DOM so the harness can query the same table the other impls render.
  createRenderRoot() { return this; }

  render() {
    const selected = this.selected;
    const onSelect = (id) => { this.selected = id; };
    const onRemove = (id) => { this.rows = this.rows.filter((r) => r.id !== id); };
    return html`<table>
      <tbody>${repeat(this.rows, (r) => r.id, (r) => html`
        <tr class=${r.id === selected ? 'danger' : ''}>
          <td class="col-md-1">${r.id}</td>
          <td class="col-md-4">
            <a class="lbl" @click=${() => onSelect(r.id)}>${r.label}</a>
          </td>
          <td class="col-md-1">
            <a class="remove" @click=${() => onRemove(r.id)}>✕</a>
          </td>
          <td class="col-md-6"></td>
        </tr>`)}
      </tbody>
    </table>`;
  }
}

if (!customElements.get('bench-lit')) customElements.define('bench-lit', BenchLit);

function flush(el) {
  if (el.isUpdatePending) el.performUpdate();
}

export default function lit(container) {
  const el = document.createElement('bench-lit');
  container.append(el);
  flush(el);

  return {
    create(n) { el.rows = buildData(n); el.selected = -1; flush(el); },
    append(n) { el.rows = el.rows.concat(buildData(n)); flush(el); },
    update() {
      const rows = el.rows.slice();
      for (let i = 0; i < rows.length; i += 10) {
        rows[i] = { ...rows[i], label: rows[i].label + ' !!!' };
      }
      el.rows = rows;
      flush(el);
    },
    select(i) { const r = el.rows[i]; if (r) { el.selected = r.id; flush(el); } },
    swap() {
      if (el.rows.length < 999) return;
      const rows = el.rows.slice();
      [rows[1], rows[998]] = [rows[998], rows[1]];
      el.rows = rows;
      flush(el);
    },
    remove(i) { const rows = el.rows.slice(); rows.splice(i, 1); el.rows = rows; flush(el); },
    clear() { el.rows = []; el.selected = -1; flush(el); },
    count: () => container.querySelectorAll('tbody > tr').length,
    firstLabel: () => container.querySelector('.lbl')?.textContent ?? '',
    dispose: () => el.remove(),
  };
}
