// Demo — structure & layout: accordion, breadcrumbs, pagination, stepper,
// bottom navigation, stack, container, surface.

import { html, signal } from 'alacris';
import { block, stackBlock, row } from './helpers.js';
import '../src/components/ui-accordion.js';
import '../src/components/ui-accordion-item.js';
import '../src/components/ui-breadcrumbs.js';
import '../src/components/ui-pagination.js';
import '../src/components/ui-stepper.js';
import '../src/components/ui-step.js';
import '../src/components/ui-bottom-nav.js';
import '../src/components/ui-nav-item.js';
import '../src/components/ui-stack.js';
import '../src/components/ui-container.js';
import '../src/components/ui-surface.js';
import '../src/components/ui-button.js';
import '../src/components/ui-text.js';

export const title = 'Structure & layout';

const page = signal(3);
const step = signal(1);
const dest = signal('home');

export const section = () => html`
  ${stackBlock('Accordion (single)', html`
    <ui-accordion>
      <ui-accordion-item value="what" headline="What is Alacris UI?" expanded>
        A complete design system built on Alacris alone — tokens, theme engine,
        motion, and this component set.
      </ui-accordion-item>
      <ui-accordion-item value="theme" headline="How do I theme it?">
        One seed color in <code>applyTheme</code>. Or override any token at any
        of the three tiers — see docs/theming.md.
      </ui-accordion-item>
      <ui-accordion-item value="locked" headline="Disabled panel" disabled>
        Not reachable.
      </ui-accordion-item>
    </ui-accordion>`)}

  ${stackBlock('Accordion (multi)', html`
    <ui-accordion multi>
      <ui-accordion-item value="a" headline="First">Can stay open…</ui-accordion-item>
      <ui-accordion-item value="b" headline="Second">…while this one opens too.</ui-accordion-item>
    </ui-accordion>`)}

  ${block('Breadcrumbs', html`
    <ui-breadcrumbs separator-icon="chevron-right">
      <a href="#">Home</a>
      <a href="#">Components</a>
      <span aria-current="page">Breadcrumbs</span>
    </ui-breadcrumbs>`)}

  ${block('Pagination', html`
    <ui-pagination count="10" page=${page} @change=${(e) => page(e.detail.page)}></ui-pagination>
    <ui-text variant="body-sm" color="onSurfaceVariant">page ${page} of 10</ui-text>`)}

  ${stackBlock('Stepper', html`
    <ui-stepper active=${step}>
      <ui-step label="Account"></ui-step>
      <ui-step label="Shipping" optional-text="Optional"></ui-step>
      <ui-step label="Payment"></ui-step>
      <ui-step label="Review"></ui-step>
    </ui-stepper>
    ${row(html`
      <ui-button variant="outlined" @click=${() => step(Math.max(0, step() - 1))}>Back</ui-button>
      <ui-button @click=${() => step(Math.min(3, step() + 1))}>Next</ui-button>`)}`)}

  ${stackBlock('Bottom navigation', html`
    <ui-bottom-nav value=${dest} @change=${(e) => dest(e.detail.value)} label="Demo destinations">
      <ui-nav-item value="home" icon="home" label="Home"></ui-nav-item>
      <ui-nav-item value="search" icon="search" label="Search"></ui-nav-item>
      <ui-nav-item value="favorites" icon="star-border" active-icon="star" label="Favorites"></ui-nav-item>
      <ui-nav-item value="settings" icon="settings" label="Settings"></ui-nav-item>
    </ui-bottom-nav>
    <ui-text variant="body-sm" color="onSurfaceVariant">destination: ${dest}</ui-text>`)}

  ${block('Stack', html`
    <ui-stack direction="row" gap="2">
      <ui-surface elevation="1" radius="sm" style="padding:12px">gap 2</ui-surface>
      <ui-surface elevation="1" radius="sm" style="padding:12px">row</ui-surface>
      <ui-surface elevation="1" radius="sm" style="padding:12px">stack</ui-surface>
    </ui-stack>
    <ui-stack gap="1" align="center">
      <ui-surface elevation="1" radius="sm" style="padding:8px 12px">column</ui-surface>
      <ui-surface elevation="1" radius="sm" style="padding:8px 12px">centered</ui-surface>
    </ui-stack>`)}

  ${block('Surfaces (elevation 0–5)', html`
    ${[0, 1, 2, 3, 4, 5].map((n) => html`
      <ui-surface elevation=${n} radius="md" style="padding:16px 20px">
        <ui-text variant="label-lg">${n}</ui-text>
      </ui-surface>`)}
    <ui-surface outlined radius="md" bg="surfaceContainerLow" style="padding:16px 20px">
      <ui-text variant="label-lg">outlined</ui-text>
    </ui-surface>`)}

  ${stackBlock('Container', html`
    <ui-container size="sm" style="outline:1px dashed var(--ui-color-outline-variant)">
      <ui-text variant="body-sm" color="onSurfaceVariant">size="sm" — 640px, centered, gutters</ui-text>
    </ui-container>
    <ui-container size="md" style="outline:1px dashed var(--ui-color-outline-variant)">
      <ui-text variant="body-sm" color="onSurfaceVariant">size="md" — 960px</ui-text>
    </ui-container>`)}
`;
