// Smoke test — the kitchen-sink demo is itself a composition of the system.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, render, signal } from '@alacris/core';
import { applyCurrentTheme } from '../demo/theme-controls.js';
import { bindSearchDock } from '../demo/search-dock.js';
import '../demo/app.js';
import { unmountAll, tick, fire } from './helpers.js';

test('demo-app boots an app shell built from ui-* components', async () => {
  applyCurrentTheme();
  const host = document.createElement('div');
  document.body.append(host);
  render(html`<demo-app></demo-app>`, host);
  await tick();

  const app = host.querySelector('demo-app');
  assert.ok(app?.shadowRoot, 'demo-app upgrades with a shadow root');
  const root = app.shadowRoot;
  assert.ok(root.querySelector('ui-app-bar'), 'top app bar');
  assert.ok(root.querySelector('ui-nav-rail, ui-drawer'), 'section navigation');
  const theme = root.querySelector('demo-theme-controls');
  assert.ok(theme, 'theme playground');
  const panel = theme.shadowRoot;
  assert.ok(panel.querySelector('[aria-label="Seed color"]'), 'seed swatches');
  assert.equal(panel.querySelectorAll('ui-toggle-group').length, 3, 'density, motion, appearance');
  assert.ok(panel.querySelector('ui-slider'), 'shape slider');
  assert.ok(root.querySelector('#theme-tokens'), 'tokens section');
  assert.ok(root.querySelector('#basics'), 'family sections render');
  assert.ok(root.querySelector('ui-button'), 'family demos project into the shell');
  assert.ok(root.querySelector('.pill'), 'feature labels are static, not chips');
  assert.ok([...root.querySelectorAll('.pill')].some((el) => el.textContent === 'ESM-only'));
  assert.ok(root.querySelector('.search-anchor > .hero-search'), 'hero search has a layout anchor');
  assert.ok(root.querySelector('.search-dock'), 'app bar has a search dock target');
  unmountAll();
  await tick();
});

test('demo search keeps a multi-character query and matches blocks', async () => {
  applyCurrentTheme();
  const host = document.createElement('div');
  document.body.append(host);
  render(html`<demo-app></demo-app>`, host);
  await tick();
  await tick();

  const search = host.querySelector('demo-app').shadowRoot.querySelector('.hero-search');
  const input = search.shadowRoot.querySelector('input');
  let q = '';
  for (const ch of 'dialog') {
    q += ch;
    input.value = q;
    fire(input, 'input');
  }
  assert.equal(search.value, 'dialog', 'query survives consecutive keystrokes');
  assert.equal(search.open, true, 'view stays open while typing');
  const hits = [...search.querySelectorAll('ui-list-item')].map((el) => el.headline);
  assert.ok(hits.some((h) => /dialog/i.test(h)), `results include Dialog, got ${hits.join(', ')}`);
  unmountAll();
  await tick();
});

const box = (r) => ({
  ...r,
  bottom: r.top + r.height,
  right: r.left + r.width,
  x: r.left,
  y: r.top,
  toJSON() {},
});

const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

test('search dock pins and unpins when the hero field crosses the app bar', async () => {
  const restore = window.matchMedia;
  window.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });

  const search = document.createElement('div');
  const anchor = document.createElement('div');
  const dock = document.createElement('div');
  document.body.append(search, anchor, dock);
  const docked = signal(false);

  const hero = { top: 240, left: 24, width: 400, height: 56 };
  const bar = { top: 8, left: 96, width: 640, height: 48 };
  search.getBoundingClientRect = () => box(hero);
  anchor.getBoundingClientRect = () => box(hero);
  dock.getBoundingClientRect = () => box(bar);

  const stop = bindSearchDock({ search, anchor, dock, docked });
  try {
    await frames();
    assert.equal(docked(), false);
    assert.notEqual(search.style.position, 'fixed');

    const crossed = { ...hero, top: 4 };
    search.getBoundingClientRect = () => box(crossed);
    anchor.getBoundingClientRect = () => box(crossed);
    window.dispatchEvent(new Event('scroll'));
    await frames();
    assert.equal(docked(), true);
    assert.equal(search.style.position, 'fixed');

    search.getBoundingClientRect = () => box(hero);
    anchor.getBoundingClientRect = () => box(hero);
    window.dispatchEvent(new Event('scroll'));
    await frames();
    assert.equal(docked(), false);
    assert.notEqual(search.style.position, 'fixed');
  } finally {
    stop();
    window.matchMedia = restore;
    unmountAll();
  }
});
