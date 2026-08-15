// Demo — data display family: avatar, badge, divider, list, table, tooltip.

import { html } from 'alacris';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-avatar.js';
import '../src/components/ui-badge.js';
import '../src/components/ui-divider.js';
import '../src/components/ui-list.js';
import '../src/components/ui-list-item.js';
import '../src/components/ui-table.js';
import '../src/components/ui-tooltip.js';
import '../src/components/ui-carousel.js';
import '../src/components/ui-carousel-item.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-button.js';
import '../src/components/ui-card.js';
import '../src/components/ui-text.js';

// A tiny self-contained portrait so the image avatar works offline.
const portrait =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
  '<rect width="40" height="40" fill="%236750a4"/>' +
  '<circle cx="20" cy="15" r="7" fill="%23e8def8"/>' +
  '<ellipse cx="20" cy="33" rx="13" ry="9" fill="%23e8def8"/></svg>';

export const title = 'Data display';

export const section = () => html`
  ${block('Avatars', html`
    <ui-avatar src=${portrait} label="Portrait of Ada Lovelace"></ui-avatar>
    <ui-avatar name="Ada Lovelace"></ui-avatar>
    <ui-avatar name="Grace Hopper" size="56px"></ui-avatar>
    <ui-avatar icon="person" label="Guest"></ui-avatar>
    <ui-avatar name="Margaret Hamilton" size="24px"></ui-avatar>
    <ui-avatar name="Katherine Johnson" size="64px"></ui-avatar>`)}

  ${block('Badges', html`
    <ui-badge value="3" label="3 unread">
      <ui-icon-button icon="menu" label="Inbox"></ui-icon-button>
    </ui-badge>
    <ui-badge value="1287" max="999" label="Over 999 notifications">
      <ui-icon-button icon="settings" label="Notifications"></ui-icon-button>
    </ui-badge>
    <ui-badge dot label="New activity">
      <ui-icon-button icon="favorite" label="Activity"></ui-icon-button>
    </ui-badge>
    <ui-badge value="7" label="7 tasks">
      <ui-avatar name="Ada Lovelace"></ui-avatar>
    </ui-badge>`)}

  ${stackBlock('Dividers', html`
    <ui-card variant="outlined">
      <ui-text variant="body-md">Full width below</ui-text>
      <ui-divider></ui-divider>
      <ui-text variant="body-md">Inset below</ui-text>
      <ui-divider inset></ui-divider>
      <ui-text variant="body-md">Middle below</ui-text>
      <ui-divider middle></ui-divider>
      <div style="display:flex; align-items:center; gap:12px; padding-block:8px;">
        <ui-text variant="body-md">Left</ui-text>
        <ui-divider orientation="vertical"></ui-divider>
        <ui-text variant="body-md">Right</ui-text>
      </div>
    </ui-card>`)}

  ${stackBlock('List', html`
    <ui-card variant="outlined" style="--ui-card-padding: 0;">
      <ui-list label="Recent conversations">
        <ui-list-item interactive selected
                      headline="Ada Lovelace"
                      supporting="Notes on the Analytical Engine">
          <ui-avatar slot="leading" name="Ada Lovelace"></ui-avatar>
          <span slot="trailing">17:45</span>
        </ui-list-item>
        <ui-list-item interactive
                      headline="Grace Hopper"
                      supporting="The compiler draft is ready for review">
          <ui-avatar slot="leading" name="Grace Hopper"></ui-avatar>
          <span slot="trailing">15:12</span>
        </ui-list-item>
        <ui-divider inset></ui-divider>
        <ui-list-item interactive headline="Archived">
          <ui-avatar slot="leading" icon="person" label=""></ui-avatar>
          <span slot="trailing">12</span>
        </ui-list-item>
        <ui-list-item disabled interactive headline="Deactivated account"
                      supporting="This contact is no longer available">
          <ui-avatar slot="leading" icon="person" label=""></ui-avatar>
        </ui-list-item>
      </ui-list>
    </ui-card>`)}

  ${stackBlock('Table', html`
    <ui-card variant="outlined" style="--ui-card-padding: 0;">
      <ui-table>
        <table>
          <thead>
            <tr><th>Dessert</th><th>Calories</th><th>Fat (g)</th><th>Carbs (g)</th><th>Protein (g)</th></tr>
          </thead>
          <tbody>
            <tr><td>Frozen yogurt</td><td>159</td><td>6.0</td><td>24</td><td>4.0</td></tr>
            <tr><td>Ice cream sandwich</td><td>237</td><td>9.0</td><td>37</td><td>4.3</td></tr>
            <tr><td>Eclair</td><td>262</td><td>16.0</td><td>24</td><td>6.0</td></tr>
            <tr><td>Cupcake</td><td>305</td><td>3.7</td><td>67</td><td>4.3</td></tr>
            <tr><td>Gingerbread</td><td>356</td><td>16.0</td><td>49</td><td>3.9</td></tr>
          </tbody>
        </table>
      </ui-table>
    </ui-card>`)}

  ${block('Tooltips', html`
    <ui-tooltip text="Tooltip on top" position="top">
      <ui-button variant="tonal">Top</ui-button>
    </ui-tooltip>
    <ui-tooltip text="Tooltip on bottom" position="bottom">
      <ui-button variant="tonal">Bottom</ui-button>
    </ui-tooltip>
    <ui-tooltip text="Tooltip on left" position="left">
      <ui-button variant="tonal">Left</ui-button>
    </ui-tooltip>
    <ui-tooltip text="Tooltip on right" position="right">
      <ui-button variant="tonal">Right</ui-button>
    </ui-tooltip>
    <ui-tooltip rich position="bottom">
      <div slot="content">
        <ui-text variant="title-sm">Rich tooltip</ui-text>
        <ui-text variant="body-sm" color="onSurfaceVariant">
          Supporting text with more detail than a plain tooltip can carry.
        </ui-text>
      </div>
      <ui-button variant="outlined">Rich</ui-button>
    </ui-tooltip>`)}

  ${stackBlock('Carousel', html`
    <ui-carousel label="Photos" style="max-inline-size: 480px">
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">One</ui-text>
          <ui-text variant="body-sm" color="onSurfaceVariant">Multi-browse slide</ui-text>
        </div>
      </ui-carousel-item>
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">Two</ui-text>
        </div>
      </ui-carousel-item>
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">Three</ui-text>
        </div>
      </ui-carousel-item>
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">Four</ui-text>
        </div>
      </ui-carousel-item>
    </ui-carousel>
    <ui-carousel label="Hero photos" variant="hero" style="max-inline-size: 480px">
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">Hero</ui-text>
          <ui-text variant="body-sm" color="onSurfaceVariant">Selected slide dominates</ui-text>
        </div>
      </ui-carousel-item>
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">Next</ui-text>
        </div>
      </ui-carousel-item>
      <ui-carousel-item>
        <div style="padding: 24px; min-block-size: 160px">
          <ui-text variant="title-md">After</ui-text>
        </div>
      </ui-carousel-item>
    </ui-carousel>`)}
`;
