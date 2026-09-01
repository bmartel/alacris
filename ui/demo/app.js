// <demo-app> — kitchen-sink shell: app bar, rail, drawer, search, side sheet.
//
// Layout chrome is light DOM. Alacris delegates events on the render root and
// skips inner shadows, so wrapping controls in ui-stack / ui-container / ui-card
// swallows @click. Slotted chrome (app-bar actions, search hits, drawer rows)
// uses @click.capture so the host listener fires before that skip.

import { define, html, svg, css, signal, computed, effect, keyed } from '@alacris/core';
import { sys } from '../src/tokens/sys.js';
import { scheme } from '../src/theme/index.js';
import { prefersReducedMotion } from '../src/motion/animate.js';
import { base, focusRingOn } from '../src/components/base.js';
import { slug } from './helpers.js';
import { toggleDark } from './theme-controls.js';
import { bindSearchDock } from './search-dock.js';
import './theme-controls.js';

import '../src/components/ui-text.js';
import '../src/components/ui-icon.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-button.js';
import '../src/components/ui-divider.js';
import '../src/components/ui-app-bar.js';
import '../src/components/ui-nav-rail.js';
import '../src/components/ui-nav-item.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-search.js';
import '../src/components/ui-list-item.js';

import * as tokens from './tokens.js';
import * as basics from './basics.js';
import * as inputs from './inputs.js';
import * as pickers from './pickers.js';
import * as display from './display.js';
import * as feedback from './feedback.js';
import * as navigation from './navigation.js';
import * as structure from './structure.js';

const FAMILIES = [
  { ...tokens, icon: 'tune', rail: 'Tokens',
    blurb: 'Color roles, type, shape, elevation.',
    keywords: 'token theme seed color type typography radius elevation space density motion sys' },
  { ...basics, icon: 'home', rail: 'Basics',
    blurb: 'Buttons, cards, fields, dialogs, type.',
    keywords: 'button card switch field dialog sheet icon typography' },
  { ...inputs, icon: 'keyboard', rail: 'Inputs',
    blurb: 'FAB, toggles, sliders, search.',
    keywords: 'fab checkbox radio slider rating search toggle split' },
  { ...pickers, icon: 'calendar', rail: 'Pickers',
    blurb: 'Select, chips, date and time.',
    keywords: 'select autocomplete chip date time picker' },
  { ...display, icon: 'table-chart', rail: 'Display',
    blurb: 'Lists, tables, avatars, carousels.',
    keywords: 'avatar badge list table tooltip carousel' },
  { ...feedback, icon: 'info', rail: 'Feedback',
    blurb: 'Alerts, progress, snackbars.',
    keywords: 'alert progress spinner skeleton snackbar backdrop' },
  { ...navigation, icon: 'explore', rail: 'Nav',
    blurb: 'Tabs, drawers, app bars, rails.',
    keywords: 'tabs menu drawer app-bar rail toolbar' },
  { ...structure, icon: 'view-column', rail: 'Layout',
    blurb: 'Accordion, stepper, stack, surface.',
    keywords: 'accordion breadcrumbs pagination stepper stack container surface' },
].map((f) => ({ ...f, id: slug(f.title) }));

const METRICS = [
  { value: '69', label: 'Components' },
  { value: '0', label: 'Dependencies' },
  { value: '1', label: 'Seed color' },
];

// Same fractured A as docs/src/assets/logo.svg. Fills keep the seed's hue and
// chroma (`oklch from` primary) and only move lightness — peak up, feet down —
// so a re-seed restyles the two-tone mark without washing it out.
const brandMark = svg`
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path class="peak" d="M16 3 24.55 20.1 17.62 20.1 16 16.86 14.38 20.1 7.45 20.1Z"></path>
    <path class="feet" d="M6.55 21.9 13.48 21.9 9.93 29 3 29ZM18.52 21.9 25.45 21.9 29 29 22.07 29Z"></path>
  </svg>`;

const COMPACT = '(max-width: 839px)';

