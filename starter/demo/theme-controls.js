// <demo-theme-controls> — the live theme playground.
//
// Every control rebuilds the theme with createTheme and re-applies it in
// place: one stylesheet rewrite re-skins every component on the page,
// including the ones inside shadow roots. This panel is the proof that the
// token system works — nothing on this page knows the theme changed.

import { define, html, css, signal } from 'alacris';
import { createTheme, applyTheme, setScheme, scheme, schemePreference } from '../src/theme/index.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-text.js';

const seed = signal(localStorage.getItem('ui-seed') || '#6750a4');
const radius = signal(+(localStorage.getItem('ui-radius') || 1));
const density = signal(+(localStorage.getItem('ui-density') || 0));
const motionScale = signal(+(localStorage.getItem('ui-motion') || 1));
const font = signal(localStorage.getItem('ui-font') || 'google-sans-flex');

const FONT_OPTIONS = [
  { id: 'google-sans-flex', label: 'Google Sans Flex', typography: 'google-sans-flex' },
  { id: 'google-sans', label: 'Google Sans', typography: 'google-sans' },
  { id: 'roboto', label: 'Roboto', typography: 'roboto' },
  { id: 'inter', label: 'Inter', typography: { family: 'Inter' } },
  { id: 'system', label: 'System', typography: 'system' },
];

export function applyCurrentTheme() {
  const opt = FONT_OPTIONS.find((o) => o.id === font()) || FONT_OPTIONS[0];
  applyTheme(createTheme({
    seed: seed(),
    shape: { radius: radius() },
    density: density(),
    motion: { scale: motionScale() },
    typography: opt.typography,
  }));
  localStorage.setItem('ui-seed', seed());
  localStorage.setItem('ui-radius', String(radius()));
  localStorage.setItem('ui-density', String(density()));
  localStorage.setItem('ui-motion', String(motionScale()));
  localStorage.setItem('ui-font', opt.id);
}

const savedScheme = localStorage.getItem('ui-scheme');
if (savedScheme) setScheme(savedScheme);

const PRESETS = ['#6750a4', '#0b57d0', '#1e8e3e', '#b3261e', '#7d5260', '#006874'];

define('demo-theme-controls', {
  styles: css`
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: var(--ui-radius-lg);
      background: var(--ui-color-surface-container);
    }
    .group { display: flex; align-items: center; gap: 8px; }
    label { font: var(--ui-type-label-md); color: var(--ui-color-on-surface-variant); }
    .swatch {
      inline-size: 24px;
      block-size: 24px;
      border-radius: var(--ui-radius-full);
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
    }
    .swatch.on { border-color: var(--ui-color-on-surface); }
    input[type="color"] {
      inline-size: 32px;
      block-size: 32px;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
    }
    input[type="range"] { accent-color: var(--ui-color-primary); inline-size: 96px; }
    select {
      font: var(--ui-type-label-lg);
      color: var(--ui-color-on-surface);
      background: var(--ui-color-surface-container-highest);
      border: none;
      border-radius: var(--ui-radius-xs);
      padding: 6px 8px;
    }
  `,
  setup() {
    const set = (sig, v) => { sig.set(v); applyCurrentTheme(); };
    return html`
      <div class="group" role="group" aria-label="Seed color">
        <label>Seed</label>
        ${() => PRESETS.map((hex) => html`
          <button class=${() => ({ swatch: true, on: seed() === hex })}
                  style=${{ background: hex }}
                  aria-label=${'Seed ' + hex}
                  @click=${() => set(seed, hex)}></button>`)}
        <input type="color" .value=${seed} aria-label="Custom seed color"
               @input=${(e) => set(seed, e.target.value)}>
      </div>
      <div class="group">
        <label for="radius">Shape</label>
        <input id="radius" type="range" min="0" max="2" step="0.25" .value=${() => String(radius())}
               @input=${(e) => set(radius, +e.target.value)}>
      </div>
      <div class="group">
        <label for="density">Density</label>
        <select id="density" @change=${(e) => set(density, +e.target.value)}>
          <option value="0" selected=${() => density() === 0 || null}>Default</option>
          <option value="-1" selected=${() => density() === -1 || null}>Compact</option>
          <option value="-2" selected=${() => density() === -2 || null}>Dense</option>
        </select>
      </div>
      <div class="group">
        <label for="motion">Motion</label>
        <select id="motion" @change=${(e) => set(motionScale, +e.target.value)}>
          <option value="1" selected=${() => motionScale() === 1 || null}>Full</option>
          <option value="1.8" selected=${() => motionScale() === 1.8 || null}>Slow (see it)</option>
          <option value="0" selected=${() => motionScale() === 0 || null}>Off</option>
        </select>
      </div>
      <div class="group">
        <label for="font">Font</label>
        <select id="font" @change=${(e) => set(font, e.target.value)}>
          ${FONT_OPTIONS.map((o) => html`
            <option value=${o.id} selected=${() => font() === o.id || null}>${o.label}</option>`)}
        </select>
      </div>
      <div class="group">
        <ui-icon-button
          icon=${() => (scheme() === 'dark' ? 'light-mode' : 'dark-mode')}
          label=${() => (scheme() === 'dark' ? 'Switch to light' : 'Switch to dark')}
          @click=${() => {
            setScheme(scheme() === 'dark' ? 'light' : 'dark');
            localStorage.setItem('ui-scheme', schemePreference());
          }}></ui-icon-button>
      </div>`;
  },
});
