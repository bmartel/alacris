import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTheme, applyTheme, themeCss, loadThemeFonts } from '../src/theme/index.js';
import {
  FONT_PRESETS, FONT_STACKS, DEFAULT_FONT_PRESET,
  resolveTypography, googleFontsHref, typographyTokens,
} from '../src/tokens/typography.js';

const fontLink = () => document.head.querySelector('link[data-ui-font]');
const clearFonts = () => {
  document.head.querySelectorAll('link[data-ui-font], link[data-ui-font-preconnect]').forEach((n) => n.remove());
};

test('default typeface is Google Sans Flex with a Google Fonts href', () => {
  const theme = createTheme();
  assert.equal(DEFAULT_FONT_PRESET, 'google-sans-flex');
  assert.match(theme.common['font-brand'], /Google Sans Flex/);
  assert.match(theme.common['font-plain'], /Google Sans Flex/);
  assert.match(theme.common['font-plain'], /Google Sans/);
  assert.equal(theme.common['font-brand'], FONT_STACKS.brand);
  assert.equal(theme.fonts.preset, 'google-sans-flex');
  assert.equal(theme.fonts.href, FONT_PRESETS['google-sans-flex'].href);
  assert.match(theme.common['type-body-md'], /--ui-type-body-md-font/);
  assert.equal(theme.common['type-body-md-font'], 'var(--ui-font-plain)');
  assert.equal(theme.common['type-display-lg-font'], 'var(--ui-font-brand)');
});

