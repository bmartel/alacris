// Alacris — custom elements.
// `setup` runs once per element. It returns a template that is rendered once;
// after that every update is a direct write from a signal to a DOM node.

import { signal, root } from './signal.js';
import { render } from './html.js';

const kebab = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

const coerce = (v, d) => {
  if (v === null) return typeof d === 'boolean' ? false : d;
  const t = typeof d;
  if (t === 'number') return +v;
  if (t === 'boolean') return v !== 'false';
  if (d !== null && t === 'object') { try { return JSON.parse(v); } catch { return d; } }
  return v;
};

/**
 * define('x-thing', { props, setup, styles, shadow })
 * define('x-thing', (props, host) => html`...`)
 */
export function define(name, opts) {
  if (typeof opts === 'function') opts = { setup: opts };
  const { props = {}, setup, styles, shadow = 'open' } = opts;
  const keys = Object.keys(props);
  const attrs = keys.map(kebab);
  let sheet;

  class AlacrisElement extends HTMLElement {
    static observedAttributes = attrs;

    constructor() {
      super();
      const p = this.props = {};
      for (let i = 0; i < keys.length; i++) p[keys[i]] = signal(props[keys[i]]);
      // Values assigned before upgrade shadow the accessors; replay them.
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (Object.prototype.hasOwnProperty.call(this, k)) {
          const v = this[k];
          delete this[k];
          this[k] = v;
        }
      }
    }

    attributeChangedCallback(n, _o, v) {
      const k = keys[attrs.indexOf(n)];
      this.props[k].set(coerce(v, props[k]));
    }

    connectedCallback() {
      this._on = 1;
      if (this._up) return;
      this._up = 1;
      // A shadow root can only be attached once, so reuse it across reconnects.
      let target = this._t;
      if (!target) {
        target = this._t = shadow ? this.attachShadow({ mode: shadow }) : this;
        if (styles) {
          const r = shadow ? target : this.getRootNode();
          if (r.adoptedStyleSheets) {
            if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(styles); }
            if (r.adoptedStyleSheets.indexOf(sheet) < 0) r.adoptedStyleSheets = [...r.adoptedStyleSheets, sheet];
          } else {
            const s = document.createElement('style');
            s.textContent = styles;
            (r.head || r).append(s);
          }
        }
      }
      this._d = root(() => { this._r = render(setup(this.props, this), target); });
    }

    disconnectedCallback() {
      this._on = 0;
      // Moving a node re-connects it in the same task, so defer teardown.
      queueMicrotask(() => {
        if (this._on || !this._up) return;
        this._r(); this._d();
        this._up = 0;
      });
    }

    /** Dispatch a composed, bubbling CustomEvent. */
    emit(type, detail, o) {
      return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, ...o }));
    }
  }

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    Object.defineProperty(AlacrisElement.prototype, k, {
      get() { return this.props[k](); },
      set(v) { this.props[k].set(v); },
      configurable: true,
      enumerable: true,
    });
  }

  customElements.define(name, AlacrisElement);
  return AlacrisElement;
}
