// <ui-date-picker> — Material date picker: a text-field-style control that
// opens a calendar. Docked (default) commits on day click; modal confirms
// with OK / Cancel.
//
//   <ui-date-picker label="Event" value=${date}
//                   @change=${(e) => date(e.detail.value)}></ui-date-picker>
//
// `value` is an ISO date string (YYYY-MM-DD), or '' for none. Typing an
// ISO or locale-formatted date into the field commits on blur / Enter.
// Set `range` to pick a start and end; `change` then reports
// `{ start, end, value }` where `value` is `start/end`. In range mode a
// typed "start – end" (en/em dash, " - ", " to ", "→", or ISO/ISO) commits
// both ends on blur / Enter.
//
// Typing understands ISO dates, the locale's numeric order (M/D/Y in en-US,
// D/M/Y in en-GB, D.M.Y in de, Y/M/D in ja…; any of / . - or space between
// parts, two-digit years are 20xx, a missing year is this year) and the
// locale's month names, long or short (`parseDate` is exported).
//
// The docked calendar is a `popover` in the top layer, anchored to the field
// (flips above it when there is no room below), so no ancestor's overflow,
// transform or stacking context clips or covers it. The week starts on the
// locale's first day (`Intl.Locale#getWeekInfo`) unless `firstDay` is set.
//
// Keyboard: Alt+ArrowDown or F4 opens the calendar and moves focus into it
// (ArrowDown too while it is open). In the grid, arrows move a day / a week
// (left and right mirror in RTL), Home / End go to the week's start / end,
// PageUp / PageDown a month (with Shift a year), Enter or Space picks, and
// Escape closes it with focus back in the field.
//
// Without a `label`, the field's accessible name is the host's `aria-label`
// (moved onto the input), else the placeholder, else `strings.date`.
//
// Methods: `showPicker()` opens the calendar (focus stays where it is);
// `focus(options)` focuses the text field.
//
// `strings` overrides the built-in English text, any subset of:
//   { previousMonth, nextMonth, openCalendar, closeCalendar, chooseDate,
//     selectDate, selectDates, selectedDate, selectedDates, ok, cancel, date }
//
// @prop  {string}  label=''
// @prop  {string}  value=''         — ISO date (YYYY-MM-DD); range: start/end
// @prop  {boolean} range=false      — pick a start and end date
// @prop  {string}  start=''         — range start ISO
// @prop  {string}  end=''           — range end ISO
// @prop  {string}  variant='filled' — filled | outlined
// @prop  {string}  presentation='docked' — docked | modal
// @prop  {string}  min=''           — inclusive ISO lower bound
// @prop  {string}  max=''           — inclusive ISO upper bound
// @prop  {string}  locale=''        — BCP 47 tag; empty uses the runtime locale
// @prop  {number}  firstDay=-1      — first day of the week, 0 (Sunday)–6; -1 = the locale's
// @prop  {object}  strings=null     — localized text (see above)
// @prop  {boolean} disabled=false
// @prop  {boolean} required=false
// @prop  {string}  name=''          — form participation
// @prop  {string}  placeholder=''
// @event change — committed; detail: { value } or { start, end, value } when range
// @event input  — field keystroke; detail: { value } (the raw text)
// @event open   — calendar visible (after the enter animation); does not bubble
// @event close  — calendar removed (after the exit animation); does not bubble
// @part  field, input, label, panel, day
// @vars  see `t` below (`themeVars.names`)

import { define, html, css, vars, computed, signal, effect, onCleanup } from '@alacris/core';
import { sys } from '../tokens/sys.js';
import { base } from './base.js';
import { formBind } from '../util/form.js';
import { presence } from '../motion/presence.js';
import { animate, fx, releaseFill } from '../motion/animate.js';
import { autoUpdate } from '../util/position.js';
import { escapeLayer } from '../util/keys.js';
import { popupEvent } from '../util/popup.js';
import { focusTrap, scrollLock } from '../util/focus.js';
import { isRtl } from '../util/dir.js';
import { overlayOn, visiblePadding, fitToViewport } from '../util/viewport.js';
import './ui-icon-button.js';
import './ui-button.js';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => {
  const m = ISO.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
};
const loc = (locale) => locale || undefined;
const formatDate = (iso, locale) => {
  const d = parseISO(iso);
  return d ? new Intl.DateTimeFormat(loc(locale), { dateStyle: 'medium' }).format(d) : '';
};
const formatRange = (start, end, locale) => {
  const a = formatDate(start, locale);
  const b = formatDate(end, locale);
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
};
const monthTitle = (d, locale) =>
  new Intl.DateTimeFormat(loc(locale), { month: 'long', year: 'numeric' }).format(d);
const fullDate = (iso, locale) => {
  const d = parseISO(iso);
  return d ? new Intl.DateTimeFormat(loc(locale), { dateStyle: 'full' }).format(d) : '';
};
// 2026-08-09 is a Sunday.
const weekdays = (locale, first = 0) => {
  const fmt = new Intl.DateTimeFormat(loc(locale), { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 7, 9 + ((first + i) % 7))));
};

