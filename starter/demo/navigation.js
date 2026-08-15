// Demo — Navigation: tabs, menu, drawer, app bar, navigation rail.

import { html, signal } from 'alacris';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-tabs.js';
import '../src/components/ui-menu.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-app-bar.js';
import '../src/components/ui-bottom-app-bar.js';
import '../src/components/ui-toolbar.js';
import '../src/components/ui-nav-rail.js';
import '../src/components/ui-nav-item.js';
import '../src/components/ui-fab.js';
import '../src/components/ui-button.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-divider.js';

export const title = 'Navigation';

const divider = () => html`<ui-divider style="margin-block: var(--ui-space-2)"></ui-divider>`;

export const section = () => {
  const startOpen = signal(false);
  const endOpen = signal(false);
  const standardOpen = signal(true);
  const railDest = signal('home');

  return html`
    ${stackBlock('Tabs', html`
      <ui-tabs value="overview" label="Project sections">
        <ui-tab value="overview" icon="home">Overview</ui-tab>
        <ui-tab value="activity">Activity</ui-tab>
        <ui-tab value="settings" disabled>Settings</ui-tab>
        <ui-tab-panel slot="panels" value="overview">
          Overview panel — arrow keys move and select (automatic activation).
        </ui-tab-panel>
        <ui-tab-panel slot="panels" value="activity">
          Activity panel — fades in when its tab is selected.
        </ui-tab-panel>
        <ui-tab-panel slot="panels" value="settings">
          Settings panel (its tab is disabled, so you should never see this).
        </ui-tab-panel>
      </ui-tabs>`)}

    ${stackBlock('Secondary tabs', html`
      <ui-tabs variant="secondary" value="one" label="Secondary">
        <ui-tab value="one">One</ui-tab>
        <ui-tab value="two">Two</ui-tab>
        <ui-tab value="three">Three</ui-tab>
        <ui-tab-panel slot="panels" value="one">Secondary tabs use a hairline indicator.</ui-tab-panel>
        <ui-tab-panel slot="panels" value="two">Two</ui-tab-panel>
        <ui-tab-panel slot="panels" value="three">Three</ui-tab-panel>
      </ui-tabs>`)}

    ${block('Menu', html`
      <ui-menu placement="bottom-start">
        <ui-icon-button slot="anchor" icon="more-vert" label="More options"></ui-icon-button>
        <ui-menu-item value="edit" icon="edit">Edit<span slot="trailing">⌘E</span></ui-menu-item>
        <ui-menu-item value="duplicate" icon="add">Duplicate<span slot="trailing">⌘D</span></ui-menu-item>
        <ui-menu-item value="share" icon="send" disabled>Share</ui-menu-item>
        ${divider()}
        <ui-menu-item value="delete" icon="delete" danger>Delete<span slot="trailing">⌫</span></ui-menu-item>
      </ui-menu>`)}

    ${block('Modal drawer', html`
      <ui-button variant="tonal" @click=${() => startOpen.set(true)}>Open start drawer</ui-button>
      <ui-button variant="tonal" @click=${() => endOpen.set(true)}>Open end drawer</ui-button>
      <ui-drawer open=${startOpen} anchor="start" label="Main navigation"
                 @close=${() => startOpen.set(false)}>
        <p>Start-anchored modal drawer. Escape or the scrim closes it.</p>
        <ui-button variant="text" @click=${() => startOpen.set(false)}>Close</ui-button>
      </ui-drawer>
      <ui-drawer open=${endOpen} anchor="end" label="Details"
                 @close=${() => endOpen.set(false)}>
        <p>End-anchored modal drawer.</p>
        <ui-button variant="text" @click=${() => endOpen.set(false)}>Close</ui-button>
      </ui-drawer>`)}

    ${stackBlock('Standard drawer (in-flow)', html`
      <ui-button variant="outlined" @click=${() => standardOpen.set(!standardOpen())}>
        Toggle standard drawer
      </ui-button>
      <div style="display: flex; align-items: stretch; gap: var(--ui-space-3); min-block-size: 160px; border: 1px solid var(--ui-color-outline-variant); border-radius: var(--ui-radius-md); overflow: hidden;">
        <ui-drawer variant="standard" open=${standardOpen} anchor="start" label="Sidebar">
          <p>In-flow drawer — animates its width, no scrim, no focus trap.</p>
        </ui-drawer>
        <p style="align-self: center;">Page content sits beside it.</p>
      </div>`)}

    ${stackBlock('Top app bar', html`
      <div style="border: 1px solid var(--ui-color-outline-variant); border-radius: var(--ui-radius-md); overflow: auto; max-block-size: 220px;">
        <ui-app-bar>
          <ui-icon-button slot="navigation" icon="menu" label="Menu"></ui-icon-button>
          Inbox
          <ui-icon-button slot="actions" icon="search" label="Search"></ui-icon-button>
          <ui-icon-button slot="actions" icon="more-vert" label="More"></ui-icon-button>
        </ui-app-bar>
        <div style="padding: var(--ui-space-4); block-size: 400px;">
          Scroll this container — the bar is sticky. (Window-scroll auto-elevation
          is the <code>scroll-elevate</code> prop.)
        </div>
      </div>
      <div style="border: 1px solid var(--ui-color-outline-variant); border-radius: var(--ui-radius-md); overflow: hidden;">
        <ui-app-bar variant="large" elevated>
          <ui-icon-button slot="navigation" icon="arrow-back" label="Back"></ui-icon-button>
          Large headline
          <ui-icon-button slot="actions" icon="settings" label="Settings"></ui-icon-button>
        </ui-app-bar>
      </div>`)}

    ${stackBlock('Navigation rail', html`
      <div style="display:flex; min-block-size: 280px; border: 1px solid var(--ui-color-outline-variant); border-radius: var(--ui-radius-md); overflow: hidden;">
        <ui-nav-rail value=${railDest} @change=${(e) => railDest(e.detail.value)} label="Main">
          <ui-icon-button slot="menu" icon="menu" label="Menu"></ui-icon-button>
          <ui-fab slot="fab" icon="add"></ui-fab>
          <ui-nav-item value="home" icon="home" label="Home"></ui-nav-item>
          <ui-nav-item value="search" icon="search" label="Search"></ui-nav-item>
          <ui-nav-item value="favorites" icon="star-border" active-icon="star" label="Favorites"></ui-nav-item>
          <ui-nav-item value="settings" icon="settings" label="Settings"></ui-nav-item>
        </ui-nav-rail>
        <p style="align-self:center; padding: var(--ui-space-4);">destination: ${railDest}</p>
      </div>`)}

    ${stackBlock('Bottom app bar', html`
      <ui-bottom-app-bar>
        <ui-icon-button slot="navigation" icon="menu" label="Menu"></ui-icon-button>
        <ui-fab slot="fab" icon="add"></ui-fab>
        <ui-icon-button slot="actions" icon="search" label="Search"></ui-icon-button>
        <ui-icon-button slot="actions" icon="more-vert" label="More"></ui-icon-button>
      </ui-bottom-app-bar>`)}

    ${block('Toolbar', html`
      <ui-toolbar label="Selection">
        <ui-icon-button icon="edit" label="Edit"></ui-icon-button>
        <ui-icon-button icon="delete" label="Delete"></ui-icon-button>
        <ui-icon-button icon="send" label="Share"></ui-icon-button>
        <ui-fab slot="fab" icon="add" size="sm"></ui-fab>
      </ui-toolbar>`)}`;
};
