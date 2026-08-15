import { define, html, css, vars, adoptGlobal } from '@alacris/core';

// The component declares what it can be themed by. Each token compiles to
// var(--chip-bg, <default>), so a consumer overrides it with plain CSS.
const chip = vars('chip', {
  bg: '#eceef3',
  fg: '#16161a',
  dot: '#8a8a99',
  radius: '999px',
});

define('demo-chip', {
  props: { tone: '' },
  styles: css`
    :host {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .3rem .8rem; margin: 0 .35rem .35rem 0;
      background: ${chip.bg}; color: ${chip.fg};
      border-radius: ${chip.radius};
      font: inherit; font-size: .9rem;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: ${chip.dot} }
  `,
  setup: (p) => html`
    <span class="dot" part="dot" style=${() => ({
      '--chip-dot': p.tone() === 'warn' ? '#e8a33d' : p.tone() === 'ok' ? '#3da35d' : '',
    })}></span>
    <slot></slot>`,
});

// A consumer theming a component library it does not own: one call, every
// instance, including any created later.
const DARK = css`
  :host { --chip-bg: #22222a; --chip-fg: #f2f2f5; --chip-radius: 6px }
`;

define('demo-theme-switch', {
  styles: `
    :host { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem }
    button { font: inherit; padding: .35rem .7rem; border-radius: 6px; cursor: pointer;
      border: 1px solid currentColor; background: transparent; color: inherit }
  `,
  setup() {
    let undoTheme = null;
    let partRule = null;

    const toggleTheme = () => {
      if (undoTheme) { undoTheme(); undoTheme = null; }
      else undoTheme = adoptGlobal(DARK);
    };
    const togglePart = () => {
      if (partRule) { partRule.remove(); partRule = null; return; }
      partRule = document.createElement('style');
      partRule.textContent = 'demo-chip::part(dot) { width: 16px; height: 16px }';
      document.head.append(partRule);
    };

    return html`
      <button @click=${toggleTheme}>toggle global theme</button>
      <button @click=${togglePart}>toggle ::part rule</button>`;
  },
});
