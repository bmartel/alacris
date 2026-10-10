// <ui-chat-composer> — the prompt box of a chat, in the Material 3 style of
// Gemini: one rounded surface holding an add button with its menu, a text
// area that grows with what is typed, an optional picker (a model or mode),
// trailing actions (a microphone) and a round Send button that turns into
// Stop while a reply streams. Attachments show as chips above the text, files
// pasted or dropped on the surface are reported, a counter appears near
// `maxlength`, and a short caption can sit under the surface.
//
//   <ui-chat-composer label="Message" placeholder="Ask anything"
//                     .value=${draft} ?busy=${streaming}
//                     @input=${(e) => e.detail && draft.set(e.detail.value)}
//                     @send=${(e) => ask(e.detail.value)} @stop=${stop}>
//     <ui-menu-item slot="menu" value="file" icon="attach-file">Attach a file</ui-menu-item>
//     <ui-menu slot="picker" placement="top-end">…a text button and its items…</ui-menu>
//     <ui-tooltip slot="trailing" text="Dictate"><ui-icon-button icon="mic" label="Dictate"></ui-icon-button></ui-tooltip>
//   </ui-chat-composer>
//
// Enter sends and Shift+Enter starts a new line (`submit`), never while an
// input method is composing. The text area grows from one line to `maxRows`,
// then scrolls; at the bottom of a column the surface grows upward. Wide
// hosts lay everything out on one row; narrower ones put the text above a row
// of actions (`layout`); below `compactWidth` the picker slot is hidden and
// the host gets `data-compact`, so the app can offer the picker's choices in
// the add menu instead (`layoutchange`). Attachment chips are not buttons:
// each has its own remove button beside its name, never nested in another
// control.
//
// @prop  {string}  value=''         — the text (two-way: listen to `input`)
// @prop  {string}  label=''         — accessible name of the text area (falls back to `placeholder`)
// @prop  {string}  placeholder=''
// @prop  {boolean} disabled=false
// @prop  {boolean} busy=false       — a reply is coming: Send becomes Stop and Enter does not send
// @prop  {number}  maxlength=0      — >0 enforces it; a quiet counter shows past 90% of it
// @prop  {number}  maxRows=8        — lines the text area grows to before it scrolls (attribute `max-rows`)
// @prop  {string}  submit='enter'   — enter (Enter sends, Shift+Enter is a new line) |
//                                     mod-enter (Ctrl/⌘+Enter sends) | none
// @prop  {string}  layout='auto'    — auto (inline from 560px wide, else stacked) | inline | stacked
// @prop  {number}  compactWidth=300 — narrower than this the picker slot is hidden (attribute `compact-width`)
// @prop  {boolean} allowFiles=false — files pasted into or dropped on the surface emit `files` (attribute `allow-files`)
// @prop  {Array}   attachments=[]   — chips above the text: [{ id, name, thumbnail?, icon? }]
// @prop  {string}  caption=''       — a short note centered under the surface
// @prop  {string}  sendLabel='Send'
// @prop  {string}  stopLabel='Stop'
// @prop  {string}  addLabel='Add'   — the add button's name and tooltip
// @prop  {string}  removeLabel='Remove' — prefixes each attachment's name on its remove button
// @prop  {string}  attachmentsLabel='Attachments'
// @event input  — every edit (not mid-composition), and '' after a send; detail: { value }
// @event send   — Send or the submit key with text or attachments; detail: { value, attachments }.
//                 Cancelable: unless prevented, the text clears.
// @event stop   — Stop was pressed while busy
// @event select — an item of the add menu was chosen; detail: { value }
// @event files  — files were pasted or dropped (`allowFiles`); detail: { files, source: 'paste' | 'drop' }
// @event remove — an attachment's remove button; detail: { id }
// @event layoutchange — the resolved layout changed; detail: { layout: 'inline' | 'stacked', compact }
// @slot  leading  — replaces the add button and its menu
// @slot  menu     — <ui-menu-item> children of the add menu (the add button shows only with some)
// @slot  picker   — a picker between the text and the trailing actions; hidden when compact
// @slot  trailing — actions before Send (a microphone)
// @slot  caption  — rich caption content (replaces `caption`)
// @part  surface, input, attachments, attachment, counter, send, caption
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, computed, signal, effect, each, onCleanup } from '@alacris/core';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import './ui-icon.js';
import './ui-icon-button.js';
import './ui-menu.js';
import './ui-menu-item.js';
import './ui-tooltip.js';

