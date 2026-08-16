// Smoke tests for the navigation family: tabs, menu, drawer, app bar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

import '../src/components/ui-tabs.js';
import '../src/components/ui-menu.js';
import '../src/components/ui-drawer.js';
import '../src/components/ui-app-bar.js';
import '../src/components/ui-nav-rail.js';
import '../src/components/ui-nav-item.js';
import '../src/components/ui-fab.js';
import '../src/components/ui-bottom-app-bar.js';
import '../src/components/ui-toolbar.js';
import '../src/components/ui-icon-button.js';

const TABS = `
  <ui-tabs value="one" label="Demo">
    <ui-tab value="one" icon="home">One</ui-tab>
    <ui-tab value="two">Two</ui-tab>
    <ui-tab value="three" disabled>Three</ui-tab>
    <ui-tab-panel slot="panels" value="one">P1</ui-tab-panel>
    <ui-tab-panel slot="panels" value="two">P2</ui-tab-panel>
  </ui-tabs>`;

test('ui-tabs wires roles, reflects selection, and panels follow', async () => {
  const el = mount(TABS);
  await tick();
  const tabs = [...el.querySelectorAll('ui-tab')];
  const panels = [...el.querySelectorAll('ui-tab-panel')];

  assert.equal(el.shadowRoot.querySelector('[role=tablist]').getAttribute('aria-label'), 'Demo');
  assert.equal(tabs[0].getAttribute('role'), 'tab');
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[1].getAttribute('aria-selected'), 'false');
  assert.equal(tabs[2].getAttribute('aria-disabled'), 'true');
  assert.equal(panels[0].getAttribute('role'), 'tabpanel');
  assert.equal(panels[0].hasAttribute('hidden'), false, 'matching panel is visible');
  assert.equal(panels[1].hasAttribute('hidden'), true, 'other panel is hidden');
  assert.ok(tabs[0].getAttribute('aria-controls'), 'tab is wired to its panel');
  assert.equal(panels[0].getAttribute('aria-labelledby'), tabs[0].id);

  // Live prop write: parent-owned value moves the selection.
  el.value = 'two';
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(panels[1].hasAttribute('hidden'), false);
  await tick(); // indicator measurement must no-op safely at zero sizes
  unmountAll();
});

test('ui-tabs selects on tab click and emits change; disabled tabs inert', async () => {
  const el = mount(TABS);
  await tick();
  const tabs = [...el.querySelectorAll('ui-tab')];
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));

  fire(tabs[1], 'click');
  assert.equal(el.value, 'two');
  assert.equal(detail.value, 'two');
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');

  detail = null;
  fire(tabs[2], 'click');
  assert.equal(el.value, 'two', 'disabled tab does not select');
  assert.equal(detail, null, 'disabled tab does not emit');
  await tick();
  unmountAll();
});

test('ui-menu opens by property, item click selects and closes', async () => {
  const el = mount(`
    <ui-menu>
      <button slot="anchor">Open</button>
      <ui-menu-item value="a" icon="edit">Alpha<span slot="trailing">⌘A</span></ui-menu-item>
      <ui-menu-item value="b" danger>Beta</ui-menu-item>
      <ui-menu-item value="c" disabled>Gamma</ui-menu-item>
    </ui-menu>`);
  await tick();
  assert.equal(el.shadowRoot.querySelector('[role=menu]'), null, 'closed = no panel');

  el.open = true;
  const panel = el.shadowRoot.querySelector('[role=menu]');
  assert.ok(panel, 'open renders the panel synchronously');

  const items = [...el.querySelectorAll('ui-menu-item')];
  assert.equal(items[0].getAttribute('role'), 'menuitem');
  assert.equal(items[2].getAttribute('aria-disabled'), 'true');

  let detail = null;
  el.addEventListener('select', (e) => (detail = e.detail));
  fire(items[0], 'click');
  assert.equal(detail.value, 'a', 'selection emits select');
  assert.equal(el.open, false, 'selection closes the menu');
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('[role=menu]'), null, 'exit removes the panel');
  unmountAll();
});

test('ui-menu-item live prop write flips the danger class', async () => {
  const el = mount('<ui-menu-item value="x">Item</ui-menu-item>');
  await tick();
  const control = el.shadowRoot.querySelector('.control');
  assert.ok(!control.className.includes('danger'));
  el.danger = true;
  assert.ok(control.className.includes('danger'));
  unmountAll();
});

