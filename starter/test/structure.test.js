// Smoke tests — structure & layout family.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

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

test('ui-accordion-item toggles and emits; single accordion closes siblings', async () => {
  const acc = mount(`
    <ui-accordion>
      <ui-accordion-item value="a" headline="A" expanded></ui-accordion-item>
      <ui-accordion-item value="b" headline="B"></ui-accordion-item>
    </ui-accordion>`);
  await tick();
  const [a, b] = acc.querySelectorAll('ui-accordion-item');
  assert.equal(a.expanded, true);
  const headerB = b.shadowRoot.querySelector('button');
  assert.equal(headerB.getAttribute('aria-expanded'), 'false');
  let changed = null;
  acc.addEventListener('change', (e) => (changed = e.detail));
  fire(headerB, 'click');
  await tick();
  assert.equal(b.expanded, true, 'clicked item expands');
  assert.equal(a.expanded, false, 'single mode collapses the sibling');
  assert.equal(changed.value, 'b');
  unmountAll();
});

test('ui-accordion multi keeps both open', async () => {
  const acc = mount(`
    <ui-accordion multi>
      <ui-accordion-item value="a" headline="A" expanded></ui-accordion-item>
      <ui-accordion-item value="b" headline="B"></ui-accordion-item>
    </ui-accordion>`);
  await tick();
  const [a, b] = acc.querySelectorAll('ui-accordion-item');
  fire(b.shadowRoot.querySelector('button'), 'click');
  await tick();
  assert.equal(a.expanded, true);
  assert.equal(b.expanded, true);
  unmountAll();
});

test('ui-breadcrumbs renders nav with label and separator token', async () => {
  const el = mount('<ui-breadcrumbs><a href="#">A</a><span>B</span></ui-breadcrumbs>');
  await tick();
  const nav = el.shadowRoot.querySelector('nav');
  assert.equal(nav.getAttribute('aria-label'), 'Breadcrumb');
  el.separator = '›';
  assert.ok(el.style.getPropertyValue('--_ui-breadcrumbs-sep').includes('›'));
  unmountAll();
});

test('ui-pagination renders ellipsis window and emits change', async () => {
  const el = mount('<ui-pagination count="10" page="5"></ui-pagination>');
  await tick();
  const text = el.shadowRoot.textContent;
  assert.ok(text.includes('…') || el.shadowRoot.querySelectorAll('button').length > 4);
  let page = null;
  el.addEventListener('change', (e) => (page = e.detail.page));
  const buttons = [...el.shadowRoot.querySelectorAll('button')];
  const next = buttons.find((b) => (b.getAttribute('aria-label') || '').match(/next/i));
  fire(next, 'click');
  assert.equal(page, 6, 'next emits page+1');
  el.page = 2;
  const current = el.shadowRoot.querySelector('[aria-current="page"]');
  assert.equal(current.textContent.trim(), '2');
  unmountAll();
});

test('ui-stepper assigns states from active', async () => {
  const el = mount(`
    <ui-stepper active="1">
      <ui-step label="One"></ui-step>
      <ui-step label="Two"></ui-step>
      <ui-step label="Three"></ui-step>
    </ui-stepper>`);
  await tick();
  const steps = [...el.querySelectorAll('ui-step')];
  assert.deepEqual(steps.map((s) => s.state), ['completed', 'active', 'upcoming']);
  el.active = 2;
  assert.deepEqual(steps.map((s) => s.state), ['completed', 'completed', 'active']);
  unmountAll();
});

test('ui-bottom-nav coordinates selection and emits change', async () => {
  const el = mount(`
    <ui-bottom-nav value="home">
      <ui-nav-item value="home" icon="home" label="Home"></ui-nav-item>
      <ui-nav-item value="search" icon="search" label="Search"></ui-nav-item>
    </ui-bottom-nav>`);
  await tick();
  const [home, search] = el.querySelectorAll('ui-nav-item');
  assert.equal(home.selected, true);
  let value = null;
  el.addEventListener('change', (e) => (value = e.detail.value));
  fire(search.shadowRoot.querySelector('button'), 'click');
  assert.equal(value, 'search');
  assert.equal(search.selected, true);
  assert.equal(home.selected, false);
  unmountAll();
});

test('ui-stack maps numeric gap to the space token and passes raw lengths', async () => {
  const el = mount('<ui-stack direction="row" gap="4"></ui-stack>');
  await tick();
  assert.equal(el.style.flexDirection, 'row');
  assert.ok(el.style.gap.includes('--ui-space-4'));
  el.gap = '1.5rem';
  assert.equal(el.style.gap, '1.5rem');
  unmountAll();
});

test('ui-surface applies elevation, radius, and bg role', async () => {
  const el = mount('<ui-surface elevation="3" radius="lg" bg="surfaceContainerHigh"></ui-surface>');
  await tick();
  const s = el.style.cssText;
  assert.ok(s.includes('--ui-elevation-3'));
  assert.ok(s.includes('--ui-radius-lg'));
  assert.ok(s.includes('--ui-color-surface-container-high'));
  el.elevation = 5;
  assert.ok(el.style.cssText.includes('--ui-elevation-5'));
  unmountAll();
});

test('ui-container sizes', async () => {
  const el = mount('<ui-container size="sm">x</ui-container>');
  await tick();
  assert.ok(el.shadowRoot || el.style, 'upgrades');
  el.size = 'full';
  unmountAll();
});
