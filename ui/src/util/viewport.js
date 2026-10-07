// The visible viewport, for overlays that must fit inside it.
//
// Two things make "the viewport" smaller than `100vh` on phones and tablets:
//
// 1. The browser's URL bar. `vh` is the LARGE viewport (URL bar hidden), so a
//    `100vh` overlay in a Chrome tab with the bar shown runs off the bottom of
//    the screen. A `position: fixed; inset: 0` box with no explicit size
//    tracks the visible area instead (as `dvh` does), so every overlay here is
//    sized by its insets — see `overlayOn`.
// 2. The on-screen keyboard. By default (`interactive-widget=resizes-visual`)
//    it shrinks only the visual viewport; fixed boxes keep their full height
//    and the keyboard covers their bottom. `trackViewport` follows
//    `window.visualViewport` and reports how much of the layout viewport is
//    hidden above and below the visible area, which overlays write onto
//    themselves as `--ui-vv-top` / `--ui-vv-bottom` and pad by. With
//    `interactive-widget=resizes-content` in the page's viewport meta the
//    layout viewport itself shrinks, both insets stay 0, and the inset-sized
//    overlay already fits.

/**
 * Base rules for a fixed, full-viewport overlay that is also a `popover`
 * (the UA sheet gives popovers `width/height: fit-content`, `margin: auto`,
 * and a border). Interpolate into a component's css template:
 *
 *   ${overlayOn('.overlay')}
 */
export const overlayOn = (selector) => `
  ${selector} {
    position: fixed;
    inset: 0;
    inline-size: auto;
    block-size: auto;
    max-inline-size: none;
    max-block-size: none;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    overflow: visible;
  }
  ${selector}::backdrop { display: none; }
`;

/**
 * Padding that keeps an overlay's content inside the visible area: clear of
 * the keyboard (`--ui-vv-*`) and of notches / home indicators
 * (`env(safe-area-inset-*)`, which needs `viewport-fit=cover` to be non-zero),
 * with at least `gap` on every side.
 */
export const visiblePadding = (gap = '0px') => `
  padding-top: calc(var(--ui-vv-top, 0px) + max(${gap}, env(safe-area-inset-top, 0px)));
  padding-bottom: calc(var(--ui-vv-bottom, 0px) + max(${gap}, env(safe-area-inset-bottom, 0px)));
  padding-left: max(${gap}, env(safe-area-inset-left, 0px));
  padding-right: max(${gap}, env(safe-area-inset-right, 0px));
`;

/**
 * How much of the layout viewport is outside the visible area, in CSS px:
 * `{ top, bottom }`. Non-zero while the on-screen keyboard overlays the page
 * (and the browser has panned the visual viewport). Zero while pinch-zoomed —
 * a zoomed visual viewport is the user looking closer, not less room.
 */
export function viewportInsets() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv || Math.abs((vv.scale || 1) - 1) > 0.01) return { top: 0, bottom: 0 };
  const layout = layoutHeight();
  const top = Math.max(0, Math.round(vv.offsetTop));
  const bottom = Math.max(0, Math.round(layout - vv.height - vv.offsetTop));
  return { top, bottom };
}

// clientHeight excludes a horizontal scrollbar, which visualViewport.height
// also excludes; innerHeight would count the scrollbar as "hidden".
function layoutHeight() {
  const root = document.documentElement;
  return document.compatMode === 'CSS1Compat' && root?.clientHeight
    ? root.clientHeight
    : window.innerHeight;
}

/**
 * The visible band of the layout viewport, `{ top, bottom }` in the same
 * coordinates as getBoundingClientRect and `position: fixed`. Anchored popups
 * (menu, select, pickers) stay inside it, so they open above the keyboard.
 */
export function visibleBounds() {
  const { top, bottom } = viewportInsets();
  return { top, bottom: layoutHeight() - bottom };
}

/**
 * Write the insets as `--ui-vv-top` / `--ui-vv-bottom` on `el`, and mark it
 * `data-keyboard` while the bottom inset is non-zero, so an overlay can drop
 * decorative margins when the keyboard has taken half the screen.
 */
export function applyViewportInsets(el, { top, bottom } = viewportInsets()) {
  if (!el?.style) return;
  el.toggleAttribute?.('data-keyboard', bottom > 0);
  if (top) el.style.setProperty('--ui-vv-top', `${top}px`);
  else el.style.removeProperty('--ui-vv-top');
  if (bottom) el.style.setProperty('--ui-vv-bottom', `${bottom}px`);
  else el.style.removeProperty('--ui-vv-bottom');
}

/**
 * Call `onChange(insets)` now and whenever the visual viewport resizes or
 * pans (keyboard shown/hidden, URL bar moved, rotation). Returns a stop
 * function. A no-op without `visualViewport`.
 */
export function trackViewport(onChange) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  let last = '';
  const run = () => {
    const insets = viewportInsets();
    const key = `${insets.top},${insets.bottom}`;
    if (key === last) return;
    last = key;
    onChange(insets);
  };
  run();
  if (!vv) return () => {};
  vv.addEventListener('resize', run);
  vv.addEventListener('scroll', run);
  window.addEventListener('resize', run);
  return () => {
    vv.removeEventListener('resize', run);
    vv.removeEventListener('scroll', run);
    window.removeEventListener('resize', run);
  };
}

/**
 * Keep an overlay inside the visible viewport: tracks the visual viewport,
 * writes `--ui-vv-*` on `el`, and — when the viewport shrinks (the keyboard
 * opened) — scrolls the focused element inside `host` back into view so the
 * field being typed in is not left under the keyboard. Returns a stop
 * function.
 */
export function fitToViewport(el, host) {
  let prevBottom = 0;
  return trackViewport((insets) => {
    applyViewportInsets(el, insets);
    const shrank = insets.bottom > prevBottom;
    prevBottom = insets.bottom;
    if (!shrank || !host) return;
    // Wait for the new padding to lay out before measuring.
    const reveal = () => {
      const active = deepActive();
      if (active && within(host, active)) {
        active.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal);
    else reveal();
  });
}

function deepActive() {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

// Whether `node` is inside `host`, looking through shadow roots: a field
// focused inside a slotted <ui-text-field> counts, and so does a node in the
// host's own shadow root.
function within(host, node) {
  for (let n = node; n; n = n.getRootNode?.()?.host) {
    if (host.contains(n)) return true;
  }
  return false;
}
