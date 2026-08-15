# Motion

Animation in Alacris UI is built on three commitments:

1. **Motion is themed.** Durations and easings are system tokens
   (`--ui-duration-*`, `--ui-easing-*`). The theme's `motion.scale` slows,
   speeds, or zeroes every animation on the page — CSS transitions and JS
   animation alike — because both read the same tokens.
2. **Reduced motion is automatic.** `prefers-reduced-motion` collapses CSS
   transitions/animations (guard in `components/base.js`, included by every
   component) and makes JS animations jump to their end state (guard in
   `animate`). You never write the media query yourself.
3. **The Web Animations API, not timers.** Animations run where the browser
   can offload them; sequencing uses `.finished`, never `setTimeout`.

Everything importable from `./src/motion/index.js`.

## `animate(el, keyframes, opts)`

A thin, token-aware wrapper over `el.animate`:

```js
import { animate, fx } from './src/motion/index.js';

animate(panel, fx.slideInUp, { duration: 'medium2', easing: 'emphasizedDecelerate' });
animate(dot, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 'long1' });
```

- `duration` — a token key (`'short4'`, `'medium2'`, `'extraLong1'` …) resolved
  from the live CSS token (so `motion.scale` applies), or a raw ms number.
- `easing` — a token key (`'standard'`, `'emphasized'`,
  `'emphasizedDecelerate'` …) or any CSS easing string.
- Defaults: `duration: 'short4'`, `easing: 'standard'`, `fill: 'both'`. Any
  other WAAPI option passes through.
- Returns the `Animation`. `settled(anim)` awaits it without throwing on
  cancellation (cancel is control flow, not an error).

`fx` is the preset library: `fadeIn/Out`, `scaleIn/Out`, `slideInUp/Down/Left/Right`
(+ matching outs), `collapse`. Enter presets pair naturally with
`emphasizedDecelerate`, exits with `emphasizedAccelerate`.

## `presence` — exit animations for conditional DOM

Fine-grained rendering removes a conditional subtree the instant its condition
turns false — correct, but too soon to animate the exit. `presence` gives the
condition a lifecycle:

```js
import { presence, fx } from './src/motion/index.js';

setup({ open }, host) {
  return html`
    <div class="host">
      ${presence(open, () => html`<div class="sheet">…</div>`, {
        enter: fx.slideInUp,   enterDuration: 'medium2',
        exit:  fx.slideOutDown, exitDuration: 'short4',
        onEntered: () => host.emit('opened'),
        onExited:  () => host.emit('closed'),
      })}
    </div>`;
}
```

- Mounts and plays `enter` when the signal turns truthy; plays `exit` *then*
  unmounts when it turns falsy.
- Re-entry during an exit cancels cleanly and remounts fresh.
- `target: '.selector'` animates a specific descendant instead of the first
  element (e.g. animate the sheet while a scrim just fades).
- Call it in a child position during `setup` — it creates an owned effect and
  returns an invisible `display: contents` anchor.
- `enter: false` / `exit: false` disable either side.

This is how `ui-dialog`, `ui-menu`, `ui-drawer`, `ui-snackbar` and `ui-tooltip`
animate — read `ui-dialog.js` for the canonical composition with `focusTrap`
and `scrollLock`.

## `withFlip` — list reorders that glide

`each(...)` moves DOM nodes on reorder instead of rebuilding them, which makes
FLIP animation trivial — node identity is stable, so we measure, mutate,
measure again, and play the inversion:

```js
import { withFlip } from './src/motion/index.js';

html`<ul ref=${(el) => (list = el)}>
  ${each(() => state.rows, (row) => html`<li>${() => row().name}</li>`, (r) => r.id)}
</ul>`;

// any synchronous mutation — sort, splice, filter-toggle:
withFlip(list, () => state.rows.sort(byName), { stagger: 15 });
```

Moved children glide to their new positions; new children fade in. (Removed
children are gone before anything can animate them — for individually
dismissable items, wrap the item's content in `presence`, or animate first and
mutate in `onExited`, as `ui-chip`'s dismiss does.)

## `ripple` — the Material press feedback

```js
html`<button class="control" ref=${(el) => ripple(el, { disabled })}>…</button>`
```

Expands a `currentColor` wave from the pointer (or the center, for
`{ centered: true }` / keyboard presses) at the pressed-state-layer opacity
token. Pass the `disabled` *signal* so the ripple tracks it live. The wave
completes before fading — the Material feel — and reduced motion swaps it for
an instant tint. Attach once per element (idempotent); requires the element to
be positioned (`position: relative`), which the conventions' control recipe
already guarantees.

## CSS transitions — when they're the right tool

State-to-state changes (hover, checked, expanded chevrons) stay in CSS, always
on tokens:

```css
.handle {
  transition: translate var(--ui-duration-short-4) var(--ui-easing-emphasized);
}
```

Guideline: **CSS for state changes on persistent elements; `animate`/`presence`
for things entering, leaving, or being choreographed.** Both obey the theme
and reduced motion, so pick the simpler one.

## Recipes

**Staggered entrance for a static set:**

```js
cards.forEach((el, i) =>
  animate(el, fx.slideInUp, { duration: 'medium2', delay: i * 40, fill: 'backwards' }));
```

**Slow everything down to debug choreography:**

```js
applyTheme({ motion: { scale: 5 } });   // the demo playground has this toggle
```

**Instant UI for tests / kiosks:** `applyTheme({ motion: { scale: 0 } })` —
tokens go to `0ms`; JS animations resolve immediately but `.finished`
sequencing still runs, so `open`/`closed` events keep firing in order.

**A custom easing vocabulary:** add tokens via
`overrides.common: { 'easing-spring': 'linear(0, 0.6, 1.1, 0.95, 1)' }` and use
`easing: 'var(--ui-easing-spring)'`-consuming CSS, or pass the raw string to
`animate`.
