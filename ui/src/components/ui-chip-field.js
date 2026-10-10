// <ui-chip-field> — a text field that holds its values as input chips, with a
// filtering listbox: tags, labels, a select or multi-select.
//
//   <ui-chip-field label="Tags" variant="outlined" multiple allow-create
//                  .options=${[{ value: 'work', color: 'tertiary' }, 'home']}
//                  .value=${['work']}
//                  @change=${(e) => save(e.detail.value)}></ui-chip-field>
//
// The container is <ui-text-field>'s, pixel for pixel: filled or outlined, a
// 56px minimum height, the notched floating label (floated while it holds
// chips, has text or focus), the same paddings, hover, focus, error and
// disabled states, supporting text under it, and leading / trailing icons.
// The chips are MD3 input chips (32px, 8px corners, 8px apart) followed by
// the text input; the field grows a row at a time when they wrap. Each chip
// has its own remove button (a sibling of the label, never inside another
// button). The dropdown indicator is the trailing icon: it toggles the
// listbox and turns while it is open.
//
// Typing filters the options (case and accents ignored) in a listbox that
// sits in the top layer, anchored to the field, at least as wide as it, and
// flips above it near the bottom of the window. While typing, the exact
// match (else the first option listed) is active; ArrowDown / ArrowUp move
// it (Alt+ArrowDown only opens) and Enter picks it. With `allowCreate`, what
// was typed is offered as the last option, "Create “…”" (active, so Enter
// creates it, when nothing matches). In
// `multiple` mode picking toggles an option and the listbox stays open, and
// a comma (typed or pasted) ends a value; otherwise a pick replaces the one chip and
// closes it. Backspace in an empty input (or ArrowLeft at its start,
// ArrowRight in RTL) moves to the last chip's remove button; there Backspace
// / Delete / Enter / Space remove it, the arrows move between chips and
// Escape goes back to the input. Leaving the field picks an exact match of
// what was typed and drops any other text (nothing is created by leaving).
// Escape closes the listbox.
//
// Accessibility: the input is a `combobox` (aria-expanded, aria-controls,
// aria-activedescendant) named by the label and described by the chips it
// holds; options carry `aria-selected` (and the listbox
// `aria-multiselectable` in multiple mode). Adding or removing a chip is
// announced politely.
//
// `value` is an array of option values in `multiple` mode, else a string
// ('' for none). `options` are strings or { value, label, color } objects;
// `color` tints the chip: a role name ('primary' | 'secondary' | 'tertiary'
// | 'error' — that role's container colours) or any CSS colour (a light
// wash of it). Values not among the options still show, as themselves.
//
// `strings` overrides the built-in English text, any subset of:
//   { remove: 'Remove {label}', create: 'Create “{query}”',
//     added: '{label} added', removed: '{label} removed',
//     showOptions, hideOptions, options }
//
// Methods: `focus(options)` focuses the text input.
//
// @prop  {string}  variant='filled'  — filled | outlined
// @prop  {string}  label=''
// @prop  {string|Array} value=''     — string (single) or array (multiple)
// @prop  {Array}   options=[]        — strings or { value, label, color }
// @prop  {boolean} multiple=false    — several chips; picking toggles
// @prop  {boolean} allowCreate=false — Enter on text with no match creates it
// @prop  {string}  placeholder=''
// @prop  {string}  helper=''         — supporting text under the field
// @prop  {string}  error=''          — error message; non-empty switches to error state
// @prop  {boolean} disabled=false
// @prop  {boolean} required=false
// @prop  {string}  name=''           — form participation (multiple: comma-joined)
// @prop  {object}  strings=null      — localized text (see above)
// @event change — the value changed (a pick, a create or a removal); detail: { value }
// @event create — a new value was created from the text; detail: { value }
//                 (followed by `change`)
// @event input  — every keystroke; detail: { value } (the raw text)
// @event open   — listbox visible (after the enter animation); does not bubble
// @event close  — listbox removed (after the exit animation); does not bubble
// @slot  leading  — icon before the chips
// @slot  trailing — replaces the dropdown indicator
// @part  field, input, label, helper, chip, panel, option
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, computed, signal, effect, onCleanup, each, untrack } from '@alacris/core';
import { sys } from '../tokens/sys.js';
import { base, focusRingOn } from './base.js';
import { formBind } from '../util/form.js';
import { escapeLayer } from '../util/keys.js';
import { presence } from '../motion/presence.js';
import { fx } from '../motion/animate.js';
import { ripple } from '../motion/ripple.js';
import { autoUpdate } from '../util/position.js';
import { popupEvent } from '../util/popup.js';
import { isRtl } from '../util/dir.js';
import './ui-icon.js';

