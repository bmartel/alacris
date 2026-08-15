// Helpers for demo section modules.
//
// A family module exports:
//   export const title = 'Buttons';
//   export const section = () => html`${block('Variants', html`…`)} …`;

import { html } from 'alacris';
import { sys } from '../src/tokens/sys.js';
import '../src/components/ui-text.js';
import '../src/components/ui-stack.js';
import '../src/components/ui-surface.js';

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const pad = { padding: sys.space(5) };

/** A labeled demo block: a caption and a wrapping row of examples. */
export const block = (label, body) => html`
  <ui-surface bg="surfaceContainerLow" radius="lg" style=${pad} id=${slug(label)}>
    <ui-stack gap="4">
      <ui-text variant="title-sm" color="onSurfaceVariant">${label}</ui-text>
      <ui-stack direction="row" gap="4" wrap align="flex-start">${body}</ui-stack>
    </ui-stack>
  </ui-surface>`;

/** Like block, but examples stack vertically. */
export const stackBlock = (label, body) => html`
  <ui-surface bg="surfaceContainerLow" radius="lg" style=${pad} id=${slug(label)}>
    <ui-stack gap="4">
      <ui-text variant="title-sm" color="onSurfaceVariant">${label}</ui-text>
      <ui-stack gap="4">${body}</ui-stack>
    </ui-stack>
  </ui-surface>`;

/** A wrapping row — for nested groups inside a stackBlock. */
export const row = (body) => html`
  <ui-stack direction="row" gap="4" wrap align="flex-start">${body}</ui-stack>`;