test('ui-drawer modal opens, scrim requests close, exit removes DOM', async () => {
  const el = mount('<ui-drawer label="Nav"><a href="#one">Link</a></ui-drawer>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'closed = no DOM');

  el.open = true;
  const surface = el.shadowRoot.querySelector('[part=surface]');
  assert.ok(surface, 'open renders the panel');
  assert.equal(surface.getAttribute('aria-modal'), 'true');
  assert.ok(surface.className.includes('start'), 'default anchor is start');

  let reason = null;
  el.addEventListener('close', (e) => (reason = e.detail.reason));
  fire(el.shadowRoot.querySelector('.scrim'), 'click');
  assert.equal(reason, 'scrim', 'scrim click emits close');

  el.open = false;
  await tick();
  await tick();
  assert.equal(el.shadowRoot.querySelector('.overlay'), null, 'exit removes the DOM');
  unmountAll();
});

test('ui-drawer standard variant renders in flow and tracks open', async () => {
  const el = mount('<ui-drawer variant="standard" label="Side"><p>Nav</p></ui-drawer>');
  await tick();
  const std = el.shadowRoot.querySelector('.std');
  assert.ok(std, 'standard renders without opening');
  assert.ok(!std.className.includes('open'));
  el.open = true;
  assert.ok(std.className.includes('open'), 'open widens the panel');
  assert.equal(el.shadowRoot.querySelector('.scrim'), null, 'no scrim in standard');
  el.anchor = 'end';
  assert.ok(std.className.includes('end'), 'anchor prop is live');
  unmountAll();
});

test('ui-app-bar variants, elevation, and scroll elevation', async () => {
  const el = mount(`
    <ui-app-bar>
      <span>Title</span>
    </ui-app-bar>`);
  await tick();
  const bar = el.shadowRoot.querySelector('[part=bar]');
  assert.ok(bar.className.includes('small'), 'default variant is small');

  el.variant = 'large';
  assert.ok(bar.className.includes('large'), 'variant prop is live');

  el.elevated = true;
  assert.ok(bar.className.includes('raised'), 'elevated forces the raised state');
  el.elevated = false;
  assert.ok(!bar.className.includes('raised'));

  // scrollElevate: stub scrollY and dispatch a window scroll event.
  el.scrollElevate = true;
  let stubbed = false;
  try {
    Object.defineProperty(window, 'scrollY', { value: 24, configurable: true });
    stubbed = window.scrollY === 24;
  } catch {
    stubbed = false;
  }
  if (stubbed) {
    window.dispatchEvent(new window.Event('scroll'));
    assert.ok(bar.className.includes('raised'), 'scrolling raises the bar');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new window.Event('scroll'));
    assert.ok(!bar.className.includes('raised'), 'back at top lowers the bar');
  }
  unmountAll();
});

test('ui-nav-rail coordinates selection and emits change', async () => {
  const el = mount(`
    <ui-nav-rail value="home" label="Main">
      <ui-fab slot="fab" icon="add"></ui-fab>
      <ui-nav-item value="home" icon="home" label="Home"></ui-nav-item>
      <ui-nav-item value="search" icon="search" label="Search"></ui-nav-item>
    </ui-nav-rail>`);
  await tick();
  const [home, search] = el.querySelectorAll('ui-nav-item');
  assert.equal(home.selected, true);
  assert.ok(el.shadowRoot.querySelector('nav'));
  let value = null;
  el.addEventListener('change', (e) => (value = e.detail.value));
  fire(search.shadowRoot.querySelector('button'), 'click');
  assert.equal(value, 'search');
  assert.equal(search.selected, true);
  assert.equal(home.selected, false);
  unmountAll();
});

test('ui-tabs secondary variant is live on the tablist', async () => {
  const el = mount(TABS);
  await tick();
  const tablist = el.shadowRoot.querySelector('[role=tablist]');
  assert.ok(tablist.className.includes('primary'));
  el.variant = 'secondary';
  assert.ok(tablist.className.includes('secondary'));
  unmountAll();
});

test('ui-bottom-app-bar renders navigation, actions, and fab slots', async () => {
  const el = mount(`
    <ui-bottom-app-bar>
      <ui-icon-button slot="navigation" icon="menu" label="Menu"></ui-icon-button>
      <ui-fab slot="fab" icon="add"></ui-fab>
      <ui-icon-button slot="actions" icon="search" label="Search"></ui-icon-button>
    </ui-bottom-app-bar>`);
  await tick();
  const bar = el.shadowRoot.querySelector('[part=bar]');
  assert.equal(bar.getAttribute('role'), 'toolbar');
  assert.ok(bar.className.includes('end'));
  el.fabAlign = 'center';
  assert.ok(bar.className.includes('center'));
  unmountAll();
});

test('ui-toolbar is a labeled toolbar', async () => {
  const el = mount(`
    <ui-toolbar label="Selection">
      <ui-icon-button icon="edit" label="Edit"></ui-icon-button>
    </ui-toolbar>`);
  await tick();
  const bar = el.shadowRoot.querySelector('[part=bar]');
  assert.equal(bar.getAttribute('role'), 'toolbar');
  assert.equal(bar.getAttribute('aria-label'), 'Selection');
  unmountAll();
});