const hashId = () => {
  try { return location.hash.replace(/^#/, ''); } catch { return ''; }
};

const familyId = (id) => (FAMILIES.some((f) => f.id === id) ? id : '');

const hay = (item) =>
  `${item.title} ${item.blurb} ${item.rail || ''} ${item.keywords}`.toLowerCase();

const styles = css`
  :host {
    display: block;
    min-block-size: 100vh;
    background: ${sys.color.surface};
    color: ${sys.color.onSurface};
    --demo-bar-size: 64px;
  }
  .shell {
    display: flex;
    min-block-size: 100vh;
    padding-block-start: var(--demo-bar-size);
  }
  .pane { flex: 1; min-inline-size: 0; }
  .pane > ui-app-bar {
    position: fixed;
    inset-block-start: 0;
    inset-inline: 0;
  }
  .rail {
    position: sticky;
    inset-block-start: var(--demo-bar-size);
    align-self: flex-start;
    block-size: calc(100vh - var(--demo-bar-size));
    overflow: auto;
    flex: none;
  }
  .hero {
    position: relative;
    padding-block: ${sys.space(12)} ${sys.space(10)};
    background:
      radial-gradient(ellipse 90% 80% at -10% -20%,
        color-mix(in srgb, ${sys.color.primary} 26%, transparent), transparent 58%),
      radial-gradient(ellipse 70% 60% at 110% 0%,
        color-mix(in srgb, ${sys.color.tertiary} 22%, transparent), transparent 52%),
      radial-gradient(ellipse 50% 40% at 50% 110%,
        color-mix(in srgb, ${sys.color.secondaryContainer} 70%, transparent), transparent 55%);
  }
  .hero-inner, .main {
    box-sizing: border-box;
    inline-size: min(100%, 1120px);
    margin-inline: auto;
    padding-inline: ${sys.space(6)};
  }
  .hero-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: ${sys.space(8)};
  }
  .hero-copy { flex: 1.15; min-inline-size: min(100%, 22rem); display: flex; flex-direction: column; gap: ${sys.space(5)}; }
  .search-anchor {
    inline-size: min(100%, 36rem);
    min-block-size: calc(var(--ui-search-height, 56px) + var(--ui-density, 0) * 4px);
  }
  .hero-search { inline-size: 100%; }
  /* Pinned idle is the same search pill, shorter, matching the hero's width —
     not a full-bar trough. In-use (open view) keeps the extra-large overlay. */
  .hero-search.is-pinned {
    margin: 0;
    max-inline-size: none;
    --ui-search-height: 40px;
    --ui-search-font: ${sys.type.bodyMd};
  }
  .bar-mid {
    display: grid;
    align-items: center;
    justify-items: start;
    min-inline-size: 0;
    inline-size: 100%;
    block-size: 40px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: ${sys.space(2)};
    min-inline-size: 0;
    margin: 0;
    padding: ${sys.space(1)} ${sys.space(3)};
    border: none;
    border-radius: ${sys.radius.sm};
    background: transparent;
    color: ${sys.color.primary};
    cursor: pointer;
    font: ${sys.type.titleSm};
    letter-spacing: ${sys.tracking.titleSm};
  }
  ${focusRingOn('.brand')}
  .brand svg {
    flex: none;
    inline-size: 1.75rem;
    block-size: 1.75rem;
  }
  .brand .peak {
    fill: oklch(from ${sys.color.primary} calc(l + 0.06) c h);
  }
  .brand .feet {
    fill: oklch(from ${sys.color.primary} calc(l - 0.16) c h);
  }
  .brand .wordmark {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .search-dock {
    justify-self: stretch;
    inline-size: 100%;
    max-inline-size: 36rem;
    block-size: 40px;
    min-block-size: 40px;
    visibility: hidden;
    pointer-events: none;
  }
  .drawer-brand {
    inline-size: 100%;
    justify-content: flex-start;
    padding: ${sys.space(2)} ${sys.space(3)};
    font: ${sys.type.titleMd};
    letter-spacing: ${sys.tracking.titleMd};
  }
  .drawer-brand svg {
    inline-size: 2rem;
    block-size: 2rem;
  }
  .pills, .cta, .metrics { display: flex; flex-wrap: wrap; gap: ${sys.space(3)}; }
  .pills { gap: ${sys.space(2)}; }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: ${sys.space(1)} ${sys.space(3)};
    border: 1px solid ${sys.color.outlineVariant};
    border-radius: ${sys.radius.sm};
    color: ${sys.color.onSurfaceVariant};
    font: ${sys.type.labelMd};
    letter-spacing: ${sys.tracking.labelMd};
  }
  .metric {
    flex: 1;
    min-inline-size: 7rem;
    padding: ${sys.space(4)};
    background: ${sys.color.surfaceContainer};
    border-radius: ${sys.radius.lg};
  }
  .playground {
    flex: 1;
    min-inline-size: min(100%, 22rem);
    display: flex;
    flex-direction: column;
    gap: ${sys.space(6)};
    padding: ${sys.space(6)};
    background: ${sys.color.surfaceContainerLow};
    border-radius: ${sys.radius.lg};
    box-shadow: ${sys.elevation[1]};
  }
  .playground-head { display: flex; flex-direction: column; gap: ${sys.space(1)}; }
  .section { scroll-margin-block-start: 88px; padding-block: ${sys.space(10)} 0; display: flex; flex-direction: column; gap: ${sys.space(5)}; }
  .demo-block { container-type: inline-size; }
  .token-swatches {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: ${sys.space(4)} ${sys.space(3)};
    min-inline-size: 0;
  }
  @container (min-width: 22rem) {
    .token-swatches { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .token-swatch { min-inline-size: 0; max-inline-size: 100%; }
  .token-swatch .token-name { overflow-wrap: anywhere; }
  /* Fields default to 240px; cards size to content. Grow to fill a wrapping
     row, and fill a stack, so a lone item spans the card. */
  .demo-row > :is(ui-text-field, ui-select, ui-autocomplete, ui-date-picker, ui-time-picker, ui-slider, ui-search, ui-card),
  .demo-col > :is(ui-text-field, ui-select, ui-autocomplete, ui-date-picker, ui-time-picker, ui-slider, ui-search, ui-card) {
    min-inline-size: min(100%, 16rem);
    max-inline-size: 100%;
  }
  .demo-row > :is(ui-text-field, ui-select, ui-autocomplete, ui-date-picker, ui-time-picker, ui-slider, ui-search, ui-card) {
    flex: 1 1 16rem;
  }
  .demo-col > :is(ui-text-field, ui-select, ui-autocomplete, ui-date-picker, ui-time-picker, ui-slider, ui-search, ui-card) {
    inline-size: 100%;
  }
  .footer { padding-block: ${sys.space(12)} ${sys.space(16)}; display: flex; flex-direction: column; gap: ${sys.space(3)}; }
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: ${sys.space(3)};
    inline-size: 100%;
  }
  .icon-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${sys.space(2)};
    padding: ${sys.space(3)};
    border-radius: ${sys.radius.sm};
    background: ${sys.color.surfaceContainer};
    color: ${sys.color.onSurface};
    font: ${sys.type.labelSm};
    text-align: center;
  }
  .icon-cell span {
    max-inline-size: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  h1, h2 { margin: 0; }
`;

define('demo-app', {
  styles: [base, styles],
  setup(_, host) {
    const compact = signal(
      typeof matchMedia === 'function' && matchMedia(COMPACT).matches,
    );
    const drawerOpen = signal(false);
    const themeOpen = signal(false);
    const query = signal('');
    const active = signal(0);
    const arriving = hashId();
    const current = signal(familyId(arriving) || FAMILIES[0].id);
    const searchDocked = signal(!!arriving);
    let searchEl;
    let searchAnchor;
    let searchDock;
    const markDock = (which) => (el) => {
      if (which === 'search') searchEl = el;
      else if (which === 'anchor') searchAnchor = el;
      else searchDock = el;
    };

    const reveal = (id, { smooth = false } = {}) => {
      if (!id) return null;
      const el = host.shadowRoot?.getElementById(id);
      if (!el) return null;
      const sec = el.closest('[data-demo-section]');
      if (sec?.id) current.set(sec.id);
      el.scrollIntoView({
        behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
        block: 'start',
      });
      return el;
    };

    try { history.scrollRestoration = 'manual'; } catch { /* non-browser */ }

    effect(() => {
      if (typeof matchMedia !== 'function') return;
      const mq = matchMedia(COMPACT);
      const on = () => {
        compact.set(mq.matches);
        if (!mq.matches) drawerOpen.set(false);
      };
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    });

    const catalog = signal(FAMILIES);
    let catalogIndexed = false;

    const indexCatalog = () => {
      const root = host.shadowRoot;
      if (!root || catalogIndexed) return;
      const out = [];
      const seen = new Set();
      const add = (item) => {
        if (!item?.id || seen.has(item.id)) return;
        seen.add(item.id);
        out.push(item);
      };
      for (const f of FAMILIES) add(f);
      for (const sec of root.querySelectorAll('[data-demo-section]')) {
        const fam = FAMILIES.find((f) => f.id === sec.id);
        for (const el of sec.querySelectorAll('.demo-block[id]')) {
          const title = el.getAttribute('data-search-title') || el.id;
          add({
            id: el.id,
            title,
            blurb: fam ? fam.title : '',
            icon: fam?.icon || 'search',
            keywords: `${title} ${el.id.replace(/-/g, ' ')} ${fam?.keywords || ''}`,
          });
        }
      }
      catalogIndexed = true;
      catalog.set(out);
    };

    const jump = (id) => {
      if (!id) return;
      drawerOpen.set(false);
      query.set('');
      active.set(0);
      const search = searchEl || host.shadowRoot?.querySelector('.hero-search');
      if (search) search.open = false;
      reveal(id, { smooth: true });
      try { history.replaceState(null, '', '#' + id); } catch { /* non-browser */ }
    };

    const goHome = () => {
      drawerOpen.set(false);
      query.set('');
      active.set(0);
      const search = searchEl || host.shadowRoot?.querySelector('.hero-search');
      if (search) search.open = false;
      current.set(FAMILIES[0].id);
      try { history.replaceState(null, '', location.pathname + location.search); } catch { /* non-browser */ }
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    };

    effect(() => {
      const onHash = () => reveal(hashId());
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    });

    effect(() => {
      let io;
      let stopDock;
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        const restored = !!reveal(hashId());
        let holdIo = restored;
        indexCatalog();
        const els = [...(host.shadowRoot?.querySelectorAll('[data-demo-section]') || [])];
        if (els.length) {
          io = new IntersectionObserver((entries) => {
            if (holdIo) return;
            const hit = entries
              .filter((e) => e.isIntersecting)
              .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (hit?.target?.id) current.set(hit.target.id);
          }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
          for (const el of els) io.observe(el);
        }
        if (holdIo) requestAnimationFrame(() => { holdIo = false; });
        searchEl = searchEl || host.shadowRoot?.querySelector('.hero-search');
        searchAnchor = searchAnchor || host.shadowRoot?.querySelector('.search-anchor');
        searchDock = searchDock || host.shadowRoot?.querySelector('.search-dock');
        if (!searchEl || !searchAnchor || !searchDock) return;
        stopDock = bindSearchDock({
          search: searchEl,
          anchor: searchAnchor,
          dock: searchDock,
          docked: searchDocked,
          restore: restored,
        });
      });
      return () => {
        cancelled = true;
        io?.disconnect();
        stopDock?.();
      };
    });

    const matches = computed(() => {
      const q = query().trim().toLowerCase();
      if (!q) return FAMILIES;
      const words = q.split(/\s+/);
      const found = catalog().filter((item) => {
        const h = hay(item);
        return words.every((w) => h.includes(w));
      });
      found.sort((a, b) => {
        const at = a.title.toLowerCase();
        const bt = b.title.toLowerCase();
        const rank = (t) => (t.startsWith(q) ? 0 : t.includes(q) ? 1 : 2);
        return rank(at) - rank(bt) || at.localeCompare(bt);
      });
      return found;
    });

    effect(() => {
      matches();
      active.set(0);
    });

    const onSearchKey = (e) => {
      const items = matches();
      if (e.key === 'ArrowDown' && items.length) {
        e.preventDefault();
        active.set((active() + 1) % items.length);
      } else if (e.key === 'ArrowUp' && items.length) {
        e.preventDefault();
        active.set((active() - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        jump(items[active()]?.id);
      }
    };

    const rail = () => html`
      <ui-nav-rail class="rail" value=${current} label="Sections"
                   @change.capture=${(e) => jump(e.detail.value)}>
        ${FAMILIES.map((f) => html`
          <ui-nav-item value=${f.id} icon=${f.icon} label=${f.rail}
                       selected=${() => current() === f.id}></ui-nav-item>`)}
      </ui-nav-rail>`;

    const appBar = () => html`
      <ui-app-bar variant="small" scroll-elevate>
        ${() => compact()
          ? html`<ui-icon-button slot="navigation" icon="menu" label="Open navigation"
                                 @click.capture=${() => drawerOpen.set(true)}></ui-icon-button>`
          : html`<button slot="navigation" type="button" class="brand" aria-label="Alacris UI home"
                         @click.capture=${goHome}>
              ${brandMark}
              <span class="wordmark">Alacris UI</span>
            </button>`}
        <div class="bar-mid">
          <div class="search-dock" ref=${markDock('dock')}></div>
        </div>
        <ui-icon-button slot="actions" icon="tune" label="Open theme"
                        @click.capture=${() => themeOpen.set(true)}></ui-icon-button>
        <ui-icon-button slot="actions" class="scheme-toggle"
          icon=${() => (scheme() === 'dark' ? 'dark-mode' : 'light-mode')}
          label=${() => (scheme() === 'dark' ? 'Dark mode' : 'Light mode')}
          @click.capture=${toggleDark}></ui-icon-button>
      </ui-app-bar>`;

    const hero = () => html`
      <div class="hero-inner">
        <div class="hero-copy">
          <div class="pills">
            <span class="pill">ESM-only</span>
            <span class="pill">Zero dependencies</span>
            <span class="pill">Signals, no VDOM</span>
          </div>
          <h1><ui-text variant="display-md">Material defaults. Your system.</ui-text></h1>
          <ui-text variant="body-lg" color="onSurfaceVariant">
            Pick a seed, shape, and density. Color, type, and motion follow
            through one stylesheet — including every control below.
          </ui-text>
          <div class="search-anchor" ref=${markDock('anchor')}>
            <ui-search class="hero-search"
                       presentation="view"
                       label="Jump to a section"
                       placeholder="Buttons, tables, drawers…"
                       value=${query}
                       ref=${markDock('search')}
                       @input=${(e) => {
                         const v = e.detail?.value;
                         if (typeof v === 'string') query.set(v);
                       }}
                       @keydown.capture=${onSearchKey}>
              ${() => {
                const items = matches();
                if (!items.length) {
                  return keyed('empty', html`<ui-list-item headline="No matches"
                    supporting="Try buttons, tables, tokens"></ui-list-item>`);
                }
                return items.map((item, i) => keyed(item.id, html`
                  <ui-list-item interactive headline=${item.title} supporting=${item.blurb}
                                selected=${() => active() === i}
                                @click.capture=${() => jump(item.id)}>
                    <ui-icon slot="leading" name=${item.icon}></ui-icon>
                  </ui-list-item>`));
              }}
            </ui-search>
          </div>
          <div class="cta">
            <ui-button href="https://bmartel.github.io/alacris/ui/getting-started/" target="_blank">
              Docs<ui-icon slot="trailing" name="arrow-forward"></ui-icon>
            </ui-button>
            <ui-button variant="outlined" href="https://github.com/bmartel/alacris" target="_blank">
              GitHub
            </ui-button>
            <ui-button variant="tonal" @click=${() => jump('theme-tokens')}>
              <ui-icon slot="icon" name="tune"></ui-icon>Tokens
            </ui-button>
          </div>
          <div class="metrics">
            ${METRICS.map((m) => html`
              <div class="metric">
                <ui-text variant="headline-sm" color="primary">${m.value}</ui-text>
                <ui-text variant="label-md" color="onSurfaceVariant">${m.label}</ui-text>
              </div>`)}
          </div>
        </div>
        <div class="playground">
          <div class="playground-head">
            <ui-text variant="title-lg">Theme</ui-text>
            <ui-text variant="body-sm" color="onSurfaceVariant">
              Seed, shape, density, and motion. The page restyles as you go.
            </ui-text>
          </div>
          <demo-theme-controls @browse=${() => jump('theme-tokens')}></demo-theme-controls>
        </div>
      </div>`;

    return html`
      <div class="shell">
        ${() => (compact() ? null : rail())}
        <div class="pane">
          ${appBar()}
          <div class="hero">${hero()}</div>
          <div class="main">
            ${FAMILIES.map((f) => html`
              <section class="section" id=${f.id} data-demo-section>
                <div>
                  <h2><ui-text variant="headline-md">${f.title}</ui-text></h2>
                  <ui-text variant="body-md" color="onSurfaceVariant">${f.blurb}</ui-text>
                </div>
                ${f.section()}
              </section>`)}
            <footer class="footer">
              <ui-divider></ui-divider>
              <ui-text variant="body-md" color="onSurfaceVariant">
                Seed, shape, density, and motion are the four knobs.
                Component vars handle the rest.
              </ui-text>
            </footer>
          </div>
        </div>
      </div>
      <ui-drawer open=${drawerOpen} label="Sections"
                 @close=${() => drawerOpen.set(false)}>
        <div style=${{ display: 'flex', flexDirection: 'column', gap: sys.space(2) }}>
          <button type="button" class="brand drawer-brand" aria-label="Alacris UI home"
                  @click.capture=${() => { goHome(); drawerOpen.set(false); }}>
            ${brandMark}
            <span class="wordmark">Alacris UI</span>
          </button>
          ${FAMILIES.map((f) => html`
            <ui-list-item interactive headline=${f.rail} supporting=${f.blurb}
                          selected=${() => current() === f.id}
                          @click.capture=${() => jump(f.id)}>
              <ui-icon slot="leading" name=${f.icon}></ui-icon>
            </ui-list-item>`)}
        </div>
      </ui-drawer>
      <ui-side-sheet open=${themeOpen} label="Theme"
                     @close=${() => themeOpen.set(false)}>
        <span slot="headline">Theme</span>
        <demo-theme-controls
          @browse=${() => { themeOpen.set(false); jump('theme-tokens'); }}></demo-theme-controls>
        <ui-button slot="actions" variant="text"
                   @click.capture=${() => themeOpen.set(false)}>Done</ui-button>
      </ui-side-sheet>`;
  },
});

export const tag = 'demo-app';
