// Shared test helpers for component smoke tests.

/** Mount markup, upgrade elements, return the first element. */
export function mount(markup) {
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  document.body.append(holder);
  return holder.firstElementChild;
}

export function unmountAll() {
  document.body.innerHTML = '';
}

/** Wait for queued microtasks (disconnect teardown is deferred one tick). */
export const tick = () => new Promise((r) => setTimeout(r, 0));

/** A bubbling, composed event — delegated handlers only see bubbling events. */
export const fire = (el, type, init = {}) =>
  el.dispatchEvent(new window.Event(type, { bubbles: true, composed: true, ...init }));
