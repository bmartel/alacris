// Shared base for every component's `styles` list. `css` interns by text, so
// this parses exactly once for the whole page no matter how many components
// include it.

import { css } from 'alacris';

export const base = css`
  *, *::before, *::after { box-sizing: border-box; }
  :host { -webkit-tap-highlight-color: transparent; }
  :host([hidden]) { display: none; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms;
      animation-duration: 0.01ms;
      animation-iteration-count: 1;
    }
  }
`;

/**
 * The focus ring rule for a selector, e.g. ${focusRingOn('.control')}.
 * Interpolate into a component's css template.
 */
export const focusRingOn = (selector) => `
  ${selector}:focus-visible {
    outline: var(--ui-focus-ring);
    outline-offset: var(--ui-focus-ring-offset);
  }
`;
