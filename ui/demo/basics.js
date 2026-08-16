// Demo — the exemplar components: buttons, cards, switches, text fields,
// dialog, bottom sheet, typography, icons.

import { html, signal } from '@alacris/core';
import { block, stackBlock, row } from './helpers.js';
import { iconNames } from '../src/util/icons.js';
import '../src/components/ui-button.js';
import '../src/components/ui-icon-button.js';
import '../src/components/ui-card.js';
import '../src/components/ui-switch.js';
import '../src/components/ui-text-field.js';
import '../src/components/ui-dialog.js';
import '../src/components/ui-sheet.js';
import '../src/components/ui-side-sheet.js';
import '../src/components/ui-text.js';
import '../src/components/ui-icon.js';

export const title = 'Basics';

const dialogOpen = signal(false);
const sheetOpen = signal(false);
const sideOpen = signal(false);
const email = signal('');

export const section = () => html`
  ${block('Buttons', html`
    <ui-button>Filled</ui-button>
    <ui-button variant="tonal">Tonal</ui-button>
    <ui-button variant="outlined">Outlined</ui-button>
    <ui-button variant="text">Text</ui-button>
    <ui-button variant="elevated">Elevated</ui-button>
    <ui-button disabled>Disabled</ui-button>
    <ui-button variant="tonal"><ui-icon slot="icon" name="add"></ui-icon>With icon</ui-button>
    <ui-button variant="outlined" href="https://bmartel.github.io/alacris/" target="_blank">
      Link<ui-icon slot="trailing" name="arrow-forward"></ui-icon>
    </ui-button>`)}

  ${block('Icon buttons', html`
    <ui-icon-button icon="search" label="Search"></ui-icon-button>
    <ui-icon-button icon="settings" label="Settings" variant="filled"></ui-icon-button>
    <ui-icon-button icon="edit" label="Edit" variant="tonal"></ui-icon-button>
    <ui-icon-button icon="delete" label="Delete" variant="outlined"></ui-icon-button>
    <ui-icon-button icon="star-border" selected-icon="star" label="Favorite" toggle></ui-icon-button>
    <ui-icon-button icon="send" label="Send" disabled></ui-icon-button>`)}

  ${block('Cards', html`
    <ui-card>
      <ui-text variant="title-md">Elevated</ui-text>
      <ui-text variant="body-sm" color="onSurfaceVariant">The default card.</ui-text>
    </ui-card>
    <ui-card variant="filled">
      <ui-text variant="title-md">Filled</ui-text>
      <ui-text variant="body-sm" color="onSurfaceVariant">Highest surface tone.</ui-text>
    </ui-card>
    <ui-card variant="outlined">
      <ui-text variant="title-md">Outlined</ui-text>
      <ui-text variant="body-sm" color="onSurfaceVariant">Hairline instead of shadow.</ui-text>
    </ui-card>
    <ui-card variant="elevated" interactive>
      <ui-text variant="title-md">Interactive</ui-text>
      <ui-text variant="body-sm" color="onSurfaceVariant">Hover, focus, ripple.</ui-text>
    </ui-card>`)}

  ${block('Switches', html`
    <ui-switch label="Wi-Fi" checked></ui-switch>
    <ui-switch label="Bluetooth"></ui-switch>
    <ui-switch label="With icons" icons checked></ui-switch>
    <ui-switch label="Off limits" disabled></ui-switch>`)}

  ${stackBlock('Text fields', html`
    ${row(html`
      <ui-text-field label="Filled" helper="Supporting text"></ui-text-field>
      <ui-text-field variant="outlined" label="Outlined"></ui-text-field>
      <ui-text-field label="Password" type="password" value="hunter2"></ui-text-field>`)}
    ${row(html`
      <ui-text-field label="Email" value=${email} clearable
                     helper=${() => (email() ? `Hello, ${email()}` : 'We never spam')}>
        <ui-icon slot="leading" name="person"></ui-icon>
      </ui-text-field>
      <ui-text-field variant="outlined" label="Username" error="Already taken"></ui-text-field>
      <ui-text-field label="Bio" type="textarea" maxlength="80" placeholder="A few words…"></ui-text-field>`)}
    ${row(html`
      <ui-text-field label="Disabled" disabled value="Read only-ish"></ui-text-field>
      <ui-text-field variant="outlined" label="Required" required></ui-text-field>`)}`)}

  ${block('Dialog', html`
    <ui-button variant="tonal" @click=${() => dialogOpen(true)}>Open dialog</ui-button>
    <ui-dialog open=${dialogOpen} @close=${() => dialogOpen(false)}>
      <span slot="headline">Reset settings?</span>
      This will restore the defaults for every panel. You cannot undo this.
      <ui-button slot="actions" variant="text" @click.capture=${() => dialogOpen(false)}>Cancel</ui-button>
      <ui-button slot="actions" @click.capture=${() => dialogOpen(false)}>Reset</ui-button>
    </ui-dialog>`)}

  ${block('Bottom sheet', html`
    <ui-button variant="tonal" @click=${() => sheetOpen(true)}>Open sheet</ui-button>
    <ui-sheet open=${sheetOpen} @close=${() => sheetOpen(false)}>
      <span slot="headline">Share</span>
      A modal bottom sheet — slides up from the bottom, traps focus, and the
      parent owns <code>open</code>. Escape or the scrim closes it.
      <ui-button slot="actions" variant="text" @click.capture=${() => sheetOpen(false)}>Close</ui-button>
    </ui-sheet>`)}

  ${block('Side sheet', html`
    <ui-button variant="tonal" @click=${() => sideOpen(true)}>Open side sheet</ui-button>
    <ui-side-sheet open=${sideOpen} @close=${() => sideOpen(false)}>
      <span slot="headline">Filters</span>
      Complementary content — distinct from a navigation drawer. Close via the
      X, Escape, or the scrim.
      <ui-button slot="actions" variant="text" @click.capture=${() => sideOpen(false)}>Apply</ui-button>
    </ui-side-sheet>`)}

  ${stackBlock('Type scale', html`
    <ui-text variant="display-sm">Display small</ui-text>
    <ui-text variant="headline-md">Headline medium</ui-text>
    <ui-text variant="title-lg">Title large</ui-text>
    <ui-text variant="body-lg">Body large — the reading size for prose and long-form content.</ui-text>
    <ui-text variant="body-md" color="onSurfaceVariant">Body medium in the variant color.</ui-text>
    <ui-text variant="label-md" color="primary">LABEL MEDIUM</ui-text>`)}

  ${stackBlock('Icons', html`
    <ui-text variant="body-sm" color="onSurfaceVariant">
      Material filled 24×24. Add more with <code>registerIcons()</code>.
    </ui-text>
    <div class="icon-grid">
      ${iconNames().map((n) => html`
        <div class="icon-cell" title=${n}>
          <ui-icon name=${n} size="1.75rem"></ui-icon>
          <span>${n}</span>
        </div>`)}
    </div>`)}
`;
