// <ui-search> — Material search bar.
//
//   <ui-search label="Search mail" value=${q}
//              @input=${(e) => q(e.detail.value)}
//              @submit=${(e) => run(e.detail.value)}></ui-search>
//
// A pill-shaped field with a leading search icon, a trailing clear control
// while there is text, and an optional trailing slot (avatar, voice, …).
// Enter emits `submit`. The field chrome is the focus indicator — the inner
// input has no extra outline.
//
// `presentation="view"` expands into a docked search view: a back control
// and a suggestions list (the default slot) while open. The bar also shows
// that list when it has slotted suggestions and the field is focused. The
// open surface is one extra-large rounded container (not a stretched pill)
// with a divider between the field and the list.
//
// @prop  {string}  label='Search'   — accessible name (and the floating placeholder)
// @prop  {string}  value=''
// @prop  {string}  placeholder=''   — shown in the field; falls back to `label`
// @prop  {string}  presentation='bar' — bar | view
// @prop  {boolean} open=false       — view / suggestions visibility
// @prop  {boolean} disabled=false
// @prop  {string}  name=''          — form participation
// @event input  — every keystroke; detail: { value }
// @event change — committed (blur/Enter); detail: { value }
// @event submit — Enter pressed; detail: { value }
// @event clear  — the clear affordance was used
// @event open   — suggestions visible (after the enter animation)
// @event close  — suggestions removed (after the exit animation)
// @slot  leading  — replaces the search icon
// @slot  trailing — after the clear button (avatar, extra actions)
// @slot  (default) — suggestion rows (ui-list-item, …)
// @part  bar, input, panel
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, computed, signal } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import { formBind } from '../util/form.js';
import { presence } from '../motion/presence.js';
import { fx } from '../motion/animate.js';
import './ui-icon.js';
import './ui-icon-button.js';

const t = vars('ui-search', {
  bg: sys.color.surfaceContainerHigh,
  bgActive: sys.color.surfaceContainerHighest,
  fg: sys.color.onSurface,
  placeholderFg: sys.color.onSurfaceVariant,
  radius: sys.radius.full,
  font: sys.type.bodyLg,
  height: '56px',
  panelBg: sys.color.surfaceContainerHigh,
  panelRadius: sys.radius.xl,
  divider: sys.color.outlineVariant,
});

const styles = css`
  :host { display: block; position: relative; inline-size: min(100%, 720px); }
  .bar {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${sys.space(2)};
    min-block-size: calc(${t.height} + var(--ui-density, 0) * 4px);
    padding-inline: ${sys.space(4)} ${sys.space(2)};
    border-radius: ${t.radius};
    background: ${t.bg};
    color: ${t.fg};
    font: ${t.font};
    letter-spacing: ${sys.tracking.bodyLg};
    cursor: text;
    --ui-icon-size: 1.5rem;
    transition: background-color ${sys.duration.short2} ${sys.easing.standard},
                border-radius ${sys.duration.short2} ${sys.easing.standard};
  }
  .bar::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: inherit;
    background: ${sys.color.onSurface};
    opacity: 0;
    pointer-events: none;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .bar:hover:not(:focus-within)::before { opacity: ${sys.state.hover}; }
  .bar:focus-within { background: ${t.bgActive}; }
  /* Docked search view: one extra-large surface, not a pill stretched over the list. */
  .open {
    background: ${t.panelBg};
    border-radius: ${t.panelRadius};
    box-shadow: ${sys.elevation[2]};
  }
  .open .bar {
    border-radius: 0;
    background: transparent;
    padding-inline: ${sys.space(2)};
  }
  .open .bar::before { opacity: 0; }
  .open .bar:focus-within { background: transparent; }
  .lead { color: ${t.placeholderFg}; display: grid; place-items: center; }
  input {
    flex: 1;
    min-inline-size: 0;
    margin: 0;
    border: none;
    outline: none;
    appearance: none;
    background: transparent;
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
    padding: 0;
  }
  input::placeholder { color: ${t.placeholderFg}; }
  .panel {
    padding-block: ${sys.space(2)};
    background: ${t.panelBg};
    overflow: auto;
    max-block-size: min(70vh, 360px);
    border-block-start: 1px solid ${t.divider};
  }
  .open .panel { background: transparent; }
  .disabled { opacity: ${sys.state.disabledContent}; pointer-events: none; }
`;

