# Alacris UI — component authoring conventions

This starter is a complete design system built on **Alacris** and nothing else.
Every component in `src/components/` follows the rules in this file exactly.
Read the exemplars first — `ui-button.js`, `ui-switch.js`, `ui-text-field.js`,
`ui-dialog.js` — they are the reference implementations of everything below.

## Naming

- Tag prefix: `ui-`. One component per file, filename = tag name (`ui-button.js`).
- Token prefix: `--ui-`. System tokens are referenced through the `sys` object
  (`src/tokens/sys.js`), never as raw `var(--ui-…)` strings in component code.
- Component tokens are declared with `vars('ui-<name>', {...})` and default to
  system tokens, so re-theming the system re-themes every component, and any
  single component can still be overridden independently.

```js
import { vars, css } from 'alacris';
import { sys } from '../tokens/sys.js';

const t = vars('ui-button', {
  bg: sys.color.primary,
  fg: sys.color.onPrimary,
  radius: sys.radius.full,
  font: sys.type.labelLg,
});
```

## The three token tiers (never skip a tier)

1. **Reference** — generated tonal palettes (`--ui-ref-primary-40`). Only the
   theme engine writes these. Components never touch them.
2. **System** — semantic roles (`--ui-color-primary`, `--ui-radius-md`,
   `--ui-duration-short-4`). Set on `:root` by `applyTheme`; they inherit
   through every shadow boundary. Components consume them **only** via `sys`.
3. **Component** — `vars('ui-x', …)` per component. This is the public,
   documented theming contract of that component.

Hardcoded colors, font sizes, radii, shadows, durations, or easings inside a
component are **bugs**. Structural values (1px borders, small fixed paddings)
may be literal.

## File anatomy

```js
// ui-thing.js
//
// <ui-thing> — one-line summary.
//
// @prop  {string}  label=''      — visible label
// @prop  {boolean} disabled=false
// @event change — fired when …; detail: { value }
// @slot  (default) — …
// @slot  icon — …
// @part  control — the interactive element
// @vars  --ui-thing-bg, --ui-thing-fg, … (see `t` below)

import { define, html, css, computed } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';

const t = vars('ui-thing', { /* … */ });

define('ui-thing', {
  props: { label: '', disabled: false },
  styles: [base, css`/* … */`],
  setup({ label, disabled }, host) {
    return html`…`;
  },
});

export const tag = 'ui-thing';
export const themeVars = t;
```

- The header comment is the component's documentation. Keep it accurate — the
  docs catalog is assembled from these headers.
- Always include `base` (from `./base.js`) first in `styles`. It carries the
  box-sizing reset, the reduced-motion guard, and the focus-ring helper.
- Export `tag` and `themeVars` (the `vars()` object — its `.names` is the
  documented custom-property list).

## Interactive control recipe

Material state layers + ripple + focus ring, identically in every component:

```js
import { ripple } from '../motion/ripple.js';

setup({ disabled }, host) {
  return html`
    <button part="control" class="control"
            ?disabled=${disabled}
            ref=${(el) => ripple(el, { disabled })}>
      <span class="layer" aria-hidden="true"></span>
      <slot></slot>
    </button>`;
}
```

```css
.control { position: relative; isolation: isolate; /* … */ }
.layer {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: currentColor; opacity: 0;
  transition: opacity ${sys.duration.short2} ${sys.easing.standard};
}
.control:hover .layer { opacity: ${sys.state.hover}; }
.control:focus-visible .layer { opacity: ${sys.state.focus}; }
.control:active .layer { opacity: ${sys.state.pressed}; }
.control:disabled { pointer-events: none; }
```

- `ripple(el, { disabled })` attaches the Material press ripple (already
  reduced-motion aware). Pass the prop signal itself, not its value.
- Hover/focus/pressed opacities: `${stateLayerOn('.control')}` from `base.js`.
- Focus ring: `.control:focus-visible { outline: var(--ui-focus-ring) }` via the
  `focusRing` snippet in `base.js`. Never remove outlines without replacing them.

## Sizing and density

Component heights use the density formula so `density: -2…0` in the theme
compresses every control by 4px per step:

