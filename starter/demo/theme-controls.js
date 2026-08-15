// <demo-theme-controls> — the live theme playground.
//
// Every control rebuilds the theme with createTheme and re-applies it in
// place: one stylesheet rewrite re-skins every component on the page,
// including the ones inside shadow roots. Two instances (hero + side sheet)
// share these signals, so they stay in lockstep.
//
// Layout is light DOM. Nested ui-stack / ui-chip-set shadows swallow
// delegated @input/@change. Seed swatches are plain buttons; segmented
// groups listen on the group host. Toggle-group allows deselection — empty
// change events are ignored so a knob always has a value.

import { define, html, css, signal } from '@alacris/core';
import { sys } from '../src/tokens/sys.js';
import { DEFAULT_SEED } from '../src/tokens/color.js';
import { createTheme, applyTheme, setScheme, scheme, schemePreference } from '../src/theme/index.js';
import { base, focusRingOn } from '../src/components/base.js';
import '../src/components/ui-text.js';
import '../src/components/ui-slider.js';
import '../src/components/ui-toggle-group.js';
import '../src/components/ui-toggle-button.js';
import '../src/components/ui-button.js';
import '../src/components/ui-divider.js';
import '../src/components/ui-icon.js';

const DEFAULTS = { seed: DEFAULT_SEED, radius: 1, density: 0, motion: 1 };

const store = {
  get: (k) => { try { return globalThis.localStorage?.getItem(k); } catch { return null; } },
  set: (k, v) => { try { return globalThis.localStorage?.setItem(k, v); } catch { /* persistence is best-effort */ } },
};

const seed = signal(store.get('ui-seed') || DEFAULTS.seed);
const radius = signal(+(store.get('ui-radius') || DEFAULTS.radius));
const density = signal(+(store.get('ui-density') || DEFAULTS.density));
const motionScale = signal(+(store.get('ui-motion') || DEFAULTS.motion));

export function applyCurrentTheme() {
  applyTheme(createTheme({
    seed: seed(),
    shape: { radius: radius() },
    density: density(),
    motion: { scale: motionScale() },
  }));
  store.set('ui-seed', seed());
  store.set('ui-radius', String(radius()));
  store.set('ui-density', String(density()));
  store.set('ui-motion', String(motionScale()));
}

const savedScheme = store.get('ui-scheme');
if (savedScheme) setScheme(savedScheme);

export const PRESETS = [
  { hex: DEFAULT_SEED, name: 'Alacris' },
  { hex: '#6750a4', name: 'Violet' },
  { hex: '#0b57d0', name: 'Blue' },
  { hex: '#1e8e3e', name: 'Green' },
  { hex: '#b3261e', name: 'Red' },
  { hex: '#7d5260', name: 'Rose' },
  { hex: '#006874', name: 'Cyan' },
];

const set = (sig, v) => { sig.set(v); applyCurrentTheme(); };

const reset = () => {
  seed.set(DEFAULTS.seed);
  radius.set(DEFAULTS.radius);
  density.set(DEFAULTS.density);
  motionScale.set(DEFAULTS.motion);
  applyCurrentTheme();
};

export const toggleDark = () => {
  setScheme(scheme() === 'dark' ? 'light' : 'dark');
  store.set('ui-scheme', schemePreference());
};

const setAppearance = (pref) => {
  setScheme(pref);
  store.set('ui-scheme', pref);
};

const isPreset = () => PRESETS.some((p) => p.hex === seed());

const inkOn = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return '#fff';
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#1c1b1f' : '#fff';
};

/** Keep a required exclusive group from clearing when the selected segment is pressed again. */
const exclusive = (read, write) => (e) => {
  const v = e.detail.value;
  if (v === '' || v == null) {
    e.currentTarget.value = read();
    return;
  }
  write(v);
};

