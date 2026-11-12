// <ui-tabs> — Material tabs: a tab bar with an animated active indicator.
//
//   <ui-tabs value="one" label="Demo tabs" @change=${(e) => ...}>
//     <ui-tab value="one" icon="home">One</ui-tab>
//     <ui-tab value="two">Two</ui-tab>
//     <ui-tab-panel slot="panels" value="one">…</ui-tab-panel>
//     <ui-tab-panel slot="panels" value="two">…</ui-tab-panel>
//   </ui-tabs>
//
// Tabs go in the default slot, panels in the "panels" slot. The parent
// reflects `selected` onto each <ui-tab> and `active` onto each
// <ui-tab-panel>, and wires aria-controls/aria-labelledby ids between them.
// Activation is AUTOMATIC per the ARIA APG: arrow keys move focus AND select
// (one Tab stop for the whole bar via roving tabindex).
//
// More tabs than fit: the bar scrolls horizontally (no scrollbar) instead of
// widening the page, and selecting a tab scrolls it fully into view. The
// indicator is positioned in the bar's scroll coordinates, so it stays under
// its tab while the bar scrolls, and it is re-measured whenever the bar or
// the selected tab changes size (late fonts, a count appearing in a label).
//
// `change` here means "the selected tab changed". Controls inside a panel
// (a <ui-switch>, a <ui-select>) emit their own bubbling `change`, and those
// pass through this element like any DOM event. A handler on <ui-tabs> that
// must only see tab changes checks `e.target === e.currentTarget`.
//
// @prop  {string} value='' — the selected tab's value
// @prop  {string} variant='primary' — primary | secondary
// @prop  {string} label='' — accessible name for the tablist
// @event change — user selected a tab; detail: { value }
// @slot  (default) — <ui-tab> children
// @slot  panels    — <ui-tab-panel> children
// @part  tablist, indicator
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, signal, effect, onCleanup } from '@alacris/core';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import { rovingTabindex } from '../util/keys.js';
import './ui-tab.js';
import './ui-tab-panel.js';

const t = vars('ui-tabs', {
  indicator: sys.color.primary,
  indicatorHeight: '3px',
  divider: sys.color.outlineVariant,
});

const styles = css`
  :host { display: block; position: relative; }
  .tablist {
    position: relative;
    display: flex;
    align-items: stretch;
    border-block-end: 1px solid ${t.divider};
    /* Too many tabs scroll inside the bar rather than overflowing the page. */
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }
  .tablist::-webkit-scrollbar { display: none; }
  /* A tab keeps its natural width; the bar scrolls instead of squeezing it. */
  ::slotted(ui-tab) { flex: none; }
  .indicator {
    position: absolute;
    inset-block-end: 0;
    /* Physical on purpose: the indicator is moved by the selected tab's
       physical x offset (translateX), so it is anchored at the left edge in
       both directions. */
    left: 0;
    block-size: ${t.indicatorHeight};
    background: ${t.indicator};
    border-start-start-radius: ${t.indicatorHeight};
    border-start-end-radius: ${t.indicatorHeight};
    pointer-events: none;
    transition: transform ${sys.duration.medium2} ${sys.easing.emphasized},
                width ${sys.duration.medium2} ${sys.easing.emphasized},
                opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .secondary .indicator {
    block-size: 2px;
    border-radius: 0;
    background: ${sys.color.onSurface};
  }
`;

let uid = 0;

