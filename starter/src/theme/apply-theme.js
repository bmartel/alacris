// applyTheme — one constructed stylesheet for the whole design system.
//
// All tokens live on `:root`, so they inherit through every shadow boundary
// and a re-theme is a single `replaceSync` — no component re-renders, no
// sheet re-adoption, every element on the page updates at once.
//
// Scheme selection is layered so the same sheet serves all three modes:
//   - light tokens on `:root` (the default)
//   - dark tokens under `prefers-color-scheme: dark` unless the app pinned
//     light (`<html data-ui-scheme="light">`)
//   - dark tokens whenever the app pinned dark (`data-ui-scheme="dark"`)

import { signal, computed } from 'alacris';
import { createTheme } from './create-theme.js';

// `color-scheme` is a real CSS property riding along in the token map (it
// keeps scrollbars and form controls in scheme); everything else gets `--ui-`.
const decl = (name, value) => (name === 'color-scheme' ? name : `--ui-${name}`) + `:${value};`;

const block = (tokens) => {
  let s = '';
  for (const name in tokens) s += decl(name, tokens[name]);
  return s;
};

export function themeCss(theme) {
  const { common, schemes } = theme;
  return [
    `:root{${block(common)}${block(schemes.light)}}`,
    `:root[data-ui-scheme="dark"]{${block(schemes.dark)}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-ui-scheme="light"]){${block(schemes.dark)}}}`,
  ].join('\n');
}

let sheet = null;
let styleEl = null;

/** The currently applied theme (a signal; null until applyTheme runs). */
export const activeTheme = signal(null);

/**
 * Apply a theme to the document. Accepts a theme from `createTheme` or a
 * config object (which is passed through `createTheme` for you). Calling it
 * again rewrites the same stylesheet in place.
 */
export function applyTheme(themeOrConfig = {}) {
  const theme = themeOrConfig.schemes ? themeOrConfig : createTheme(themeOrConfig);
  const text = themeCss(theme);
  if (!sheet && !styleEl) {
    if (document.adoptedStyleSheets && typeof CSSStyleSheet.prototype.replaceSync === 'function') {
      sheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } else {
      styleEl = document.createElement('style');
      document.head.append(styleEl);
    }
  }
  if (sheet) sheet.replaceSync(text);
  else styleEl.textContent = text;
  activeTheme.set(theme);
  return theme;
}

// ------------------------------------------------------------------ scheme

/** 'light' | 'dark' | 'auto' — what the app asked for. */
export const schemePreference = signal('auto');

const prefersDark =
  typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const osDark = signal(!!prefersDark?.matches);
prefersDark?.addEventListener?.('change', (e) => osDark.set(e.matches));

/** The scheme actually in effect right now: 'light' | 'dark'. */
export const scheme = computed(() => {
  const pref = schemePreference();
  return pref === 'auto' ? (osDark() ? 'dark' : 'light') : pref;
});

/** Pin the scheme, or return to following the OS with 'auto'. */
export function setScheme(pref /* 'light' | 'dark' | 'auto' */) {
  schemePreference.set(pref);
  const el = document.documentElement;
  if (pref === 'auto') el.removeAttribute('data-ui-scheme');
  else el.setAttribute('data-ui-scheme', pref);
}

/** Flip between light and dark (leaves 'auto' by pinning the opposite). */
export function toggleScheme() {
  setScheme(scheme() === 'dark' ? 'light' : 'dark');
}
