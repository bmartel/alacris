// <ui-table> — Material data-table styling for a slotted native <table>.
//
//   <ui-table>
//     <table>
//       <thead><tr><th>Dessert</th>…</tr></thead>
//       <tbody><tr><td>Frozen yogurt</td>…</tr></tbody>
//     </table>
//   </ui-table>
//
// LIGHT DOM by design (`shadow: false`): the consumer's <table> markup stays
// exactly where it is, and this component only contributes CSS. Verified
// against Alacris internals: `render()` (src/html.js) appends its anchor
// comments to the host without clearing existing children, so `setup`
// returning an empty template leaves the slotted table intact. With
// `shadow: false` the `styles` sheet is applied to the containing document
// (see src/define.js), so EVERY rule below is scoped under the `ui-table`
// tag selector — nothing leaks. `base` is deliberately NOT included: its
// universal-selector reset must not reach the document.
//
// @prop  {boolean} dense=false        — 40px rows instead of 52px (reflected
//                                       as the `dense` attribute for CSS)
// @prop  {boolean} stickyHeader=false — sticky <thead> cells (reflected as
//                                       `sticky-header`)
// @vars  --ui-table-row-height, --ui-table-dense-row-height,
//        --ui-table-border-color, --ui-table-header-fg, --ui-table-fg,
//        --ui-table-hover-bg, --ui-table-header-bg

import { define, html, css, vars, effect } from 'alacris';
import { sys } from '../tokens/sys.js';

const t = vars('ui-table', {
  rowHeight: '52px',
  denseRowHeight: '40px',
  borderColor: sys.color.outlineVariant,
  headerFg: sys.color.onSurfaceVariant,
  headerBg: sys.color.surface,
  fg: sys.color.onSurface,
  hoverBg: sys.color.surfaceContainerLow,
});

// Light-DOM styles: every rule scoped under `ui-table`.
const styles = css`
  ui-table { display: block; overflow-x: auto; }
  ui-table table {
    inline-size: 100%;
    border-collapse: collapse;
    color: ${t.fg};
  }
  ui-table tr { block-size: calc(${t.rowHeight} + var(--ui-density, 0) * 4px); }
  ui-table[dense] tr { block-size: calc(${t.denseRowHeight} + var(--ui-density, 0) * 4px); }
  ui-table th, ui-table td {
    padding-inline: ${sys.space(4)};
    border-block-end: 1px solid ${t.borderColor};
  }
  ui-table th {
    font: ${sys.type.labelLg};
    letter-spacing: ${sys.tracking.labelLg};
    color: ${t.headerFg};
    text-align: start;
  }
  ui-table td {
    font: ${sys.type.bodyMd};
    letter-spacing: ${sys.tracking.bodyMd};
  }
  ui-table tbody tr {
    transition: background-color ${sys.duration.short2} ${sys.easing.standard};
  }
  ui-table tbody tr:hover { background: ${t.hoverBg}; }
  ui-table[sticky-header] thead th {
    position: sticky;
    inset-block-start: 0;
    z-index: 1;
    background: ${t.headerBg};
  }
`;

define('ui-table', {
  props: { dense: false, stickyHeader: false },
  shadow: false,
  styles,
  setup({ dense, stickyHeader }, host) {
    effect(() => host.toggleAttribute('dense', dense()));
    effect(() => host.toggleAttribute('sticky-header', stickyHeader()));
    // Empty template: render() only appends its anchors, so the consumer's
    // light-DOM <table> children are preserved untouched.
    return html``;
  },
});

export const tag = 'ui-table';
export const themeVars = t;