const t = vars('ui-chip-field', {
  bg: sys.color.surfaceContainerHighest,
  fg: sys.color.onSurface,
  labelFg: sys.color.onSurfaceVariant,
  accent: sys.color.primary,
  errorFg: sys.color.error,
  outlineColor: sys.color.outline,
  radius: sys.radius.xs,
  font: sys.type.bodyLg,
  height: '56px',
  chipHeight: '32px',
  chipRadius: sys.radius.sm,
  chipFont: sys.type.labelLg,
  chipFg: sys.color.onSurfaceVariant,
  chipLabelFg: sys.color.onSurface,
  chipOutline: sys.color.outlineVariant,
  chipSelectedBg: sys.color.secondaryContainer,
  chipSelectedFg: sys.color.onSecondaryContainer,
  panelBg: sys.color.surfaceContainer,
});

const STRINGS = {
  remove: 'Remove {label}',
  create: 'Create “{query}”',
  added: '{label} added',
  removed: '{label} removed',
  showOptions: 'Show options',
  hideOptions: 'Hide options',
  options: 'Options',
};

// Role names a chip's `color` may give: that role's container pair.
const ROLES = {
  primary: [sys.color.primaryContainer, sys.color.onPrimaryContainer],
  secondary: [sys.color.secondaryContainer, sys.color.onSecondaryContainer],
  tertiary: [sys.color.tertiaryContainer, sys.color.onTertiaryContainer],
  error: [sys.color.errorContainer, sys.color.onErrorContainer],
};

/** The custom properties that tint a chip (or an option's label) in `color`. */
const tint = (color) => {
  if (!color) return null;
  const role = ROLES[color];
  return role
    ? { '--_tint-bg': role[0], '--_tint-fg': role[1] }
    : { '--_tint-bg': `color-mix(in srgb, ${color} 22%, transparent)`, '--_tint-fg': sys.color.onSurface };
};

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fill = (s, vals) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
const sameList = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);