define('ui-tabs', {
  props: { value: '', variant: 'primary', label: '' },
  styles: [base, styles],
  setup({ value, variant, label }, host) {
    const id = ++uid;
    let seq = 0;
    const rev = signal(0); // bumped on slotchange so syncs re-run
    const bump = () => rev.update((n) => n + 1);

    const tabsOf = () => [...host.querySelectorAll('ui-tab')];
    const panelsOf = () => [...host.querySelectorAll('ui-tab-panel')];

    const select = (v) => {
      if (v === undefined || v === value.peek()) return;
      value.set(v);
      host.emit('change', { value: v });
    };

    // Selection made by a tab (click / Enter / Space).
    host.addEventListener('ui-tab-select', (e) => {
      e.stopPropagation();
      select(e.detail.value);
    });

    // Automatic activation: arrows move focus and select.
    const roving = rovingTabindex(host, {
      selector: 'ui-tab',
      orientation: 'horizontal',
      skip: (el) => el.disabled,
      onMove: (el) => select(el.value),
    });
    onCleanup(() => roving.destroy());

    // Reflect selection down and keep the ARIA wiring current.
    effect(() => {
      const v = value();
      rev();
      const tabs = tabsOf();
      const panels = panelsOf();
      let hasStop = false;
      for (const tab of tabs) {
        const on = tab.value === v;
        tab.selected = on;
        tab.tabIndex = on && !tab.disabled ? 0 : -1;
        if (on && !tab.disabled) hasStop = true;
        // Ids come from a counter, never from `value`: this can run before a
        // tab has upgraded (value still undefined, so every tab got the same
        // id and aria-controls pointed nowhere), and a value may hold
        // characters an IDREF cannot.
        if (!tab.id) tab.id = `ui-tab-${id}-${++seq}`;
      }
      if (!hasStop) {
        const first = tabs.find((el) => !el.disabled);
        if (first) first.tabIndex = 0;
      }
      for (const panel of panels) {
        panel.active = panel.value === v;
        if (!panel.id) panel.id = `ui-tab-panel-${id}-${++seq}`;
        // Before upgrade neither side has a value yet; pairing undefined with
        // undefined wired every panel to the first tab.
        const tab = panel.value === undefined ? null : tabs.find((el) => el.value === panel.value);
        if (tab) {
          tab.setAttribute('aria-controls', panel.id);
          panel.setAttribute('aria-labelledby', tab.id);
        }
      }
    });

    // Animated indicator: measure the selected tab in the host's coordinate
    // space. Zero sizes (simulated DOM, display:none) hide the bar instead of
    // animating to garbage.
    const ix = signal(0);
    const iw = signal(0);
    let tablistEl = null;
    // Both variants measure viewport rects and convert to the bar's scroll
    // coordinates (the indicator is a child of the scrolling bar, so it must
    // be placed where its tab sits in the scrolled content, not on screen).
    // scrollLeft is negative in RTL, which is exactly the correction needed
    // for an indicator anchored at the physical left edge.
    const measure = () => {
      const tab = tabsOf().find((el) => el.selected);
      if (!tab || !tablistEl) { iw.set(0); return; }
      const target = variant.peek() === 'primary'
        ? tab.shadowRoot?.querySelector('.inner') || tab
        : tab;
      const listRect = tablistEl.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      if (!r.width) { iw.set(0); return; }
      ix.set(r.left - listRect.left + (tablistEl.scrollLeft || 0));
      iw.set(r.width);
    };

    // Bring the selected tab fully into the bar. Only the bar scrolls: a
    // scrollIntoView() would also move the page when the bar is off screen.
    const reveal = () => {
      const tab = tabsOf().find((el) => el.selected);
      if (!tab || !tablistEl || tablistEl.scrollWidth <= tablistEl.clientWidth) return;
      const listRect = tablistEl.getBoundingClientRect();
      const r = tab.getBoundingClientRect();
      const delta = r.left < listRect.left
        ? r.left - listRect.left
        : r.right > listRect.right ? r.right - listRect.right : 0;
      if (delta) tablistEl.scrollBy?.({ left: delta, behavior: 'auto' });
    };

    // The first measurement can run before the tabs have laid out (their own
    // templates, a webfont), which left the indicator a few pixels wide until
    // something else re-measured. Observing sizes makes it self-correcting.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measure()) : null;
    let observed = [];
    const observe = () => {
      if (!ro) return;
      for (const el of observed) ro.unobserve(el);
      observed = [tablistEl, ...tabsOf()].filter(Boolean);
      for (const el of observed) ro.observe(el);
    };
    onCleanup(() => ro?.disconnect());

    effect(() => {
      value();
      rev();
      queueMicrotask(() => {
        observe();
        reveal();
        measure();
      });
    });
    effect(() => {
      window.addEventListener('resize', measure, { passive: true });
      return () => window.removeEventListener('resize', measure);
    });

    return html`
      <div class=${() => `tablist ${variant()}`} part="tablist" role="tablist" aria-label=${() => label() || null}
           ref=${(el) => (tablistEl = el)}>
        <slot @slotchange=${bump}></slot>
        <span class="indicator" part="indicator" aria-hidden="true"
              style=${() => ({
                transform: `translateX(${ix()}px)`,
                width: `${iw()}px`,
                opacity: iw() ? '1' : '0',
              })}></span>
      </div>
      <slot name="panels" @slotchange=${bump}></slot>`;
  },
});

export const tag = 'ui-tabs';
export const themeVars = t;
