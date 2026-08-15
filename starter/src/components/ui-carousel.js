// <ui-carousel> — a Material carousel: snap-scrolling slides with previous /
// next controls.
//
//   <ui-carousel label="Photos" variant="multi-browse">
//     <ui-carousel-item>One</ui-carousel-item>
//     <ui-carousel-item>Two</ui-carousel-item>
//   </ui-carousel>
//
// multi-browse shows several items; uncontained lets slides overflow the
// frame; hero makes the selected slide dominate. Selection reflects down as
// `selected` on each <ui-carousel-item>. Prev/next (and arrow keys) scroll
// the selected slide into view; dragging the track updates `index`.
//
// @prop  {number} index=0 — the selected slide
// @prop  {string} variant='multi-browse' — multi-browse | uncontained | hero
// @prop  {string} label='' — accessible name for the region
// @event change — index moved; detail: { index }
// @slot  (default) — <ui-carousel-item> children
// @part  viewport, track, prev, next
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, effect, computed, signal, onCleanup } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base, focusRingOn } from './base.js';
import { prefersReducedMotion } from '../motion/animate.js';
import './ui-icon-button.js';
import './ui-carousel-item.js';

const t = vars('ui-carousel', {
  gap: sys.space(2),
  height: '200px',
  heroSize: '80%',
  controlFg: sys.color.onSurface,
  itemBasis: '40%',
});

const styles = css`
  :host { display: block; position: relative; }
  .root { position: relative; }
  .viewport {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    block-size: ${t.height};
    --ui-carousel-item-basis: ${t.itemBasis};
  }
  .viewport::-webkit-scrollbar { display: none; }
  .track {
    display: flex;
    align-items: stretch;
    gap: ${t.gap};
    block-size: 100%;
    padding-inline: ${sys.space(2)};
  }
  .track > slot { display: contents; }
  .uncontained { --ui-carousel-item-basis: 56%; }
  .hero { --ui-carousel-item-basis: 28%; }
  .hero ::slotted(ui-carousel-item[selected]) { --ui-carousel-item-basis: ${t.heroSize}; }
  .prev, .next {
    position: absolute;
    inset-block-start: 50%;
    translate: 0 -50%;
    z-index: 1;
    color: ${t.controlFg};
  }
  .prev { inset-inline-start: ${sys.space(1)}; }
  .next { inset-inline-end: ${sys.space(1)}; }
  ${focusRingOn('.prev')}
  ${focusRingOn('.next')}
`;

define('ui-carousel', {
  props: { index: 0, variant: 'multi-browse', label: '' },
  styles: [base, styles],
  setup({ index, variant, label }, host) {
    const rev = signal(0);
    const bump = () => rev.update((n) => n + 1);
    const itemsOf = () => [...host.querySelectorAll('ui-carousel-item')];
    let viewport = null;
    let ignoreScroll = 0;

    const clamp = (n) => {
      const max = Math.max(0, itemsOf().length - 1);
      return Math.max(0, Math.min(max, n));
    };
    const go = (n) => {
      const next = clamp(n);
      if (next === index.peek()) return;
      index.set(next);
      host.emit('change', { index: next });
    };

    const scrollToCurrent = () => {
      const items = itemsOf();
      const target = items[clamp(index.peek())];
      if (!target || !viewport) return;
      const dest = viewport.scrollLeft + (target.getBoundingClientRect().left - viewport.getBoundingClientRect().left);
      if (Math.abs(dest - viewport.scrollLeft) < 1) return;
      if (typeof viewport.scrollTo !== 'function') return;
      ignoreScroll++;
      viewport.scrollTo({
        left: dest,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      const done = () => { ignoreScroll = Math.max(0, ignoreScroll - 1); };
      viewport.addEventListener('scrollend', done, { once: true });
      setTimeout(done, 500);
    };

    const sync = () => {
      rev();
      const i = clamp(index());
      itemsOf().forEach((el, n) => { el.selected = n === i; });
      requestAnimationFrame(scrollToCurrent);
    };
    effect(sync);

    const onScrollEnd = () => {
      if (ignoreScroll) return;
      const items = itemsOf();
      if (!items.length || !viewport) return;
      const origin = viewport.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;
      items.forEach((el, n) => {
        const d = Math.abs(el.getBoundingClientRect().left - origin);
        if (d < bestDist) { bestDist = d; best = n; }
      });
      if (best !== index.peek()) {
        index.set(best);
        host.emit('change', { index: best });
      }
    };

    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(index() + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(index() - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(itemsOf().length - 1); }
    };

    const viewportRef = (el) => {
      viewport?.removeEventListener('scrollend', onScrollEnd);
      viewport = el;
      el.addEventListener('scrollend', onScrollEnd);
      requestAnimationFrame(scrollToCurrent);
    };
    onCleanup(() => viewport?.removeEventListener('scrollend', onScrollEnd));

    const cls = computed(() => `viewport ${variant()}`);
    const atStart = computed(() => index() <= 0);
    const atEnd = computed(() => {
      rev();
      const n = itemsOf().length;
      return n === 0 || index() >= n - 1;
    });

    return html`
      <div class="root" role="region" aria-roledescription="carousel"
           aria-label=${() => label() || null} @keydown=${onKey}>
        <ui-icon-button class="prev" part="prev" variant="tonal"
                        icon="chevron-left" label="Previous"
                        disabled=${atStart} @click=${() => go(index() - 1)}></ui-icon-button>
        <div class=${cls} part="viewport" tabindex="0" ref=${viewportRef}>
          <div class="track" part="track">
            <slot @slotchange=${bump}></slot>
          </div>
        </div>
        <ui-icon-button class="next" part="next" variant="tonal"
                        icon="chevron-right" label="Next"
                        disabled=${atEnd} @click=${() => go(index() + 1)}></ui-icon-button>
      </div>`;
  },
});

export const tag = 'ui-carousel';
export const themeVars = t;
