# Alacris UI

A complete, themeable design system built with **[Alacris](https://github.com/bmartel/alacris)** and nothing else. No other runtime dependencies, no build step, no CSS framework — 68 components, a three-tier token system, a theme engine that re-skins the whole page with one stylesheet write, and a documented motion layer.

**Material Design is the default. Your design system is the point.** Every visual decision flows through tokens you can override at three levels — from "change the brand color" (one line) to "this is no longer Material at all".

The tags are real custom elements, so they work in plain HTML and inside React, Vue, Svelte, Angular, Rails, Django, and [Alacris-Go](https://github.com/bmartel/alacris-go) — anywhere that renders a tag.

**Docs:** [Live catalog](https://bmartel.github.io/alacris/ui/) · [Getting started](https://bmartel.github.io/alacris/ui/getting-started/)

## Install

```bash
npm install @alacris/ui
```

That pulls in `@alacris/core` as well. Do not also load a second copy of Alacris from a CDN on the same page — two copies means two reactive graphs, and updates stop crossing the boundary.

```js
import { applyTheme } from '@alacris/ui';

applyTheme({ seed: '#0b57d0' });
```

```html
<ui-button>Hello</ui-button>
<ui-text-field label="Email" clearable></ui-text-field>
<ui-switch label="Dark mode"></ui-switch>
```

Importing `@alacris/ui` registers every component. For a smaller page, import only what you use — each component module is self-contained:

```js
import { applyTheme } from '@alacris/ui/theme';
import '@alacris/ui/components/ui-button.js';
import '@alacris/ui/components/ui-text-field.js';

applyTheme({ seed: '#0b57d0' });
```

### Without a bundler

The published package is plain ESM. Point an import map at a pinned CDN build of Alacris (the only bare specifier the UI source uses) and at this package:

```html
<script type="importmap">
{
  "imports": {
    "@alacris/core": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.4/dist/alacris.js",
    "@alacris/ui": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.5.0/src/index.js",
    "@alacris/ui/theme": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.5.0/src/theme/index.js",
    "@alacris/ui/components/": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.5.0/src/components/"
  }
}
</script>
<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#0b57d0' });
</script>

<ui-button>Hello</ui-button>
```

Never mix two versions of `@alacris/core` on one page — two copies means two reactive graphs.

## Theming

```js
import { createTheme, applyTheme, setScheme, toggleScheme } from '@alacris/ui/theme';

applyTheme({ seed: '#6750a4' });
applyTheme({ seed: '#b3261e', density: -1 });
setScheme('dark');
toggleScheme();

applyTheme(createTheme({
  colors: { primary: '#0b57d0', tertiary: '#00695c' },
  typography: 'google-sans',
  shape: { radius: 0.5 },
  overrides: { light: { 'color-surface': '#faf7f2' } },
}));
```

`applyTheme` writes **one** document-level stylesheet of `--ui-*` custom properties and replaces it in place on the next call. Scheme switching after that is `data-ui-scheme` on `<html>` (`light` | `dark` | `auto`).

Three places to intervene, from broadest to narrowest:

1. **Re-theme the system** — `applyTheme({ seed, shape, … })`. Every component follows. Dark mode is generated automatically.
2. **Re-skin one component type** — `ui-button { --ui-button-radius: 4px; }`.
3. **Reach inside one instance** — `ui-dialog::part(surface) { backdrop-filter: blur(8px) }`.

Full guide: [docs/theming.md](docs/theming.md).

## Motion

```js
import { animate, fx, presence, withFlip } from '@alacris/ui/motion';

animate(el, fx.slideInUp, { duration: 'medium2', easing: 'emphasizedDecelerate' });

html`${presence(open, () => html`<div class="sheet">…</div>`, {
  enter: fx.slideInUp, exit: fx.slideOutDown,
})}`;
```

Durations and easings are tokens, so the theme's `motion.scale` governs CSS transitions and JS animation alike, and `prefers-reduced-motion` is honoured automatically. Full guide: [docs/motion.md](docs/motion.md).

## Forms

Named controls (`ui-text-field`, `ui-switch`, `ui-checkbox`, `ui-select`, …) are form-associated custom elements. Give a component a `name` and it submits, resets, and follows `<fieldset disabled>` like a native field.

## Entry points

| Import | What it is |
| --- | --- |
| `@alacris/ui` | registers every component; re-exports theme, motion, tokens, utilities |
| `@alacris/ui/theme` | `createTheme`, `applyTheme`, scheme switching |
| `@alacris/ui/motion` | `animate`, `fx`, `presence`, `withFlip`, `ripple` |
| `@alacris/ui/tokens` | `sys` and the token engines |
| `@alacris/ui/components/ui-button.js` | one element, registered as a side effect |

Component modules have side effects (they call `define()`). Theme, motion and token modules do not.

## In this repository

This package lives in `ui/` of the [Alacris repo](https://github.com/bmartel/alacris) so the library and the design system can be developed together. They **publish separately**: `@alacris/ui` has its own version, changelog, and npm release. A commit that only changes this folder does not cut an Alacris library release. `starter/` in the same repo is a usage example and install guide, not this package.

```
ui/
  src/           the published modules
  types/         hand-written .d.ts
  demo/          kitchen-sink app (not published)
  docs/          theming, motion, component catalog
  test/          node smoke tests
  CONVENTIONS.md rules every component follows
```

The live catalog is [bmartel.github.io/alacris/ui](https://bmartel.github.io/alacris/ui/) — every component plus a theme playground, no clone required.

From a clone of the repo:

```bash
npm install
npm run demo        # kitchen sink: http://localhost:5173/ui/
                    # starter app:  http://localhost:5173/starter/
cd ui && npm test
```

## License

MIT
