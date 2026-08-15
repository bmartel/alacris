import { define, html, signal } from '@alacris/core';
import { createContext, provide, consume } from '@alacris/core/context';

// One key object, imported by both the provider and the consumer.
const Theme = createContext('demo-theme');

// A leaf, several levels down, that never receives the value as a prop.
define('demo-leaf', {
  styles: `
    :host { display: inline-block; padding: .35rem .7rem; border-radius: 6px;
            border: 1px solid currentColor; font: inherit; font-size: .9rem }
    :host([data-theme='dark']) { background: #22222a; color: #f2f2f5 }
  `,
  setup(_props, host) {
    const theme = consume(host, Theme, 'light');
    // Reflect it so the host can style itself.
    return html`<span ref=${() => queueMicrotask(() => host.setAttribute('data-theme', theme()))}
      >theme is ${theme}</span>`;
  },
});

define('demo-middle', {
  styles: `:host { display: block; padding-left: 1rem; border-left: 2px solid currentColor; opacity: .9 }`,
  setup: () => html`<p style="margin:.25rem 0">a component that knows nothing about themes</p>
    <demo-leaf></demo-leaf>`,
});

define('demo-provider', {
  styles: `
    :host { display: grid; gap: .6rem; font: inherit }
    button { font: inherit; padding: .3rem .7rem; border-radius: 6px; cursor: pointer;
      border: 1px solid currentColor; background: transparent; color: inherit; justify-self: start }
  `,
  setup(_props, host) {
    const theme = signal('light');
    // Serve it to every descendant, across shadow boundaries.
    provide(host, Theme, theme);
    return html`
      <button @click=${() => theme(theme() === 'light' ? 'dark' : 'light')}>
        toggle theme (currently ${theme})
      </button>
      <demo-middle></demo-middle>`;
  },
});
