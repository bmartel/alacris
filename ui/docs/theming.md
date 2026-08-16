# Theming

Everything visual in Alacris UI flows through CSS custom properties arranged in
three tiers. Understanding the tiers tells you exactly where to intervene for
any change, from a brand color to a ground-up redesign.

## The three tiers

### Tier 1 — reference tokens (generated)

Tonal palettes: 24 tones (0–100 by perceptual lightness) for each key color —
`primary`, `secondary`, `tertiary`, `neutral`, `neutralVariant`, `error`,
`success`, `warning`, `info`. Generated in **OKLCH** from your seed(s) by
`src/tokens/color.js`: hue and chroma held constant, each tone targeting the
CIE luminance Material's tone scale defines, gamut-mapped by walking chroma
down. You never touch these directly; they exist so tier 2 always has
contrast-correct material to draw from.

### Tier 2 — system tokens (the theme)

Semantic roles on `:root`, inheriting through every shadow boundary:

| Group | Tokens (prefix `--ui-`) |
| --- | --- |
| Color | `color-primary`, `color-on-primary`, `color-primary-container`, `color-on-primary-container` — same quartet for secondary/tertiary/error/success/warning/info; `color-surface`, `color-surface-dim/bright`, `color-surface-container-lowest/low/…/highest`, `color-on-surface`, `color-on-surface-variant`, `color-outline`, `color-outline-variant`, `color-inverse-*`, `color-scrim`, `color-shadow` |
| Type | `type-<role>` shorthand + `-size/-line/-weight/-tracking/-font` for the 15 roles `display|headline|title|body|label` × `lg|md|sm`; `font-brand`, `font-plain`, `font-code`. Default face is Google Sans Flex. |
| Shape | `radius-none/xs/sm/md/lg/xl/full` |
| Elevation | `elevation-0…5` (key+ambient shadow pairs on `shadow-rgb`) |
| Motion | `duration-short-1…extra-long-4`, `easing-standard/emphasized(+-accelerate/-decelerate)/linear` |
| Space | `space-1…24` (4px grid) |
| State | `state-hover/focus/pressed/dragged`, `state-disabled-content/container` |
| Focus | `focus-ring`, `focus-ring-width/offset/color` |
| Misc | `density` (0…-2), `z-app-bar/drawer/modal/snackbar/tooltip` |

Components never write these names as strings — they go through the `sys`
accessor (`src/tokens/sys.js`): `sys.color.primary`, `sys.radius.md`,
`sys.duration.short4`, `sys.space(4)`, `sys.type.bodyMd`, `sys.font.plain`. A
typo becomes a visible `undefined` instead of a silently inert custom property.

### Tier 3 — component tokens (the per-component contract)

Each component declares what it can be themed by with Alacris's `vars()`:

```js
const t = vars('ui-button', {
  radius: sys.radius.full,        // → var(--ui-button-radius, var(--ui-radius-full))
  filledBg: sys.color.primary,    // → var(--ui-button-filled-bg, var(--ui-color-primary))
});
```

The default of every component token is a *system* token — so tier-2 changes
cascade everywhere, while any single component type can still be pulled away
from the system in plain CSS:

```css
ui-button { --ui-button-radius: 4px; }              /* all buttons */
.danger-zone ui-button { --ui-button-filled-bg: var(--ui-color-error); }
```

Each component that declares `vars()` lists them in its file header and
exports `themeVars`; `themeVars.names` is the machine-readable list. Layout
and typography primitives with no component tokens (`ui-stack`, `ui-surface`,
`ui-text`) export `tag` only.

## The theme engine

### `createTheme(config)` — pure data

```js
const theme = createTheme({
  seed: '#e8ad18',            // one color → whole scheme, or:
  colors: {                   // explicit key colors (any subset)
    primary: '#0b57d0', secondary: '#585e71', tertiary: '#00695c',
    neutral: '#5d5e62', error: '#b3261e', success: '#1e8e3e',
    warning: '#e37400', info: '#0b57d0',
  },
  typography: 'google-sans-flex', // or 'google-sans' | 'roboto' | 'system'
                                  // or { family: 'Inter' } / { brand, plain, code, scale }
  shape: { radius: 1 },       // 0 = square corners, 2 = extra round
  motion: { scale: 1 },       // 0 = instant UI, 2 = slow-motion debugging
  density: 0,                 // 0 … -2; each step removes 4px of control height
  overrides: {                // raw token surgery, applied last
    common: { 'radius-md': '10px', 'z-modal': '2000' },
    light:  { 'color-surface': '#faf7f2' },
    dark:   { 'color-surface': '#101014' },
  },
});
```

Returns `{ config, palettes, common, schemes: { light, dark }, fonts }` — flat
maps of token name → value, plus `{ href, preset }` for the typeface
stylesheet. It touches no DOM: build themes ahead of time, diff them,
serialize them, unit-test them.

### `applyTheme(themeOrConfig)` — one stylesheet

Serializes the theme into a single constructed stylesheet adopted by the
document:

- light tokens on `:root`
- dark tokens under `@media (prefers-color-scheme: dark)` unless pinned light
- dark tokens whenever `<html data-ui-scheme="dark">`

Calling `applyTheme` again **rewrites the same sheet in place** — one
`replaceSync`, every component on the page re-themes, nothing re-renders. This
is what the demo's theme playground does on every slider input; it is cheap
enough to wire to a color picker's `input` event.

