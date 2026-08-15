// <demo-theme-controls> — the live theme playground.
//
// Every control rebuilds the theme with createTheme and re-applies it in
// place: one stylesheet rewrite re-skins every component on the page,
// including the ones inside shadow roots. Two instances (hero + side sheet)
// share these signals, so they stay in lockstep.
//
// Layout is light DOM. Nested ui-stack / ui-chip-set shadows swallow
// delegated @input/@change; chips and the native color input use .capture.

import { define, html, css, signal } from 'alacris';
import { sys } from '../src/tokens/sys.js';
import { createTheme, applyTheme, setScheme, scheme, schemePreference } from '../src/theme/index.js';
import { base } from '../src/components/base.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-text.js';
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
    .col { display: flex; flex-direction: column; gap: ${sys.space(5)}; }
    .block { display: flex; flex-direction: column; gap: ${sys.space(2)}; }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: ${sys.space(2)};
    }
    .row.end { align-items: flex-end; gap: ${sys.space(5)}; }
    .between { justify-content: space-between; }
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
      <div class="col">
        <div class="block">
          <div class="row between">
            <ui-text variant="label-md" color="onSurfaceVariant">Seed color</ui-text>
            <ui-text variant="label-sm" color="onSurfaceVariant">${seed}</ui-text>
          </div>
          <div class="row">
            <ui-chip-set label="Seed color">
              ${PRESETS.map((p) => html`
                <ui-chip variant="filter" value=${p.hex} selected=${() => seed() === p.hex}
                         @click.capture=${() => set(seed, p.hex)}>
                  ${p.name}
                </ui-chip>`)}
            </ui-chip-set>
            <input type="color" .value=${seed} aria-label="Custom seed color"
                   @input.capture=${(e) => set(seed, e.target.value)}>
          </div>
        </div>
        <div class="row end">
          <div class="block">
            <ui-text variant="label-md" color="onSurfaceVariant">Shape</ui-text>
            <ui-slider label="Corner radius" min="0" max="2" step="0.25"
                       value=${radius} ?show-value=${true}
                       style="inline-size:160px"
                       @input=${(e) => set(radius, e.detail.value)}></ui-slider>
          </div>
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
        </div>
      </div>`;
  },
});
