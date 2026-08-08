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

/** Identity tag so editors syntax-highlight CSS. */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string;

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
};

export interface Options<P extends Record<string, unknown>> {
  /** Prop names with their defaults. The default's type drives attribute coercion. */
  props?: P;
  /** Runs once per element; return the template to render. */
  setup: (props: Props<P>, host: AlacrisElement<P>) => Renderable;
  /** Stylesheet text, shared across every instance of this element. */
  styles?: string;
  /** Shadow root mode, or `false` to render into light DOM. Defaults to `'open'`. */
  shadow?: 'open' | 'closed' | false;
}

export function define<P extends Record<string, unknown>>(
  name: string,
  options: Options<P>,
): { new (): AlacrisElement<P> };

export function define(
  name: string,
  setup: (props: Record<string, never>, host: AlacrisElement<{}>) => Renderable,
): { new (): AlacrisElement<{}> };