test('themeCss puts the plain face on :root so native text inherits it', () => {
  const cssText = themeCss(createTheme());
  assert.match(cssText, /:root\{font-family:var\(--ui-font-plain\)/);
  assert.match(cssText, /--ui-font-brand:'Google Sans Flex'/);
});

test('preset names swap brand and plain together', () => {
  const sans = createTheme({ typography: 'google-sans' });
  assert.match(sans.common['font-brand'], /^'Google Sans'/);
  assert.equal(sans.fonts.preset, 'google-sans');
  assert.equal(sans.fonts.href, FONT_PRESETS['google-sans'].href);

  const roboto = createTheme({ typography: 'roboto' });
  assert.match(roboto.common['font-plain'], /Roboto/);
  assert.match(roboto.fonts.href, /Roboto/);

  const system = createTheme({ typography: 'system' });
  assert.match(system.common['font-plain'], /^system-ui/);
  assert.equal(system.fonts.href, null);
});

test('unknown preset throws', () => {
  assert.throws(() => createTheme({ typography: 'comic-sans' }), /Unknown font preset/);
});

test('{ family } sets brand and plain and derives a Google Fonts href', () => {
  const theme = createTheme({ typography: { family: 'Inter' } });
  assert.match(theme.common['font-brand'], /^'Inter'/);
  assert.match(theme.common['font-plain'], /^'Inter'/);
  assert.match(theme.fonts.href, /family=Inter:wght@400;500;700/);
  assert.equal(theme.fonts.preset, null);
});

test('explicit brand/plain stacks pass through; first family is loaded', () => {
  const theme = createTheme({
    typography: {
      brand: 'Playfair Display, serif',
      plain: 'Source Sans 3, sans-serif',
    },
  });
  assert.equal(theme.common['font-brand'], 'Playfair Display, serif');
  assert.equal(theme.common['font-plain'], 'Source Sans 3, sans-serif');
  assert.match(theme.fonts.href, /Playfair\+Display/);
  assert.match(theme.fonts.href, /Source\+Sans\+3/);
});

test('load: false keeps tokens and skips a stylesheet href', () => {
  const theme = createTheme({ typography: { family: 'GT America', load: false } });
  assert.match(theme.common['font-plain'], /GT America/);
  assert.equal(theme.fonts.href, null);
});

test('load: url uses a custom stylesheet', () => {
  const theme = createTheme({
    typography: { family: 'Inter', load: 'https://example.com/inter.css' },
  });
  assert.equal(theme.fonts.href, 'https://example.com/inter.css');
});

test('scale-only config still uses the default Flex preset', () => {
  const theme = createTheme({ typography: { scale: 1.05 } });
  assert.match(theme.common['font-brand'], /Google Sans Flex/);
  assert.equal(theme.fonts.preset, 'google-sans-flex');
  assert.notEqual(theme.common['type-body-md-size'], typographyTokens()['type-body-md-size']);
});

test('googleFontsHref skips generic CSS families', () => {
  assert.equal(googleFontsHref(['system-ui, sans-serif']), null);
  assert.match(googleFontsHref(["'Google Sans Flex', system-ui"]), /Google\+Sans\+Flex:opsz,wght/);
});

test('resolveTypography is idempotent on its own output', () => {
  const once = resolveTypography({ family: 'Inter', scale: 1.1 });
  const twice = resolveTypography(once);
  assert.equal(twice.brand, once.brand);
  assert.equal(twice.plain, once.plain);
  assert.equal(twice.scale, once.scale);
  assert.equal(typographyTokens(once)['font-plain'], once.plain);
});

test('applyTheme injects one font stylesheet and reuses it', () => {
  clearFonts();
  applyTheme({ seed: '#6750a4' });
  const first = fontLink();
  assert.ok(first, 'injects a font stylesheet');
  assert.equal(first.getAttribute('href'), FONT_PRESETS['google-sans-flex'].href);
  assert.equal(document.head.querySelectorAll('link[data-ui-font]').length, 1);
  assert.ok(document.head.querySelector('link[data-ui-font-preconnect][href="https://fonts.googleapis.com"]'));

  applyTheme({ typography: 'google-sans' });
  const second = fontLink();
  assert.equal(second, first, 'reuses the same link element');
  assert.equal(second.getAttribute('href'), FONT_PRESETS['google-sans'].href);

  applyTheme({ typography: 'system' });
  assert.equal(fontLink(), null, 'system preset removes the webfont link');
  clearFonts();
});

test('applyTheme({ loadFonts: false }) does not inject a font link', () => {
  clearFonts();
  applyTheme({ typography: 'google-sans-flex', loadFonts: false });
  assert.equal(fontLink(), null);
  loadThemeFonts(createTheme({ typography: 'roboto' }));
  assert.ok(fontLink());
  clearFonts();
});

test('scrollbar tokens are included in common theme and themeCss output', () => {
  const theme = createTheme();
  assert.equal(theme.common['scrollbar-size'], '8px');
  assert.equal(theme.common['scrollbar-radius'], 'var(--ui-radius-full)');
  assert.equal(theme.common['scrollbar-track'], 'transparent');
  assert.equal(theme.common['scrollbar-thumb'], 'var(--ui-color-outline-variant)');
  assert.equal(theme.common['scrollbar-thumb-hover'], 'var(--ui-color-outline)');
  assert.equal(theme.common['scrollbar-thumb-active'], 'var(--ui-color-on-surface-variant)');

  const cssText = themeCss(theme);
  assert.match(cssText, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(cssText, /scrollbar-width: thin;/);
  assert.match(cssText, /scrollbar-color: var\(--ui-scrollbar-thumb\) var\(--ui-scrollbar-track\);/);
  assert.match(cssText, /::-webkit-scrollbar-thumb/);
  assert.match(cssText, /::-webkit-scrollbar-button\s*\{\s*display:\s*none;/);
});

test('scrollbar tokens can be overridden via theme config', () => {
  const custom = createTheme({
    overrides: {
      common: {
        'scrollbar-size': '10px',
        'scrollbar-thumb': '#ff0000',
      },
    },
  });
  assert.equal(custom.common['scrollbar-size'], '10px');
  assert.equal(custom.common['scrollbar-thumb'], '#ff0000');
});