/**
 * The first day of the week for a locale, 0 (Sunday)–6, from
 * `Intl.Locale#getWeekInfo()` (or the older `weekInfo` getter); Sunday when
 * the runtime does not say.
 */
export const weekStart = (locale) => {
  try {
    const l = new Intl.Locale(locale || (typeof navigator !== 'undefined' && navigator.language) || 'en-US');
    const info = typeof l.getWeekInfo === 'function' ? l.getWeekInfo() : l.weekInfo;
    const d = info?.firstDay;
    return typeof d === 'number' && d >= 1 && d <= 7 ? d % 7 : 0;
  } catch {
    return 0;
  }
};

// Folds case, diacritics and trailing dots so "Okt." matches "okt".
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.+$/, '').trim();
const namesCache = new Map();
const monthNames = (locale) => {
  const key = locale || '';
  if (namesCache.has(key)) return namesCache.get(key);
  const out = [];
  const forms = [{ month: 'long' }, { month: 'short' }, { day: 'numeric', month: 'long' }, { day: 'numeric', month: 'short' }];
  for (const lc of [loc(locale), 'en-US']) {
    for (const opts of forms) {
      let fmt;
      try { fmt = new Intl.DateTimeFormat(lc, opts); } catch { continue; }
      for (let m = 0; m < 12; m++) {
        const part = fmt.formatToParts(new Date(2026, m, 15)).find((x) => x.type === 'month');
        const name = part && fold(part.value);
        if (name && !/^\d+$/.test(name)) out.push({ name, m });
      }
    }
  }
  namesCache.set(key, out);
  return out;
};
const monthOf = (word, locale, exact) => {
  const w = fold(word);
  if (!w || /^\d/.test(w)) return -1;
  const names = monthNames(locale);
  const hit = exact ? names.find((n) => n.name === w) : w.length >= 3 && names.find((n) => n.name.startsWith(w));
  return hit ? hit.m : -1;
};
const numericOrder = (locale) => {
  try {
    const parts = new Intl.DateTimeFormat(loc(locale), { year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date(2026, 9, 3));
    const order = parts.map((x) => x.type).filter((x) => x === 'day' || x === 'month' || x === 'year');
    return order.length === 3 ? order : ['month', 'day', 'year'];
  } catch {
    return ['month', 'day', 'year'];
  }
};
const fullYear = (y) => (y < 100 ? 2000 + y : y);
const isoOf = (y, m, d) => {
  const iso = `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
  return parseISO(iso) ? iso : null;
};

/**
 * Parse a typed date in `locale` to an ISO date (YYYY-MM-DD). Returns '' for
 * empty text and null when it cannot be read.
 */
export const parseDate = (text, locale = '', now = new Date()) => {
  const raw = String(text ?? '').replace(/[  ]/g, ' ').trim();
  if (!raw) return '';
  if (parseISO(raw)) return raw;
  // CJK forms: 2026年10月3日, 2026년 10월 3일.
  const tokens = raw
    .replace(/[年月日년월일]/g, ' ')
    .split(/[\s/.,\-–]+/)
    .filter(Boolean);
  const nums = tokens.filter((tok) => /^\d+$/.test(tok));
  const words = tokens.filter((tok) => !/^\d+$/.test(tok));
  // An exact month name wins over a prefix ("mar." the weekday vs "mars").
  let month = -1;
  for (const exact of [true, false]) {
    for (const w of words) {
      const m = monthOf(w, locale, exact);
      if (m >= 0) { month = m; break; }
    }
    if (month >= 0) break;
  }
  const order = numericOrder(locale);
  if (month >= 0 && nums.length >= 1 && nums.length <= 2) {
    let day, year;
    if (nums.length === 1) {
      day = +nums[0];
      year = now.getFullYear();
    } else {
      const longAt = nums.findIndex((n) => n.length >= 3);
      if (longAt >= 0) {
        year = +nums[longAt];
        day = +nums[1 - longAt];
      } else {
        // Both short: the locale says whether the day comes before the year.
        const dayFirst = order.indexOf('day') < order.indexOf('year');
        day = +nums[dayFirst ? 0 : 1];
        year = fullYear(+nums[dayFirst ? 1 : 0]);
      }
    }
    const iso = isoOf(year, month + 1, day);
    if (iso) return iso;
  }
  if (month < 0 && (nums.length === 3 || nums.length === 2) && nums.length === tokens.length) {
    const parts = {};
    if (nums.length === 3 && nums[0].length >= 3) {
      Object.assign(parts, { year: +nums[0], month: +nums[1], day: +nums[2] });
    } else if (nums.length === 3) {
      order.forEach((k, i) => (parts[k] = +nums[i]));
      parts.year = fullYear(parts.year);
    } else {
      order.filter((k) => k !== 'year').forEach((k, i) => (parts[k] = +nums[i]));
      parts.year = now.getFullYear();
    }
    const iso = isoOf(parts.year, parts.month, parts.day);
    if (iso) return iso;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : toISO(d);
};

/**
 * Parse a typed range ("a – b", "a - b", "a to b", "a → b", or ISO/ISO).
 * Returns { start, end } in order, { start: '', end: '' } for empty text,
 * or null when either end cannot be read.
 */
export const parseDateRange = (text, locale = '', now = new Date()) => {
  const raw = String(text ?? '').trim();
  if (!raw) return { start: '', end: '' };
  const iso = /^(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{4}-\d{2}-\d{2})$/.exec(raw);
  const halves = iso ? [iso[1], iso[2]] : raw.split(/\s*[–—→]\s*|\s+-\s+|\s+to\s+/i);
  if (halves.length !== 2) return null;
  let a = parseDate(halves[0], locale, now);
  let b = parseDate(halves[1], locale, now);
  if (!a || !b) return null;
  if (b < a) [a, b] = [b, a];
  return { start: a, end: b };
};

const DEFAULT_STRINGS = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openCalendar: 'Open calendar',
  closeCalendar: 'Close calendar',
  chooseDate: 'Choose date',
  selectDate: 'Select date',
  selectDates: 'Select dates',
  selectedDate: 'Selected date',
  selectedDates: 'Selected dates',
  ok: 'OK',
  cancel: 'Cancel',
  date: 'Date',
};

const addDays = (iso, n) => {
  const d = parseISO(iso);
  return d ? toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)) : iso;
};
const addMonths = (iso, n) => {
  const d = parseISO(iso);
  if (!d) return iso;
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last)));
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const todayISO = () => toISO(new Date());
const monthCells = (view, selected, min, max, today, rangeStart = '', rangeEnd = '', first = 0) => {
  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() - first + 7) % 7;
  const start = new Date(y, m, 1 - lead);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = toISO(d);
    const isStart = !!rangeStart && iso === rangeStart;
    const isEnd = !!rangeEnd && iso === rangeEnd;
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === m,
      selected: isStart || isEnd || (!rangeStart && iso === selected),
      rangeStart: isStart,
      rangeEnd: isEnd,
      inRange: !!(rangeStart && rangeEnd && iso >= rangeStart && iso <= rangeEnd),
      today: iso === today,
      disabled: !!(min && iso < min) || !!(max && iso > max),
    });
  }
  return cells;
};

const t = vars('ui-date-picker', {
  bg: sys.color.surfaceContainerHighest,
  fg: sys.color.onSurface,
  labelFg: sys.color.onSurfaceVariant,
  accent: sys.color.primary,
  onAccent: sys.color.onPrimary,
  outlineColor: sys.color.outline,
  radius: sys.radius.xs,
  font: sys.type.bodyLg,
  height: '56px',
  panelBg: sys.color.surfaceContainerHigh,
  panelRadius: sys.radius.xl,
  dayRadius: sys.radius.full,
  todayFg: sys.color.primary,
  mutedFg: sys.color.onSurfaceVariant,
  rangeBg: sys.color.secondaryContainer,
  rangeFg: sys.color.onSecondaryContainer,
  scrim: `color-mix(in srgb, ${sys.color.scrim} 32%, transparent)`,
});

const styles = css`
  :host { display: block; inline-size: 240px; }
  :host([range]) { inline-size: 320px; }
  .range { inline-size: 100%; }
  .range .field { min-inline-size: 320px; }
  .root { display: block; position: relative; }
  .field {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${sys.space(1)};
    min-block-size: calc(${t.height} + var(--ui-density, 0) * 4px);
    padding-inline: ${sys.space(4)} ${sys.space(1)};
    border-radius: ${t.radius};
    font: ${t.font};
    letter-spacing: ${sys.tracking.bodyLg};
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
  .filled:focus-within .field::after,
  .filled.open .field::after { block-size: 2px; background: ${t.accent}; }
  .filled .field::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: ${sys.color.onSurface};
    opacity: 0;
    border-radius: inherit;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .filled:hover:not(:focus-within):not(.open):not(.disabled) .field::before {
    opacity: ${sys.state.hover};
  }
  .filled:hover:not(:focus-within):not(.open):not(.disabled) .field::after {
    background: ${sys.color.onSurface};
  }

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
    font: ${t.font};
    font-size: 0.75em;
    letter-spacing: calc(${sys.tracking.bodyLg} * 0.75);
    visibility: hidden;
    max-inline-size: 0.01px;
    height: 12px;
    line-height: 12px;
    transition: max-inline-size ${sys.duration.short2} ${sys.easing.standard};
  }
  legend span {
    padding-inline: ${sys.space(1)} calc(${sys.space(1)} - 0.5px);
    display: inline-block;
    opacity: 0;
    visibility: visible;
  }
  .outlined.floating legend {
    max-inline-size: 100%;
    transition: max-inline-size ${sys.duration.short3} ${sys.easing.standard};
  }
  .outlined:focus-within fieldset,
  .outlined.open fieldset { border-width: 2px; border-color: ${t.accent}; }
  .root:hover:not(:focus-within):not(.open) fieldset { border-color: ${sys.color.onSurface}; }

  .label {
    position: absolute;
    inset-inline-start: ${sys.space(4)};
    inset-block-start: 50%;
    translate: 0 -50%;
    color: ${t.labelFg};
    pointer-events: none;
    transform-origin: 0 50%;
    transition: translate ${sys.duration.short3} ${sys.easing.standard},
                scale ${sys.duration.short3} ${sys.easing.standard},
                color ${sys.duration.short2} ${sys.easing.standard};
  }
  :host(:dir(rtl)) .label { transform-origin: 100% 50%; }
  .filled.floating .label { translate: 0 calc(-50% - 16px); scale: 0.75; }
  .outlined.floating .label {
    translate: 0 calc(-50% - (${t.height} + var(--ui-density, 0) * 4px) / 2);
    scale: 0.75;
  }
  :focus-within .label, .open .label { color: ${t.accent}; }

  input {
    flex: 1;
    min-inline-size: 0;
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
  .filled.has-label input { padding-block-start: 18px; }
  input::placeholder { color: ${t.labelFg}; opacity: 0; }
  .floating input::placeholder { opacity: 1; }

  .panel {
    position: fixed;
    z-index: ${sys.z.popup};
    padding: ${sys.space(3)} ${sys.space(3)} ${sys.space(4)};
    background: ${t.panelBg};
    border-radius: ${t.panelRadius};
    box-shadow: ${sys.elevation[3]};
    color: ${t.fg};
    overflow: auto;
  }
  /* In the top layer: drop the UA popover box; position() writes left/top. */
  .panel[popover] {
    margin: 0;
    inset: auto;
    border: none;
  }
  ${overlayOn('.overlay')}
  .overlay {
    z-index: ${sys.z.popup};
    display: flex;
    align-items: center;
    justify-content: center;
    /* Inset-sized (the visible viewport, not 100vh), clear of the keyboard
       and screen cutouts. */
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
  .modal-surface {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: ${sys.space(2)};
    padding: ${sys.space(6)} ${sys.space(3)} ${sys.space(3)};
    background: ${t.panelBg};
    border-radius: ${t.panelRadius};
    box-shadow: ${sys.elevation[3]};
    color: ${t.fg};
    min-inline-size: min(360px, 100%);
    max-inline-size: 100%;
    max-block-size: 100%;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }
  /* On a short (landscape) screen the calendar scrolls; OK/Cancel stay put. */
  .modal-body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: ${sys.space(2)};
  }
  .modal-surface .actions { flex: none; }
  .headline {
    padding-inline: ${sys.space(3)};
    font: ${sys.type.labelMd};
    letter-spacing: ${sys.tracking.labelMd};
    color: ${t.mutedFg};
  }
  .picked {
    padding-inline: ${sys.space(3)};
    padding-block-end: ${sys.space(2)};
    font: ${sys.type.headlineMd};
    letter-spacing: ${sys.tracking.headlineMd};
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: ${sys.space(2)};
    padding-inline: ${sys.space(1)};
  }

  .cal-header {
    display: flex;
    align-items: center;
    gap: ${sys.space(1)};
    padding-inline: ${sys.space(2)};
    min-block-size: 48px;
  }
  .month {
    flex: 1;
    font: ${sys.type.titleSm};
    letter-spacing: ${sys.tracking.titleSm};
  }
  .weekdays, .cal-row {
    display: grid;
    grid-template-columns: repeat(7, 40px);
    justify-content: center;
  }
  .days {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .weekday {
    display: grid;
    place-items: center;
    block-size: 40px;
    font: ${sys.type.labelSm};
    letter-spacing: ${sys.tracking.labelSm};
    color: ${t.mutedFg};
  }
  .day {
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    inline-size: 40px;
    block-size: 40px;
    margin: 0;
    padding: 0;
    border: none;
    outline: none;
    appearance: none;
    background: transparent;
    font: ${sys.type.bodySm};
    letter-spacing: ${sys.tracking.bodySm};
    color: ${t.fg};
    cursor: pointer;
  }
  .day .text {
    position: relative;
    z-index: 2;
  }
  .day .layer {
    position: absolute; inset: 0; z-index: 3;
    border-radius: ${t.dayRadius}; background: currentColor; opacity: 0;
    transition: opacity ${sys.duration.short2} ${sys.easing.standard};
  }
  .day:hover .layer { opacity: ${sys.state.hover}; }
  .day:active .layer { opacity: ${sys.state.pressed}; }
  .day:focus-visible { outline: ${sys.focus.ring}; outline-offset: -2px; }
  .day.outside { color: ${t.mutedFg}; }

  /* In-range connector track */
  .day.in-range { color: ${t.rangeFg}; }
  .day.in-range::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${t.rangeBg};
    z-index: 0;
    pointer-events: none;
  }
  .day.in-range.range-start::before {
    inset-inline-start: 50%;
    inset-inline-end: 0;
  }
  .day.in-range.range-end::before {
    inset-inline-start: 0;
    inset-inline-end: 50%;
  }
  .day.in-range:nth-child(7n + 1)::before {
    border-start-start-radius: ${t.dayRadius};
    border-end-start-radius: ${t.dayRadius};
  }
  .day.in-range:nth-child(7n)::before {
    border-start-end-radius: ${t.dayRadius};
    border-end-end-radius: ${t.dayRadius};
  }
  .day.in-range.range-start.range-end::before { display: none; }

  /* Selected circular badge */
  .day.selected {
    color: ${t.onAccent};
    font-weight: 500;
  }
  .day.selected::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${t.dayRadius};
    background: ${t.accent};
    z-index: 1;
    pointer-events: none;
    transition: background-color ${sys.duration.short4} ${sys.easing.standard};
  }

  /* Today outline indicator */
  .day.today:not(.selected) {
    color: ${t.todayFg};
  }
  .day.today:not(.selected)::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${t.dayRadius};
    border: 1px solid ${t.todayFg};
    box-sizing: border-box;
    z-index: 1;
    pointer-events: none;
  }

  .day:disabled {
    color: color-mix(in srgb, ${sys.color.onSurface} calc(${sys.state.disabledContent} * 100%), transparent);
    cursor: default;
    pointer-events: none;
  }

  .disabled { opacity: ${sys.state.disabledContent}; pointer-events: none; }
`;

define('ui-date-picker', {
  formAssociated: true,
  props: {
    label: '', value: '', range: false, start: '', end: '',
    variant: 'filled', presentation: 'docked',
    min: '', max: '', locale: '', firstDay: -1, strings: null,
    disabled: false, required: false,
    name: '', placeholder: '',
  },
  styles: [base, styles],
  setup(p, host) {
    const { label, value, range, start, end, variant, presentation, min, max, locale, firstDay, strings, disabled, required, name, placeholder } = p;
    formBind(host, { name, value, disabled });

    const S = computed(() => ({ ...DEFAULT_STRINGS, ...(strings() || {}) }));
    const ws = computed(() => {
      const f = Number(firstDay());
      return Number.isInteger(f) && f >= 0 && f <= 6 ? f : weekStart(locale());
    });
    // The host's aria-label names the input (a label on a role-less host
    // would be prohibited ARIA), kept in step if it is set again.
    const hostLabel = signal('');
    const takeLabel = () => {
      const v = host.getAttribute('aria-label');
      if (v == null) return;
      hostLabel.set(v);
      host.removeAttribute('aria-label');
    };
    takeLabel();
    const labelObserver = typeof MutationObserver === 'function' ? new MutationObserver(takeLabel) : null;
    labelObserver?.observe(host, { attributes: true, attributeFilter: ['aria-label'] });

    const open = signal(false);
    const focused = signal(false);
    const text = signal('');
    const viewMonth = signal(startOfMonth(parseISO(value() || start()) || new Date()));
    const draft = signal(value());
    const draftStart = signal(start());
    const draftEnd = signal(end());
    const rangeAnchor = signal('');
    // The day that holds the grid's one tab stop.
    const focusIso = signal(todayISO());
    const rtl = signal(false);
    let fieldEl = null;
    let inputEl = null;
    let modalSurfaceEl = null;
    let stopAuto = null;
    let releaseTrap = null;
    let unlock = null;

    effect(() => {
      if (range()) {
        const next = [start(), end()].filter(Boolean).join('/');
        if (value.peek() !== next) value.set(next);
        text.set(formatRange(start(), end(), locale()) || next);
        const d = parseISO(start());
        if (d && !open()) viewMonth.set(startOfMonth(d));
        return;
      }
      const v = value();
      text.set(formatDate(v, locale()) || v);
      const d = parseISO(v);
      if (d && !open()) viewMonth.set(startOfMonth(d));
    });

    const floating = computed(() => focused() || text() !== '' || placeholder() !== '' || open());
    const cls = computed(() =>
      ['root', variant(), range() && 'range', floating() && 'floating', open() && 'open',
       disabled() && 'disabled', label() && 'has-label'].filter(Boolean).join(' '));
    const selected = computed(() => (presentation() === 'modal' && open() ? draft() : value()));
    const liveStart = computed(() => (range() && open() ? draftStart() : start()));
    const liveEnd = computed(() => (range() && open() ? draftEnd() : end()));
    const cells = computed(() =>
      monthCells(viewMonth(), selected(), min(), max(), todayISO(),
        range() ? liveStart() : '', range() ? liveEnd() : '', ws()));
    const title = computed(() => monthTitle(viewMonth(), locale()));
    const heads = computed(() => weekdays(locale(), ws()));
    const pickedLabel = computed(() => range()
      ? (formatRange(liveStart(), liveEnd(), locale()) || S().selectedDates)
      : (formatDate(selected(), locale()) || S().selectedDate));
    const prevDisabled = computed(() => {
      const v = viewMonth();
      return !!min() && toISO(new Date(v.getFullYear(), v.getMonth(), 0)) < min();
    });
    const nextDisabled = computed(() => {
      const v = viewMonth();
      return !!max() && toISO(new Date(v.getFullYear(), v.getMonth() + 1, 1)) > max();
    });

    const outOfRange = (iso) => !!(min() && iso < min()) || !!(max() && iso > max());
    const clamp = (iso) => (min() && iso < min() ? min() : max() && iso > max() ? max() : iso);

    const commit = (iso, { close = true } = {}) => {
      if (iso !== value()) {
        value.set(iso);
        host.emit('change', { value: iso });
      }
      text.set(formatDate(iso, locale()) || iso);
      if (close) closePanel();
    };
    const commitRange = (s, e, { close = true } = {}) => {
      start.set(s);
      end.set(e);
      const joined = [s, e].filter(Boolean).join('/');
      value.set(joined);
      host.emit('change', { start: s, end: e, value: joined });
      text.set(formatRange(s, e, locale()) || joined);
      if (close) closePanel();
    };

    let lastPicked = null;
    const pick = (iso) => {
      if (!iso || outOfRange(iso) || iso === lastPicked) return;
      lastPicked = iso;
      setTimeout(() => { lastPicked = null; }, 0);
      focusIso.set(iso);
      if (range()) {
        const anchor = rangeAnchor();
        if (!anchor || iso === anchor) {
          rangeAnchor.set(iso);
          draftStart.set(iso);
          draftEnd.set('');
          text.set(formatDate(iso, locale()) || iso);
          return;
        }
        let a = anchor;
        let b = iso;
        if (b < a) { a = iso; b = anchor; }
        rangeAnchor.set('');
        draftStart.set(a);
        draftEnd.set(b);
        if (presentation() !== 'modal') commitRange(a, b);
        return;
      }
      if (presentation() === 'modal') { draft.set(iso); return; }
      commit(iso);
    };

    const openPanel = () => {
      if (disabled() || open()) return;
      const sel = range() ? start() : value();
      const d = parseISO(sel) || new Date();
      viewMonth.set(startOfMonth(d));
      draft.set(value());
      draftStart.set(start());
      draftEnd.set(end());
      rangeAnchor.set(range() && start() && !end() ? start() : '');
      const fi = clamp(parseISO(sel) ? sel : todayISO());
      focusIso.set(fi);
      if (fi.slice(0, 7) !== toISO(d).slice(0, 7)) viewMonth.set(startOfMonth(parseISO(fi)));
      rtl.set(isRtl(host));
      open.set(true);
    };
    const closePanel = () => {
      if (!open.peek()) return;
      // Focus inside the calendar goes back to the field it came from.
      const active = host.shadowRoot?.activeElement;
      const inPanel = !!active && active !== inputEl && !fieldEl?.contains(active);
      open.set(false);
      if (inPanel) inputEl?.focus({ preventScroll: true });
    };
    const toggle = (e) => {
      e?.stopPropagation();
      open() ? closePanel() : openPanel();
    };

    const dayButtonFor = (iso) => host.shadowRoot?.querySelector(`.day[data-iso="${iso}"]`);
    const focusDay = () => dayButtonFor(focusIso.peek())?.focus({ preventScroll: true });
    // After the panel is shown (it enters the top layer on a microtask).
    const focusDayWhenShown = () => queueMicrotask(() => queueMicrotask(() => { if (open.peek()) focusDay(); }));
    const moveFocus = (iso) => {
      const next = clamp(iso);
      focusIso.set(next);
      const d = parseISO(next);
      const v = viewMonth();
      if (d.getFullYear() !== v.getFullYear() || d.getMonth() !== v.getMonth()) viewMonth.set(startOfMonth(d));
      focusDay();
    };

    const shiftMonth = (delta) => {
      const v = viewMonth();
      viewMonth.set(new Date(v.getFullYear(), v.getMonth() + delta, 1));
      focusIso.set(clamp(addMonths(focusIso(), delta)));
    };

    const onGridKey = (e) => {
      const cur = focusIso();
      const d = parseISO(cur);
      if (!d) return;
      const back = isRtl(host) ? 1 : -1;
      const intoWeek = (d.getDay() - ws() + 7) % 7;
      let next;
      switch (e.key) {
        case 'ArrowLeft': next = addDays(cur, back); break;
        case 'ArrowRight': next = addDays(cur, -back); break;
        case 'ArrowUp': next = addDays(cur, -7); break;
        case 'ArrowDown': next = addDays(cur, 7); break;
        case 'Home': next = addDays(cur, -intoWeek); break;
        case 'End': next = addDays(cur, 6 - intoWeek); break;
        case 'PageUp': next = addMonths(cur, e.shiftKey ? -12 : -1); break;
        case 'PageDown': next = addMonths(cur, e.shiftKey ? 12 : 1); break;
        default: return;
      }
      e.preventDefault();
      e.stopPropagation();
      moveFocus(next);
    };

    const onInput = (e) => {
      text.set(e.target.value);
      host.emit('input', { value: e.target.value });
    };
    const restoreText = () => text.set(range()
      ? (formatRange(start(), end(), locale()) || value())
      : (formatDate(value(), locale()) || value()));
    // Commit what was typed; false when it cannot be read.
    const commitTyped = (close) => {
      if (range()) {
        const r = parseDateRange(text(), locale());
        if (!r || (r.start && (outOfRange(r.start) || outOfRange(r.end)))) return false;
        if (r.start !== start() || r.end !== end()) commitRange(r.start, r.end, { close });
        else restoreText();
        if (close) closePanel();
        return true;
      }
      const parsed = parseDate(text(), locale());
      if (parsed === null || (parsed && outOfRange(parsed))) return false;
      if (parsed !== value()) commit(parsed, { close });
      else restoreText();
      if (close) closePanel();
      return true;
    };
    const onBlur = () => {
      focused.set(false);
      if (!commitTyped(false)) restoreText();
    };
    const onKeydown = (e) => {
      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        openPanel();
        focusDayWhenShown();
      } else if (e.key === 'ArrowDown' && open()) {
        e.preventDefault();
        focusDay();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (open()) closePanel();
        else { openPanel(); focusDayWhenShown(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        commitTyped(true);
      } else if (e.key === 'Escape' && open()) {
        e.preventDefault();
        closePanel();
      }
    };

    host.showPicker = () => openPanel();
    host.focus = (opts) => inputEl?.focus(opts);

    effect(() => {
      if (!open()) return;
      const onDoc = (e) => {
        if (e.composedPath().includes(host)) return;
        closePanel();
      };
      // Capture at the document is not early enough: a dialog registers the
      // same way when it opens, so it is already listening by the time this
      // panel does and one Escape closes both.
      const releaseEsc = escapeLayer(closePanel);
      document.addEventListener('pointerdown', onDoc);
      return () => {
        document.removeEventListener('pointerdown', onDoc);
        releaseEsc();
      };
    });
    effect(() => {
      if (open() && presentation() === 'modal') {
        unlock = scrollLock();
        queueMicrotask(() => { if (open() && !releaseTrap) releaseTrap = focusTrap(host); });
      } else {
        if (modalSurfaceEl?.isConnected) {
          animate(modalSurfaceEl, fx.scaleOut, { duration: 'short4', easing: 'emphasizedAccelerate' });
        }
        releaseTrap?.(); releaseTrap = null;
        unlock?.(); unlock = null;
      }
    });
    effect(() => {
      if (!open() && stopAuto) { stopAuto(); stopAuto = null; }
    });
    let stopFit = null;
    onCleanup(() => { stopAuto?.(); releaseTrap?.(); unlock?.(); stopFit?.(); labelObserver?.disconnect(); });

    const dayClassFrom = (cell) => [
      'day',
      !cell.inMonth && 'outside',
      cell.selected && 'selected',
      cell.today && 'today',
      cell.inRange && 'in-range',
      cell.rangeStart && 'range-start',
      cell.rangeEnd && 'range-end',
    ].filter(Boolean).join(' ');
    const dayButton = (cell) => html`
      <button type="button" part="day" role="gridcell"
              class=${dayClassFrom(cell)}
              data-iso=${cell.iso}
              tabindex=${cell.iso === focusIso.peek() ? '0' : '-1'}
              aria-label=${fullDate(cell.iso, locale.peek())}
              aria-selected=${cell.selected ? 'true' : 'false'}
              ?disabled=${cell.disabled}
              @click=${() => pick(cell.iso)}>
        <span class="layer" aria-hidden="true"></span>
        <span class="text" aria-hidden="true">${cell.day}</span>
      </button>`;
    const calGrid = () => {
      const all = cells();
      const rows = [];
      for (let r = 0; r < all.length; r += 7) {
        rows.push(html`<div class="cal-row" role="row">${all.slice(r, r + 7).map(dayButton)}</div>`);
      }
      return html`
        <div class="cal" role="grid" aria-label=${() => title()} @keydown=${onGridKey}>
          <div class="weekdays" role="row">${() => heads().map((w) => html`<span class="weekday" role="columnheader">${w}</span>`)}</div>
          <div class="days">${rows}</div>
        </div>`;
    };

    // Presence mounts the grid in a nested owner. A setup-level paint keeps
    // selected / in-range classes and the tab stop in sync even if a row
    // binding does not.
    effect(() => {
      const a = range() ? liveStart() : '';
      const b = range() ? liveEnd() : '';
      const sel = selected();
      const rng = range();
      const fi = focusIso();
      cells();
      if (!open()) return;
      const paint = () => {
        const root = host.shadowRoot;
        if (!root) return;
        let stop = null;
        let fallback = null;
        for (const btn of root.querySelectorAll('.day')) {
          const iso = btn.getAttribute('data-iso');
          if (!iso) continue;
          const isStart = !!(rng && a && iso === a);
          const isEnd = !!(rng && b && iso === b);
          const isSel = !!(isStart || isEnd || (!rng && iso === sel) || (!a && iso === sel));
          btn.classList.toggle('selected', isSel);
          btn.classList.toggle('in-range', !!(a && b && iso >= a && iso <= b));
          btn.classList.toggle('range-start', isStart);
          btn.classList.toggle('range-end', isEnd);
          btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
          btn.tabIndex = -1;
          if (iso === fi && !btn.disabled) stop = btn;
          if (!fallback && !btn.disabled && !btn.classList.contains('outside')) fallback = btn;
        }
        const tabStop = stop || fallback;
        if (tabStop) tabStop.tabIndex = 0;
      };
      paint();
      queueMicrotask(paint);
    });

    const panelRef = (el) => {
      stopAuto?.();
      if (presentation() === 'modal') return;
      stopAuto = autoUpdate(el, fieldEl, { placement: 'bottom-start', offset: 4 });
      // Into the top layer once it is in the document: no ancestor's
      // overflow, transform or stacking context can clip or cover it.
      queueMicrotask(() => {
        if (!el.isConnected || !open.peek()) return;
        try {
          el.showPopover?.();
        } catch {
          el.removeAttribute('popover');
        }
        stopAuto?.();
        stopAuto = autoUpdate(el, fieldEl, { placement: 'bottom-start', offset: 4 });
      });
    };

    const monthNav = () => html`
      <div class="cal-header">
        <span class="month">${title}</span>
        <ui-icon-button icon=${() => (rtl() ? 'chevron-right' : 'chevron-left')} label=${() => S().previousMonth}
                        ?disabled=${prevDisabled} @click=${() => shiftMonth(-1)}></ui-icon-button>
        <ui-icon-button icon=${() => (rtl() ? 'chevron-left' : 'chevron-right')} label=${() => S().nextMonth}
                        ?disabled=${nextDisabled} @click=${() => shiftMonth(1)}></ui-icon-button>
      </div>`;

    const dockedView = () => html`
      <div class="panel" part="panel" popover="manual" role="dialog" aria-label=${() => label() || hostLabel() || S().chooseDate}
           ref=${panelRef}>
        ${monthNav()}
        ${calGrid}
      </div>`;

    const modalSurfaceRef = (el) => {
      modalSurfaceEl = el;
      releaseFill(animate(el, fx.scaleIn, { duration: 'medium2', easing: 'emphasizedDecelerate' }));
    };

    const modalOverlayRef = (el) => {
      stopFit?.();
      stopFit = fitToViewport(el, host);
      queueMicrotask(() => {
        try {
          if (el.isConnected) el.showPopover?.();
        } catch {}
      });
    };

    const modalView = () => html`
      <div class="overlay" popover="manual" ref=${modalOverlayRef}>
        <div class="scrim" aria-hidden="true" @click=${closePanel}></div>
        <div class="modal-surface" part="panel" role="dialog" aria-modal="true"
             aria-label=${() => label() || hostLabel() || S().chooseDate}
             ref=${modalSurfaceRef}>
          <div class="modal-body">
            <div class="headline">${() => (range() ? S().selectDates : S().selectDate)}</div>
            <div class="picked">${pickedLabel}</div>
            ${monthNav()}
            ${calGrid}
          </div>
          <div class="actions">
            <ui-button variant="text" @click=${closePanel}>${() => S().cancel}</ui-button>
            <ui-button variant="text" @click=${() => range() ? commitRange(draftStart(), draftEnd()) : commit(draft())}>${() => S().ok}</ui-button>
          </div>
        </div>
      </div>`;

    return html`
      <div class=${cls}>
        <div class="field" part="field" ref=${(el) => (fieldEl = el)}>
          ${() => (variant() === 'outlined'
            ? html`<fieldset aria-hidden="true"><legend><span>${label}${() => (required() ? ' *' : '')}</span></legend></fieldset>`
            : null)}
          ${() => (label() ? html`<span class="label" part="label" id="field-label">${label}${() => (required() ? ' *' : '')}</span>` : null)}
          <input part="input" .value=${text} ref=${(el) => (inputEl = el)}
                 placeholder=${() => placeholder() || null}
                 ?disabled=${disabled} ?required=${required}
                 aria-labelledby=${() => (label() ? 'field-label' : null)}
                 aria-label=${() => (label() ? null : (hostLabel() || placeholder() || S().date))}
                 aria-haspopup="dialog" aria-expanded=${() => String(open())}
                 autocomplete="off"
                 @input=${onInput} @focus=${() => focused.set(true)} @blur=${onBlur}
                 @keydown=${onKeydown}>
          <ui-icon-button icon="calendar" label=${() => (open() ? S().closeCalendar : S().openCalendar)}
                          ?disabled=${disabled} @click=${toggle}></ui-icon-button>
        </div>
        ${presence(() => open() && presentation() !== 'modal', dockedView, {
          enter: fx.scaleIn,
          exit: fx.scaleOut,
          enterDuration: 'short4',
          exitDuration: 'short4',
          onEntered: () => host.emit('open', null, popupEvent),
          onExited: () => host.emit('close', null, popupEvent),
        })}
        ${presence(() => open() && presentation() === 'modal', modalView, {
          enter: fx.fadeIn,
          exit: fx.fadeOut,
          enterDuration: 'medium2',
          exitDuration: 'short4',
          onEntered: () => host.emit('open', null, popupEvent),
          onExited: () => {
            stopFit?.();
            stopFit = null;
            host.emit('close', null, popupEvent);
          },
        })}
      </div>`;
  },
});

export const tag = 'ui-date-picker';
export const themeVars = t;
