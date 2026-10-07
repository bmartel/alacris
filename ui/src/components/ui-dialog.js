// <ui-dialog> — a modal dialog.
//
//   <ui-dialog open=${open} @close=${() => open(false)}>
//     <span slot="headline">Discard draft?</span>
//     Your changes will be lost.
//     <ui-button slot="actions" variant="text">Cancel</ui-button>
//     <ui-button slot="actions">Discard</ui-button>
//   </ui-dialog>
//
// Opening: set the `open` prop (pass a signal from the parent to stay live).
// The dialog animates in, traps focus, and locks page scroll. It requests
// closing by emitting `close` with a reason — the PARENT owns the state and
// flips the signal; Escape and scrim clicks emit `close` too (unless
// `persistent`).
//
// @prop  {boolean} open=false
// @prop  {boolean} persistent=false — Escape/scrim do not request closing
// @prop  {string}  label=''         — accessible name if no headline slot
// @event close  — detail: { reason: 'esc' | 'scrim' | 'method' }
// @event opened — enter animation finished
// @event closed — exit animation finished, DOM removed
// @slot  (default) — body content
// @slot  headline
// @slot  actions   — right-aligned buttons
// @part  scrim, surface, headline, body, actions
// @vars  see `t` below

import { define, html, css, vars, effect, onCleanup, signal } from '@alacris/core';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import { presence } from '../motion/presence.js';
import { animate, fx, releaseFill } from '../motion/animate.js';
import { focusTrap, scrollLock } from '../util/focus.js';
import { overlayOn, visiblePadding, fitToViewport } from '../util/viewport.js';

const t = vars('ui-dialog', {
  bg: sys.color.surfaceContainerHigh,
  fg: sys.color.onSurface,
  headlineFg: sys.color.onSurface,
  radius: sys.radius.xl,
  width: 'min(560px, calc(100vw - 48px))',
  scrim: `color-mix(in srgb, ${sys.color.scrim} 32%, transparent)`,
});

const styles = css`
  :host { display: contents; }
  ${overlayOn('.overlay')}
  .overlay {
    z-index: ${sys.z.modal};
    display: flex;
    align-items: center;
    justify-content: center;
    /* The overlay is sized by its insets (the visible viewport, not 100vh);
       the padding keeps the surface clear of the keyboard and screen cutouts. */
    ${visiblePadding('24px')}
  }
  .overlay:popover-open {
    display: flex;
  }
  /* With the keyboard up every pixel counts: keep only a small margin. */
  .overlay[data-keyboard] {
    padding-top: calc(var(--ui-vv-top, 0px) + max(8px, env(safe-area-inset-top, 0px)));
    padding-bottom: calc(var(--ui-vv-bottom, 0px) + 8px);
  }
  .scrim { position: absolute; inset: 0; background: ${t.scrim}; }
  .surface {
    position: relative;
    display: flex;
    flex-direction: column;
    inline-size: ${t.width};
    max-inline-size: 100%;
    max-block-size: 100%;
    min-block-size: 0;
    /* Last resort on a tiny visible area (landscape phone + keyboard): when
       even headline + actions do not fit, the whole surface scrolls so the
       actions are still reachable. Normally only the body scrolls. */
    overflow: auto;
    overscroll-behavior: contain;
    background: ${t.bg};
    color: ${t.fg};
    border-radius: ${t.radius};
    box-shadow: ${sys.elevation[3]};
    padding: ${sys.space(6)};
    gap: ${sys.space(4)};
  }
  .headline {
    flex: none;
    font: ${sys.type.headlineSm};
    letter-spacing: ${sys.tracking.headlineSm};
    color: ${t.headlineFg};
  }
  .headline:not(.has) { display: none; }
  /* Only the body scrolls, so the headline and actions stay on screen. */
  .body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
    font: ${sys.type.bodyMd};
    letter-spacing: ${sys.tracking.bodyMd};
    color: ${sys.color.onSurfaceVariant};
  }
  .actions {
    flex: none;
    display: flex;
    justify-content: flex-end;
    gap: ${sys.space(2)};
  }
  .actions:not(.has) { display: none; }
`;

