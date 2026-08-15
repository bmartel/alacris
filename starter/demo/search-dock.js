// Dock the kitchen-sink search into the app bar when the hero field would
// scroll under it. One <ui-search> stays in the tree so focus and the query
// survive; FLIP (pin to the destination, invert, play) morphs it both ways.
// In-flow while in the hero so page scroll stays compositor-native; position
// fixed only while docked or mid-flight.

import { animate, prefersReducedMotion, settled } from '../src/motion/animate.js';

const HYSTERESIS = 12;

const usable = (r) => r && r.width >= 8 && r.height >= 8;

const box = (r) => ({ top: r.top, left: r.left, width: r.width, height: r.height });

const moved = (a, b) =>
  Math.abs(a.top - b.top) > 1
  || Math.abs(a.left - b.left) > 1
  || Math.abs(a.width - b.width) > 1;

export function bindSearchDock({ search, anchor, dock, docked }) {
  let pinned = false;
  let lastPin = null;
  let anim = null;
  let gen = 0;
  let raf = 0;
  let booted = false;

  const measure = (el) => box(el.getBoundingClientRect());

  const pinTo = (r) => {
    search.classList.add('is-pinned');
    search.style.position = 'fixed';
    search.style.top = `${r.top}px`;
    search.style.left = `${r.left}px`;
    search.style.width = `${r.width}px`;
    search.style.inlineSize = `${r.width}px`;
    search.style.maxWidth = 'none';
    search.style.margin = '0';
    search.style.zIndex = '1101';
    search.style.boxSizing = 'border-box';
    pinned = true;
    lastPin = r;
  };

  const unpin = () => {
    search.classList.remove('is-pinned');
    search.style.position = '';
    search.style.top = '';
    search.style.left = '';
    search.style.width = '';
    search.style.inlineSize = '';
    search.style.maxWidth = '';
    search.style.margin = '';
    search.style.zIndex = '';
    search.style.boxSizing = '';
    search.style.transform = '';
    search.style.willChange = '';
    pinned = false;
    lastPin = null;
  };

  const stopAnim = () => {
    if (!anim) return;
    try { anim.cancel(); } catch { /* already finished */ }
    anim = null;
    search.style.transform = '';
  };

  const morphTo = (dest, stayPinned) => {
    const first = measure(search);
    stopAnim();
    pinTo(dest);
    const last = measure(search);
    const dx = first.left - last.left;
    const dy = first.top - last.top;

    const snap = () => {
      if (!stayPinned) unpin();
      else pinTo(dest);
    };

    if (prefersReducedMotion() || (!moved(first, last) && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
      snap();
      return;
    }

    const my = ++gen;
    search.style.willChange = 'transform, width';
    anim = animate(search, [
      { transform: `translate(${dx}px, ${dy}px)`, width: `${first.width}px`, inlineSize: `${first.width}px` },
      { transform: 'none', width: `${last.width}px`, inlineSize: `${last.width}px` },
    ], { duration: 'medium2', easing: 'emphasized', fill: 'backwards' });

    settled(anim).then(() => {
      if (my !== gen) return;
      anim = null;
      search.style.willChange = '';
      snap();
    });
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
      if (want) pinTo(d);
      else unpin();
      return;
    }

    if (want === docked.peek()) {
      if (want && pinned && !anim && lastPin && moved(lastPin, d)) pinTo(d);
      return;
    }

    docked.set(want);
    morphTo(want ? d : a, want);
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };

  const onResize = () => {
    if (anim) return;
    if (docked.peek() && pinned) {
      const next = measure(dock);
      if (usable(next) && (!lastPin || moved(lastPin, next))) pinTo(next);
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
    gen += 1;
    if (raf) cancelAnimationFrame(raf);
    stopAnim();
    unpin();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    globalThis.visualViewport?.removeEventListener('resize', onResize);
    ro?.disconnect();
  };
}