const t = vars('ui-chat-composer', {
  bg: sys.color.surfaceContainerHigh,
  fg: sys.color.onSurface,
  placeholderFg: sys.color.onSurfaceVariant,
  radius: sys.radius.xl,
  elevation: sys.elevation[1],
  padding: sys.space(2),
  gap: sys.space(1),
  font: sys.type.bodyLg,
  tracking: sys.tracking.bodyLg,
  focusColor: sys.color.primary,
  dropBg: sys.color.secondaryContainer,
  chipBg: sys.color.surfaceContainerLowest,
  chipBorder: sys.color.outlineVariant,
  chipRadius: sys.radius.md,
  counterFg: sys.color.onSurfaceVariant,
  captionFg: sys.color.onSurfaceVariant,
  captionFont: sys.type.bodySm,
});

/** Below this width `layout="auto"` stacks the text above the actions. */
const INLINE_MIN = 560;

const styles = css`
  :host { display: block; }
  .surface {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto auto auto;
    grid-template-areas:
      "files files files files files files"
      "lead input picker trail count send";
    align-items: end;
    column-gap: ${t.gap};
    padding: ${t.padding};
    border-radius: ${t.radius};
    background: ${t.bg};
    color: ${t.fg};
    box-shadow: ${t.elevation};
    outline: 2px solid transparent;
    outline-offset: -2px;
    transition: outline-color ${sys.duration.short2} ${sys.easing.standard},
                background-color ${sys.duration.short2} ${sys.easing.standard};
  }
  .stacked .surface {
    grid-template-areas:
      "files files files files files files"
      "input input input input input input"
      "lead . picker trail count send";
  }
  .focused .surface { outline-color: ${t.focusColor}; }
  .dropping .surface {
    outline: 2px dashed ${t.focusColor};
    background: ${t.dropBg};
  }
  .disabled textarea { opacity: ${sys.state.disabledContent}; }

  .lead { grid-area: lead; display: flex; align-items: center; }
  .picker { grid-area: picker; display: flex; align-items: center; min-inline-size: 0; }
  .trail { grid-area: trail; display: flex; align-items: center; gap: ${t.gap}; }
  .send { grid-area: send; display: flex; align-items: center; }
  .compact .picker { display: none; }
  .lead:not(.has), .picker:not(.has), .trail:not(.has) { display: none; }

  .input {
    grid-area: input;
    display: flex;
    min-inline-size: 0;
  }
  textarea {
    flex: 1;
    min-inline-size: 0;
    margin: 0;
    border: none;
    outline: none;
    appearance: none;
    resize: none;
    background: transparent;
    color: inherit;
    font: ${t.font};
    letter-spacing: ${t.tracking};
    /* One line high at rest, as tall as a 40px button beside it. */
    padding: ${sys.space(2)} ${sys.space(2)};
    field-sizing: content;
    min-block-size: calc(1lh + 2 * ${sys.space(2)});
    max-block-size: calc(var(--_rows, 8) * 1lh + 2 * ${sys.space(2)});
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .stacked textarea { padding-block-end: 0; min-block-size: calc(1lh + ${sys.space(2)}); max-block-size: calc(var(--_rows, 8) * 1lh + ${sys.space(2)}); }
  textarea::placeholder { color: ${t.placeholderFg}; opacity: 1; }
  textarea:disabled { cursor: default; }

  .attachments {
    grid-area: files;
    display: flex;
    flex-wrap: wrap;
    gap: ${sys.space(2)};
    margin: 0;
    padding: ${sys.space(1)} ${sys.space(1)} ${sys.space(2)};
    list-style: none;
  }
  .attachment {
    display: inline-flex;
    align-items: center;
    gap: ${sys.space(2)};
    max-inline-size: 100%;
    block-size: 48px;
    padding-inline: ${sys.space(1)} 0;
    border: 1px solid ${t.chipBorder};
    border-radius: ${t.chipRadius};
    background: ${t.chipBg};
    font: ${sys.type.labelLg};
    letter-spacing: ${sys.tracking.labelLg};
    --ui-icon-size: 1.25rem;
    --ui-icon-button-size: 40px;
  }
  .thumb {
    flex: none;
    inline-size: 36px;
    block-size: 36px;
    border-radius: ${sys.radius.sm};
    object-fit: cover;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${sys.color.surfaceContainerHighest};
    color: ${sys.color.onSurfaceVariant};
  }
  .name {
    min-inline-size: 0;
    max-inline-size: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    grid-area: count;
    align-self: center;
    padding-inline: ${sys.space(2)};
    font: ${sys.type.labelSm};
    letter-spacing: ${sys.tracking.labelSm};
    color: ${t.counterFg};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .count.over { color: ${sys.color.error}; }

  .caption {
    display: block;
    padding: ${sys.space(2)} ${sys.space(4)} 0;
    text-align: center;
    font: ${t.captionFont};
    letter-spacing: ${sys.tracking.bodySm};
    color: ${t.captionFg};
  }
  .caption[hidden] { display: none; }
`;

