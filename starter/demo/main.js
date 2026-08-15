// Alacris UI kitchen sink — every component, one page, live theme playground.

import { html, render } from 'alacris';
import { applyCurrentTheme } from './theme-controls.js';
import './theme-controls.js';
import '../src/components/ui-text.js';

import * as basics from './basics.js';
import * as inputs from './inputs.js';
import * as pickers from './pickers.js';
import * as display from './display.js';
import * as feedback from './feedback.js';
import * as navigation from './navigation.js';
import * as structure from './structure.js';

// Theme first, so the first paint is already themed.
applyCurrentTheme();

const FAMILIES = [basics, inputs, pickers, display, feedback, navigation, structure];

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');

const app = html`
  <nav class="demo-nav" aria-label="Sections">
    <ui-text variant="title-md" style="padding: 8px 16px 16px">Alacris UI</ui-text>
    ${FAMILIES.map((f) => html`<a href=${'#' + slug(f.title)}>${f.title}</a>`)}
  </nav>
  <main>
    <header style="display:flex; flex-direction:column; gap:16px; padding-block-end: 8px">
      <h1 style="margin:0"><ui-text variant="display-sm">Alacris UI</ui-text></h1>
      <ui-text variant="body-lg" color="onSurfaceVariant">
        A complete design system built with Alacris and nothing else.
        Every control on this page re-themes live from the playground below —
        one stylesheet write, zero re-renders.
      </ui-text>
      <demo-theme-controls></demo-theme-controls>
    </header>
    ${FAMILIES.map((f) => html`
      <section class="demo-section" id=${slug(f.title)}>
        <ui-text variant="headline-md">${f.title}</ui-text>
        ${f.section()}
      </section>`)}
  </main>`;

render(app, document.querySelector('#app'));
