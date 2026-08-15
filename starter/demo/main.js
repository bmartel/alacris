// Alacris UI kitchen sink — every component, one page, live theme playground.
// The page is itself a composition of the design system: see demo/app.js.

import { html, render } from 'alacris';
import { applyCurrentTheme } from './theme-controls.js';
import './app.js';

// Theme first, so the first paint is already themed.
applyCurrentTheme();

render(html`<demo-app></demo-app>`, document.querySelector('#app'));
