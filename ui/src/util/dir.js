// Writing direction for parts placed or moved in JS.
//
// CSS handles direction with logical properties and `:dir(rtl)`. Physical
// values written from script — a popup's `left`, a `translateX`, a swipe
// delta — need the element's resolved direction instead. Read it from the
// computed style, so `dir` on any ancestor, `dir="auto"`, and CSS `direction`
// all count, through shadow boundaries.

/** True when `el` lays out right to left. */
export function isRtl(el) {
  try {
    return getComputedStyle(el).direction === 'rtl';
  } catch {
    return false;
  }
}

/**
 * The physical edge ('left' | 'right') a logical 'start' | 'end' edge maps
 * to for `el`.
 */
export function physicalEdge(el, edge) {
  return (edge === 'end') !== isRtl(el) ? 'right' : 'left';
}