const styles = css`
  :host { display: block; inline-size: 240px; }
  .root { display: block; position: relative; }
  .field {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${sys.space(2)};
    min-block-size: calc(${t.height} + var(--ui-density, 0) * 4px);
    padding-inline: ${sys.space(4)} ${sys.space(1)};
    border-radius: ${t.radius};
    font: ${t.font};
    color: ${t.fg};
    cursor: text;
    --ui-icon-size: 1.5rem;
  }
  .filled .field {
    background: ${t.bg};
    border-start-start-radius: ${t.radius};
    border-start-end-radius: ${t.radius};
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }
  .filled .field::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: 1px;
    background: ${sys.color.onSurfaceVariant};
    transition: block-size ${sys.duration.short2} ${sys.easing.standard},
                background-color ${sys.duration.short2} ${sys.easing.standard};
  }
  .filled.focused .field::after { block-size: 2px; background: ${t.accent}; }
  .filled.error .field::after { background: ${t.errorFg}; }
  .filled .filled-hover {
    position: absolute; inset: 0; pointer-events: none;
    background: ${sys.color.onSurface};
    opacity: 0;
    border-radius: inherit;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .filled:hover:not(.focused):not(.error):not(.disabled) .filled-hover {
    opacity: ${sys.state.hover};
  }
  .filled:hover:not(.focused):not(.error):not(.disabled) .field::after {
    background: ${sys.color.onSurface};
  }

  /* Outlined: a fieldset draws the border; its legend opens the label notch
     (the same geometry as <ui-text-field>). */
  fieldset {
    position: absolute;
    inset: -6px 0 0;
    margin: 0;
    padding: 0 calc(${sys.space(3)} - 2px);
    min-inline-size: 0;
    box-sizing: border-box;
    appearance: none;
    border: 1px solid ${t.outlineColor};
    border-radius: ${t.radius};
    pointer-events: none;
    transition: border-color ${sys.duration.short2} ${sys.easing.standard},
                border-width ${sys.duration.short2} ${sys.easing.standard};
  }
  legend {
    float: unset;
    display: block;
    width: max-content;
    padding: 0;
    margin: 0;
    margin-inline-start: 0;
    white-space: nowrap;
    overflow: hidden;
    font: inherit;
    font-size: 0.75rem;
    letter-spacing: inherit;
    visibility: hidden;
    max-inline-size: 0.01px;
    height: 12px;
    line-height: 12px;
    transition: max-inline-size ${sys.duration.short2} ${sys.easing.standard};
  }
  legend span {
    padding-inline: 4px 5px;
    display: inline-block;
    opacity: 0;
    visibility: visible;
  }
  .outlined.floating legend {
    max-inline-size: 100%;
    transition: max-inline-size ${sys.duration.short3} ${sys.easing.standard};
  }
  .outlined.focused fieldset { border-width: 2px; border-color: ${t.accent}; }
  .outlined.error fieldset { border-color: ${t.errorFg}; }
  .root:hover:not(.focused):not(.error) fieldset { border-color: ${sys.color.onSurface}; }

  /* The label sits on the first row's centre line, so a field grown by
     wrapped chips keeps it where a one-row field has it. */
  .label {
    position: absolute;
    inset-inline-start: ${sys.space(4)};
    inset-block-start: calc((${t.height} + var(--ui-density, 0) * 4px) / 2);
    translate: 0 -50%;
    color: ${t.labelFg};
    pointer-events: none;
    transform-origin: 0 50%;
    z-index: 2;
    white-space: nowrap;
    transition: inset-block-start ${sys.duration.short3} ${sys.easing.standard},
                inset-inline-start ${sys.duration.short3} ${sys.easing.standard},
                translate ${sys.duration.short3} ${sys.easing.standard},
                font-size ${sys.duration.short3} ${sys.easing.standard},
                color ${sys.duration.short2} ${sys.easing.standard};
  }
  .with-leading .label { inset-inline-start: calc(${sys.space(4)} + 1.5rem + ${sys.space(2)}); }
  .filled.floating .label { translate: 0 calc(-50% - 16px); font-size: 0.75rem; }
  .outlined.floating .label {
    inset-inline-start: ${sys.space(4)};
    inset-block-start: 0;
    translate: 0 -50%;
    font-size: 0.75rem;
  }
  .focused .label { color: ${t.accent}; }
  .error .label { color: ${t.errorFg}; }

  /* Chips and the input share the rows: (56 - 32) / 2 above and below one row. */
  .content {
    flex: 1;
    min-inline-size: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${sys.space(2)};
    padding-block: calc((${t.height} - ${t.chipHeight}) / 2);
  }
  /* Filled with a label: the rows start under the floated label. */
  .filled.has-label .content { padding-block: 21px 3px; }
  .chips { display: contents; }

  input {
    flex: 1 0 4rem;
    min-inline-size: 0;
    block-size: calc(${t.chipHeight} + var(--ui-density, 0) * 4px);
    margin: 0;
    border: none;
    outline: none;
    appearance: none;
    background: transparent;
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
    padding: 0;
  }
  input::placeholder { color: ${t.labelFg}; opacity: 0; transition: opacity ${sys.duration.short2} linear; }
  .floating input::placeholder { opacity: 1; }

  .chip {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    max-inline-size: 100%;
    min-inline-size: 0;
    block-size: calc(${t.chipHeight} + var(--ui-density, 0) * 4px);
    padding-inline: ${sys.space(3)} ${sys.space(1)};
    border: 1px solid ${t.chipOutline};
    border-radius: ${t.chipRadius};
    font: ${t.chipFont};
    letter-spacing: ${sys.tracking.labelLg};
    color: ${t.chipFg};
    background: transparent;
    cursor: default;
    transition: background-color ${sys.duration.short2} ${sys.easing.standard},
                border-color ${sys.duration.short2} ${sys.easing.standard};
    --ui-icon-size: 1.125rem;
  }
  .chip .chip-label {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${t.chipLabelFg};
  }
  .chip.tinted { background: var(--_tint-bg); border-color: transparent; }
  .chip.tinted, .chip.tinted .chip-label { color: var(--_tint-fg); }
  .chip-layer {
    position: absolute; inset: 0; z-index: -1;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .chip:hover .chip-layer { opacity: ${sys.state.hover}; }
  /* Its remove button holds the keyboard: the MD3 selected input chip. */
  .chip:has(.chip-remove:focus-visible) {
    background: ${t.chipSelectedBg};
    border-color: transparent;
    outline: var(--ui-focus-ring);
    outline-offset: var(--ui-focus-ring-offset);
  }
  .chip:has(.chip-remove:focus-visible) .chip-label { color: ${t.chipSelectedFg}; }
  .chip.tinted:has(.chip-remove:focus-visible) { background: var(--_tint-bg); }
  .chip-remove {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    inline-size: 24px;
    block-size: 24px;
    margin: 0;
    margin-inline-start: ${sys.space(1)};
    padding: 0;
    border: none;
    border-radius: ${sys.radius.full};
    background: transparent;
    color: inherit;
    cursor: pointer;
    outline: none;
  }
  .chip-remove .layer {
    position: absolute; inset: 0; z-index: -1;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .chip-remove:hover .layer { opacity: ${sys.state.hover}; }
  .chip-remove:active .layer { opacity: ${sys.state.pressed}; }

  /* The dropdown indicator: a 24px icon in a 40px target at the end edge,
     where <ui-date-picker> has its calendar button. */
  .toggle {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    inline-size: 40px;
    block-size: 40px;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: ${sys.radius.full};
    background: transparent;
    color: ${t.labelFg};
    cursor: pointer;
    outline: none;
  }
  ${focusRingOn('.toggle')}
  .toggle .layer {
    position: absolute; inset: 0; z-index: -1;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .toggle:hover .layer { opacity: ${sys.state.hover}; }
  .toggle:active .layer { opacity: ${sys.state.pressed}; }
  .toggle ui-icon { transition: rotate ${sys.duration.short3} ${sys.easing.standard}; }
  .expanded .toggle ui-icon { rotate: 180deg; }
  ::slotted([slot]) { color: ${t.labelFg}; }

  .below {
    display: flex;
    justify-content: space-between;
    gap: ${sys.space(4)};
    padding-inline: ${sys.space(4)};
    padding-block-start: ${sys.space(1)};
    font: ${sys.type.bodySm};
    letter-spacing: ${sys.tracking.bodySm};
    color: ${t.labelFg};
  }
  .error .below .msg { color: ${t.errorFg}; }
  .disabled { opacity: ${sys.state.disabledContent}; pointer-events: none; }

  .panel {
    position: fixed;
    z-index: ${sys.z.popup};
    min-inline-size: 112px;
    max-block-size: 40vh;
    max-block-size: 40dvh;
    overflow: auto;
    padding-block: ${sys.space(2)};
    background: ${t.panelBg};
    border-radius: ${sys.radius.xs};
    box-shadow: ${sys.elevation[2]};
    color: ${t.fg};
    transform-origin: top center;
  }
  /* In the top layer: drop the UA popover box; position() writes left/top. */
  .panel[popover] { margin: 0; inset: auto; border: none; }
  .opt {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: ${sys.space(3)};
    min-block-size: calc(48px + var(--ui-density, 0) * 4px);
    padding-inline: ${sys.space(3)};
    font: ${t.font};
    letter-spacing: ${sys.tracking.bodyLg};
    color: ${t.fg};
    cursor: pointer;
    user-select: none;
    --ui-icon-size: 1.5rem;
  }
  .opt .layer {
    position: absolute; inset: 0; z-index: -1;
    background: currentColor; opacity: 0;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .opt:hover .layer { opacity: ${sys.state.hover}; }
  .opt.active .layer { opacity: ${sys.state.focus}; }
  .opt:active .layer { opacity: ${sys.state.pressed}; }
  .opt[aria-selected='true'] { background: ${sys.color.secondaryContainer}; color: ${sys.color.onSecondaryContainer}; }
  .check { inline-size: 1.5rem; flex: none; display: inline-flex; }
  .opt-label { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .opt-label.tinted {
    padding-inline: ${sys.space(2)};
    border-radius: ${t.chipRadius};
    font: ${t.chipFont};
    letter-spacing: ${sys.tracking.labelLg};
    line-height: 1.75rem;
    background: var(--_tint-bg);
    color: var(--_tint-fg);
  }
  .create { color: ${t.accent}; }

  .sr {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;

define('ui-chip-field', {
  formAssociated: true,
  props: {
    variant: 'filled', label: '', value: '', options: [], multiple: false, allowCreate: false,
    placeholder: '', helper: '', error: '', disabled: false, required: false, name: '', strings: null,
  },
  styles: [base, styles],
  setup(p, host) {
    const { variant, label, value, options, multiple, allowCreate, placeholder, helper, error,
      disabled, required, name, strings } = p;
    const S = computed(() => ({ ...STRINGS, ...(strings() || {}) }));

    // The value as a list of distinct strings, whatever shape it came in.
    const values = computed(() => {
      const v = value();
      let list;
      if (Array.isArray(v)) list = v;
      else if (v == null || v === '') list = [];
      else if (typeof v === 'string' && v.trim().startsWith('[')) {
        try { list = [].concat(JSON.parse(v)); } catch { list = [v]; }
      } else list = [v];
      list = [...new Set(list.filter((x) => x != null && x !== '').map(String))];
      return multiple() ? list : list.slice(0, 1);
    }, sameList);

    // Forms get one string: the value, or the values joined by commas.
    let initial;
    const formValue = () => values().join(',');
    formValue.set = () => value.set(initial);
    initial = untrack(() => value());
    formBind(host, { name, value: formValue, disabled });

    const opts = computed(() => (options() || []).map((o) =>
      typeof o === 'string' || typeof o === 'number'
        ? { value: String(o), label: String(o), color: '' }
        : { value: String(o.value), label: o.label != null ? String(o.label) : String(o.value), color: o.color || '' }));
    const byValue = computed(() => new Map(opts().map((o) => [o.value, o])));
    const optionOf = (v) => byValue().get(v) ?? { value: v, label: v, color: '' };

    const query = signal('');
    const open = signal(false);
    const focused = signal(false);
    const hasLeading = signal(false);
    const activeKey = signal(null);
    const said = signal('');

    // Every option, then values that are not among them (they stay pickable).
    const all = computed(() => {
      const list = [...opts()];
      for (const v of values()) if (!byValue().has(v)) list.push(optionOf(v));
      return list;
    });
    const exact = (q) => {
      const f = fold(q.trim());
      return f ? all().find((o) => fold(o.label) === f || fold(o.value) === f) ?? null : null;
    };
    const items = computed(() => {
      const q = query().trim();
      const f = fold(q);
      const list = all()
        .filter((o) => !f || fold(o.label).includes(f))
        .map((o) => ({ key: `o:${o.value}`, kind: 'option', ...o }));
      if (q && allowCreate() && !exact(q)) list.push({ key: '\u0000create', kind: 'create', value: q, label: q, color: '' });
      return list;
    });
    const activeIndex = computed(() => items().findIndex((x) => x.key === activeKey()));
    const showPanel = computed(() => open() && !disabled() && items().length > 0);

    const floating = computed(() => focused() || values().length > 0 || query() !== '' || placeholder() !== '');
    const cls = computed(() =>
      ['root', variant(), floating() && 'floating', focused() && 'focused', showPanel() && 'expanded',
       error() && 'error', disabled() && 'disabled', label() && 'has-label', hasLeading() && 'with-leading']
        .filter(Boolean).join(' '));

    let input = null;
    let rootEl = null;
    let fieldEl = null;
    let panelEl = null;
    let stopAuto = null;
    host.focus = (o) => input?.focus(o);

    const announce = (text) => said.set(said() === text ? `${text} ` : text);

    const setValues = (next) => {
      const out = multiple() ? next : (next[0] ?? '');
      value.set(out);
      host.emit('change', { value: out });
    };
    const clearQuery = () => {
      query.set('');
      if (input) input.value = '';
    };

    const choose = (item) => {
      if (!item) return;
      let v = item.value;
      if (item.kind === 'create') {
        v = item.value.trim();
        if (!v) return;
        host.emit('create', { value: v });
      }
      const has = values().includes(v);
      const name = item.kind === 'create' ? v : optionOf(v).label;
      if (multiple()) {
        setValues(has ? values().filter((x) => x !== v) : [...values(), v]);
        announce(fill(has ? S().removed : S().added, { label: name }));
      } else {
        if (!has) {
          setValues([v]);
          announce(fill(S().added, { label: name }));
        }
        open.set(false);
      }
      clearQuery();
      if (item.kind === 'create') activeKey.set(`o:${v}`);
    };

    const remove = (v) => {
      setValues(values().filter((x) => x !== v));
      announce(fill(S().removed, { label: optionOf(v).label }));
    };

    /** Enter (or a comma): the active option, else an exact match, else a new value. */
    const commitText = () => {
      if (showPanel() && activeIndex() >= 0) {
        const item = items()[activeIndex()];
        // Typed text never takes a chosen value away: that is a click, or Enter with no text.
        if (query().trim() && item.kind === 'option' && values().includes(item.value)) clearQuery();
        else choose(item);
        return true;
      }
      const q = query().trim();
      if (!q) return false;
      const match = exact(q);
      if (match) { choose({ kind: 'option', ...match }); return true; }
      if (allowCreate()) { choose({ kind: 'create', value: q }); return true; }
      return false;
    };

    const move = (delta) => {
      const list = items();
      if (!list.length) return;
      const i = activeIndex();
      const n = i < 0 ? (delta > 0 ? 0 : list.length - 1) : (i + delta + list.length) % list.length;
      activeKey.set(list[n].key);
    };

    const chipButtons = () => [...(rootEl?.querySelectorAll('.chip-remove') ?? [])];
    const focusChip = (i) => {
      const all = chipButtons();
      if (!all.length) return;
      all[Math.max(0, Math.min(i, all.length - 1))].focus();
    };

    let composing = false;
    // While typing, the option to pick is active: the exact match, else the first one listed (the
    // Create option when nothing matches), so Enter takes what the listbox shows first.
    const activateFirst = () => {
      const q = query().trim();
      const match = q ? exact(q) : null;
      activeKey.set(match ? `o:${match.value}` : q ? (items()[0]?.key ?? null) : null);
    };
    const onInput = (e) => {
      e.stopPropagation();
      if (composing) return;
      let text = e.target.value;
      // A comma (typed or pasted) ends a value in multiple mode: each one before it is picked.
      if (multiple() && text.includes(',')) {
        const parts = text.split(',');
        text = parts.pop().replace(/^\s+/, '');
        for (const part of parts) {
          const q = part.trim();
          if (!q) continue;
          const match = exact(q);
          if (match) { if (!values().includes(match.value)) choose({ kind: 'option', ...match }); }
          else if (allowCreate()) choose({ kind: 'create', value: q });
        }
        e.target.value = text;
      }
      query.set(text);
      open.set(true);
      activateFirst();
      host.emit('input', { value: text });
    };
    const onKeydown = (e) => {
      if (composing || e.isComposing) return;
      const back = isRtl(host) ? 'ArrowRight' : 'ArrowLeft';
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!open()) open.set(true);
          if (!e.altKey) move(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!open()) open.set(true);
          else move(-1);
          break;
        case 'Enter':
          if (commitText()) e.preventDefault();
          break;
        case 'Backspace':
          if (input.value === '' && values().length) { e.preventDefault(); open.set(false); focusChip(Infinity); }
          break;
        case 'Tab':
          open.set(false);
          break;
        default:
          if (e.key === back && input.selectionStart === 0 && input.selectionEnd === 0 && values().length) {
            e.preventDefault();
            open.set(false);
            focusChip(Infinity);
          }
      }
    };

    const onChipKeydown = (e, v) => {
      const list = chipButtons();
      const i = list.indexOf(e.currentTarget);
      const rtl = isRtl(host);
      const prev = rtl ? 'ArrowRight' : 'ArrowLeft';
      const next = rtl ? 'ArrowLeft' : 'ArrowRight';
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const last = i === list.length - 1;
        remove(v);
        queueMicrotask(() => (values().length && !(e.key === 'Delete' && last) ? focusChip(e.key === 'Backspace' ? i - 1 : i) : input?.focus()));
      } else if (e.key === prev) {
        e.preventDefault();
        if (i > 0) focusChip(i - 1);
      } else if (e.key === next) {
        e.preventDefault();
        if (i < list.length - 1) focusChip(i + 1);
        else input?.focus();
      } else if (e.key === 'Escape' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        input?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusChip(0);
      }
    };
    const onChipRemove = (e, v) => {
      e.stopPropagation();
      if (disabled()) return;
      remove(v);
      input?.focus();
    };

    // Focus anywhere inside (input, a chip) is the field's focus.
    const onFocusIn = () => focused.set(true);
    const onFocusOut = (e) => {
      if (e.relatedTarget && rootEl?.contains(e.relatedTarget)) return;
      focused.set(false);
      open.set(false);
      const match = exact(query());
      if (match && !values().includes(match.value)) choose({ kind: 'option', ...match });
      clearQuery();
    };

    const onFieldClick = (e) => {
      if (disabled()) return;
      const path = e.composedPath();
      if (path.some((n) => n.classList?.contains('chip-remove') || n.classList?.contains('toggle'))) return;
      if (path.some((n) => n.getAttribute?.('slot') === 'trailing' || n.getAttribute?.('slot') === 'leading')) return;
      input?.focus();
      open.set(true);
    };
    const onToggle = (e) => {
      e.stopPropagation();
      if (disabled()) return;
      open.set(!showPanel());
      input?.focus();
    };

    // The listbox owns Escape while it is up (so a dialog around it stays).
    effect(() => {
      if (!showPanel()) return;
      return escapeLayer(() => open.set(false));
    });
    // Keep the active option in view.
    effect(() => {
      const i = activeIndex();
      if (i < 0 || !panelEl) return;
      panelEl.querySelector('.opt.active')?.scrollIntoView?.({ block: 'nearest' });
    });
    effect(() => {
      if (!showPanel() && stopAuto) { stopAuto(); stopAuto = null; }
    });
    effect(() => { if (!showPanel()) activeKey.set(null); });
    onCleanup(() => stopAuto?.());

    const panelRef = (el) => {
      panelEl = el;
      stopAuto?.();
      stopAuto = autoUpdate(el, fieldEl, { placement: 'bottom-start', matchWidth: true, offset: 4 });
      // Into the top layer once it is in the document: no ancestor's
      // overflow, transform or stacking context can clip or cover it.
      queueMicrotask(() => {
        if (!el.isConnected || !showPanel.peek()) return;
        try { el.showPopover?.(); } catch { el.removeAttribute('popover'); }
        stopAuto?.();
        stopAuto = autoUpdate(el, fieldEl, { placement: 'bottom-start', matchWidth: true, offset: 4 });
      });
    };

    const optionView = (o) => html`
      <div role="option" part="option"
           class=${() => ({ opt: true, active: activeKey() === o().key, create: o().kind === 'create' })}
           id=${() => `opt-${items().findIndex((x) => x.key === o().key)}`}
           aria-selected=${() => (o().kind === 'create' ? null : String(values().includes(o().value)))}
           @pointerdown=${(e) => e.preventDefault()}
           @click=${() => choose(untrack(o))}>
        <span class="layer" aria-hidden="true"></span>
        ${() => (multiple() || o().kind === 'create'
          ? html`<span class="check" aria-hidden="true">${() => (o().kind === 'create'
              ? html`<ui-icon name="add"></ui-icon>`
              : values().includes(o().value) ? html`<ui-icon name="check"></ui-icon>` : null)}</span>`
          : null)}
        <span class=${() => (o().color && o().kind !== 'create' ? 'opt-label tinted' : 'opt-label')}
              style=${() => (o().kind === 'create' ? null : tint(o().color))} dir="auto">${() =>
          (o().kind === 'create' ? fill(S().create, { query: o().value }) : o().label)}</span>
      </div>`;

    const panelView = () => html`
      <div class="panel" part="panel" popover="manual" role="listbox" id="listbox"
           aria-label=${() => label() || S().options}
           aria-multiselectable=${() => (multiple() ? 'true' : null)}
           ref=${panelRef}>
        ${each(items, optionView, (x) => x.key)}
      </div>`;

    const chipView = (c) => html`
      <span class=${() => (optionOf(c()).color ? 'chip tinted' : 'chip')} part="chip"
            style=${() => tint(optionOf(c()).color)}>
        <span class="chip-layer" aria-hidden="true"></span>
        <span class="chip-label" dir="auto">${() => optionOf(c()).label}</span>
        <button class="chip-remove" type="button" tabindex="-1"
                aria-label=${() => fill(S().remove, { label: optionOf(c()).label })}
                title=${() => fill(S().remove, { label: optionOf(c()).label })}
                ?disabled=${disabled}
                ref=${(el) => ripple(el, { disabled })}
                @pointerdown=${(e) => e.preventDefault()}
                @click=${(e) => onChipRemove(e, untrack(c))}
                @keydown=${(e) => onChipKeydown(e, untrack(c))}>
          <span class="layer" aria-hidden="true"></span>
          <ui-icon name="close"></ui-icon>
        </button>
      </span>`;

    const describe = computed(() => error() || helper() || '');
    const selectedText = computed(() => values().map((v) => optionOf(v).label).join(', '));

    return html`
      <div class=${cls} ref=${(el) => (rootEl = el)} @focusin=${onFocusIn} @focusout=${onFocusOut}>
        <div class="field" part="field" ref=${(el) => (fieldEl = el)} @click=${onFieldClick}>
          ${() => (variant() === 'filled' ? html`<span class="filled-hover" aria-hidden="true"></span>` : null)}
          ${() => (variant() === 'outlined'
            ? html`<fieldset aria-hidden="true"><legend><span>${label}${() => (required() ? ' *' : '')}</span></legend></fieldset>`
            : null)}
          ${() => (label() ? html`<span class="label" part="label" id="label">${label}${() => (required() ? ' *' : '')}</span>` : null)}
          <slot name="leading" ref=${(el) => el.addEventListener('slotchange', () => hasLeading.set(el.assignedElements().length > 0))}></slot>
          <div class="content">
            <span class="chips">${each(values, chipView, (v) => v)}</span>
            <input part="input" role="combobox" ref=${(el) => (input = el)}
                   aria-autocomplete="list" aria-haspopup="listbox" aria-controls="listbox"
                   aria-expanded=${() => String(showPanel())}
                   aria-activedescendant=${() => (showPanel() && activeIndex() >= 0 ? `opt-${activeIndex()}` : null)}
                   aria-labelledby=${() => (label() ? 'label' : null)}
                   aria-label=${() => (label() ? null : placeholder() || null)}
                   aria-describedby="selected describe"
                   aria-invalid=${() => (error() ? 'true' : null)}
                   placeholder=${() => (values().length ? null : placeholder() || null)}
                   ?disabled=${disabled} ?required=${() => required() && !values().length}
                   autocomplete="off" autocapitalize="off" spellcheck="false"
                   @compositionstart=${() => { composing = true; }}
                   @compositionend=${(e) => { composing = false; onInput(e); }}
                   @input=${onInput} @change=${(e) => e.stopPropagation()} @keydown=${onKeydown}>
          </div>
          <slot name="trailing">
            <button class="toggle" type="button" tabindex="-1"
                    aria-label=${() => (showPanel() ? S().hideOptions : S().showOptions)}
                    title=${() => (showPanel() ? S().hideOptions : S().showOptions)}
                    aria-controls="listbox" aria-expanded=${() => String(showPanel())}
                    ?disabled=${disabled}
                    ref=${(el) => ripple(el, { disabled })}
                    @pointerdown=${(e) => e.preventDefault()} @click=${onToggle}>
              <span class="layer" aria-hidden="true"></span>
              <ui-icon name="arrow-drop-down"></ui-icon>
            </button>
          </slot>
        </div>
        ${() => (describe()
          ? html`<span class="below" part="helper"><span class="msg" role=${() => (error() ? 'alert' : null)}>${describe}</span></span>`
          : null)}
        <span class="sr" id="selected">${selectedText}</span>
        <span class="sr" id="describe">${describe}</span>
        <span class="sr" aria-live="polite">${said}</span>
        ${presence(showPanel, panelView, {
          enter: fx.scaleIn,
          exit: fx.scaleOut,
          enterDuration: 'short4',
          exitDuration: 'short2',
          enterEasing: 'emphasizedDecelerate',
          exitEasing: 'emphasizedAccelerate',
          onEntered: () => host.emit('open', null, popupEvent),
          onExited: () => { panelEl = null; host.emit('close', null, popupEvent); },
        })}
      </div>`;
  },
});

export const tag = 'ui-chip-field';
export const themeVars = t;
