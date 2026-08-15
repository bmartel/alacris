// Anchored positioning for popups (menu, select, tooltip, autocomplete).
//
// The panel is `position: fixed`, measured, placed relative to the anchor's
// viewport rect, flipped to the other side when it would overflow, and clamped
// to the viewport. `autoUpdate` keeps it glued through scroll and resize.
// ~90 lines instead of a positioning dependency, because the components only
// need the four sides, alignment, flip and shift.

const MAIN = { top: 'top', bottom: 'top', left: 'left', right: 'left' };

/**
 * position(panel, anchor, { placement = 'bottom-start', offset = 4,
 *                           flip = true, matchWidth = false, padding = 8 })
 *
 * placement: side[-alignment] — side: top|bottom|left|right,
 * alignment: start|center|end (start = aligned to the anchor's leading edge).
 * Writes `left`/`top` on the panel and returns { placement } (the side may
 * have flipped).
 */
export function position(panel, anchor, opts = {}) {
  const { placement = 'bottom-start', offset = 4, flip = true, matchWidth = false, padding = 8 } = opts;
  const a = anchor.getBoundingClientRect();
  if (matchWidth) panel.style.minInlineSize = `${a.width}px`;
  const p = panel.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let [side, align = 'start'] = placement.split('-');

  const fits = (s) =>
    s === 'bottom' ? a.bottom + offset + p.height <= vh
    : s === 'top' ? a.top - offset - p.height >= 0
    : s === 'right' ? a.right + offset + p.width <= vw
    : a.left - offset - p.width >= 0;

  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  if (flip && !fits(side) && fits(opposite[side])) side = opposite[side];

  const alongX = side === 'top' || side === 'bottom';
  let x, y;
  if (alongX) {
    y = side === 'bottom' ? a.bottom + offset : a.top - offset - p.height;
    x = align === 'start' ? a.left : align === 'end' ? a.right - p.width : a.left + a.width / 2 - p.width / 2;
  } else {
    x = side === 'right' ? a.right + offset : a.left - offset - p.width;
    y = align === 'start' ? a.top : align === 'end' ? a.bottom - p.height : a.top + a.height / 2 - p.height / 2;
  }

  x = Math.max(padding, Math.min(x, vw - p.width - padding));
  y = Math.max(padding, Math.min(y, vh - p.height - padding));

  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  return { placement: align ? `${side}-${align}` : side, [MAIN[side]]: true };
}

/**
 * Keep a panel positioned while it is open. Returns a stop function.
 * Repositions on scroll anywhere (capture), resize, and anchor size change.
 */
export function autoUpdate(panel, anchor, opts) {
  const run = () => position(panel, anchor, opts);
  run();
  window.addEventListener('scroll', run, { capture: true, passive: true });
  window.addEventListener('resize', run, { passive: true });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(run) : null;
  ro?.observe(anchor);
  ro?.observe(panel);
  return () => {
    window.removeEventListener('scroll', run, { capture: true });
    window.removeEventListener('resize', run);
    ro?.disconnect();
  };
}
