// <ui-table> — Material data-table. Pass a native <table>; it is moved into
// the open shadow tree so rows and cells are styled without document CSS.
//
//   <ui-table>
//     <table>
//       <thead><tr><th>Dessert</th>…</tr></thead>
//       <tbody><tr><td>Frozen yogurt</td>…</tr></tbody>
//     </table>
//   </ui-table>
//
// `::slotted()` cannot style descendants of a slotted node, so a slotted
// <table> could not be themed from the shadow. On connect the table is
// adopted into the wrapper (same node, new parent) and all rules below
// apply inside this tree. `base` is included — its reset stays in the
// shadow and never reaches the page.
//
// @prop  {boolean} dense=false        — 40px rows instead of 52px (reflected
//                                       as the `dense` attribute for CSS)
// @prop  {boolean} stickyHeader=false — sticky <thead> cells (reflected as
//                                       `sticky-header`)
// @slot  (default) — a native <table>; adopted into the shadow on connect
// @part  container — overflow wrapper around the table
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, effect } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';

const t = vars('ui-table', {
  rowHeight: '52px',
  denseRowHeight: '40px',
  borderColor: sys.color.outlineVariant,
  headerFg: sys.color.onSurfaceVariant,
  headerBg: sys.color.surface,
  fg: sys.color.onSurface,
  hoverBg: sys.color.surfaceContainerLow,
});

const styles = css`
  :host { display: block; overflow-x: auto; }
  table {
    inline-size: 100%;
    border-collapse: collapse;
    color: ${t.fg};
  }
  tr { block-size: calc(${t.rowHeight} + var(--ui-density, 0) * 4px); }
  :host([dense]) tr { block-size: calc(${t.denseRowHeight} + var(--ui-density, 0) * 4px); }
  th, td {
    padding-inline: ${sys.space(4)};
    border-block-end: 1px solid ${t.borderColor};
  }
  th {
    font: ${sys.type.labelLg};
    letter-spacing: ${sys.tracking.labelLg};
    color: ${t.headerFg};
    text-align: start;
  }
  td {
    font: ${sys.type.bodyMd};
    letter-spacing: ${sys.tracking.bodyMd};
  }
  tbody tr {
    transition: background-color ${sys.duration.short2} ${sys.easing.standard};
  }
  tbody tr:hover { background: ${t.hoverBg}; }
  :host([sticky-header]) thead th {
    position: sticky;
    inset-block-start: 0;
    z-index: 1;
    background: ${t.headerBg};
  }
`;

define('ui-table', {
  props: { dense: false, stickyHeader: false },
  styles: [base, styles],
  setup({ dense, stickyHeader }, host) {
    effect(() => host.toggleAttribute('dense', dense()));
    effect(() => host.toggleAttribute('sticky-header', stickyHeader()));

    const adopt = (slot) => {
      const wrap = slot.parentNode;
      for (const el of slot.assignedElements()) {
        if (el.localName === 'table') wrap.append(el);
      }
    };

    return html`
      <div class="wrap" part="container">
        <slot ref=${(slot) => {
          slot.addEventListener('slotchange', () => adopt(slot));
          adopt(slot);
        }}></slot>
      </div>`;
  },
});

export const tag = 'ui-table';
export const themeVars = t;
