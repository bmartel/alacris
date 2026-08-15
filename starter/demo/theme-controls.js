// <demo-theme-controls> — the live theme playground.
//
// Every control rebuilds the theme with createTheme and re-applies it in
// place: one stylesheet rewrite re-skins every component on the page,
// including the ones inside shadow roots. This panel is the proof that the
// token system works — nothing on this page knows the theme changed.
//
// The controls themselves are the design system: chips, a slider, selects,
// an icon button. Two instances (hero + side sheet) share these signals, so
// they stay in lockstep.

import { define, html, css, signal } from 'alacris';
import { sys } from '../src/tokens/sys.js';
import { createTheme, applyTheme, setScheme, scheme, schemePreference } from '../src/theme/index.js';
import { base } from '../src/components/base.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-text.js';
import '../src/components/ui-stack.js';
import '../src/components/ui-chip.js';
import '../src/components/ui-chip-set.js';
import '../src/components/ui-slider.js';
import '../src/components/ui-select.js';
import '../src/components/ui-option.js';
import '../src/components/ui-button.js';

const DEFAULTS = { seed: '#6750a4', radius: 1, density: 0, motion: 1 };

const store = {
  get: (k) => { try { return globalThis.localStorage?.getItem(k); } catch { return null; } },
  set: (k, v) => { try { globalThis.localStorage?.setItem(k, v); } catch { /* persistence is best-effort */ } },
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

define('demo-theme-controls', {
  styles: [base, css`
    :host { display: block; }
    input[type="color"] {
      inline-size: 40px;
      block-size: 40px;
      padding: 0;
      border: 1px solid ${sys.color.outlineVariant};
      border-radius: ${sys.radius.full};
      background: transparent;
      cursor: pointer;
    }
  `],
  setup() {
    return html`
      <ui-stack gap="5">
        <ui-stack gap="2">
          <ui-stack direction="row" gap="3" align="center" justify="space-between" wrap>
            <ui-text variant="label-md" color="onSurfaceVariant">Seed color</ui-text>
            <ui-text variant="label-sm" color="onSurfaceVariant">${seed}</ui-text>
          </ui-stack>
          <ui-stack direction="row" gap="2" align="center" wrap>
            <ui-chip-set label="Seed color">
              ${PRESETS.map((p) => html`
                <ui-chip variant="filter" value=${p.hex} selected=${() => seed() === p.hex}
                         @click.capture=${() => set(seed, p.hex)}>
                  ${p.name}
                </ui-chip>`)}
            </ui-chip-set>
            <input type="color" .value=${seed} aria-label="Custom seed color"
                   @input=${(e) => set(seed, e.target.value)}>
          </ui-stack>
        </ui-stack>
        <ui-stack direction="row" gap="5" wrap align="end">
          <ui-stack gap="2">
            <ui-text variant="label-md" color="onSurfaceVariant">Shape</ui-text>
            <ui-slider label="Corner radius" min="0" max="2" step="0.25"
                       value=${radius} ?show-value=${true}
                       style="inline-size:160px"
                       @input=${(e) => set(radius, e.detail.value)}></ui-slider>
          </ui-stack>
          <ui-select label="Density" variant="outlined"
                     value=${() => String(density())}
                     style="inline-size:148px"
                     @change=${(e) => set(density, +e.detail.value)}>
            <ui-option value="0">Default</ui-option>
            <ui-option value="-1">Compact</ui-option>
            <ui-option value="-2">Dense</ui-option>
          </ui-select>
          <ui-select label="Motion" variant="outlined"
                     value=${() => String(motionScale())}
                     style="inline-size:148px"
                     @change=${(e) => set(motionScale, +e.detail.value)}>
            <ui-option value="1">Full</ui-option>
            <ui-option value="1.8">Slow</ui-option>
            <ui-option value="0">Off</ui-option>
          </ui-select>
          <ui-icon-button
            icon=${() => (scheme() === 'dark' ? 'light-mode' : 'dark-mode')}
            label=${() => (scheme() === 'dark' ? 'Switch to light' : 'Switch to dark')}
            @click=${toggleDark}></ui-icon-button>
          <ui-button variant="text" @click=${reset}>Reset</ui-button>
        </ui-stack>
      </ui-stack>`;
  },
});
