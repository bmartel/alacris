// <demo-app> — the kitchen-sink page, composed from the design system it
// documents. App bar, navigation rail, modal drawer, search, side sheet,
// stack, container, card, surface — the layout is the product.

import { define, html, css, signal, computed, effect } from 'alacris';
import { sys } from '../src/tokens/sys.js';
import { scheme } from '../src/theme/index.js';
import { prefersReducedMotion } from '../src/motion/animate.js';
import { base } from '../src/components/base.js';
import { slug } from './helpers.js';
import { toggleDark } from './theme-controls.js';
import './theme-controls.js';

import '../src/components/ui-text.js';
import '../src/components/ui-icon.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-button.js';
import '../src/components/ui-stack.js';
import '../src/components/ui-container.js';
import '../src/components/ui-surface.js';
import '../src/components/ui-card.js';
import '../src/components/ui-divider.js';
import '../src/components/ui-app-bar.js';
import '../src/components/ui-nav-rail.js';
import '../src/components/ui-nav-item.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-search.js';
import '../src/components/ui-list-item.js';
import '../src/components/ui-fab.js';
import '../src/components/ui-chip.js';
import '../src/components/ui-avatar.js';
import '../src/components/ui-badge.js';
import '../src/components/ui-list.js';

import * as basics from './basics.js';
import * as inputs from './inputs.js';
import * as pickers from './pickers.js';
import * as display from './display.js';
import * as feedback from './feedback.js';
import * as navigation from './navigation.js';
import * as structure from './structure.js';

const FAMILIES = [
  { ...basics, icon: 'home', rail: 'Basics',
    blurb: 'Buttons, cards, fields, dialogs, type.',
    keywords: 'button card switch field dialog sheet icon typography' },
  { ...inputs, icon: 'keyboard', rail: 'Inputs',
    blurb: 'FAB, toggles, sliders, search.',
    keywords: 'fab checkbox radio slider rating search toggle split' },
  { ...pickers, icon: 'calendar', rail: 'Pickers',
    blurb: 'Select, chips, date and time.',
    keywords: 'select autocomplete chip date time picker' },
  { ...display, icon: 'table-rows', rail: 'Display',
    blurb: 'Lists, tables, avatars, carousels.',
    keywords: 'avatar badge list table tooltip carousel' },
  { ...feedback, icon: 'info', rail: 'Feedback',
    blurb: 'Alerts, progress, snackbars.',
    keywords: 'alert progress spinner skeleton snackbar backdrop' },
  { ...navigation, icon: 'menu', rail: 'Nav',
    blurb: 'Tabs, drawers, app bars, rails.',
    keywords: 'tabs menu drawer app-bar rail toolbar' },
  { ...structure, icon: 'view-column', rail: 'Layout',
    blurb: 'Accordion, stepper, stack, surface.',
    keywords: 'accordion breadcrumbs pagination stepper stack container surface' },
].map((f) => ({ ...f, id: slug(f.title) }));

const METRICS = [
  { value: '68', label: 'Components' },
  { value: '0', label: 'Dependencies' },
  { value: '1', label: 'Seed color' },
];

const COMPACT = '(max-width: 839px)';

