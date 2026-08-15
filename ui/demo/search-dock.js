// Dock the kitchen-sink search into the app bar when the hero field would
// scroll under it. One <ui-search> stays in the tree so focus and the query
// survive.
//
// Motion is a Material container transform: layout snaps to the live
// destination (the dock is sticky; the hero slot moves with scroll) and a
// compositor scale+translate inverts the delta. Fast scroll retargets from
// the current visual box instead of cancelling a width/height animation onto
// a stale rect — that was the jank.

import { prefersReducedMotion, duration } from '../src/motion/animate.js';

const reduced = () =>
  (typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : prefersReducedMotion());

const HYSTERESIS = 12;

const usable = (r) => r && r.width >= 8 && r.height >= 8;

const box = (r) => ({ top: r.top, left: r.left, width: r.width, height: r.height });

const moved = (a, b) =>
  Math.abs(a.top - b.top) > 1
  || Math.abs(a.left - b.left) > 1
  || Math.abs(a.width - b.width) > 1
  || Math.abs(a.height - b.height) > 1;

/** Y at t for cubic-bezier(0.2, 0, 0, 1) — MD3 emphasized spatial. */
const emphasizedAt = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let x = t;
  for (let i = 0; i < 5; i++) {
    const cx = 3 * 0.2;
    const bx = 3 * (0 - 0.2) - cx;
    const ax = 1 - cx - bx;
    const d = ((ax * x + bx) * x + cx) * x - t;
    const dx = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(dx) < 1e-6) break;
    x -= d / dx;
  }
  const cy = 0;
  const by = 3 * (1 - 0) - cy;
  const ay = 1 - cy - by;
  return ((ay * x + by) * x + cy) * x;
};

export function bindSearchDock({ search, anchor, dock, docked }) {
  let pinned = false;
  let lastPin = null;
  let raf = 0;
  let booted = false;
  let flight = null;

  const measure = (el) => box(el.getBoundingClientRect());

  const applyFixed = (r, compact) => {
    search.classList.toggle('is-pinned', compact);
    search.style.position = 'fixed';
    search.style.top = `${r.top}px`;
    search.style.left = `${r.left}px`;
    search.style.width = `${r.width}px`;
    search.style.height = `${r.height}px`;
    search.style.inlineSize = `${r.width}px`;
    search.style.blockSize = `${r.height}px`;
    search.style.maxWidth = 'none';
    search.style.margin = '0';
    search.style.zIndex = '1101';
    search.style.boxSizing = 'border-box';
    search.style.transformOrigin = '0 0';
    pinned = true;
    lastPin = r;
  };

  const unpin = () => {
    search.classList.remove('is-pinned');
    search.style.position = '';
    search.style.top = '';
    search.style.left = '';
    search.style.width = '';
    search.style.height = '';
    search.style.inlineSize = '';
    search.style.blockSize = '';
    search.style.maxWidth = '';
    search.style.margin = '';
    search.style.zIndex = '';
    search.style.boxSizing = '';
    search.style.transform = '';
    search.style.transformOrigin = '';
    search.style.willChange = '';
    pinned = false;
    lastPin = null;
  };

  const stopFlight = () => {
    if (!flight) return;
    if (flight.raf) cancelAnimationFrame(flight.raf);
    flight = null;
  };

  const snap = (want) => {
    stopFlight();
    search.style.transform = '';
    search.style.willChange = '';
    if (want) applyFixed(measure(dock), true);
    else unpin();
  };

  const flyTo = (want) => {
    if (reduced() || duration('long2') <= 0) {
      snap(want);
      return;
    }

    const from = measure(search);
    stopFlight();
    const t0 = performance.now();
    const dur = duration('long2');

    const tick = () => {
      const dest = want ? measure(dock) : measure(anchor);
      if (!usable(dest)) {
        snap(want);
        return;
      }
      const t = dur <= 0 ? 1 : Math.min(1, (performance.now() - t0) / dur);
      const e = emphasizedAt(t);

      applyFixed(dest, want);
      const dx = (from.left - dest.left) * (1 - e);
      const dy = (from.top - dest.top) * (1 - e);
      const sx = 1 + ((from.width / dest.width) - 1) * (1 - e);
      const sy = 1 + ((from.height / dest.height) - 1) * (1 - e);
      search.style.willChange = 'transform';
      search.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

      if (t >= 1) {
        search.style.transform = '';
        search.style.willChange = '';
        if (want) applyFixed(dest, true);
        else unpin();
        flight = null;
        return;
      }
      flight.raf = requestAnimationFrame(tick);
    };

    flight = { raf: 0, want };
    tick();
  };

  const sync = () => {
    const a = measure(anchor);
    const d = measure(dock);
    if (!usable(a) || !usable(d)) return;

    const want = docked.peek()
      ? a.top <= d.top + HYSTERESIS
      : a.top <= d.top;

    if (!booted) {
      booted = true;
      docked.set(want);
      snap(want);
      return;
    }

    if (want === docked.peek()) {
      if (flight) return;
      if (want && pinned && lastPin && moved(lastPin, d)) applyFixed(d, true);
      return;
    }

    docked.set(want);
    flyTo(want);
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };

  const onResize = () => {
    if (flight) return;
    if (docked.peek() && pinned) {
      const next = measure(dock);
      if (usable(next) && (!lastPin || moved(lastPin, next))) applyFixed(next, true);
    } else {
      sync();
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  globalThis.visualViewport?.addEventListener('resize', onResize);
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(onResize)
    : null;
  ro?.observe(dock);
  ro?.observe(anchor);

  sync();
  requestAnimationFrame(sync);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    stopFlight();
    unpin();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    globalThis.visualViewport?.removeEventListener('resize', onResize);
    ro?.disconnect();
  };
}
