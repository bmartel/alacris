// <ui-slider> — a Material single-value slider on a NATIVE <input type="range">
// for bulletproof keyboard and screen-reader behavior.
//
// The active track portion is painted with a `--ui-slider-fill` percentage
// bound from the template into a gradient; the thumb's hover/focus halo is a
// box-shadow state layer (it replaces the native focus outline).
//
// @prop  {number}  value=0
// @prop  {number}  min=0
// @prop  {number}  max=100
// @prop  {number}  step=1
// @prop  {string}  label=''   — REQUIRED accessible name (aria-label)
// @prop  {boolean} disabled=false
// @prop  {boolean} showValue=false — value bubble above the thumb while
//        focused/dragging (animates in and out)
// @prop  {string}  name=''    — form participation
// @event input  — every drag/keystroke; detail: { value }
// @event change — committed value; detail: { value }
// @part  input — the native <input type="range">
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, computed, signal } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import { formBind } from '../util/form.js';
import { presence } from '../motion/presence.js';
import { fx } from '../motion/animate.js';

const t = vars('ui-slider', {
  trackHeight: '4px',
  thumbSize: '20px',
  track: sys.color.surfaceContainerHighest,
  active: sys.color.primary,
  thumb: sys.color.primary,
  bubbleBg: sys.color.primary,
  bubbleFg: sys.color.onPrimary,
});

const styles = css`
  :host { display: block; inline-size: 240px; }
  .root { position: relative; display: flex; align-items: center; }
  input {
    appearance: none;
    -webkit-appearance: none;
    inline-size: 100%;
    /* density never shrinks the touch target below 44px */
    block-size: max(44px, calc(48px + var(--ui-density, 0) * 4px));
    margin: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }
  /* The thumb halo below replaces the native outline as the focus indicator. */
  input:focus-visible { outline: none; }

  input::-webkit-slider-runnable-track {
    block-size: ${t.trackHeight};
    border-radius: ${sys.radius.full};
    background: linear-gradient(to right,
      ${t.active} var(--ui-slider-fill, 0%),
      ${t.track} var(--ui-slider-fill, 0%));
  }
  input::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    inline-size: ${t.thumbSize};
    block-size: ${t.thumbSize};
    margin-block-start: calc((${t.trackHeight} - ${t.thumbSize}) / 2);
    border: none;
    border-radius: ${sys.radius.full};
    background: ${t.thumb};
    transition: box-shadow ${sys.duration.short2} ${sys.easing.standard};
  }
  input:hover::-webkit-slider-thumb {
    box-shadow: 0 0 0 10px color-mix(in srgb, ${t.thumb} calc(${sys.state.hover} * 100%), transparent);
  }
  input:focus-visible::-webkit-slider-thumb,
  input:active::-webkit-slider-thumb {
    box-shadow: 0 0 0 10px color-mix(in srgb, ${t.thumb} calc(${sys.state.focus} * 100%), transparent);
  }

  input::-moz-range-track {
    block-size: ${t.trackHeight};
    border-radius: ${sys.radius.full};
    background: ${t.track};
  }
  input::-moz-range-progress {
    block-size: ${t.trackHeight};
    border-radius: ${sys.radius.full};
    background: ${t.active};
  }
  input::-moz-range-thumb {
    inline-size: ${t.thumbSize};
    block-size: ${t.thumbSize};
    border: none;
    border-radius: ${sys.radius.full};
    background: ${t.thumb};
    transition: box-shadow ${sys.duration.short2} ${sys.easing.standard};
  }
  input:hover::-moz-range-thumb {
    box-shadow: 0 0 0 10px color-mix(in srgb, ${t.thumb} calc(${sys.state.hover} * 100%), transparent);
  }
  input:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 10px color-mix(in srgb, ${t.thumb} calc(${sys.state.focus} * 100%), transparent);
  }

  input:disabled { cursor: default; pointer-events: none; opacity: ${sys.state.disabledContent}; }

  .bubble {
    position: absolute;
    inset-inline-start: var(--ui-slider-fill, 0%);
    inset-block-start: 0;
    translate: -50% -100%;
    padding: ${sys.space(1)} ${sys.space(2)};
    border-radius: ${sys.radius.full};
    background: ${t.bubbleBg};
    color: ${t.bubbleFg};
    font: ${sys.type.labelMd};
    letter-spacing: ${sys.tracking.labelMd};
    white-space: nowrap;
    pointer-events: none;
  }
`;

define('ui-slider', {
  props: {
    value: 0, min: 0, max: 100, step: 1,
    label: '', disabled: false, showValue: false, name: '',
  },
  styles: [base, styles],
  setup({ value, min, max, step, label, disabled, showValue, name }, host) {
    formBind(host, { name, value, disabled });

    const active = signal(false);

    const fill = computed(() => {
      const lo = min();
      const span = max() - lo || 1;
      return Math.min(100, Math.max(0, ((value() - lo) / span) * 100));
    });

    const read = (el) => {
      const n = Number(el.value);
      return Number.isNaN(n) ? min() : n;
    };
    const onInput = (e) => {
      value.set(read(e.target));
      host.emit('input', { value: value() });
    };
    const onChange = (e) => {
      value.set(read(e.target));
      host.emit('change', { value: value() });
    };

    return html`
      <div class="root" style=${() => ({ '--ui-slider-fill': fill() + '%' })}>
        <input part="input" type="range"
               min=${min} max=${max} step=${step} .value=${value}
               ?disabled=${disabled}
               aria-label=${() => label() || null}
               @input=${onInput} @change=${onChange}
               @pointerdown=${() => active.set(true)}
               @focus=${() => active.set(true)}
               @blur=${() => active.set(false)}>
        ${presence(() => showValue() && active(), () => html`
            <output class="bubble" aria-hidden="true">${value}</output>`, {
          enter: fx.scaleIn,
          exit: fx.scaleOut,
          enterDuration: 'short4',
          exitDuration: 'short2',
        })}
      </div>`;
  },
});

export const tag = 'ui-slider';
export const themeVars = t;
