// Registers a DOM on globalThis so the render/define tests can run under `node --test`.
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });

for (const k of [
  'window', 'document', 'customElements', 'HTMLElement', 'Element', 'Node',
  'CustomEvent', 'Event', 'CSSStyleSheet', 'DocumentFragment', 'NodeFilter',
  'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle',
]) {
  globalThis[k] = k === 'window' ? window : window[k];
}
globalThis.happyWindow = window;

if (typeof globalThis.MouseEvent === 'undefined') {
  globalThis.MouseEvent = globalThis.window.MouseEvent;
}
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = globalThis.window.PointerEvent || class PointerEvent extends (globalThis.window.MouseEvent || Event) {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
      this.isPrimary = init.isPrimary ?? true;
      this.button = init.button ?? 0;
    }
  };
}

// Fix happy-dom getRootNode on detached trees (spec mandates returning the root ancestor).
const origGetRootNode = window.Node.prototype.getRootNode;
window.Node.prototype.getRootNode = function(options) {
  if (this.isConnected) return origGetRootNode.call(this, options);
  let curr = this;
  while (curr.parentNode) curr = curr.parentNode;
  return curr;
};
