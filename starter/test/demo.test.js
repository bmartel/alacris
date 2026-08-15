// Smoke test — the kitchen-sink demo is itself a composition of the system.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, render } from 'alacris';
import { applyCurrentTheme } from '../demo/theme-controls.js';
import '../demo/app.js';
import { unmountAll, tick } from './helpers.js';

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
  assert.ok(root.querySelector('ui-container'), 'content container');
  assert.ok(root.querySelector('demo-theme-controls'), 'live theme playground');
  assert.ok(root.querySelector('#basics'), 'family sections render');
  assert.ok(root.querySelector('ui-button'), 'family demos project into the shell');
  unmountAll();
  await tick();
});
