# Alacris UI — a design system starter

A complete, production-shaped design system and component library built with
**[Alacris](https://github.com/bmartel/alacris)** and nothing else. No other
runtime dependencies, no build step, no CSS framework — ~70 components, a
three-tier token system, a theme engine that re-skins the whole page with one
stylesheet write, and a documented motion layer.

**Material Design is the default. Your design system is the point.** Every
visual decision flows through tokens you can override at three levels — from
"change the brand color" (one line) to "this is no longer Material at all"
(edit one directory).

## Quick start

This starter lives inside the Alacris repo as a template. To try it here:

```bash
# from the repo root
npm run demo        # builds dist/ and serves — open http://localhost:5173/starter/
```

To use it as the starting point for an app, copy `starter/` out, then either
`npm install alacris` or point the import map in `index.html` at a pinned CDN
build — the source is identical in both setups:

```html
<script type="importmap">
{ "imports": { "alacris": "https://cdn.jsdelivr.net/npm/alacris@0.6/dist/alacris.js" } }
</script>
```

Boot a page in three lines:

```js
import { applyTheme } from './src/theme/index.js';
import './src/index.js';                 // registers every component

applyTheme({ seed: '#0b57d0' });          // the entire theme from one color
                                          // (Google Sans Flex, loaded for you)
```

```html
<ui-button>Hello</ui-button>
<ui-text-field label="Email" clearable></ui-text-field>
<ui-switch label="Dark mode"></ui-switch>
```

Components are real custom elements, so they work in plain HTML and inside
React, Vue, Svelte, Rails, Django — anywhere that renders tags.

## What's inside

```
starter/
  index.html            kitchen-sink demo — an app shell built from the system
  src/
    index.js            imports/registers every component; public API surface
    tokens/             tier 1+2: palettes (OKLCH engine), type scale, shape,
                        elevation, motion, spacing, state layers — and `sys`,
                        the accessor components use to reference tokens
    theme/              createTheme / applyTheme / scheme switching
    motion/             animate, fx presets, presence, withFlip, ripple
    util/               positioning, focus trap, roving tabindex, formBind, icons
    components/         one file per component
  demo/                 kitchen-sink: app bar, rail, drawer, search, playground
  docs/
    theming.md          the token architecture and how to make this yours
    motion.md           the animation system
    components.md       full catalog: props, events, slots, parts, vars
  test/                 node smoke tests (repo's happy-dom harness)
  CONVENTIONS.md        the rules every component follows — read before adding one
```

## The architecture in one diagram

```
createTheme({ seed, colors, typography, shape, motion, density, overrides })
        │  pure data — palettes generated in OKLCH, mapped to Material roles
        ▼
applyTheme(theme)  ──►  ONE document-level stylesheet of custom properties
        │               --ui-color-*  --ui-type-*  --ui-radius-*  --ui-duration-*
        │               (light + dark schemes; re-theme = one replaceSync)
        ▼
   sys tokens        components consume ONLY these, via the `sys` object
        ▼
vars('ui-button', { bg: sys.color.primary, … })
        │            per-component contract: --ui-button-bg overrides one
        ▼            component; the system tokens re-theme all of them
   <ui-button>
```

Three override levels, from broadest to narrowest:

1. **Re-theme the system** — `applyTheme({ seed: '#00695c', shape: { radius: 0 } })`.
   Every component follows. Dark mode is included automatically.
2. **Re-skin one component type** — set its custom properties anywhere in CSS:
   `ui-button { --ui-button-radius: 4px; --ui-button-filled-bg: black }`.
3. **Reach inside one instance** — exposed parts:
   `ui-dialog::part(surface) { backdrop-filter: blur(8px) }`.

Full guide: [docs/theming.md](docs/theming.md).

## Theming in 30 seconds

```js
import { createTheme, applyTheme, setScheme, toggleScheme } from './src/theme/index.js';

applyTheme({ seed: '#6750a4' });                    // Material baseline (Google Sans Flex)
applyTheme({ seed: '#b3261e', density: -1 });       // rebrand + compact, live
setScheme('dark');                                  // pin dark ('light' | 'auto')
toggleScheme();                                     // flip

applyTheme(createTheme({
  colors: { primary: '#0b57d0', tertiary: '#00695c' },  // explicit key colors
  typography: 'google-sans',                             // or { family: 'Inter' }
  shape: { radius: 0.5 },                                // tighter corners
  overrides: { light: { 'color-surface': '#faf7f2' } },  // raw token surgery
}));
```

Scheme switching is pure CSS after that: `data-ui-scheme` on `<html>`, with
`auto` following the OS. Native form controls follow via `color-scheme`.

## Motion

Durations and easings are tokens, so the theme's `motion.scale` governs CSS
transitions and JS animation alike — and `prefers-reduced-motion` is honored
everywhere automatically. The layer on top:

```js
import { animate, fx, presence, withFlip, ripple } from './src/motion/index.js';

animate(el, fx.slideInUp, { duration: 'medium2', easing: 'emphasizedDecelerate' });

// exit animations for conditional DOM — the thing fine-grained rendering
// normally can't give you:
${presence(open, () => html`<div class="sheet">…</div>`, {
  enter: fx.slideInUp, exit: fx.slideOutDown,
})}

withFlip(listEl, () => state.rows.sort(byName));   // reorders glide, via each()
```

Full guide: [docs/motion.md](docs/motion.md).

## Forms

Every named control (`ui-text-field`, `ui-switch`, `ui-checkbox`,
`ui-select`, …) is a **form-associated custom element** (Alacris's
`formAssociated: true`): the browser treats it as a real field via
`ElementInternals`, so it submits, resets to its initial value, and follows
`<fieldset disabled>` natively. Where `ElementInternals` is unavailable,
`formBind` falls back to mirroring the value into a hidden light-DOM input —
either way, give a component a `name` and it submits like a native field.

## Components

~70 elements across inputs, selection, pickers, data display, feedback, navigation,
surfaces and layout — the MUI/Material breadth. Every component documents its
props, events, slots, parts and theme vars in its file header;
[docs/components.md](docs/components.md) is the assembled catalog.

## Tests

```bash
cd starter && npm test     # node smoke tests on the repo's happy-dom harness
```

Browser-only behavior (layout, animations, focus rings) is exercised by the
demo page — `npm run demo` from the repo root, then `/starter/`.

## Making it not-Material

The Material defaults are one file deep at every layer: swap the typeface with
`typography: 'google-sans'` (or `{ family: 'Inter' }`), the type scale in
`tokens/typography.js`, the shape ramp in `tokens/system.js`, the role mapping
in `tokens/color.js` — or leave the machinery alone and override tokens from
`createTheme(...)`. The components only ever speak `sys.*`, so they follow
wherever the tokens go. [docs/theming.md](docs/theming.md#building-your-own-design-system)
walks through a full re-skin.