define('demo-theme-controls', {
  styles: [base, css`
    :host { display: block; }
    .panel { display: flex; flex-direction: column; gap: ${sys.space(6)}; }
    .section { display: flex; flex-direction: column; gap: ${sys.space(3)}; }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: ${sys.space(3)};
    }
    .hex {
      font: ${sys.type.labelSm};
      letter-spacing: ${sys.tracking.labelSm};
      font-family: ${sys.font.code};
      color: ${sys.color.onSurfaceVariant};
    }
    .swatches {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: ${sys.space(3)};
    }
    .swatch, .custom {
      display: grid;
      place-items: center;
      inline-size: 40px;
      block-size: 40px;
      padding: 0;
      border: 2px solid transparent;
      border-radius: ${sys.radius.full};
      cursor: pointer;
      --ui-icon-size: 1.125rem;
    }
    .swatch { box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 18%, transparent); }
    .swatch ui-icon, .custom ui-icon { opacity: 0; }
    .swatch.on, .custom.on {
      box-shadow: 0 0 0 2px ${sys.color.surface}, 0 0 0 4px ${sys.color.primary};
    }
    .swatch.on ui-icon, .custom.on ui-icon { opacity: 1; }
    ${focusRingOn('.swatch')}
    .custom {
      position: relative;
      border: 2px dashed ${sys.color.outline};
      background: ${sys.color.surfaceContainerHighest};
      color: ${sys.color.onSurfaceVariant};
    }
    .custom:not(.on) ui-icon { opacity: 1; }
    .custom.on {
      border-style: solid;
      border-color: transparent;
      background: var(--swatch);
      color: var(--ink);
    }
    .custom:focus-within {
      outline: ${sys.focus.ring};
      outline-offset: ${sys.focus.ringOffset};
    }
    .custom input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    ui-slider { inline-size: 100%; }
    .ends {
      display: flex;
      justify-content: space-between;
      margin-block-start: calc(${sys.space(1)} * -1);
    }
    .field { display: flex; }
    .field ui-toggle-group {
      display: flex;
      inline-size: 100%;
    }
    .field ui-toggle-group::part(group) {
      display: flex;
      inline-size: 100%;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: ${sys.space(2)};
    }
  `],
  setup(_, host) {
    return html`
      <div class="panel">
        <div class="section">
          <div class="head">
            <ui-text variant="title-sm">Seed</ui-text>
            <span class="hex">${seed}</span>
          </div>
          <div class="swatches" role="radiogroup" aria-label="Seed color">
            ${PRESETS.map((p) => html`
              <button type="button" class=${() => (seed() === p.hex ? 'swatch on' : 'swatch')}
                      style=${{ background: p.hex, color: inkOn(p.hex) }}
                      aria-label=${p.name} aria-pressed=${() => String(seed() === p.hex)}
                      @click=${() => set(seed, p.hex)}>
                <ui-icon name="check"></ui-icon>
              </button>`)}
            <label class=${() => (isPreset() ? 'custom' : 'custom on')}
                   style=${() => ({ '--swatch': seed(), '--ink': inkOn(seed()) })}
                   title="Custom color">
              <ui-icon name=${() => (isPreset() ? 'palette' : 'check')}></ui-icon>
              <input type="color" .value=${seed} aria-label="Custom seed color"
                     @input=${(e) => set(seed, e.target.value)}>
            </label>
          </div>
        </div>
        <div class="section">
          <div class="head">
            <ui-text variant="title-sm">Shape</ui-text>
            <ui-text variant="label-sm" color="onSurfaceVariant">${() => `${radius()}×`}</ui-text>
          </div>
          <ui-slider label="Corner radius" min="0" max="2" step="0.25"
                     value=${radius} ?show-value=${true}
                     @input=${(e) => set(radius, e.detail.value)}></ui-slider>
          <div class="ends">
            <ui-text variant="label-sm" color="onSurfaceVariant">Sharp</ui-text>
            <ui-text variant="label-sm" color="onSurfaceVariant">Round</ui-text>
          </div>
        </div>
        <div class="section">
          <ui-text variant="title-sm">Density</ui-text>
          <div class="field">
            <ui-toggle-group label="Density" value=${() => String(density())}
                             @change=${exclusive(() => String(density()), (v) => set(density, +v))}>
              <ui-toggle-button value="0">Default</ui-toggle-button>
              <ui-toggle-button value="-1">Compact</ui-toggle-button>
              <ui-toggle-button value="-2">Dense</ui-toggle-button>
            </ui-toggle-group>
          </div>
        </div>
        <div class="section">
          <ui-text variant="title-sm">Motion</ui-text>
          <div class="field">
            <ui-toggle-group label="Motion" value=${() => String(motionScale())}
                             @change=${exclusive(() => String(motionScale()), (v) => set(motionScale, +v))}>
              <ui-toggle-button value="1">Full</ui-toggle-button>
              <ui-toggle-button value="1.8">Slow</ui-toggle-button>
              <ui-toggle-button value="0">Off</ui-toggle-button>
            </ui-toggle-group>
          </div>
        </div>
        <div class="section">
          <ui-text variant="title-sm">Appearance</ui-text>
          <div class="field">
            <ui-toggle-group label="Appearance" value=${schemePreference}
                             @change=${exclusive(() => schemePreference(), setAppearance)}>
              <ui-toggle-button value="light">Light</ui-toggle-button>
              <ui-toggle-button value="dark">Dark</ui-toggle-button>
              <ui-toggle-button value="auto">System</ui-toggle-button>
            </ui-toggle-group>
          </div>
        </div>
        <ui-divider></ui-divider>
        <div class="actions">
          <ui-button variant="text" @click=${reset}>Reset</ui-button>
          <ui-button variant="text" @click=${() => host.emit('browse')}>
            Browse tokens<ui-icon slot="trailing" name="arrow-forward"></ui-icon>
          </ui-button>
        </div>
      </div>`;
  },
});