`applyTheme` also loads the theme's typeface (a Google Fonts `<link>` for
presets and `family` names). Constructed stylesheets cannot `@import`, so the
face is a real element, reused on the next call. Pass `loadFonts: false` — or
`typography: { load: false }` — when the files are self-hosted or already on
the page. `theme.fonts.href` is the URL `themeCss` consumers add by hand:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,400..700&display=swap">
```

### Fonts

The type scale is 15 roles. The *faces* those roles point at are three system
tokens: `--ui-font-brand` (display, headline, title-lg), `--ui-font-plain`
(everything else), `--ui-font-code`. Change those and every component follows
— each type-role shorthand ends in `var(--ui-font-brand)` or
`var(--ui-font-plain)`, and `base` sets `:host { font-family }` from the plain
face so slotted text inherits it too. `applyTheme` also sets `font-family` on
`:root`, so native markup on the page matches.

The Material baseline is **Google Sans Flex**, with Google Sans next in the
stack (often already installed on ChromeOS / Android). That is what Google's
own Material 3 surfaces ship. Switching the whole product is one argument:

```js
applyTheme();                              // Google Sans Flex, loaded for you
applyTheme({ typography: 'google-sans' }); // Google Sans
applyTheme({ typography: 'roboto' });      // classic MD3
applyTheme({ typography: 'system' });      // no webfont

applyTheme({ typography: { family: 'Inter' } });           // brand + plain
applyTheme({ typography: {                                // split faces
  brand: 'Playfair Display, serif',
  plain: 'Source Sans 3, sans-serif',
  code:  'Google Sans Code, ui-monospace, monospace',
  scale: 1.05,
}});
```

`family` is the simple knob: one name (or a full CSS stack) for brand and
plain. `brand` / `plain` / `code` override individually. A family name is
quoted and given a system-ui fallback; a comma-separated stack is used as-is.
Named presets live in `FONT_PRESETS`.

Google Fonts is loaded automatically for presets and for the first
non-generic family in a custom stack. Self-host instead:

```js
applyTheme({
  typography: { family: 'GT America', load: false },
});
// or keep the derived URL and skip the network:
applyTheme({ typography: { family: 'Inter' }, loadFonts: false });
```

### Scheme switching

```js
import { scheme, schemePreference, setScheme, toggleScheme } from './src/theme/index.js';

setScheme('dark');      // pin dark  → <html data-ui-scheme="dark">
setScheme('light');     // pin light
setScheme('auto');      // follow the OS (default)
toggleScheme();         // flip from whatever is showing

scheme();               // signal: 'light' | 'dark' — what is in effect NOW
schemePreference();     // signal: 'light' | 'dark' | 'auto'
```

`scheme` is a signal — bind it: the demo's appearance button renders its icon
from `${() => scheme() === 'dark' ? 'dark-mode' : 'light-mode'}`.

### No-JS / static theming

`themeCss(theme)` returns the stylesheet text. Generate once, save as a `.css`
file, ship it in a `<link>` — the components require only that the custom
properties exist, not that the engine runs. Add a second `<link>` for
`theme.fonts.href` so the typeface files load; constructed CSS cannot
`@import`.

## Consumer styling — the full toolbox

For components you use (including these), the platform gives three doors, and
every Alacris UI component opens all of them:

1. **Custom properties** — the tiers above.
2. **Parts** — each component exposes its internals deliberately
   (`::part(control)`, `::part(surface)`, …; listed in the header docs). An
   outer `::part` rule beats the component's own styles, so you always win:

   ```css
   ui-text-field::part(input) { font-variant-numeric: tabular-nums; }
   ui-dialog::part(surface) { border: 2px solid var(--ui-color-outline); }
   ```

3. **`adoptGlobal`** — push a whole stylesheet into *every* component, e.g. a
   tracking nudge across the board:

   ```js
   import { adoptGlobal, css } from '@alacris/core';
   adoptGlobal(css`:host { letter-spacing: 0.01em }`);
   ```

None of the components use `!important`, so nothing here can be locked against
you.

## Recipes

**Brand re-skin (keep Material bones):**

```js
applyTheme({ colors: { primary: '#e4002b' }, typography: { family: 'GT America' } });
```

**Dark-only product:** `setScheme('dark')` at boot; done. Or serve only the
dark block from `themeCss` if you want to hard-commit.

**Compact data app:** `applyTheme({ density: -2, shape: { radius: 0.5 } })`.

**Scoped sub-brand** (one section of the page differs): custom properties
cascade, so scope the overrides:

```css
.partner-embed {
  --ui-color-primary: #0f62fe;
  --ui-color-on-primary: #fff;
  --ui-radius-full: 4px;
}
```

Everything inside `.partner-embed` — including shadow internals — follows.

## Building your own design system

The Material defaults are deliberately shallow. A full departure:

1. **Color**: keep the OKLCH engine and change the *role mapping* in
   `tokens/color.js` (`ROLES` — which tone each role takes per scheme), or
   bypass generation entirely with `overrides.light/dark` maps of final hex
   values.
2. **Type**: change the faces with `typography: 'google-sans'` / `{ family }`
   (see [Fonts](#fonts)), or edit `SCALE` in `tokens/typography.js` for a
   different ramp. Keep the role *names* and every component follows; rename
   them and update `sys.type` accordingly.
3. **Shape/elevation/motion**: `tokens/system.js` — flat shadows? one-liner.
   Snappier easing language? replace the `EASINGS` map.
4. **Component contracts**: each component's `vars()` block is its skin. The
   deepest change — replacing a component's anatomy — is one self-contained
   file that follows `CONVENTIONS.md`.

The invariant to preserve: **components consume `sys.*` only**. Uphold that
and theming keeps working no matter how far you take the visuals.
