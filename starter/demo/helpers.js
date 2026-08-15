// Helpers for demo section modules.
//
// A family module exports:
//   export const title = 'Buttons';
//   export const section = () => html`${block('Variants', html`…`)} …`;
//
// Example chrome is light DOM on purpose. Alacris delegates events on the
// render root and skips anything inside an inner shadow — wrapping a control
// in ui-stack / ui-surface swallows @click, @input, and @change. Captions
// sit beside the examples, never around them.

import { html } from 'alacris';
import { sys } from '../src/tokens/sys.js';
import '../src/components/ui-text.js';

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const surface = {
  background: sys.color.surfaceContainerLow,
  borderRadius: sys.radius.lg,
  padding: sys.space(5),
  display: 'flex',
  flexDirection: 'column',
  gap: sys.space(4),
};

const wrapRow = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: sys.space(4),
};

const wrapCol = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: sys.space(4),
};

/** A labeled demo block: a caption and a wrapping row of examples. */
export const block = (label, body) => html`
  <div class="demo-block" id=${slug(label)} data-search-title=${label} style=${surface}>
    <ui-text variant="title-sm" color="onSurfaceVariant">${label}</ui-text>
    <div style=${wrapRow}>${body}</div>
  </div>`;

/** Like block, but examples stack vertically. */
export const stackBlock = (label, body) => html`
  <div class="demo-block" id=${slug(label)} data-search-title=${label} style=${surface}>
    <ui-text variant="title-sm" color="onSurfaceVariant">${label}</ui-text>
    <div style=${wrapCol}>${body}</div>
  </div>`;

/** A wrapping row — for nested groups inside a stackBlock. */
export const row = (body) => html`<div style=${wrapRow}>${body}</div>`;
