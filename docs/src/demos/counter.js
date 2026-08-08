import { define, html, signal } from 'alacris';

define('demo-counter', {
  props: { start: 0, step: 1 },
  styles: `
    :host { display: inline-flex; align-items: center; gap: .75rem; font: inherit }
    button { font: inherit; padding: .3rem .7rem; border-radius: 6px; cursor: pointer;
             border: 1px solid currentColor; background: transparent; color: inherit }
    output { font-variant-numeric: tabular-nums; font-size: 1.4rem; min-width: 3ch;
             text-align: center; font-weight: 700 }
  `,
  setup({ start, step }) {
    const count = signal(start());
    return html`
      <button @click=${() => count(count() - step())} aria-label="decrement">&minus;</button>
      <output>${count}</output>
      <button @click=${() => count(count() + step())} aria-label="increment">+</button>`;
  },
});
