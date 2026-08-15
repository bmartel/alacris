// Feedback — alerts, progress, spinners, skeletons, snackbars, backdrop.

import { html, signal } from 'alacris';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-alert.js';
import '../src/components/ui-progress.js';
import '../src/components/ui-spinner.js';
import '../src/components/ui-skeleton.js';
import '../src/components/ui-backdrop.js';
import { showSnackbar } from '../src/components/ui-snackbar.js';
import '../src/components/ui-button.js';

export const title = 'Feedback';

const SEVERITIES = ['info', 'success', 'warning', 'error'];

const alertRow = (variant) =>
  SEVERITIES.map(
    (s) => html`
      <ui-alert severity=${s} variant=${variant} title=${s[0].toUpperCase() + s.slice(1)}>
        A ${variant} ${s} alert — something you should know about.
      </ui-alert>`,
  );

export const section = () => {
  const dismissed = signal(false);
  const progress = signal(30);
  const snackOpen = signal(false);
  const backdropOpen = signal(false);

  return html`
    ${stackBlock('Alert — tonal', alertRow('tonal'))}
    ${stackBlock('Alert — filled', alertRow('filled'))}
    ${stackBlock('Alert — outlined', alertRow('outlined'))}

    ${stackBlock(
      'Alert — dismissible',
      html`${() =>
        dismissed()
          ? html`<ui-button variant="text" @click=${() => dismissed(false)}>Show it again</ui-button>`
          : html`
              <ui-alert severity="success" title="Saved" dismissible @dismiss=${() => dismissed(true)}>
                Your changes are safe. Dismiss me — I collapse away.
                <ui-button slot="action" variant="text">Undo</ui-button>
              </ui-alert>`}`,
    )}

    ${stackBlock(
      'Linear progress',
      html`
        <ui-progress label="Upload progress" value=${progress}></ui-progress>
        <div class="demo-row">
          <ui-button variant="tonal" @click=${() => progress((progress() + 10) % 110)}>
            Advance ${() => Math.round(progress())}%
          </ui-button>
        </div>
        <ui-progress label="Loading"></ui-progress>`,
    )}

    ${block(
      'Circular progress',
      html`
        <ui-spinner label="Loading" size="24px"></ui-spinner>
        <ui-spinner label="Loading"></ui-spinner>
        <ui-spinner label="Loading" size="56px"></ui-spinner>
        <ui-spinner label="Upload progress" value=${progress}></ui-spinner>
        <ui-spinner label="Upload progress" value=${progress} size="56px"></ui-spinner>`,
    )}

    ${block(
      'Skeleton',
      html`
        <div style="display: flex; gap: 16px; align-items: flex-start; inline-size: 320px;">
          <ui-skeleton variant="circular" width="40px" height="40px" animation="wave"></ui-skeleton>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <ui-skeleton animation="wave" width="60%"></ui-skeleton>
            <ui-skeleton animation="wave"></ui-skeleton>
            <ui-skeleton variant="rectangular" height="96px"></ui-skeleton>
            <ui-skeleton width="80%"></ui-skeleton>
          </div>
        </div>`,
    )}

    ${block(
      'Snackbar',
      html`
        <ui-button
          @click=${() =>
            showSnackbar('Message archived', { action: 'Undo', duration: 4000 })}>
          Service snackbar
        </ui-button>
        <ui-button
          variant="tonal"
          @click=${() => {
            showSnackbar('First in the queue', { duration: 2000 });
            showSnackbar('Second, right after', { duration: 2000 });
          }}>
          Queue two
        </ui-button>
        <ui-button variant="outlined" @click=${() => snackOpen(true)}>Declarative snackbar</ui-button>
        <ui-snackbar
          open=${snackOpen}
          message="Declarative snackbar — sticky until closed"
          action="Got it"
          closeButton
          duration="0"
          @close=${() => snackOpen(false)}></ui-snackbar>`,
    )}

    ${block(
      'Backdrop',
      html`
        <ui-button @click=${() => backdropOpen(true)}>Show backdrop (click it to close)</ui-button>
        <ui-backdrop open=${backdropOpen} @close=${() => backdropOpen(false)}></ui-backdrop>`,
    )}`;
};
