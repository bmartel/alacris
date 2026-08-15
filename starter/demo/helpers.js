// Helpers for demo section modules.
//
// A family module exports:
//   export const title = 'Buttons';
//   export const section = () => html`${block('Variants', html`…`)} …`;

import { html } from 'alacris';
import '../src/components/ui-text.js';

/** A labeled demo block: a caption and a row of examples. */
export const block = (label, body) => html`
  <div class="demo-block">
    <ui-text variant="title-sm" color="onSurfaceVariant">${label}</ui-text>
    <div class="demo-row">${body}</div>
  </div>`;

/** Like block, but examples stack vertically. */
export const stackBlock = (label, body) => html`
  <div class="demo-block">
    <ui-text variant="title-sm" color="onSurfaceVariant">${label}</ui-text>
    <div class="demo-col">${body}</div>
  </div>`;
