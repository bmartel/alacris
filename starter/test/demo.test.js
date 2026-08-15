// Smoke test — the kitchen-sink demo is itself a composition of the system.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, render } from 'alacris';
import { applyCurrentTheme } from '../demo/theme-controls.js';
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
  assert.ok(root.querySelector('demo-theme-controls'), 'live theme playground');
  assert.ok(root.querySelector('#theme-tokens'), 'tokens section');
  assert.ok(root.querySelector('#basics'), 'family sections render');
  assert.ok(root.querySelector('ui-button'), 'family demos project into the shell');
  assert.ok(root.querySelector('.pill'), 'feature labels are static, not chips');
  assert.ok([...root.querySelectorAll('.pill')].some((el) => el.textContent === 'ESM-only'));
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

  const search = host.querySelector('demo-app').shadowRoot.querySelector('ui-search');
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
