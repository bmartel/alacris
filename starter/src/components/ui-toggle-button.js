// <ui-toggle-button> — one Material segmented button, used inside
// <ui-toggle-group> (the group draws the outlined container and dividers;
// standalone the segment is a flat pill).
//
// Selecting shows a leading check icon, animated in and out. The button does
// not own its selection: it emits `ui-toggle` and the group (or any parent)
// sets `selected` back down.
//
// @prop  {string}  value=''       — REQUIRED identity within the group
// @prop  {boolean} selected=false — set by the owning group
// @prop  {boolean} disabled=false
// @prop  {string}  icon=''        — optional leading icon
// @event ui-toggle — pressed; detail: { value } (consumed by ui-toggle-group)
// @slot  (default) — label
// @part  control   — the <button>
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base, focusRingOn } from './base.js';
import { ripple } from '../motion/ripple.js';
import { presence } from '../motion/presence.js';
import { fx } from '../motion/animate.js';
import './ui-icon.js';

const t = vars('ui-toggle-button', {
  height: '40px',
  radius: sys.radius.full,
  bg: sys.color.surface,
  fg: sys.color.onSurface,
  selectedBg: sys.color.secondaryContainer,
  selectedFg: sys.color.onSecondaryContainer,
  font: sys.type.labelLg,
  tracking: sys.tracking.labelLg,
});

const styles = css`
  :host { display: inline-flex; vertical-align: middle; }
  .control {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${sys.space(2)};
    block-size: calc(${t.height} + var(--ui-density, 0) * 4px);
    padding-inline: ${sys.space(3)};
    border: none;
    border-radius: ${t.radius};
    background: ${t.bg};
    color: ${t.fg};
    font: ${t.font};
    letter-spacing: ${t.tracking};
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition: background-color ${sys.duration.short4} ${sys.easing.standard},
                color ${sys.duration.short4} ${sys.easing.standard};
    --ui-icon-size: 1.125rem;
  }
  ${focusRingOn('.control')}
  .layer {
    position: absolute; inset: 0; z-index: -1;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .control:hover .layer { opacity: ${sys.state.hover}; }
  .control:focus-visible .layer { opacity: ${sys.state.focus}; }
  .control:active .layer { opacity: ${sys.state.pressed}; }

  .control[aria-pressed="true"] {
    background: ${t.selectedBg};
    color: ${t.selectedFg};
  }

  .control:disabled {
    cursor: default;
    pointer-events: none;
    color: color-mix(in srgb, ${sys.color.onSurface} calc(${sys.state.disabledContent} * 100%), transparent);
  }
  .control:disabled[aria-pressed="true"] {
    background: color-mix(in srgb, ${sys.color.onSurface} calc(${sys.state.disabledContainer} * 100%), transparent);
  }
`;

define('ui-toggle-button', {
  props: { value: '', selected: false, disabled: false, icon: '' },
  styles: [base, styles],
  setup({ value, selected, disabled, icon }, host) {
    const onClick = () => {
      if (disabled()) return;
      host.emit('ui-toggle', { value: value() });
    };

    return html`
      <button part="control" class="control" type="button" ?disabled=${disabled}
              aria-pressed=${() => String(selected())}
              @click=${onClick} ref=${(el) => ripple(el, { disabled })}>
        <span class="layer" aria-hidden="true"></span>
        ${presence(selected, () => html`<ui-icon name="check"></ui-icon>`, {
          enter: fx.scaleIn,
          exit: fx.scaleOut,
          enterDuration: 'short4',
          exitDuration: 'short2',
        })}
        ${() => (icon() ? html`<ui-icon name=${icon}></ui-icon>` : null)}
        <slot></slot>
      </button>`;
  },
});

export const tag = 'ui-toggle-button';
export const themeVars = t;
