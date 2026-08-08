// Alacris — context.
//
// Prop-drilling is what actually stops people building anything large out of
// web components: a value five levels down has to be threaded through five
// elements that do not care about it.
//
// This implements the W3C community "context protocol" — the same
// `context-request` event Lit's @lit/context uses — so it works *between*
// libraries, not just inside Alacris. An Alacris element can consume a value provided
// by a Lit element, and a Lit element can consume one provided by Alacris. The
// event is composed, so it crosses shadow boundaries.

import { signal, effect, onCleanup, untrack } from './signal.js';

const TYPE = 'context-request';

class ContextRequestEvent extends Event {
  constructor(context, callback, subscribe) {
    super(TYPE, { bubbles: true, composed: true, cancelable: true });
    this.context = context;
    this.callback = callback;
    this.subscribe = subscribe;
  }
}

/**
 * A context key. The description is only for debugging; identity is what
 * matters, so import the same key object in provider and consumer.
 */
export function createContext(description) {
  return { toString: () => `context(${description || '?'})`, description };
}

/**
 * Serve `value` to any descendant that asks for `context`.
 *
 * `value` may be a plain value, a signal, or any function — if it is reactive,
 * subscribers are pushed the new value when it changes.
 * Returns a function that stops providing.
 */
export function provide(host, context, value) {
  const subs = new Set();
  const read = typeof value === 'function' ? value : () => value;

  const onRequest = (e) => {
    if (e.context !== context) return;
    // Claim it: the nearest provider wins, exactly like a scope chain.
    e.stopPropagation();
    const cb = e.callback;
    if (e.subscribe) {
      subs.add(cb);
      cb(untrack(read), () => subs.delete(cb));
    } else {
      cb(untrack(read));
    }
  };

  host.addEventListener(TYPE, onRequest);

  // Push updates to everyone still listening.
  const stop = effect(() => {
    const v = read();
    untrack(() => { for (const cb of subs) cb(v, () => subs.delete(cb)); });
  });

  return () => {
    host.removeEventListener(TYPE, onRequest);
    stop();
    subs.clear();
  };
}

/**
 * Ask the nearest provider above `host` for `context`.
 *
 * Returns a read-only signal. It holds `fallback` until a provider answers, so
 * a consumer that is rendered before its provider exists still works — and
 * updates arrive automatically when the provided value changes.
 */
export function consume(host, context, fallback) {
  const value = signal(fallback);
  let release = null;

  host.dispatchEvent(
    new ContextRequestEvent(
      context,
      (v, unsubscribe) => {
        // A provider may hand back a new unsubscribe each time; keep the latest.
        if (unsubscribe) release = unsubscribe;
        value.set(v);
      },
      true
    )
  );

  onCleanup(() => release && release());

  const get = () => value();
  get.peek = value.peek;
  return get;
}

/**
 * Convenience for elements: provide inside `setup` and tear down with the
 * element. Equivalent to provide(host, ...) plus an onCleanup.
 */
export function provideTo(host, context, value) {
  const stop = provide(host, context, value);
  onCleanup(stop);
  return stop;
}
