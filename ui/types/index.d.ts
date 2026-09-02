import type { Signal, Computed, Template, Sheet } from '@alacris/core';
import './elements.js';

export type Scheme = 'light' | 'dark';
export type SchemePreference = Scheme | 'auto';

export interface ThemeConfig {
  seed?: string;
  colors?: Record<string, string>;
  typography?: string | {
    preset?: string;
    family?: string;
    brand?: string;
    plain?: string;
    code?: string;
    scale?: number;
    load?: boolean;
  };
  shape?: { radius?: number };
  motion?: { scale?: number };
  density?: number;
  overrides?: {
    common?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
  loadFonts?: boolean;
}

export interface Theme {
  config: ThemeConfig;
  palettes: unknown;
  common: Record<string, string>;
  schemes: { light: Record<string, string>; dark: Record<string, string> };
  fonts: { href: string | null; preset: string };
}

export function createTheme(config?: ThemeConfig): Theme;
export function applyTheme(themeOrConfig?: Theme | ThemeConfig): Theme;
export function themeCss(theme: Theme): string;
export const activeTheme: Signal<Theme | null>;
export function loadThemeFonts(theme: Pick<Theme, 'fonts'> | { fonts: { href: null } }, doc?: Document): void;
export const schemePreference: Signal<SchemePreference>;
export const scheme: Computed<Scheme>;
export function setScheme(pref: SchemePreference): void;
export function toggleScheme(): void;

export const sys: {
  color: Record<string, string>;
  radius: Record<string, string>;
  elevation: Record<number, string>;
  duration: Record<string, string>;
  easing: Record<string, string>;
  type: Record<string, string>;
  tracking: Record<string, string>;
  font: { brand: string; plain: string; code: string };
  space: (n: number) => string;
  state: Record<string, string>;
  focus: Record<string, string>;
  z: Record<string, string>;
  scrollbar: Record<string, string>;
  density: string;
};
export function typeRule(role: string): string;

export const FONT_PRESETS: Record<string, { brand: string; plain: string; href: string | null }>;
export const FONT_STACKS: Record<string, string>;
export const DEFAULT_FONT_PRESET: string;
export const TYPE_ROLES: string[];
export function resolveTypography(config?: ThemeConfig['typography']): {
  brand: string;
  plain: string;
  code: string;
  href: string | null;
  preset: string;
};
export function googleFontsHref(names: string | string[]): string;

export type Keyframes = Keyframe[] | PropertyIndexedKeyframes | ((el: Element) => Keyframe[]);
export interface AnimateOptions extends KeyframeAnimationOptions {
  duration?: number | string;
  easing?: string;
}

export function animate(el: Element, keyframes: Keyframes, opts?: AnimateOptions): Pick<Animation, 'finished' | 'cancel' | 'finish' | 'play' | 'pause'>;
export function releaseFill<T extends { finished: Promise<unknown>; cancel(): void }>(anim: T): T;
export function settled(anim: { finished: Promise<unknown> }): Promise<void>;
export function duration(key: number | string): number;
export function easing(key: string): string;
export const prefersReducedMotion: () => boolean;
export const fx: Record<string, Keyframes>;

export function presence(
  when: Signal<unknown> | (() => unknown),
  view: () => Template | Node,
  opts?: { enter?: Keyframes | false; exit?: Keyframes | false }
): Node;

export function withFlip<T>(
  container: Element,
  mutate: () => T,
  opts?: { duration?: number | string; easing?: string; stagger?: number }
): T;

export function ripple(
  el: Element,
  opts?: { disabled?: boolean | Signal<boolean> | (() => boolean); centered?: boolean }
): Element;

export function createSwipeTracker(
  el: Element,
  opts?: {
    axis?: 'x' | 'y' | 'both';
    threshold?: number;
    filter?: (e: PointerEvent) => boolean;
    onStart?: (info: { x: number; y: number; event: PointerEvent }) => void;
    onMove?: (info: { dx: number; dy: number; x: number; y: number; vx: number; vy: number; event: PointerEvent }) => void;
    onEnd?: (info: { dx: number; dy: number; vx: number; vy: number; event: PointerEvent; cancelled: boolean }) => void;
  }
): { destroy: () => void };

export function calculateVelocity(
  history: Array<{ x: number; y: number; t: number }>,
  now?: number,
  windowMs?: number
): { vx: number; vy: number };

export function rubberBand(delta: number, factor?: number): number;

export function position(
  panel: HTMLElement,
  anchor: Element,
  opts?: {
    placement?: string;
    offset?: number;
    flip?: boolean;
    matchWidth?: boolean;
    padding?: number;
  }
): { placement: string };
export function autoUpdate(panel: HTMLElement, anchor: Element, opts?: object): () => void;

export function focusTrap(host: Element, opts?: { initial?: Element }): () => void;
export function focusables(host: Element): Element[];
export function scrollLock(lock?: boolean): void;

export function rovingTabindex(
  container: Element,
  opts?: {
    selector?: string;
    items?: () => Element[];
    listenOn?: EventTarget;
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    skip?: (el: Element) => boolean;
    onMove?: (el: Element, index: number) => void;
  }
): { focus: (el: Element | number) => void; activate: (el: Element | number) => void; refresh: () => void; destroy: () => void };

export function formBind(
  host: { internals?: ElementInternals; onFormReset?: () => void },
  fields: {
    name?: Signal<string>;
    value?: Signal<unknown>;
    checked?: Signal<boolean>;
    disabled?: Signal<boolean>;
  }
): void;

/** Register SVG path data. Names are stored kebab-case; underscores are equivalent. */
export function registerIcons(icons: Record<string, string>): void;
/** Path data for a name, or undefined. Underscores and hyphens are equivalent. */
export function iconPath(name: string): string | undefined;
/** Registered names (built-ins included, kebab-case). */
export function iconNames(): string[];

export function processTable(opts: Record<string, unknown>): Record<string, unknown>;
export function filterRows(rows: object[], cols: object[], query: string): object[];
export function sortRows(rows: object[], cols: object[], sortBy: string, sortDir: string): object[];
export function groupRows(rows: object[], groupBy: string, opts?: object): object[];
export function paginate(rows: object[], page: number, pageSize: number): { rows: object[]; page: number; pages: number };
export function aggregateRow(rows: object[], cols: object[]): object;
export function toCsv(rows: object[], cols: object[]): string;
export function downloadText(filename: string, text: string, type?: string): void;
export function inferColumns(rows: object[]): object[];
export function visibleColumns(columns: object[] | undefined, rows: object[], hidden?: string[]): object[];

export function showSnackbar(
  message: string,
  opts?: { action?: string; duration?: number; closeButton?: boolean }
): { close: () => void; closed: Promise<void> };

export const base: Sheet;
export function scrollbarOn(selector: string): string;
export function focusRingOn(selector: string): string;
export function stateLayerOn(host: string, opts?: { focus?: string }): string;
export function scrollbarTokens(): Record<string, string>;

