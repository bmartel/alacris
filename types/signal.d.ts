/** Compares an old and new value; return true to suppress the update. */
export type Equals<T> = (a: T, b: T) => boolean;

export interface Signal<T> {
  /** Read the current value and subscribe the enclosing effect/computed. */
  (): T;
  /** Write a new value. */
  (value: T): T;
  /** Write a new value. */
  set(value: T): T;
  /** Read without subscribing. */
  peek(): T;
  /** Write a value derived from the current one. */
  update(fn: (current: T) => T): T;
}

export interface Computed<T> {
  /** Read the current value and subscribe the enclosing effect/computed. */
  (): T;
  /** Read without subscribing. */
  peek(): T;
}

/** Cleanup run before the next execution and once on dispose. */
export type Cleanup = () => void;
/** Stops an effect (or a scope) and runs its cleanups. */
export type Dispose = () => void;

export function signal<T>(value: T, equals?: Equals<T>): Signal<T>;
export function signal<T = undefined>(): Signal<T | undefined>;

export function computed<T>(fn: () => T, equals?: Equals<T>): Computed<T>;

export function effect(fn: () => void | Cleanup): Dispose;

export function batch<T>(fn: () => T): T;

export function untrack<T>(fn: () => T): T;

export function root(fn: () => void): Dispose;

export function onCleanup(fn: Cleanup): Cleanup;

export function flush(): void;