const styles = css`
  :host {
    display: block;
    min-block-size: 100vh;
    background: ${sys.color.surface};
    color: ${sys.color.onSurface};
  }
  .shell { min-block-size: 100vh; }
  .rail {
    position: sticky;
    inset-block-start: 0;
    align-self: flex-start;
    block-size: 100vh;
    overflow: auto;
    flex: none;
  }
  .pane { flex: 1; min-inline-size: 0; }
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
  .hero-copy { flex: 1.15; min-inline-size: min(100%, 22rem); }
  .hero-stage { flex: 1; min-inline-size: min(100%, 22rem); }
  .hero-search { inline-size: min(100%, 36rem); }
  .metric {
    flex: 1;
    min-inline-size: 7rem;
    padding: ${sys.space(4)};
  }
  .section { scroll-margin-block-start: 88px; padding-block: ${sys.space(10)} 0; }
  .footer { padding-block: ${sys.space(12)} ${sys.space(16)}; }
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
    const current = signal(FAMILIES[0].id);

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

    const jump = (id) => {
      current.set(id);
      drawerOpen.set(false);
      query.set('');
      const search = host.shadowRoot?.querySelector('ui-search');
      if (search) search.open = false;
      host.shadowRoot?.getElementById(id)?.scrollIntoView?.({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
      try { history.replaceState(null, '', '#' + id); } catch { /* non-browser */ }
    };

    effect(() => {
      let cancelled = false;
      const onHash = () => {
        if (cancelled) return;
        let id = '';
        try { id = location.hash.slice(1); } catch { return; }
        if (!id) return;
        current.set(id);
        host.shadowRoot?.getElementById(id)?.scrollIntoView?.({ block: 'start' });
      };
      queueMicrotask(onHash);
      window.addEventListener('hashchange', onHash);
      return () => {
        cancelled = true;
        window.removeEventListener('hashchange', onHash);
      };
    });

    effect(() => {
      let io;
      const start = () => {
        const els = [...(host.shadowRoot?.querySelectorAll('[data-demo-section]') || [])];
        if (!els.length) return;
        io = new IntersectionObserver((entries) => {
          const hit = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (hit?.target?.id) current.set(hit.target.id);
        }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
        for (const el of els) io.observe(el);
      };
      queueMicrotask(start);
      return () => io?.disconnect();
    });

    const matches = computed(() => {
      const q = query().trim().toLowerCase();
      if (!q) return FAMILIES;
      return FAMILIES.filter((f) =>
        f.title.toLowerCase().includes(q) ||
        f.blurb.toLowerCase().includes(q) ||
        f.rail.toLowerCase().includes(q) ||
        f.keywords.includes(q),
      );
    });

    const rail = () => html`
      <ui-nav-rail class="rail" value=${current} label="Sections"
                   style="position:sticky;inset-block-start:0;align-self:flex-start;block-size:100vh;overflow:auto;flex:none"
                   @change=${(e) => jump(e.detail.value)}>
        <ui-fab slot="fab" icon="palette" size="sm"
                @click=${() => themeOpen.set(true)}></ui-fab>
        ${FAMILIES.map((f) => html`
          <ui-nav-item value=${f.id} icon=${f.icon} label=${f.rail}></ui-nav-item>`)}
      </ui-nav-rail>`;

    const appBar = () => html`
      <ui-app-bar variant="small" scroll-elevate>
        ${() => compact()
          ? html`<ui-icon-button slot="navigation" icon="menu" label="Open navigation"
                                 @click=${() => drawerOpen.set(true)}></ui-icon-button>`
          : null}
        Alacris UI
        <ui-icon-button slot="actions" icon="palette" label="Theme playground"
                        @click=${() => themeOpen.set(true)}></ui-icon-button>
        <ui-icon-button slot="actions"
          icon=${() => (scheme() === 'dark' ? 'light-mode' : 'dark-mode')}
          label=${() => (scheme() === 'dark' ? 'Switch to light' : 'Switch to dark')}
          @click=${toggleDark}></ui-icon-button>
      </ui-app-bar>`;

    const hero = () => html`
      <ui-container size="lg">
        <ui-stack direction="row" gap="8" wrap align="flex-start">
          <ui-stack class="hero-copy" gap="5">
            <ui-stack direction="row" gap="2" wrap>
              <ui-chip variant="assist">ESM-only</ui-chip>
              <ui-chip variant="assist">Zero dependencies</ui-chip>
              <ui-chip variant="assist">Signals, no VDOM</ui-chip>
            </ui-stack>
            <h1><ui-text variant="display-md">A design system that is the demo.</ui-text></h1>
            <ui-text variant="body-lg" color="onSurfaceVariant">
              Every surface on this page — the rail, the bar, this hero, the
              playground — is an Alacris component. One seed color rewrites one
              stylesheet. Nothing re-renders.
            </ui-text>
            <ui-search class="hero-search" presentation="view"
                       style="inline-size:min(100%,36rem)"
                       label="Jump to a section"
                       placeholder="Buttons, tables, drawers…"
                       value=${query}
                       @input=${(e) => query.set(e.detail.value ?? '')}>
              ${() => {
                const items = matches();
                if (!items.length) {
                  return html`<ui-list-item headline="No matches"
                    supporting="Try buttons, tables, drawers"></ui-list-item>`;
                }
                return items.map((f) => html`
                  <ui-list-item interactive headline=${f.title} supporting=${f.blurb}
                                @click=${() => jump(f.id)}>
                    <ui-icon slot="leading" name=${f.icon}></ui-icon>
                  </ui-list-item>`);
              }}
            </ui-search>
            <ui-stack direction="row" gap="3" wrap>
              <ui-button href="https://bmartel.github.io/alacris/" target="_blank">
                Docs<ui-icon slot="trailing" name="arrow-forward"></ui-icon>
              </ui-button>
              <ui-button variant="outlined" href="https://github.com/bmartel/alacris" target="_blank">
                GitHub
              </ui-button>
              <ui-button variant="tonal" @click=${() => themeOpen.set(true)}>
                <ui-icon slot="icon" name="palette"></ui-icon>Theme
              </ui-button>
            </ui-stack>
            <ui-stack direction="row" gap="3" wrap>
              ${METRICS.map((m) => html`
                <ui-surface class="metric" bg="surfaceContainer" radius="lg">
                  <ui-text variant="headline-sm" color="primary">${m.value}</ui-text>
                  <ui-text variant="label-md" color="onSurfaceVariant">${m.label}</ui-text>
                </ui-surface>`)}
            </ui-stack>
          </ui-stack>
          <ui-card class="hero-stage">
            <ui-stack gap="4">
              <ui-stack direction="row" gap="3" align="center" justify="space-between">
                <ui-text variant="title-md">Live playground</ui-text>
                <ui-chip variant="suggestion">re-theme, don't re-render</ui-chip>
              </ui-stack>
              <demo-theme-controls></demo-theme-controls>
              <ui-divider></ui-divider>
              <ui-list label="Live preview">
                <ui-list-item headline="Theme tokens" supporting="One stylesheet write" interactive>
                  <ui-avatar slot="leading" name="Ada Lovelace"></ui-avatar>
                  <ui-chip slot="trailing" variant="suggestion">live</ui-chip>
                </ui-list-item>
                <ui-list-item headline="Fine-grained DOM" supporting="A changed signal writes one node" interactive>
                  <ui-badge slot="leading" value="3" label="3 unread">
                    <ui-avatar name="Grace Hopper"></ui-avatar>
                  </ui-badge>
                </ui-list-item>
                <ui-list-item headline="Form-associated" supporting="Submits like a native field" interactive>
                  <ui-avatar slot="leading" name="Alan Turing"></ui-avatar>
                  <ui-icon slot="trailing" name="check-circle"></ui-icon>
                </ui-list-item>
              </ui-list>
              <ui-stack direction="row" gap="2" justify="end">
                <ui-button variant="text">Dismiss</ui-button>
                <ui-button>Compose</ui-button>
              </ui-stack>
            </ui-stack>
          </ui-card>
        </ui-stack>
      </ui-container>`;

    return html`
      <ui-stack class="shell" direction="row" gap="0px">
        ${() => (compact() ? null : rail())}
        <ui-stack class="pane" gap="0px">
          ${appBar()}
          <div class="hero">${hero()}</div>
          <ui-container size="lg">
            ${FAMILIES.map((f) => html`
              <section class="section" id=${f.id} data-demo-section>
                <ui-stack gap="5">
                  <ui-stack gap="1">
                    <h2><ui-text variant="headline-md">${f.title}</ui-text></h2>
                    <ui-text variant="body-md" color="onSurfaceVariant">${f.blurb}</ui-text>
                  </ui-stack>
                  ${f.section()}
                </ui-stack>
              </section>`)}
            <footer class="footer">
              <ui-stack gap="3">
                <ui-divider></ui-divider>
                <ui-text variant="body-md" color="onSurfaceVariant">
                  This page is built with the same components it documents.
                  Change the seed — the rail, the type, this sentence, every
                  control below — follow from one stylesheet write.
                </ui-text>
              </ui-stack>
            </footer>
          </ui-container>
        </ui-stack>
      </ui-stack>
      <ui-drawer open=${drawerOpen} label="Sections"
                 @close=${() => drawerOpen.set(false)}>
        <ui-stack gap="2">
          <ui-text variant="title-lg" style=${{ padding: sys.space(3) }}>Alacris UI</ui-text>
          <ui-list label="Sections">
            ${FAMILIES.map((f) => html`
              <ui-list-item interactive headline=${f.rail} supporting=${f.blurb}
                            selected=${() => current() === f.id}
                            @click=${() => jump(f.id)}>
                <ui-icon slot="leading" name=${f.icon}></ui-icon>
              </ui-list-item>`)}
          </ui-list>
        </ui-stack>
      </ui-drawer>
      <ui-side-sheet open=${themeOpen} label="Theme"
                     @close=${() => themeOpen.set(false)}>
        <span slot="headline">Theme</span>
        <demo-theme-controls></demo-theme-controls>
        <ui-button slot="actions" variant="text" @click=${() => themeOpen.set(false)}>Done</ui-button>
      </ui-side-sheet>`;
  },
});

export const tag = 'demo-app';
