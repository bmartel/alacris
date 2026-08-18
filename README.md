<div align="center">

<img src="https://raw.githubusercontent.com/bmartel/alacris/main/docs/public/logo.png" alt="" width="88" height="88">

# Alacris

**Web components with signals and fine-grained DOM updates — in 6.56 kB.**

ESM-only · zero dependencies · no build step required · works inside any framework

[![CI](https://github.com/bmartel/alacris/actions/workflows/ci.yml/badge.svg)](https://github.com/bmartel/alacris/actions/workflows/ci.yml)
[![Docs](https://github.com/bmartel/alacris/actions/workflows/docs.yml/badge.svg)](https://bmartel.github.io/alacris/)
[![npm](https://img.shields.io/npm/v/@alacris/core.svg)](https://www.npmjs.com/package/@alacris/core)
[![core size](https://img.shields.io/badge/core-6.56%20kB%20gzip-blue)](#size)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

***alacris*** *(Latin)* — brisk, lively, quick.

**[Documentation →](https://bmartel.github.io/alacris/)** · **[Try it in your browser →](https://bmartel.github.io/alacris/playground/)**

</div>

```html
<script type="module">
  import { define, html, signal } from 'https://unpkg.com/@alacris/core@0.11.0';

  define('ala-counter', {
    props: { start: 0 },
    setup({ start }) {
      const n = signal(start());
      return html`<button @click=${() => n(n() + 1)}>clicked ${n} times</button>`;
    },
  });
</script>

<ala-counter start="3"></ala-counter>
```

That's the whole install. One `<script type="module">`, no bundler, no config, and
`<ala-counter>` now works in plain HTML, React, Vue, Svelte, Angular, Rails, Django —
anywhere that can render a tag.

## Why

Most web-component libraries make you choose between *small* and *fast*. Alacris is both,
because it does less work at runtime:

- **No virtual DOM.** A template is parsed **once per call site** into a native
  `<template>` plus a list of binding positions. Rendering is `cloneNode` + a single
  walk. Updating is a direct write to the one node that changed — no tree diff, no
  re-render of the component.
- **Signals all the way down.** A component's `setup` runs **exactly once**. After that,
  each binding is its own tiny subscription. Changing one value touches one text node.
- **Keyed lists move nodes** instead of rebuilding them, so DOM state (focus, scroll,
  what the user typed) survives a reorder.

`bench/` measures the standard js-framework-benchmark operations against
hand-written keyed DOM, and against production React, Vue, Solid, Svelte, Lit
and Stencil.
See [Performance](#performance) for the numbers and for where Alacris still pays a tax.

## Size

| file | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `dist/alacris.js` — signals + templates + styles + elements | 16.79 KB | **6.56 KB** | 5.96 KB |
| `dist/store.js` — deep reactive state | 2.14 KB | **1.03 KB** | 0.95 KB |
| `dist/context.js` — cross-component context | 0.91 KB | **0.54 KB** | 0.46 KB |
| `dist/signal.js` — reactivity alone, no DOM | 2.34 KB | **1.03 KB** | 0.96 KB |

The add-ons are separate entry points that import the core, so you only pay for
what you import — and there is exactly one reactive graph at runtime.

Run `npm run size` to re-measure. That is the *entire* runtime — rendering,
reactivity and the custom-element layer.

## Install

```bash
npm install @alacris/core
```

```js
import { define, html, signal, computed, effect } from '@alacris/core';
```

The package used to be the unscoped `alacris`. Same API; the specifier is now
`@alacris/core`.

Or skip installing entirely:

```js
import { define, html, signal } from 'https://unpkg.com/@alacris/core@0.11.0/dist/alacris.js';
// or jsDelivr
import { define, html, signal } from 'https://cdn.jsdelivr.net/npm/@alacris/core@0.11.0/+esm';
```

Just the reactive core, without the renderer (1.03 KB):

```js
import { signal, computed, effect } from 'https://unpkg.com/@alacris/core@0.11.0/dist/signal.js';
```

That build is for non-DOM use (a worker, a server): it carries its own copy of
the reactive core, so don't mix it with the full bundle — signals from one
graph do not drive the other.

Want buttons, fields, and a theme rather than starting from `define(...)`?

```bash
npm install @alacris/ui
```

That is a separate package with its own version. It depends on `@alacris/core` and
does not bundle a second copy. [Live catalog →](https://bmartel.github.io/alacris/ui/) · [Getting started →](https://bmartel.github.io/alacris/ui/getting-started/)

## Signals

A signal is a function. Call it to read, call it with an argument to write.

```js
import { signal, computed, effect, batch, untrack } from '@alacris/core';

const count = signal(0);
count();            // 0        — read (and subscribe, if inside an effect/computed)
count(5);           // 5        — write
count.set(6);       //          — same thing, when you want to be explicit
count.update(n => n + 1);
count.peek();       // 7        — read without subscribing

const doubled = computed(() => count() * 2);   // lazy + memoized

const stop = effect(() => {
  console.log(count());
  return () => console.log('cleaning up');     // optional cleanup
});
stop();

batch(() => { count(1); count(2); });          // dependents run once, at the end
untrack(() => count());                        // read without creating a dependency
```

Effects are **glitch-free**: a computed that ends up with the same value does not wake
its dependents, and a diamond-shaped graph runs each effect exactly once per change.

## Templates

| Where the `${}` goes | What it binds |
| --- | --- |
| `<p>${name}</p>` | child: text, a node, a nested template, or an array |
| `title=${tooltip}` | attribute on a native element (removed when `null`/`undefined`/`false`); **property** on a custom element |
| `class="card ${kind}"` | attribute built from static text plus values |
| `.value=${text}` | DOM **property**, casing preserved (`.innerHTML`, `.checked`) |
| `?hidden=${isHidden}` | attribute present only while truthy |
| `@click=${fn}` | event listener |
| `ref=${el => node = el}` | called with the element |

```js
html`
  <div class="card ${() => (active() ? 'on' : '')}" ?hidden=${isHidden}>
    <input .value=${text} @input=${e => text(e.target.value)} ref=${el => (field = el)} />
    ${name}
  </div>`
```

**The rule that makes it fast: a function is a live binding.** Pass a signal (or any
thunk) and Alacris subscribes that one binding to it. Pass a plain value and it is written
once and never checked again.

```js
html`<p>${count}</p>`              // updates forever, on its own
html`<p>${count()}</p>`            // reads once — a snapshot
html`<p>${() => a() + b()}</p>`    // derived, updates on either
```

Child positions accept templates, arrays, DOM nodes, strings and numbers.
`null`, `undefined`, booleans and `''` render nothing — so `${() => cond() &&
html`...`}` never leaks a stray `true`/`false` into the page.

Event modifiers: `@click.once`, `@click.capture`, `@scroll.passive`,
`@click.stop`, `@submit.prevent` — and they compose (`@click.stop.prevent`).

### Lists

For anything that grows, shrinks or reorders, use `each`. Every row gets its own
reactive scope, built once:

```js
import { each } from '@alacris/core';

html`<ul>
  ${each(
    () => todos(),                                  // the source
    (todo) => html`<li>${() => todo().text}</li>`,   // one row
    (t) => t.id                                     // identity
  )}
</ul>`
```

`each` is the difference between a list that scales and one that does not:

- **Reordering moves nodes.** `insertBefore` on the rows that actually moved —
  focus, scroll position and typed text survive.
- **A changed row wakes only itself.** Rows are not rebuilt and neighbours are
  never consulted.
- **Appending touches nothing else.** Matching runs at the head and tail mean a
  push never looks at the rows already there.

`row` is a signal, so read it inside a thunk (`${() => row().text}`) to keep the
binding live. The second argument to the render function is the row's index,
also a signal, supplied only if you ask for it.

Place `each(...)` directly in the child position, as above — its source is
already a function, so wrapping it in a thunk (`${() => each(...)}`) only makes
every re-run build a fresh spec that tears down and rebuilds the whole list.

For a short, static list, mapping the array yourself is fine, and `keyed` gives
it stable identity:

```js
html`<ul>${() => items().map(i => keyed(i.id, html`<li>${i.text}</li>`))}</ul>`
```

But a `.map` rebuilds every row's template on every change, so the renderer has
to walk all N rows to find the one that moved. On a thousand rows a swap costs
1.4 ms with `.map` and 0.1 ms with `each`. Reach for `each` past a few dozen
items.

### SVG

Use the `svg` tag so children land in the SVG namespace:

```js
import { svg } from '@alacris/core';
svg`<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r=${radius}/></svg>`
```

## Components

```js
import { define, html, css, signal, computed } from '@alacris/core';

define('user-card', {
  // Prop names + defaults. The default's *type* drives attribute coercion:
  // number, boolean, string, or JSON for objects/arrays.
  props: { name: 'anon', age: 0, tags: [] },

  // Shared across every instance via adoptedStyleSheets — parsed once.
  styles: css`
    :host { display: block; font: inherit }
    h3 { margin: 0 }
  `,

  // 'open' (default) | 'closed' | false for light DOM.
  shadow: 'open',

  // Runs ONCE per element. Return a template.
  setup({ name, age, tags }, host) {
    const grown = computed(() => age() >= 18);
    return html`
      <h3>${name}</h3>
      <p>${() => (grown() ? 'adult' : 'minor')} · ${() => tags().join(', ')}</p>
      <button @click=${() => host.emit('greet', { name: name() })}>say hi</button>`;
  },
});
```

Shorthand when you don't need props or styles:

```js
define('hello-world', () => html`<p>hello</p>`);
```

Each element gives you:

| | |
| --- | --- |
| `props.x` | the prop as a signal — `props.x()` reads, `props.x.set(v)` writes |
| `el.x` | the same prop as a plain DOM property, for the outside world |
| `x="..."` | the matching attribute (`camelCase` → `kebab-case`) |
| `host.emit(type, detail)` | dispatch a bubbling, composed `CustomEvent` |

Effects created in `setup` are disposed when the element leaves the document.
Merely *moving* an element does not tear it down.

One footgun to know: an object or array prop default (`tags: []`) is a single
value shared by every instance that has not been given its own — treat defaults
as immutable, or set a fresh value per element.

### Form controls

A control inside a shadow root is invisible to an enclosing `<form>`.
`formAssociated: true` registers a **form-associated custom element**: the
browser treats it as a real field, and `host.internals` — the platform's
[`ElementInternals`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) —
reports its value, validity and state:

```js
define('x-field', {
  formAssociated: true,
  props: { value: '' },
  setup({ value }, host) {
    effect(() => host.internals.setFormValue(value()));   // live: every write submits
    host.onFormReset = () => value.set('');
    return html`<input .value=${value} @input=${e => value.set(e.target.value)}>`;
  },
});
```

`<x-field name="nick">` now submits, resets, and disables (inside a
`<fieldset disabled>`) like a native input. Form lifecycle reactions are
captured at registration, so assign the forwarded handlers in `setup`:
`onFormAssociated`, `onFormDisabled`, `onFormReset`, `onFormStateRestore`.

## Styling

Styles are plain CSS in a `css` template. Identical CSS is **parsed once for the
whole page**, however many components use it and however many elements exist —
`css` returns a constructed stylesheet, and adopting one into a shadow root is a
pointer copy, not a parse.

```js
import { define, html, css } from '@alacris/core';

const reset = css`*, ::before, ::after { box-sizing: border-box }`;

define('x-card', {
  styles: [reset, css`
    :host { display: block; border: 1px solid #ddd; border-radius: 8px }
    h3    { margin: 0 }
  `],
  setup: () => html`<h3><slot name="title"></slot></h3><slot></slot>`,
});
```

`styles` takes a sheet, a raw CSS string, or an array of them, applied in order.
Interpolating one sheet into another inlines its text, so stylesheets compose
without anything being parsed twice.

### Dynamic values belong in custom properties

Do not rebuild a stylesheet to change a colour. Bind a custom property instead —
one property write, no CSS re-parse, and the browser handles the rest:

```js
html`<div style=${() => ({ '--bar-fill': pct() + '%', opacity: fade() })}>`
```

`style` accepts an object (custom properties included) and clears any key you
stop passing. `class` accepts objects and arrays:

```js
html`<button class=${() => ({ btn: true, 'btn-on': active(), [size()]: true })}>`
```

## Letting other people style your components

This is the part most web components get wrong. A shadow root is opaque, which
protects the author and blocks everyone else. The platform provides three ways
through, and Alacris leans on all three rather than inventing a fourth.

### 1. Custom properties — the theming contract

`vars` declares the properties your component is themed by, with defaults baked
into each declaration:

```js
import { vars, css } from '@alacris/core';

const t = vars('btn', { bg: '#111', fg: '#fff', radius: '8px' });
// t.bg === 'var(--btn-bg, #111)'

define('x-btn', {
  styles: css`
    :host { background: ${t.bg}; color: ${t.fg}; border-radius: ${t.radius} }
  `,
  setup: () => html`<button part="control"><slot></slot></button>`,
});
```

A consumer overrides it from anywhere above the element — custom properties
inherit straight through the shadow boundary:

```css
x-btn            { --btn-bg: rebeccapurple }
.dark x-btn      { --btn-bg: #eee; --btn-fg: #111 }
```

`t.names` is the generated list (`['--btn-bg', …]`), so the contract is
introspectable and easy to document.

### 2. `::part` — reach specific internals

Mark the elements you are willing to expose, and consumers style them directly:

```js
html`<button part="control">…</button>`
```

```css
x-btn::part(control) { padding: 1rem; letter-spacing: 0.02em }
```

Outer `::part` rules beat the component's own rules, so a consumer always wins.
(Verified in `demo/test.html` against a real CSS engine, not assumed.) Expose
parts deliberately — a `part` is a public API, and renaming one is a breaking
change.

For a part inside a nested component, forward it with the platform's
`exportparts`:

```js
html`<x-icon exportparts="glyph: btn-glyph"></x-icon>`
```

### 3. `adoptGlobal` — restyle a library you do not control

Push a stylesheet into **every** Alacris component, including ones that do not
exist yet:

```js
import { adoptGlobal, css } from '@alacris/core';

const remove = adoptGlobal(css`
  :host { font-family: Inter, system-ui }
  button { border-radius: 999px }
`);

remove(); // undo it
```

Global styles are applied *after* each component's own, so they win ties without
`!important`. This is the escape hatch for theming a third-party component set
whose source you cannot edit.

To reskin without re-adopting anything, rewrite a sheet in place. Every element
that adopted it updates on one write:

```js
const skin = css`:host { --tone: #111 }`;
skin.replace(':host { --tone: #eee }');   // every instance, immediately
```

### One rule

**Never use `!important` in a component.** It is the only inner declaration a
consumer cannot override — it defeats `::part`, custom properties and
`adoptGlobal` alike. Alacris never emits it, and neither should your components.

### Light DOM

`shadow: false` renders into the light DOM, where your page's CSS applies
normally and there is nothing to expose. Component `styles` then go to the
containing document once, not per element.

## State that scales

A signal holds one value. When that value is a big object, handing it a fresh
copy tells the renderer only *something changed* — so everything reading it
re-runs. A store tells it exactly **which path** changed.

```js
import { store } from '@alacris/core/store';

const state = store({ rows: [], filter: '', selected: -1 });

state.rows.push({ id: 1, label: 'first', done: false });
state.rows[0].label = 'renamed';   // wakes the one text node showing it
state.rows.splice(3, 1);           // structural: the list re-syncs
```

Read a path and the reading binding subscribes to that path; write it and only
those readers run. `state.rows[3].label = 'x'` does not re-diff the list, does
not rebuild the row, and does not consult any other row.

Plain objects and arrays become reactive recursively. `Date`, `Map`, class
instances and DOM nodes are stored and returned untouched. `unwrap(value)` gets
the raw object back, and array mutators (`push`, `splice`, `sort`, …) apply
atomically — an observer never sees a half-shifted array.

### selector — O(1) instead of O(n)

"Which row is selected?" is the classic accidental O(n): a thousand rows each
comparing against `selected` means a thousand subscribers, so every selection
change wakes every row.

```js
import { selector } from '@alacris/core/store';

const isSelected = selector(() => state.selected);

html`<tr class=${() => (isSelected(row().id) ? 'danger' : '')}>`
```

A selector keeps one small signal per key it is asked about and flips exactly
two of them — the row losing selection and the row gaining it. In `bench/` this
takes selecting a row from 0.56 ms to under 0.01 ms.

## Composition that scales

Threading a value through five elements that do not care about it is the thing
that actually stops people building large trees out of web components. Alacris
implements the W3C community **context protocol** — the same `context-request`
event `@lit/context` uses — so it works *between* libraries, not just inside
Alacris.

```js
import { createContext, provide, consume } from '@alacris/core/context';

export const ThemeCtx = createContext('theme');

define('app-shell', {
  setup(_props, host) {
    const theme = signal('dark');
    provide(host, ThemeCtx, theme);        // a value, a signal, or any function
    return html`<slot></slot>`;
  },
});

define('deep-button', {
  setup(_props, host) {
    const theme = consume(host, ThemeCtx, 'light');   // a read-only signal
    return html`<button class=${theme}>ok</button>`;
  },
});
```

The request is a composed, bubbling event, so it crosses shadow boundaries and
the nearest provider wins — an ordinary scope chain. Because it is the shared
protocol, an Alacris element can consume context provided by a Lit element and a Lit
element can consume one provided by Alacris. Consumers created before their
provider exists hold the fallback and update as soon as one appears.

### Slots

Shadow DOM already solves children. Use `<slot>` and the browser does the
composition for you — no library feature required:

```js
define('info-card', {
  setup: () => html`<section><h3><slot name="title"></slot></h3><slot></slot></section>`,
});
```

## Performance

`bench/` runs the standard js-framework-benchmark operations against
hand-written keyed DOM and against production React 19, Vue 3, Solid, Svelte 5,
Lit 3, and Stencil 4. Every implementation is checked to render byte-identical output
before it is timed. Solid, Svelte and Stencil are compiled; Alacris and Lit are
runtime-only.

Milliseconds, median of 5, JS and DOM mutation only. Lower is better. Run
`npm run bench:bundle && npm run demo` and open `/bench/` to reproduce.

| operation | vanilla | Alacris `each` | Solid | Svelte | Lit | Stencil | Vue | React |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| create 1,000 | **1.90** | 4.30 | 2.10 | 4.50 | 4.20 | 11.4 | 3.35 | 5.65 |
| create 10,000 | **17.4** | 41.8 | 20.8 | 161 | 49.7 | 130 | 33.3 | 228 |
| append 1,000 to 10,000 | **1.60** | 4.30 | 2.50 | 36.7 | 4.90 | 95.2 | 12.0 | 6.85 |
| update every 10th row | **0.030** | 0.083 | 0.033 | 0.090 | 0.118 | 6.78 | 0.910 | 0.318 |
| select a row | **<0.01** | **<0.01** | **<0.01** | 0.240 | 0.098 | 6.80 | 0.815 | 0.152 |
| swap 2 rows | **<0.01** | 0.102 | 0.080 | 0.468 | 0.407 | 6.78 | 0.882 | 1.72 |
| remove a row | **<0.01** | 0.063 | 0.057 | 0.738 | 0.227 | 8.65 | 0.795 | 0.162 |
| clear 1,000 | **0.200** | 0.600 | 0.350 | 0.400 | 152 | 3.55 | 0.400 | 1.50 |

What this says, honestly:

- **`each` is faster than React and Stencil on every operation, and faster
  than Lit on everything except create 1,000, where the two tie within noise.**
  Lit is the fair runtime custom-element comparison; Stencil is compiled but
  emits a virtual DOM, so a keyed update still walks the tree.
- **The update path sits next to Solid.** Select, with `selector`, is at the
  vanilla floor. Remove is 0.063 ms against Solid's 0.057. Swap is two
  `insertBefore` calls (0.102 ms vs Solid's 0.080).
- **Creation still costs ~2.3× vanilla / ~2× compiled Solid** on 1,000 rows.
  That is the price of wiring bindings at runtime rather than compiling them.
  Alacris deliberately has no build step. If you need vanilla-speed creation of
  ten thousand rows, no runtime library will give it to you.

Numbers come from one machine and one browser, and the absolute values move a
lot with hardware. The ratios are the durable part.

## Using Alacris from another framework

An Alacris component is a real custom element, so it is just a tag. Nothing to install on
the other side.

**Plain HTML**

```html
<script type="module" src="https://unpkg.com/@alacris/core@0.11.0/dist/alacris.js"></script>
<user-card name="Ada" age="36"></user-card>
```

**React** (19+ passes objects and events straight through)

```jsx
<user-card name="Ada" age={36} onGreet={e => console.log(e.detail)} />
```

On React 18 and earlier, set object props and listeners through a ref:

```jsx
const ref = useRef();
useEffect(() => {
  ref.current.tags = ['a', 'b'];                     // object prop
  const on = e => console.log(e.detail);
  ref.current.addEventListener('greet', on);
  return () => ref.current.removeEventListener('greet', on);
}, []);
return <user-card ref={ref} name="Ada" age={36} />;
```

**Vue**

```vue
<user-card :name="name" :age="age" @greet="onGreet" />
```

Add `app.config.compilerOptions.isCustomElement = tag => tag.includes('-')`.

**Svelte / Angular / Solid / Astro / Django / Rails** — write the tag. Attributes work
for strings, numbers and booleans; properties (`el.tags = [...]`) work for everything.

## API

| | |
| --- | --- |
| `signal(value, equals?)` | readable/writable reactive value |
| `computed(fn, equals?)` | lazy, memoized derived value |
| `effect(fn)` | run on change; return a cleanup; returns a disposer |
| `batch(fn)` | coalesce writes |
| `untrack(fn)` | read without subscribing |
| `tracking()` | whether a subscriber is currently collecting dependencies |
| `root(fn)` | ownership scope; returns a disposer for everything created inside |
| `onCleanup(fn)` | register a cleanup with the enclosing effect or root |
| `flush()` | run queued effects now |
| `html` / `svg` | template tags |
| `css` | cached, composable stylesheet |
| `vars(prefix, defaults)` | declare the custom properties a component is themed by |
| `adoptGlobal(...styles)` | push styles into every component; returns a remover |
| `keyed(key, template)` | give a list item a stable identity |
| `each(source, row, key?)` | list with a reactive scope per row |
| `render(value, container)` | render outside a component; returns a disposer |
| `define(name, options)` | register a custom element |

From `@alacris/core/store`:

| | |
| --- | --- |
| `store(object)` | deeply reactive object; every path is independent |
| `unwrap(value)` | the raw object, untracked |
| `update(target, fn)` | apply many mutations as one update |
| `selector(source, equals?)` | O(1) "is this the selected one?" |

From `@alacris/core/context`:

| | |
| --- | --- |
| `createContext(description?)` | a context key |
| `provide(host, ctx, value)` | serve it to descendants; returns a stopper |
| `consume(host, ctx, fallback?)` | read the nearest provider, as a signal |
| `provideTo(host, ctx, value)` | `provide`, torn down with the enclosing scope |

TypeScript declarations ship with the package.

## Good to know

- **ESM only.** No CommonJS build, and none planned.
- **Modern browsers**: needs `<template>`, `TreeWalker`, and (for `styles`)
  `adoptedStyleSheets` — Chrome/Edge 86+, Safari 16.4+, Firefox 101+. There is a
  `<style>` fallback where constructable stylesheets are missing.
- **Dynamic tag names are not supported** (`` html`<${tag}>` ``). Neither are child
  bindings inside raw-text elements (`<textarea>`, `<title>`, `<style>`,
  `<script>`) — use `.value` / `.textContent` instead.
- **Attribute values with a binding must be quoted or whole**: `class="a ${b}"` or
  `class=${b}`, not `class=a${b}`.
- Writes are applied **synchronously**; wrap a burst in `batch()` when you care.
- **Events are delegated** where it is safe: one listener per render root instead
  of one per binding. Modifiers (`@click.once`, `.capture`, …) opt out and attach
  a real listener, and delegation never crosses a shadow boundary twice. One
  consequence worth knowing in tests: a delegated handler only sees events that
  **bubble**. Real user events always do; `new Event('click')` does not unless
  you pass `{ bubbles: true }`.

## Security

Interpolated values are **never parsed as HTML** — child bindings become text
nodes and attribute bindings go through `setAttribute`, so there is nothing to
escape and no way to forget it. The runtime contains no `eval` or
`new Function`, works under a strict CSP, and template parsing goes through a
[Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
policy named `alacris` where enforced. The store's proxy blocks `__proto__`
reads and writes and inherited `constructor` reads, so merging untrusted JSON
cannot pollute prototypes through it.

The escape hatches you opt into (`.innerHTML`, URL attributes, `css`
interpolation) and the full model are documented in
[Security](https://bmartel.github.io/alacris/reference/security/). Report
vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## Building with AI agents

The docs ship a drop-in
[`AGENTS.md`](https://bmartel.github.io/alacris/AGENTS.md) that teaches coding
agents (Claude Code, Cursor, Copilot, …) the conventions in this README — the
live-binding rule, project organization with or without a build step, `each`
and `selector`, the styling contract, and the security rules. Put it in your
project root:

```bash
curl -o AGENTS.md https://bmartel.github.io/alacris/AGENTS.md
```

There is also an [`llms.txt`](https://bmartel.github.io/alacris/llms.txt) map
of the documentation for agents that fetch docs on demand. Details:
[AI agents](https://bmartel.github.io/alacris/reference/agents/).

That file is for projects that *use* Alacris. This repository's own
[`AGENTS.md`](AGENTS.md) is a different document — it covers working on the
library itself, and its source lives at
[`docs/public/AGENTS.md`](docs/public/AGENTS.md).

## Development

```bash
npm install
npm test          # 163 tests: signals, rendering, lists, store, context, security, docs, built bundle
npm run build     # dist/ + SIZE.md
npm run typecheck # type-level tests against the .d.ts files
npm run demo      # http://localhost:5173 — demo, browser tests, and /bench/
```

`demo/test.html` runs the cases a simulated DOM cannot express: real
custom-element upgrade, `adoptedStyleSheets`, listener options and SVG layout.
`bench/` is the performance harness — it checks that every implementation
renders identical output before timing any of them.


## Documentation

Full documentation, with every example running live on the page, is at
**[bmartel.github.io/alacris](https://bmartel.github.io/alacris/)**:

- [What is Alacris?](https://bmartel.github.io/alacris/start/what-is-alacris/) — the idea, and what it is not good at
- [Your first component](https://bmartel.github.io/alacris/start/first-component/)
- [Lists](https://bmartel.github.io/alacris/guides/lists/) — `each` and why it scales
- [Theming for consumers](https://bmartel.github.io/alacris/guides/theming/) — letting other people restyle your components
- [State that scales](https://bmartel.github.io/alacris/guides/state/) — the store and `selector`
- [API reference](https://bmartel.github.io/alacris/reference/api/)
- [Performance](https://bmartel.github.io/alacris/reference/performance/) — the benchmark, and the create-path tax
- [Security](https://bmartel.github.io/alacris/reference/security/) — the XSS model, CSP and Trusted Types, store hardening
- [AI agents](https://bmartel.github.io/alacris/reference/agents/) — a downloadable AGENTS.md for coding agents

The site is built from `docs/` and deploys on every push to `main`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: `npm install && npm test`,
there is no build step for development, and performance claims need numbers from
`bench/`.

Release history is in [CHANGELOG.md](CHANGELOG.md).

## License

MIT
