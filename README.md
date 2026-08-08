<div align="center">

# ⚡ Alacris

**Web components with signals and fine-grained DOM updates — in 5.2 KB.**

ESM-only · zero dependencies · no build step required · works inside any framework

[![CI](https://github.com/bmartel/alacris/actions/workflows/ci.yml/badge.svg)](https://github.com/bmartel/alacris/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/alacris.svg)](https://www.npmjs.com/package/alacris)
[![core size](https://img.shields.io/badge/core-5.15%20kB%20gzip-blue)](#size)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

***alacris*** *(Latin)* — brisk, lively, quick.

</div>

```html
<script type="module">
  import { define, html, signal } from 'https://unpkg.com/alacris';

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
hand-written, keyed, delegated DOM — the floor no library can beat. See
[Performance](#performance) for the numbers and for where Alacris still pays a tax.

## Size

| file | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `dist/alacris.js` — signals + templates + elements | 12.94 KB | **5.15 KB** | 4.70 KB |
| `dist/store.js` — deep reactive state | 1.98 KB | **0.98 KB** | 0.91 KB |
| `dist/context.js` — cross-component context | 0.91 KB | **0.54 KB** | 0.46 KB |
| `dist/signal.js` — reactivity alone, no DOM | 2.25 KB | **0.97 KB** | 0.92 KB |

The add-ons are separate entry points that import the core, so you only pay for
what you import — and there is exactly one reactive graph at runtime.

Run `npm run size` to re-measure. That is the *entire* runtime — rendering,
reactivity and the custom-element layer.

## Install

```bash
npm install alacris
```

```js
import { define, html, signal, computed, effect } from 'alacris';
```

Or skip installing entirely:

```js
// latest
import { define, html, signal } from 'https://unpkg.com/alacris';
// pinned (recommended for production)
import { define, html, signal } from 'https://unpkg.com/alacris@0.1.0/dist/alacris.js';
// or jsDelivr
import { define, html, signal } from 'https://cdn.jsdelivr.net/npm/alacris/+esm';
```

Just the reactive core, without the renderer (0.97 KB):

```js
import { signal, computed, effect } from 'https://unpkg.com/alacris/dist/signal.js';
```

## Signals

A signal is a function. Call it to read, call it with an argument to write.

```js
import { signal, computed, effect, batch, untrack } from 'alacris';

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
| `title=${tooltip}` | attribute — removed when `null`, `undefined` or `false` |
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
`null`, `undefined`, `false` and `''` render nothing.

Event modifiers: `@click.once`, `@click.capture`, `@scroll.passive`,
`@click.stop`, `@submit.prevent` — and they compose (`@click.stop.prevent`).

### Lists

For anything that grows, shrinks or reorders, use `each`. Every row gets its own
reactive scope, built once:

```js
import { each } from 'alacris';

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

For a short, static list, mapping the array yourself is fine, and `keyed` gives
it stable identity:

```js
html`<ul>${() => items().map(i => keyed(i.id, html`<li>${i.text}</li>`))}</ul>`
```

But a `.map` rebuilds every row's template on every change, so the renderer has
to walk all N rows to find the one that moved. On a thousand rows that is the
difference between 1 ms and 28 ms. Reach for `each` past a few dozen items.

### SVG

Use the `svg` tag so children land in the SVG namespace:

```js
import { svg } from 'alacris';
svg`<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r=${radius}/></svg>`
```

## Components

```js
import { define, html, css, signal, computed } from 'alacris';

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

## State that scales

A signal holds one value. When that value is a big object, handing it a fresh
copy tells the renderer only *something changed* — so everything reading it
re-runs. A store tells it exactly **which path** changed.

```js
import { store } from 'alacris/store';

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
import { selector } from 'alacris/store';

const isSelected = selector(() => state.selected);

html`<tr class=${() => (isSelected(row().id) ? 'danger' : '')}>`
```

A selector keeps one small signal per key it is asked about and flips exactly
two of them — the row losing selection and the row gaining it. In `bench/` this
takes selecting a row from 0.61 ms to 0.01 ms.

## Composition that scales

Threading a value through five elements that do not care about it is the thing
that actually stops people building large trees out of web components. Alacris
implements the W3C community **context protocol** — the same `context-request`
event `@lit/context` uses — so it works *between* libraries, not just inside
Alacris.

```js
import { createContext, provide, consume } from 'alacris/context';

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
hand-written, keyed, delegated DOM — the floor no library can beat, and the line
Solid and Svelte sit within roughly 1.1× of. Every implementation is checked to
render byte-identical output before it is timed.

Milliseconds, median of 5, JS and DOM mutation only (layout excluded so the
framework's own cost is visible). Lower is better; run `npm run demo` and open
`/bench/` to reproduce.

| operation | vanilla | Alacris `.map` | Alacris `each` | `each` + store |
| --- | ---: | ---: | ---: | ---: |
| create 1,000 | 2.90 | 8.60 | 11.90 | 19.60 |
| create 10,000 | 52.50 | 105.10 | 187.50 | 285.30 |
| append 1,000 to 10,000 | 4.60 | 27.90 | **17.00** | 45.10 |
| update every 10th row | 0.060 | 1.29 | 0.325 | **0.230** |
| select a row | <0.01 | 1.18 | 0.610 | **0.010** |
| swap 2 rows | <0.01 | 2.22 | **1.18** | 1.99 |
| remove a row | 0.010 | 1.38 | **0.075** | 1.61 |
| clear 1,000 | 0.300 | 1.60 | **1.30** | 1.60 |

What this says, honestly:

- **The update path is competitive.** Removing a row is 0.075 ms against
  vanilla's 0.010; selecting one is at the floor. These were 1.46 ms and 1.40 ms
  before `each`, `selector` and event delegation.
- **Creation still costs 3–4× hand-written DOM.** That is the price of parsing
  templates at runtime instead of compiling them. Svelte and Solid close this
  gap with a build step; Alacris deliberately does not have one. If you need
  vanilla-speed creation of ten thousand rows, no runtime library will give it
  to you.
- **Pick the right tool per shape.** `each` is best for structural churn;
  the store is best for deep, targeted updates; the store's proxy costs more on
  bulk array rewrites. They compose — use `each` for the list and a store for
  the row data.

Numbers come from one machine and one browser, and the absolute values move a
lot with hardware. The ratios are the durable part.

## Using Alacris from another framework

An Alacris component is a real custom element, so it is just a tag. Nothing to install on
the other side.

**Plain HTML**

```html
<script type="module" src="https://unpkg.com/alacris/dist/alacris.js"></script>
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
| `root(fn)` | ownership scope; returns a disposer for everything created inside |
| `onCleanup(fn)` | register a cleanup with the enclosing effect or root |
| `flush()` | run queued effects now |
| `html` / `svg` | template tags |
| `css` | identity tag, for editor highlighting |
| `keyed(key, template)` | give a list item a stable identity |
| `each(source, row, key?)` | list with a reactive scope per row |
| `render(value, container)` | render outside a component; returns a disposer |
| `define(name, options)` | register a custom element |

From `alacris/store`:

| | |
| --- | --- |
| `store(object)` | deeply reactive object; every path is independent |
| `unwrap(value)` | the raw object, untracked |
| `update(target, fn)` | apply many mutations as one update |
| `selector(source, equals?)` | O(1) "is this the selected one?" |

From `alacris/context`:

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
  `adoptedStyleSheets` — Chrome/Edge 73+, Safari 16.4+, Firefox 101+. There is a
  `<style>` fallback where constructable stylesheets are missing.
- **Dynamic tag names are not supported** (`` html`<${tag}>` ``). Neither are bindings
  inside `<textarea>`/`<title>` text — use `.value` / `.textContent` instead.
- **Attribute values with a binding must be quoted or whole**: `class="a ${b}"` or
  `class=${b}`, not `class=a${b}`.
- Writes are applied **synchronously**; wrap a burst in `batch()` when you care.
- **Events are delegated** where it is safe: one listener per render root instead
  of one per binding. Modifiers (`@click.once`, `.capture`, …) opt out and attach
  a real listener, and delegation never crosses a shadow boundary twice. One
  consequence worth knowing in tests: a delegated handler only sees events that
  **bubble**. Real user events always do; `new Event('click')` does not unless
  you pass `{ bubbles: true }`.

## Development

```bash
npm install
npm test          # 97 tests: signals, rendering, lists, store, context, built bundle
npm run build     # dist/ + SIZE.md
npm run typecheck # type-level tests against the .d.ts files
npm run demo      # http://localhost:5173 — demo, browser tests, and /bench/
```

`demo/test.html` runs the cases a simulated DOM cannot express: real
custom-element upgrade, `adoptedStyleSheets`, listener options and SVG layout.
`bench/` is the performance harness — it checks that every implementation
renders identical output before timing any of them.


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: `npm install && npm test`,
there is no build step for development, and performance claims need numbers from
`bench/`.

Release history is in [CHANGELOG.md](CHANGELOG.md).

## License

MIT