define('ui-search', {
  formAssociated: true,
  props: {
    label: 'Search', value: '', placeholder: '', presentation: 'bar',
    open: false, disabled: false, name: '',
  },
  styles: [base, styles],
  setup({ label, value, placeholder, presentation, open, disabled, name }, host) {
    formBind(host, { name, value, disabled });
    const hasLeading = signal(false);
    let input;

    const ph = computed(() => placeholder() || label() || 'Search');
    const isView = computed(() => presentation() === 'view');
    const slotted = () => [...host.children].some((c) => !c.slot);
    const showPanel = computed(() => open() && (isView() || slotted()));
    const rootCls = computed(() =>
      [isView() ? 'view' : 'bar-mode', open() && 'open', disabled() && 'disabled']
        .filter(Boolean).join(' '));

    const onInput = (e) => {
      // Native `input` is composed; without this, a host @input listener sees
      // UIEvent.detail (0) and writes `undefined` into the bound value.
      e.stopPropagation();
      value.set(e.target.value);
      host.emit('input', { value: value() });
    };
    const commit = (e) => {
      e?.stopPropagation();
      host.emit('change', { value: value() });
    };
    const submit = (e) => {
      if (e.key !== 'Enter') return;
      host.emit('submit', { value: value() });
    };
    const clear = () => {
      value.set('');
      host.emit('clear');
      host.emit('input', { value: '' });
      input?.focus();
    };
    const openView = () => {
      if (disabled() || open()) return;
      if (isView() || slotted()) open.set(true);
    };
    const closeView = () => open.set(false);
    const onKeydown = (e) => {
      submit(e);
      if (e.key === 'Escape' && open()) {
        e.preventDefault();
        closeView();
      }
    };

    const panelView = () => html`
      <div class="panel" part="panel" role="listbox" aria-label=${() => label() || 'Suggestions'}>
        <slot></slot>
      </div>`;

    return html`
      <div class=${rootCls}>
        <div class=${() => `bar${disabled() ? ' disabled' : ''}`} part="bar"
             @click=${() => input?.focus()}>
          ${() => (isView() && open()
            ? html`<ui-icon-button icon="arrow-back" label="Back"
                  @click=${(e) => { e.stopPropagation(); closeView(); }}></ui-icon-button>`
            : html`<span class="lead">
                <slot name="leading" ref=${(el) => el.addEventListener('slotchange', () => hasLeading.set(el.assignedElements().length > 0))}></slot>
                ${() => (hasLeading() ? null : html`<ui-icon name="search"></ui-icon>`)}
              </span>`)}
          <input part="input" ref=${(el) => (input = el)}
                 .value=${() => value() ?? ''}
                 placeholder=${ph}
                 aria-label=${label}
                 aria-expanded=${() => String(open())}
                 ?disabled=${disabled}
                 @input=${onInput} @change=${commit} @keydown=${onKeydown}
                 @focus=${openView}>
          ${() => ((value() ?? '') !== '' && !disabled()
            ? html`<ui-icon-button icon="close" label="Clear" @click=${clear}></ui-icon-button>`
            : null)}
          <slot name="trailing"></slot>
        </div>
        ${presence(showPanel, panelView, {
          enter: fx.fadeIn,
          exit: fx.fadeOut,
          enterDuration: 'short4',
          exitDuration: 'short2',
          onEntered: () => host.emit('open'),
          onExited: () => host.emit('close'),
        })}
      </div>`;
  },
});

export const tag = 'ui-search';
export const themeVars = t;
