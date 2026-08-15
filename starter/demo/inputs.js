// Demo — Inputs & actions: FAB, button groups, segmented buttons, checkbox,
// radio, slider, rating, search.

import { html, signal } from '@alacris/core';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-button.js';
import '../src/components/ui-fab.js';
import '../src/components/ui-button-group.js';
import '../src/components/ui-toggle-button.js';
import '../src/components/ui-toggle-group.js';
import '../src/components/ui-checkbox.js';
import '../src/components/ui-radio.js';
import '../src/components/ui-radio-group.js';
import '../src/components/ui-slider.js';
import '../src/components/ui-rating.js';
import '../src/components/ui-search.js';
import '../src/components/ui-split-button.js';
import '../src/components/ui-menu-item.js';
import '../src/components/ui-fab-menu.js';
import '../src/components/ui-text.js';

export const title = 'Inputs & actions';

export const section = () => {
  const alignment = signal('center');
  const toppings = signal(['cheese']);
  const volume = signal(30);
  const rangeStart = signal(20);
  const rangeEnd = signal(80);
  const query = signal('');
  const filesQuery = signal('');

  return html`
    ${block('FAB — variants', html`
      <ui-fab icon="add"></ui-fab>
      <ui-fab icon="edit" variant="secondary"></ui-fab>
      <ui-fab icon="favorite" variant="tertiary"></ui-fab>
      <ui-fab icon="search" variant="surface"></ui-fab>
      <ui-fab icon="add" disabled></ui-fab>
    `)}

    ${block('FAB — sizes and extended', html`
      <ui-fab icon="add" size="sm"></ui-fab>
      <ui-fab icon="add" size="md"></ui-fab>
      <ui-fab icon="add" size="lg"></ui-fab>
      <ui-fab icon="edit" label="Compose"></ui-fab>
      <ui-fab icon="send" variant="secondary" label="Send" disabled></ui-fab>
    `)}

    ${block('FAB menu', html`
      <ui-fab-menu label="Compose">
        <ui-fab slot="trigger" icon="add"></ui-fab>
        <ui-fab icon="edit" label="Edit" size="sm"></ui-fab>
        <ui-fab icon="send" label="Send" size="sm" variant="secondary"></ui-fab>
      </ui-fab-menu>
    `)}

    ${block('Split button', html`
      <ui-split-button>
        Save
        <ui-menu-item slot="menu" value="draft">Save draft</ui-menu-item>
        <ui-menu-item slot="menu" value="copy">Save a copy</ui-menu-item>
      </ui-split-button>
      <ui-split-button variant="tonal">
        Export
        <ui-menu-item slot="menu" value="pdf">PDF</ui-menu-item>
        <ui-menu-item slot="menu" value="csv">CSV</ui-menu-item>
      </ui-split-button>
    `)}

    ${block('Button group', html`
      <ui-button-group label="Playback">
        <ui-button>Play</ui-button>
        <ui-button>Pause</ui-button>
        <ui-button>Stop</ui-button>
      </ui-button-group>
      <ui-button-group label="Steps">
        <ui-button variant="tonal">One</ui-button>
        <ui-button variant="tonal">Two</ui-button>
      </ui-button-group>
    `)}

    ${block('Toggle group — single select', html`
      <ui-toggle-group label="Alignment" value=${alignment}
                       @change=${(e) => alignment.set(e.detail.value)}>
        <ui-toggle-button value="left">Left</ui-toggle-button>
        <ui-toggle-button value="center">Center</ui-toggle-button>
        <ui-toggle-button value="right">Right</ui-toggle-button>
      </ui-toggle-group>
      <span>selected: ${() => alignment() || '(none)'}</span>
    `)}

    ${block('Toggle group — multi select, icons, disabled', html`
      <ui-toggle-group label="Toppings" multi value=${toppings}
                       @change=${(e) => toppings.set(e.detail.value)}>
        <ui-toggle-button value="cheese" icon="favorite">Cheese</ui-toggle-button>
        <ui-toggle-button value="olives" icon="star">Olives</ui-toggle-button>
        <ui-toggle-button value="basil" icon="check-circle">Basil</ui-toggle-button>
      </ui-toggle-group>
      <ui-toggle-group label="Disabled" value="a" disabled>
        <ui-toggle-button value="a">On</ui-toggle-button>
        <ui-toggle-button value="b">Off</ui-toggle-button>
      </ui-toggle-group>
    `)}

    ${block('Checkbox', html`
      <ui-checkbox label="Unchecked"></ui-checkbox>
      <ui-checkbox label="Checked" checked></ui-checkbox>
      <ui-checkbox label="Indeterminate" indeterminate></ui-checkbox>
      <ui-checkbox label="Disabled" disabled></ui-checkbox>
      <ui-checkbox label="Disabled checked" checked disabled></ui-checkbox>
    `)}

    ${stackBlock('Radio group', html`
      <ui-radio-group label="Size" name="size" value="m">
        <ui-radio value="s" label="Small"></ui-radio>
        <ui-radio value="m" label="Medium"></ui-radio>
        <ui-radio value="l" label="Large"></ui-radio>
      </ui-radio-group>
      <ui-radio-group label="Speed" orientation="horizontal" value="fast">
        <ui-radio value="slow" label="Slow"></ui-radio>
        <ui-radio value="fast" label="Fast"></ui-radio>
        <ui-radio value="ludicrous" label="Ludicrous" disabled></ui-radio>
      </ui-radio-group>
      <ui-radio-group label="Disabled group" value="a" disabled>
        <ui-radio value="a" label="Alpha"></ui-radio>
        <ui-radio value="b" label="Beta"></ui-radio>
      </ui-radio-group>
    `)}

    ${stackBlock('Slider', html`
      <ui-slider label="Volume" value=${volume}
                 @input=${(e) => volume.set(e.detail.value)}></ui-slider>
      <ui-slider label="Brightness" value="70" show-value></ui-slider>
      <ui-slider label="Steps of 10" min="0" max="50" step="10" value="20" show-value></ui-slider>
      <ui-slider label="Disabled" value="40" disabled></ui-slider>
      <ui-slider label="Price range" range show-value value-start=${rangeStart} value-end=${rangeEnd}
                 @input=${(e) => { rangeStart(e.detail.start); rangeEnd(e.detail.end); }}></ui-slider>
      <ui-text variant="body-sm" color="onSurfaceVariant">
        volume: ${volume} · range: ${rangeStart}–${rangeEnd}
      </ui-text>
    `)}

    ${block('Rating', html`
      <ui-rating label="Rate this"></ui-rating>
      <ui-rating label="Score" value="3"></ui-rating>
      <ui-rating label="Average score" value="4" readonly></ui-rating>
      <ui-rating label="Disabled rating" value="2" disabled></ui-rating>
      <ui-rating label="Big rating" value="3" size="2rem"></ui-rating>
      <ui-rating label="Out of ten" value="7" max="10"></ui-rating>
    `)}

    ${stackBlock('Search bar', html`
      <ui-search label="Search mail" value=${query}
                 @input=${(e) => query(e.detail.value)}
                 @submit=${(e) => query(e.detail.value)}></ui-search>
      <ui-search label="Disabled search" value="cannot type" disabled></ui-search>
      <ui-text variant="body-sm" color="onSurfaceVariant">
        ${() => (query() ? `query: ${query()}` : 'type and press Enter')}
      </ui-text>
    `)}

    ${stackBlock('Search view', html`
      <ui-search presentation="view" label="Search files" value=${filesQuery}
                 @input=${(e) => filesQuery(e.detail.value)}>
        <ui-text variant="body-sm" color="onSurfaceVariant" style="padding: 8px 16px">
          Recent — Ada, Grace, Katherine
        </ui-text>
      </ui-search>
    `)}
  `;
};
