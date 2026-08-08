// Alacris — styles.
//
// Two problems, one mechanism.
//
// For the author: a component's CSS should be parsed once for the whole page,
// not once per element and not once per component that happens to share it.
// `css` returns a cached, constructed stylesheet; adopting one into a shadow
// root is a pointer copy, so a thousand elements cost one parse.
//
// For the consumer: shadow DOM is opaque by design, which is exactly what makes
// most web components unusable in someone else's design system. The platform
// gives three ways through, and Alacris leans on all of them rather than
// inventing a fourth:
//
//   custom properties  inherit through the boundary — the theming channel
//   ::part()           outer rules beat inner ones, so consumers win
//   adopted sheets     a whole stylesheet can be pushed into components
//
// The one thing that would break all of it is `!important` inside a component,
// because that is the only inner declaration a consumer cannot override.
// Alacris never emits it, and neither should you.

const cache = new Map(); // css text -> Sheet, so identical CSS parses once
const roots = new Set(); // live style roots, for global theming
const globals = []; // sheets adopted by every component

/** Cached CSS. Constructs its stylesheet lazily, then shares it forever. */
class Sheet {
  constructor(text) {
    this.text = text;
    this._s = undefined;
  }
  toString() {
    return this.text;
  }
  get sheet() {
    if (this._s === undefined) {
      this._s = null;
      try {
        const s = new CSSStyleSheet();
        s.replaceSync(this.text);
        this._s = s;
      } catch {
        /* no constructable stylesheets — fall back to <style> */
      }
    }
    return this._s;
  }
  /**
   * Rewrite this stylesheet in place. Every root that adopted it updates at
   * once, with no re-adoption and no new rules — the cheapest way to reskin a
   * whole page.
   */
  replace(text) {
    this.text = text;
    if (this.sheet) this.sheet.replaceSync(text);
    else for (const el of document.querySelectorAll('style[data-alacris]')) {
      if (el.__t === this) el.textContent = text;
    }
    return this;
  }
}

const intern = (text) => {
  let s = cache.get(text);
  if (!s) cache.set(text, (s = new Sheet(text)));
  return s;
};

/**
 * Tagged template for component CSS.
 *
 * Interpolating another `css` result inlines its text, so stylesheets compose
 * without either one being parsed twice.
 */
export function css(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    text += (v == null || v === false ? '' : v) + strings[i + 1];
  }
  return intern(text);
}

/** Accepts a Sheet, a raw CSS string, or an existing CSSStyleSheet. */
const asSheet = (v) => (typeof v === 'string' ? intern(v) : v);

function flatten(v, out) {
  if (v == null || v === false) return out;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) flatten(v[i], out);
    return out;
  }
  out.push(asSheet(v));
  return out;
}

/** Adopt styles into a shadow root, or into a document for light-DOM elements. */
export function applyStyles(target, styles) {
  const list = flatten(styles, []);
  if (!list.length) return;
  const adopt = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const built = item instanceof Sheet ? item.sheet : item;
    if (built && target.adoptedStyleSheets) {
      if (target.adoptedStyleSheets.indexOf(built) < 0 && adopt.indexOf(built) < 0) adopt.push(built);
    } else {
      const el = document.createElement('style');
      el.setAttribute('data-alacris', '');
      el.__t = item;
      el.textContent = String(item);
      (target.head || target).append(el);
    }
  }
  // One assignment: adoptedStyleSheets is a live list, and reassigning it once
  // is cheaper than pushing to it repeatedly.
  if (adopt.length) target.adoptedStyleSheets = [...target.adoptedStyleSheets, ...adopt];
}

/** Called by define() so the root also receives anything themed globally. */
export function trackRoot(target) {
  if (roots.has(target)) return;
  roots.add(target);
  // Globals go on last, so a theme wins ties against component styles.
  if (globals.length) applyStyles(target, globals);
}

export function untrackRoot(target) {
  roots.delete(target);
}

/**
 * Push styles into every Alacris component — the ones already on the page and
 * every one created afterwards. This is how a consumer restyles a component
 * library they do not control, without touching its source.
 *
 * Returns a function that removes them again.
 */
export function adoptGlobal(...styles) {
  const added = flatten(styles, []);
  for (let i = 0; i < added.length; i++) globals.push(added[i]);
  for (const target of roots) applyStyles(target, added);

  return () => {
    const built = added.map((s) => (s instanceof Sheet ? s.sheet : s));
    for (let i = 0; i < added.length; i++) {
      const at = globals.indexOf(added[i]);
      if (at > -1) globals.splice(at, 1);
    }
    for (const target of roots) {
      if (target.adoptedStyleSheets)
        target.adoptedStyleSheets = target.adoptedStyleSheets.filter((s) => built.indexOf(s) < 0);
      target.querySelectorAll?.('style[data-alacris]').forEach((el) => {
        if (added.indexOf(el.__t) > -1) el.remove();
      });
    }
  };
}

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/**
 * Declare the custom properties a component is themed by.
 *
 *   const t = vars('btn', { bg: '#111', fg: '#fff', radius: '8px' });
 *   css`:host { background: ${t.bg}; border-radius: ${t.radius} }`
 *
 * Each token becomes `var(--btn-bg, #111)`, so the default is baked into the
 * declaration and a consumer overrides it by setting `--btn-bg` anywhere above
 * the element. `t.names` lists the properties, which is the component's
 * documented theming contract.
 */
export function vars(prefix, defaults) {
  const t = {};
  const names = [];
  for (const key in defaults) {
    const name = '--' + prefix + '-' + kebab(key);
    names.push(name);
    t[key] = 'var(' + name + ', ' + defaults[key] + ')';
  }
  Object.defineProperty(t, 'names', { value: names });
  Object.defineProperty(t, 'prefix', { value: prefix });
  return t;
}
