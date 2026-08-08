import type { Computed } from './signal.js';

/**
 * A context key. Identity is what matters — import the same object in the
 * provider and the consumer. The description is only for debugging.
 */
export interface Context<T> {
  readonly description?: string;
  toString(): string;
}

export function createContext<T>(description?: string): Context<T>;

/**
 * Serve a value to any descendant that asks for `context`.
 *
 * `value` may be a plain value, a signal, or any function; if it is reactive,
 * subscribers are pushed the new value when it changes. Returns a function
 * that stops providing.
 *
 * Implements the W3C community context protocol (`context-request` events), so
 * this interoperates with `@lit/context` and anything else that speaks it.
 */
export function provide<T>(
  host: EventTarget,
  context: Context<T>,
  value: T | (() => T)
): () => void;

/**
 * Ask the nearest provider above `host` for `context`.
 *
 * Returns a read-only signal holding `fallback` until a provider answers, and
 * updating automatically whenever the provided value changes.
 */
export function consume<T>(
  host: EventTarget,
  context: Context<T>,
  fallback?: T
): Computed<T>;

/** provide(), torn down automatically with the enclosing scope. */
export function provideTo<T>(
  host: EventTarget,
  context: Context<T>,
  value: T | (() => T)
): () => void;
