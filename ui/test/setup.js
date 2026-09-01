// Starter test bootstrap: the repo's happy-dom setup plus the few browser
// APIs the design system touches that a simulated DOM may not provide.
import '../../test/setup.js';

if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = globalThis.window.matchMedia?.bind(globalThis.window) ||
    (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
}
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (typeof globalThis.IntersectionObserver !== 'function') {
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (typeof globalThis.SVGElement === 'undefined') {
  globalThis.SVGElement = globalThis.window.SVGElement;
}
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