define('ui-dialog', {
  props: { open: false, persistent: false, label: '' },
  styles: [base, styles],
  setup({ open, persistent, label }, host) {
    let releaseTrap = null;
    let unlock = null;
    let surfaceEl = null;
    const hasHeadline = signal(false);

    const requestClose = (reason) => {
      if (reason !== 'method' && persistent()) return;
      host.emit('close', { reason });
    };


    // Escape must work wherever focus is, so listen at the document while
    // open (capture beats stopPropagation games in page code).
    const onDocKeydown = (e) => {
      if (e.key === 'Escape') requestClose('esc');
    };

    // Trap focus + lock scroll exactly while open; presence handles the DOM.
    let prevActive = null;
    effect(() => {
      if (open()) {
        prevActive = document.activeElement;
        document.addEventListener('keydown', onDocKeydown, true);
        unlock = scrollLock();
        // The surface renders synchronously with the signal write, but wait a
        // microtask so slotted content is distributed before we look for it.
        queueMicrotask(() => {
          if (open() && !releaseTrap) releaseTrap = focusTrap(host, { restore: prevActive });
        });
      } else {
        document.removeEventListener('keydown', onDocKeydown, true);
        releaseTrap?.();
        releaseTrap = null;
        prevActive = null;
        unlock?.();
        unlock = null;
        if (surfaceEl?.isConnected) {
          animate(surfaceEl, fx.scaleOut, { duration: 'short4', easing: 'emphasizedAccelerate' });
        }
      }
    });
    onCleanup(() => {
      document.removeEventListener('keydown', onDocKeydown, true);
      releaseTrap?.();
      unlock?.();
      stopFit?.();
    });

    const hasSlot = (el, set) => {
      const sync = () => set(el.assignedElements().length > 0);
      el.addEventListener('slotchange', sync);
      sync();
    };

    const surfaceRef = (el) => {
      surfaceEl = el;
      releaseFill(animate(el, fx.scaleIn, { duration: 'medium2', easing: 'emphasizedDecelerate' }));
    };

    let stopFit = null;
    const overlayRef = (el) => {
      stopFit?.();
      stopFit = fitToViewport(el, host);
      queueMicrotask(() => {
        try {
          if (el.isConnected) el.showPopover?.();
        } catch {}
      });
    };

    const view = () => html`
      <div class="overlay" popover="manual" ref=${overlayRef}>
        <div class="scrim" part="scrim" aria-hidden="true" @click=${() => requestClose('scrim')}></div>
        <div class="surface" part="surface" role="dialog" aria-modal="true"
             aria-labelledby=${() => (hasHeadline() ? 'headline' : null)}
             aria-label=${() => (hasHeadline() ? null : (label() || 'Dialog'))}
             tabindex="-1" ref=${surfaceRef}>
          <div class="headline" part="headline" id="headline"
               ref=${(el) => hasSlot(el.querySelector('slot'), (has) => {
                 hasHeadline.set(has);
                 el.classList.toggle('has', has);
               })}>
            <slot name="headline"></slot>
          </div>
          <div class="body" part="body"><slot></slot></div>
          <div class="actions" part="actions"
               ref=${(el) => hasSlot(el.querySelector('slot'), (has) => el.classList.toggle('has', has))}>
            <slot name="actions"></slot>
          </div>
        </div>
      </div>`;

    return html`${presence(open, view, {
      enter: fx.fadeIn,
      exit: fx.fadeOut,
      exitDuration: 'short4',
      onEntered: () => host.emit('opened'),
      onExited: () => {
        stopFit?.();
        stopFit = null;
        host.emit('closed');
      },
    })}`;
  },
});

export const tag = 'ui-dialog';
export const themeVars = t;
