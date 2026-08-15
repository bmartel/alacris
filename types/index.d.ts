export * from './signal.js';
import type { Signal, Computed, Dispose } from './signal.js';

/** A parsed template plus its interpolated values. */
export interface Template {
  readonly brand: unique symbol;
}

/** Anything that can sit in a `${}` child position. */
export type Renderable =
  | Template
  | Node
  | string
  | number
  | null
  | undefined
  | boolean
  | readonly Renderable[]
  | (() => Renderable);

/** Tagged template for HTML. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): Template;

/** Tagged template for SVG (children are created in the SVG namespace). */
export function svg(strings: TemplateStringsArray, ...values: unknown[]): Template;

/**
 * Cached CSS. Identical text always returns the same Sheet, so a stylesheet is
 * parsed once for the whole page however many components use it.
 */
export interface Sheet {
  /** The CSS text. Interpolating a Sheet into another `css` template inlines this. */
  readonly text: string;
  /** The constructed stylesheet, built on first use, or null where unsupported. */
  readonly sheet: CSSStyleSheet | null;
  /** Rewrite in place; every root that adopted it updates at once. */
  replace(text: string): Sheet;
  toString(): string;
}

/** Tagged template for component CSS. Interpolate another Sheet to compose. */
export function css(strings: TemplateStringsArray, ...values: unknown[]): Sheet;

/** Anything accepted by `styles`. */
export type Styles = Sheet | CSSStyleSheet | string | null | false | readonly Styles[];

/**
 * Push styles into every Alacris component — those already on the page and
 * every one created afterwards. Applied after each component's own styles, so
 * a theme wins ties. Returns a function that removes them again.
 *
 * This is how a consumer restyles a component library they do not control.
 */
export function adoptGlobal(...styles: Styles[]): () => void;

/** The custom properties a component is themed by. */
export type Vars<T> = { readonly [K in keyof T]: string } & {
  /** The generated property names — the component's theming contract. */
  readonly names: readonly string[];
  readonly prefix: string;
};

/**
 * Declare the custom properties a component is themed by.
 *
 *   const t = vars('btn', { bg: '#111', radius: '8px' });
 *   css`:host { background: ${t.bg}; border-radius: ${t.radius} }`
 *
 * Each token becomes `var(--btn-bg, #111)`, so the default is inline and a
 * consumer overrides it by setting `--btn-bg` anywhere above the element.
 * camelCase keys become kebab-case properties.
 */
export function vars<T extends Record<string, string | number>>(
  prefix: string,
  defaults: T
): Vars<T>;

/** Give a template a stable identity so list updates move nodes instead of rebuilding them. */
export function keyed<T extends Template>(key: unknown, template: T): T;

/**
 * Render a list where every row gets its own reactive scope, created once.
 *
 * The difference from mapping the array yourself is where the work lands. A
 * `.map` rebuilds every row's template result on every change, so the renderer
 * must walk all N rows to discover that one moved. `each` reorders with
 * `insertBefore` and wakes only the rows whose data actually changed.
 *
 * `key` decides identity; it defaults to the item itself.
 */
export function each<T>(
  source: () => readonly T[],
  render: (item: Computed<T>, index: Computed<number>) => Renderable,
  key?: (item: T, index: number) => unknown
): Renderable;

/** Render into a container. Returns a disposer that removes the DOM and stops every binding. */
export function render(value: Renderable, container: Node): Dispose;

/** The declared props of a component, as signals. */
export type Props<P> = { [K in keyof P]: Signal<P[K]> };

/** An Alacris custom element: declared props are also live DOM properties. */
export type AlacrisElement<P> = HTMLElement & P & {
  readonly props: Props<P>;
  /** Dispatch a composed, bubbling CustomEvent. */
  emit<T>(type: string, detail?: T, options?: EventInit): boolean;
  /**
   * The element's ElementInternals — only when the component was defined with
   * `formAssociated: true`, and `undefined` where the platform lacks
   * `attachInternals`. Use it from `setup`: `host.internals?.setFormValue(v)`.
   */
  readonly internals?: ElementInternals;
  /**
   * Assign in `setup` to run when the element's form association *changes*.
   * The initial association precedes `setup` — read `internals.form` for the
   * starting owner.
   */
  onFormAssociated?: (form: HTMLFormElement | null) => void;
  /**
   * Assign in `setup` to follow the form's disabled state (fieldset
   * included). The initial state precedes `setup` — check
   * `host.matches(':disabled')` at startup.
   */
  onFormDisabled?: (disabled: boolean) => void;
  /** Assign in `setup` to clear state when the form resets. */
  onFormReset?: () => void;
  /** Assign in `setup` to restore state (autofill, back/forward navigation). */
  onFormStateRestore?: (state: unknown, mode: 'restore' | 'autocomplete') => void;
};

export interface Options<P extends Record<string, unknown>> {
  /** Prop names with their defaults. The default's type drives attribute coercion. */
  props?: P;
  /** Runs once per element; return the template to render. */
  setup: (props: Props<P>, host: AlacrisElement<P>) => Renderable;
  /** Styles for this element: a Sheet, a CSS string, or an array of them.
   *  Shared across every instance, and parsed once per unique stylesheet. */
  styles?: Styles;
  /** Shadow root mode, or `false` to render into light DOM. Defaults to `'open'`. */
  shadow?: 'open' | 'closed' | false;
  /**
   * Register as a form-associated custom element. The element gains
   * `host.internals` (its ElementInternals) so it can report a value,
   * validity and state to an enclosing `<form>`, and the form lifecycle
   * reactions are forwarded to `host.onFormAssociated` / `onFormDisabled` /
   * `onFormReset` / `onFormStateRestore`, assigned in `setup`.
   */
  formAssociated?: boolean;
}

export function define<P extends Record<string, unknown>>(
  name: string,
  options: Options<P>,
): { new (): AlacrisElement<P> };

export function define(
  name: string,
  setup: (props: Record<string, never>, host: AlacrisElement<{}>) => Renderable,
): { new (): AlacrisElement<{}> };
