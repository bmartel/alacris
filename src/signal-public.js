// Public surface of the reactive core, for `alacris/signal`.
// `effectNode`, `rerun` and `dispose` exist for the renderer and are
// deliberately not part of the published API.
export { signal, computed, effect, batch, untrack, flush, root, onCleanup } from './signal.js';