const supportsFieldSizing = () => {
  try {
    return !!globalThis.CSS?.supports?.('field-sizing', 'content');
  } catch {
    return false;
  }
};

const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');

define('ui-chat-composer', {
  props: {
    value: '', label: '', placeholder: '', disabled: false, busy: false,
    maxlength: 0, maxRows: 8, submit: 'enter', layout: 'auto', compactWidth: 300,
    allowFiles: false, attachments: [], caption: '',
    sendLabel: 'Send', stopLabel: 'Stop', addLabel: 'Add', removeLabel: 'Remove',
    attachmentsLabel: 'Attachments',
  },
  styles: [base, styles],
  setup(p, host) {
    const {
      value, label, placeholder, disabled, busy, maxlength, maxRows, submit, layout, compactWidth,
      allowFiles, attachments, caption, sendLabel, stopLabel, addLabel, removeLabel, attachmentsLabel,
    } = p;

    let input = null;
    let surface = null;
    host.focus = (opts) => input?.focus(opts);

    const focused = signal(false);
    const dropping = signal(false);
    const width = signal(0);
    const has = { lead: signal(false), menu: signal(false), picker: signal(false), trail: signal(false), caption: signal(false) };
    const watch = (key) => (el) => {
      const sync = () => has[key].set(el.assignedElements({ flatten: true }).length > 0);
      el.addEventListener('slotchange', sync);
      sync();
    };

    const list = computed(() => (Array.isArray(attachments()) ? attachments() : []));
    const resolved = computed(() => {
      const l = layout();
      if (l === 'inline' || l === 'stacked') return l;
      return width() && width() < INLINE_MIN ? 'stacked' : width() ? 'inline' : 'stacked';
    });
    const compact = computed(() => width() > 0 && width() < Number(compactWidth()));
    const cls = computed(() =>
      ['root', resolved(), compact() && 'compact', focused() && 'focused', dropping() && 'dropping',
       disabled() && 'disabled'].filter(Boolean).join(' '));

    // Width from a ResizeObserver: it reports before the first paint, so the
    // stacked or inline layout is right from the start.
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(([entry]) => width.set(Math.round(entry.contentRect.width)));
      ro.observe(host);
      onCleanup(() => ro.disconnect());
    }
    let said = 'stacked:false';
    effect(() => {
      const state = `${resolved()}:${compact()}`;
      host.dataset.layout = resolved();
      host.toggleAttribute('data-compact', compact());
      if (state === said) return;
      said = state;
      host.emit('layoutchange', { layout: resolved(), compact: compact() });
    });

    // Grow with the text where `field-sizing: content` isn't supported.
    const native = supportsFieldSizing();
    const fit = () => {
      if (native || !input) return;
      const style = getComputedStyle(input);
      const line = parseFloat(style.lineHeight);
      if (!line) return;
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      input.style.blockSize = 'auto';
      const max = line * Math.max(1, Number(maxRows()) || 8) + pad;
      input.style.blockSize = `${Math.min(input.scrollHeight, max)}px`;
    };
    effect(() => {
      value();
      maxRows();
      resolved();
      queueMicrotask(fit);
    });

    const canSend = computed(() => !disabled() && (value().trim() !== '' || list().length > 0));
    const send = () => {
      if (busy() || !canSend()) return;
      const sent = host.emit('send', { value: value(), attachments: list() }, { cancelable: true });
      if (!sent) return;
      value.set('');
      host.emit('input', { value: '' });
    };
    const stop = () => host.emit('stop');

    let composing = false;
    const onInput = (e) => {
      if (composing) return;
      value.set(e.target.value);
      host.emit('input', { value: value() });
    };
    const onKeydown = (e) => {
      if (e.key !== 'Enter' || composing || e.isComposing || e.keyCode === 229) return;
      const mod = e.metaKey || e.ctrlKey;
      const mode = submit();
      const sends = mode === 'enter' ? !e.shiftKey && !e.altKey : mode === 'mod-enter' ? mod : false;
      if (!sends) return;
      e.preventDefault();
      send();
    };
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (!allowFiles() || !files.length || disabled()) return;
      e.preventDefault();
      host.emit('files', { files, source: 'paste' });
    };
    const onDragOver = (e) => {
      if (!allowFiles() || disabled() || !hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      dropping.set(true);
    };
    // Listeners are delegated: e.currentTarget is not the surface, so compare with its ref.
    const onDragLeave = (e) => {
      if (surface?.contains(e.relatedTarget)) return;
      dropping.set(false);
    };
    // A press on the surface around the text (not on a control) puts the cursor in it.
    const onSurfaceClick = (e) => {
      const target = e.composedPath()[0];
      if (disabled() || !(target instanceof Element)) return;
      if (target === surface || target.matches('.input, .lead, .picker, .trail, .send, .attachments')) input?.focus();
    };
    const onDrop = (e) => {
      if (!dropping()) return;
      e.preventDefault();
      dropping.set(false);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) host.emit('files', { files, source: 'drop' });
    };

    // Choosing an item of the add menu: one `select` from the host.
    const onSelect = (e) => {
      e.stopPropagation();
      host.emit('select', { value: e.detail?.value });
      const menu = host.shadowRoot?.querySelector('ui-menu.add');
      if (menu) menu.open = false;
    };
    host.addEventListener('ui-menu-select', onSelect);
    onCleanup(() => host.removeEventListener('ui-menu-select', onSelect));

    const fmt = (n) => {
      try {
        return new Intl.NumberFormat(document.documentElement.lang || undefined).format(n);
      } catch {
        return String(n);
      }
    };
    const near = computed(() => maxlength() > 0 && value().length >= Math.floor(maxlength() * 0.9));
    const counter = computed(() => (near() ? `${fmt(value().length)} / ${fmt(maxlength())}` : ''));

    const chip = (a) => html`
      <li class="attachment" part="attachment">
        ${() => (a().thumbnail
          ? html`<img class="thumb" alt="" src=${() => a().thumbnail}>`
          : html`<span class="thumb" aria-hidden="true"><ui-icon name=${() => a().icon || 'description'}></ui-icon></span>`)}
        <span class="name" title=${() => a().name}>${() => a().name}</span>
        <ui-tooltip text=${() => `${removeLabel()} ${a().name}`}>
          <ui-icon-button icon="close" label=${() => `${removeLabel()} ${a().name}`} ?disabled=${disabled}
                          @click=${() => host.emit('remove', { id: a().id })}></ui-icon-button>
        </ui-tooltip>
      </li>`;
    const hasAttachments = computed(() => list().length > 0);

    return html`
      <div class=${cls}>
        <div class="surface" part="surface" ref=${(el) => (surface = el)} @click=${onSurfaceClick}
             @dragenter=${onDragOver} @dragover=${onDragOver} @dragleave=${onDragLeave} @drop=${onDrop}>
          ${() => (hasAttachments()
            ? html`<ul class="attachments" part="attachments" aria-label=${attachmentsLabel}>
                ${each(list, chip, (a) => a.id)}
              </ul>`
            : null)}
          <span class=${() => `lead${has.lead() || has.menu() ? ' has' : ''}`}>
            <slot name="leading" ref=${(el) => {
              el.addEventListener('slotchange', () => has.lead.set(el.assignedElements().length > 0));
              has.lead.set(el.assignedElements().length > 0);
            }}>
              <ui-menu class="add" placement="top-start" ?hidden=${() => !has.menu()}>
                <ui-tooltip slot="anchor" text=${addLabel}>
                  <ui-icon-button icon="add" label=${addLabel} ?disabled=${disabled}></ui-icon-button>
                </ui-tooltip>
                <slot name="menu" ref=${watch('menu')}></slot>
              </ui-menu>
            </slot>
          </span>
          <span class="input" style=${() => ({ '--_rows': String(Math.max(1, Number(maxRows()) || 8)) })}>
            <textarea part="input" rows="1" ref=${(el) => (input = el)}
                      .value=${value}
                      aria-label=${() => label() || placeholder() || null}
                      placeholder=${() => placeholder() || null}
                      maxlength=${() => (maxlength() > 0 ? maxlength() : null)}
                      enterkeyhint=${() => (submit() === 'none' ? null : 'send')}
                      ?disabled=${disabled}
                      @compositionstart=${() => { composing = true; }}
                      @compositionend=${(e) => { composing = false; onInput(e); }}
                      @input=${onInput} @keydown=${onKeydown} @paste=${onPaste}
                      @focus=${() => focused.set(true)} @blur=${() => focused.set(false)}></textarea>
          </span>
          <span class=${() => `picker${has.picker() ? ' has' : ''}`}><slot name="picker" ref=${watch('picker')}></slot></span>
          <span class=${() => `trail${has.trail() ? ' has' : ''}`}><slot name="trailing" ref=${watch('trail')}></slot></span>
          ${() => (counter()
            ? html`<span class=${() => `count${value().length >= maxlength() ? ' over' : ''}`} part="counter">${counter}</span>`
            : null)}
          <span class="send">
            <ui-tooltip text=${() => (busy() ? stopLabel() : sendLabel())}>
              <ui-icon-button part="send" variant="filled"
                              icon=${() => (busy() ? 'stop' : 'arrow-upward')}
                              label=${() => (busy() ? stopLabel() : sendLabel())}
                              data-action=${() => (busy() ? 'stop' : 'send')}
                              ?disabled=${() => (busy() ? disabled() : !canSend())}
                              @click=${() => (busy() ? stop() : send())}></ui-icon-button>
            </ui-tooltip>
          </span>
        </div>
        <div class="caption" part="caption" ?hidden=${() => !caption() && !has.caption()}>
          <slot name="caption" ref=${watch('caption')}>${caption}</slot>
        </div>
      </div>`;
  },
});

export const tag = 'ui-chat-composer';
export const themeVars = t;
