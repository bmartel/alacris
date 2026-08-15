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
if (typeof globalThis.SVGElement === 'undefined') {
  globalThis.SVGElement = globalThis.window.SVGElement;
}
