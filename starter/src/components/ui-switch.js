// <ui-switch> — the Material switch.
//
// @prop  {boolean} checked=false
// @prop  {boolean} disabled=false
// @prop  {string}  label=''  — visible label (also the accessible name)
// @prop  {string}  name=''   — form field name (submits 'on'/value while checked)
// @prop  {string}  value='on'
// @prop  {boolean} icons=false — show check/close glyphs in the handle
// @event change — detail: { checked }
// @part  control — the switch track (role="switch")
// @part  handle
// @vars  see `t` below

import { define, html, css, vars } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base, focusRingOn } from './base.js';
import { formBind } from '../util/form.js';
import './ui-icon.js';

const t = vars('ui-switch', {
  trackWidth: '52px',
  trackHeight: '32px',
  trackBg: sys.color.surfaceContainerHighest,
  trackBgChecked: sys.color.primary,
  trackOutline: sys.color.outline,
  handleBg: sys.color.outline,
  handleBgChecked: sys.color.onPrimary,
  iconFg: sys.color.surfaceContainerHighest,
  iconFgChecked: sys.color.onPrimaryContainer,
});

const styles = css`
  :host { display: inline-flex; }
  label {
    display: inline-flex;
    align-items: center;
    gap: ${sys.space(3)};
    cursor: pointer;
    font: ${sys.type.bodyMd};
    letter-spacing: ${sys.tracking.bodyMd};
    color: ${sys.color.onSurface};
    user-select: none;
  }
  .control {
    position: relative;
    flex: none;
    inline-size: ${t.trackWidth};
    block-size: ${t.trackHeight};
    border: 2px solid ${t.trackOutline};
    border-radius: ${sys.radius.full};
    background: ${t.trackBg};
    cursor: pointer;
    padding: 0;
    transition: background-color ${sys.duration.short4} ${sys.easing.standard},
                border-color ${sys.duration.short4} ${sys.easing.standard};
  }
  ${focusRingOn('.control')}
  .control[aria-checked="true"] {
    background: ${t.trackBgChecked};
    border-color: ${t.trackBgChecked};
  }
  .handle {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 4px;
    translate: 0 -50%;
    inline-size: 16px;
    block-size: 16px;
    border-radius: ${sys.radius.full};
    background: ${t.handleBg};
    display: grid;
    place-items: center;
    color: ${t.iconFg};
    --ui-icon-size: 12px;
    transition: translate ${sys.duration.short4} ${sys.easing.emphasized},
                inline-size ${sys.duration.short4} ${sys.easing.emphasized},
                block-size ${sys.duration.short4} ${sys.easing.emphasized},
                background-color ${sys.duration.short4} ${sys.easing.standard};
  }
  .control:active .handle { inline-size: 28px; block-size: 28px; }
  .control[aria-checked="true"] .handle {
    translate: 20px -50%;
    inline-size: 24px;
    block-size: 24px;
    background: ${t.handleBgChecked};
    color: ${t.iconFgChecked};
  }
  .control:disabled { cursor: default; pointer-events: none; opacity: ${sys.state.disabledContent}; }
  :host([disabled]) label { cursor: default; pointer-events: none; }
`;

define('ui-switch', {
  formAssociated: true,
  props: { checked: false, disabled: false, label: '', name: '', value: 'on', icons: false },
  styles: [base, styles],
  setup({ checked, disabled, label, name, value, icons }, host) {
    formBind(host, { name, value, checked, disabled });

    const toggle = () => {
      if (disabled()) return;
      checked.set(!checked());
      host.emit('change', { checked: checked() });
    };

    return html`
      <label>
        <button part="control" class="control" type="button" role="switch"
                aria-checked=${() => String(checked())}
                ?disabled=${disabled}
                @click=${toggle}>
          <span part="handle" class="handle" aria-hidden="true">
            ${() => (icons() ? html`<ui-icon name=${() => (checked() ? 'check' : 'close')}></ui-icon>` : null)}
          </span>
        </button>
        ${() => label() || null}
      </label>`;
  },
});

export const tag = 'ui-switch';
export const themeVars = t;
