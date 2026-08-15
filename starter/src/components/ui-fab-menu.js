// <ui-fab-menu> — a Material FAB menu: a trigger FAB that expands related
// actions stacked above it.
//
//   <ui-fab-menu>
//     <ui-fab slot="trigger" icon="add"></ui-fab>
//     <ui-fab icon="edit" label="Edit" size="sm"></ui-fab>
//     <ui-fab icon="send" label="Send" size="sm"></ui-fab>
//   </ui-fab-menu>
//
// The PARENT may pass `open`; clicking the trigger toggles it and emits
// `open`/`close`. Choosing an action emits `select` (the action's click still
// bubbles) and closes the menu.
//
// @prop  {boolean} open=false
// @prop  {string}  label='' — accessible name for the action list
// @event open  — menu visible (after the enter animation)
// @event close — menu removed (after the exit animation)
// @slot  trigger  — the <ui-fab> that toggles the menu
// @slot  (default) — related <ui-fab> actions
// @part  actions, trigger
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars } from 'alacris';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import { presence } from '../motion/presence.js';
import { fx } from '../motion/animate.js';
import './ui-fab.js';

const t = vars('ui-fab-menu', {
  gap: sys.space(4),
});

const styles = css`
  :host {
    display: inline-flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: ${t.gap};
  }
  .actions {
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: ${t.gap};
  }
  .trigger { display: inline-flex; }
`;

define('ui-fab-menu', {
  props: { open: false, label: '' },
  styles: [base, styles],
  setup({ open, label }, host) {
    host.addEventListener('click', (e) => {
      const trigger = host.querySelector('[slot="trigger"]');
      if (trigger && e.composedPath().includes(trigger)) {
        open.set(!open.peek());
        return;
      }
      if (open.peek() && host.contains(e.target) && e.target !== host) {
        open.set(false);
      }
    });

    const actionsView = () => html`
      <div class="actions" part="actions" role="menu"
           aria-label=${() => label() || 'Actions'}>
        <slot></slot>
      </div>`;

    return html`
      <div class="trigger" part="trigger">
        <slot name="trigger"></slot>
      </div>
      ${presence(open, actionsView, {
        enter: fx.scaleIn,
        exit: fx.scaleOut,
        enterDuration: 'short4',
        exitDuration: 'short2',
        onEntered: () => host.emit('open'),
        onExited: () => host.emit('close'),
      })}`;
  },
});

export const tag = 'ui-fab-menu';
export const themeVars = t;
