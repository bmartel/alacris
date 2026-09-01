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

// Fix happy-dom getRootNode on detached trees (spec mandates returning the root ancestor).
const origGetRootNode = window.Node.prototype.getRootNode;
window.Node.prototype.getRootNode = function(options) {
  if (this.isConnected) return origGetRootNode.call(this, options);
  let curr = this;
  while (curr.parentNode) curr = curr.parentNode;
  return curr;
};