```css
.control { block-size: calc(40px + var(--ui-density, 0) * 4px); }
```

## Props and events

- Naming parity with the platform/MUI: `value`, `checked`, `disabled`, `name`,
  `label`, `variant`, `size`, `open`, `href`.
- Enumerated variants are strings with a documented default
  (`variant: 'filled'` — `filled | tonal | outlined | text | elevated`).
- Upward communication is **only** `host.emit(type, detail)`:
  - `input` — every keystroke/drag (live value in `detail.value`)
  - `change` — committed value change (`detail.value` / `detail.checked`)
  - `open` / `close` — overlay visibility changed (after animation completes)
  - `dismiss` — user dismissed a chip/alert/snackbar
- Two-way flow: parent passes a signal as a prop and listens for the event; the
  component **never** writes to its own props except in direct response to user
  interaction (e.g. `checked.set(!checked())` on click, then emit `change`).

## Accessibility (non-negotiable)

- Real native elements where possible (`<button>`, `<input>`, `<a>`); ARIA
  roles/patterns where not (tabs, menu, slider composed parts).
- Every input takes a `label` prop; if empty, apply `aria-label` fallback from
  other props where sensible. Never render an unlabeled control.
- Keyboard: follow the WAI-ARIA Authoring Practices pattern for the widget
  (roving tabindex for tabs/menus/radio-groups — use `rovingTabindex` from
  `../util/keys.js`; Escape closes overlays; arrow keys move within composites).
- Overlays (dialog, drawer, menu) use `focusTrap`/`scrollLock` from
  `../util/focus.js` and restore focus to the invoker on close.
- Respect `prefers-reduced-motion` — automatic if you animate via
  `../motion/index.js` and CSS transitions (base.js guards those).

## Motion

- CSS transitions for state (hover, focus, checked), with token durations and
  easings only.
- JS animation via `animate(el, keyframes, opts)` from `../motion/index.js` for
  enter/exit and gestures. Use `fx` presets when one fits.
- Overlays animate enter **and** exit; emit `open`/`close` after the animation
  settles. Use `presence()` from `../motion/presence.js` for conditional
  subtrees that need exit animations.

## Forms

Any component with a `name` + `value`/`checked` declares
`formAssociated: true` in its `define` options and calls `formBind` from
`../util/form.js` in `setup`. formBind drives the platform's
`ElementInternals` (`host.internals`) — value reporting, reset-to-initial,
`<fieldset disabled>` — and falls back to a hidden light-DOM `<input>` where
internals are unavailable:

```js
import { formBind } from '../util/form.js';
define('ui-thing', {
  formAssociated: true,
  props: { name: '', value: '', disabled: false },
  setup({ name, value, disabled }, host) {
    formBind(host, { name, value, disabled });
    …
  },
});
```

## Security

- Never bind `.innerHTML`. Never interpolate runtime values into `css`
  templates — dynamic values go through custom properties bound in the template
  (`style=${() => ({ '--x': v() })}`).
- Never use `!important`.

## Demo and tests

Each component family has:

- `demo/<family>.js` — exports `export const section = html\`…\`` demonstrating
  every variant/state, registered in `demo/main.js`. Use `demoSection(title,
  blocks)` from `demo/helpers.js`.
- `test/<family>.test.js` — node smoke tests on the repo's happy-dom setup:
  each element defines, renders, responds to a prop write and an interaction.
  Import `./helpers.js` (starter test helpers) for `mount()`. Note happy-dom
  has no layout — do not assert geometry, and dispatch events with
  `{ bubbles: true }`.

## Checklist before a component is "done"

1. Header docs match the implementation (props, events, parts, vars).
2. All visual values flow from tokens; toggling dark scheme needs zero
   component changes.
3. Keyboard + screen-reader semantics per ARIA APG.
4. Hover/focus/press state layers + ripple on Material-interactive surfaces.
5. Enter/exit animation on anything that appears/disappears.
6. No `!important`, no `.innerHTML`, no raw hex/px-size/duration literals.
7. Smoke test passes; demo section shows every variant.
