# AGENTS.md — building applications with Alacris

You are working in a project that uses **Alacris** (npm: `@alacris/core`) — web components
with signals and fine-grained DOM updates. ~6.60 kB gzip, ESM-only, zero dependencies,
no build step required. Docs: https://bmartel.github.io/alacris/

This file tells you how to organize, write, and verify Alacris code. Follow it
exactly unless the project's own conventions visibly differ.

## The mental model (read this first)

1. **A signal is a function.** `s()` reads, `s(v)` or `s.set(v)` writes,
   `s.peek()` reads without subscribing.
2. **In a template, a function is a live binding; a plain value is written once.**
   `html`<p>${count}</p>`` updates forever. `html`<p>${count()}</p>`` is a
   one-time snapshot. This is the single most important rule in the library.
3. **`setup` runs exactly once per element.** There is no re-render. Never write
   code that assumes a component function re-executes — derive with `computed`
   or inline thunks instead.
4. **No virtual DOM.** A changed signal writes to exactly the DOM node bound to
   it. You never need `shouldComponentUpdate`, memoization of templates, or keys
   on static content.

## Setup

### Without a build system (prefer this for small apps, demos, prototypes)

Use an import map so source files import by bare specifier, identical to the
npm path — code stays portable between the two setups:

```html
<script type="importmap">
{
  "imports": {
    "@alacris/core": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.4/dist/alacris.js",
    "@alacris/core/store": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.4/dist/store.js",
    "@alacris/core/context": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.4/dist/context.js",
    "@alacris/ui": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.4.3/src/index.js",
    "@alacris/ui/theme": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.4.3/src/theme/index.js"
  }
}
</script>
<script type="module" src="./src/main.js"></script>
```

The URLs pin the current release. Never mix two versions of the module on one
page — two copies means two reactive graphs that cannot see each other.

### With a build system

```bash
npm install @alacris/core
```

```js
import { define, html, css, signal, computed, effect, batch, each } from '@alacris/core';
import { store, selector, unwrap, update } from '@alacris/core/store';
import { createContext, provide, consume } from '@alacris/core/context';
```

ESM only — no CommonJS. `sideEffects: false` is set, so tree-shaking works.
The add-on entry points (`/store`, `/context`, `/signal`) share one reactive
graph with the core; import them freely.

### Alacris UI (design system)

Buttons, fields, navigation, a theme engine. Separate package, same tags
everywhere — HTML, React, Vue, Svelte, or no framework:

```bash
npm install @alacris/ui
```

```js
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#0b57d0' });
```

```html
<ui-button>Hello</ui-button>
```

`@alacris/ui` depends on `@alacris/core` and must share that one copy. Do not also
load a CDN build of Alacris on the same page. Live catalog:
https://bmartel.github.io/alacris/ui/
Docs:
https://bmartel.github.io/alacris/ui/getting-started/
https://bmartel.github.io/alacris/ui/frameworks/

Icon names are kebab-case (`arrow-forward`); underscores (`arrow_forward`)
resolve to the same glyph. `iconNames()` lists the registry, `registerIcons()`
adds more, and an unknown name warns instead of rendering a blank button.
Controls report through `e.detail.value` — for a slider that is a number, and
`value=${signal}` on the tag is a live property binding like any other control.

## Project organization

```
src/
  main.js             # entry: imports every component module once
  components/         # one custom element per file, filename = tag name
    app-shell.js
    todo-list.js
    todo-item.js
  state/
    app-store.js      # store() + actions exported as plain functions
  context/
    theme.js          # createContext keys, exported for provider + consumers
  styles/
    tokens.js         # shared css`` sheets and vars() contracts
```

- **One component per file**, filename matching the tag: `todo-list.js` defines
  `<todo-list>`. The file calls `define(...)` at module top level as a side
  effect and exports nothing (or exports the tag name as a string constant).
- **Tag names**: pick one project prefix (`app-`, or the product's name) and use
  it everywhere. Custom elements require a dash; two-part lowercase names only.
- **`main.js` imports every component module** so registration happens
  predictably. With a bundler this is your entry; without one it is the single
  `<script type="module">` the page loads.
- **Stores are modules, not globals on window.** Export the store and the
  functions that mutate it; components import both. Keep mutation logic in the
  store module, not spread through event handlers.
- **Shared styling tokens** (a `vars()` contract, reset sheets) live in one
  module every component imports. `css` interns by text, so shared sheets parse
  once for the whole page.

## Components

```js
import { define, html, css, computed } from '@alacris/core';

define('user-card', {
  // Prop names + defaults. The default's TYPE drives attribute coercion:
  // number, boolean, string — and objects/arrays parse attribute JSON.
  props: { name: 'anon', age: 0, tags: [] },

  // Optional. 'open' (default) | 'closed' | false for light DOM.
  shadow: 'open',

  // Shared across every instance via adoptedStyleSheets — parsed once.
  styles: css`:host { display: block } h3 { margin: 0 }`,

  // Runs ONCE per element. Props arrive as signals. Return a template.
  setup({ name, age, tags }, host) {
    const grown = computed(() => age() >= 18);
    return html`
      <h3>${name}</h3>
      <p>${() => (grown() ? 'adult' : 'minor')} · ${() => tags().join(', ')}</p>
      <button @click=${() => host.emit('greet', { name: name() })}>hi</button>`;
  },
});
```

Shorthand without props/styles: `define('x-hello', () => html`<p>hello</p>`)`.

- Props are readable three ways: attribute `age="3"`, DOM property `el.age = 3`,
  and inside `setup` as signals (`age()`, `age.set(4)`). camelCase prop ↔
  kebab-case attribute.
- **Downward with props.** In a parent template, `name=${name}` (or
  `.name=${name}`) on a custom element sets the child's property and stays live.
  Pass the signal, not `name()` — calling is a snapshot and the child will not
  see later writes. Objects and arrays go through as values; you do not need to
  stringify them, and you do not need the `.prop` prefix on a custom element.
- Communicate **upward with events** (`host.emit(type, detail)` — bubbling and
  composed), **across with context or a store**.
- Effects created inside `setup` are disposed automatically when the element
  leaves the document. Do not hand-manage teardown unless you attach listeners
  to `window`/`document` — then return-a-cleanup from an `effect`, or use
  `onCleanup`.
- Use `<slot>` (named and default) for composition instead of passing template
  children through props.
- A control that should submit inside a `<form>` needs `formAssociated: true`
  in its options — shadow inputs are invisible to forms. That gives `setup`
  `host.internals` (the platform's `ElementInternals`): keep the value live
  with `effect(() => host.internals.setFormValue(value()))`, report validity
  with `host.internals.setValidity(...)`, and assign the forwarded lifecycle
  handlers there (`host.onFormReset = () => value.set('')`, plus
  `onFormAssociated` / `onFormDisabled` / `onFormStateRestore`). The initial
  association/disabled state precedes `setup` — read `host.internals.form` /
  `host.matches(':disabled')` for the starting state; handlers hear changes
  from then on. Guard with `host.internals?.` in DOMs without
  `attachInternals`.

```js
import { define, html, signal } from '@alacris/core';

define('user-list', {
  setup() {
    const name = signal('Ada');
    const tags = signal(['math']);
    return html`
      <input .value=${name} @input=${(e) => name(e.target.value)}>
      <user-card name=${name} tags=${tags}></user-card>`;
  },
});
```

### Rendering without a custom element

`render(template, container)` mounts a template into any node and returns a
disposer that removes the DOM and stops every binding. That is how Alacris drops
into a page, a route handler, or another framework's ref — no element definition
involved:

```js
import { render, root, html } from '@alacris/core';

const stop = render(html`<p>${count}</p>`, document.querySelector('#app'));
stop(); // removes the nodes and unsubscribes everything

// Effects created outside a setup have no owner. root() gives them one.
const dispose = root(() => { effect(() => console.log(count())); });
```

Inside a component you need neither: `setup` already runs in a scope that is torn
down with the element.

## Templates — where `${}` can go

| Syntax | Meaning |
| --- | --- |
| `<p>${v}</p>` | child: text, node, template, array, `each(...)` |
| `title=${v}` | attribute; removed when `null`/`undefined`/`false` |
| `class="card ${v}"` | attribute spliced with static text (must be quoted) |
| `.value=${v}` | DOM **property**, casing preserved |
| `?disabled=${v}` | boolean attribute, present while truthy |
| `@click=${fn}` | event listener; modifiers: `.stop.prevent.once.capture.passive` |
| `ref=${el => ...}` | called with the element after creation |

- `class=${...}` and `style=${...}` also accept objects/arrays:
  `class=${() => ({ btn: true, on: active() })}`,
  `style=${() => ({ '--fill': pct() + '%' })}`.
- Conditionals: `${() => cond() && html`...`}` — `null`/`undefined`/booleans/`''`
  render nothing.
- SVG needs the `svg` tag: `` svg`<circle r=${r}/>` ``.
- Not supported: dynamic tag names, bindings inside `<textarea>`/`<title>` text
  (use `.value`/`.textContent`), unquoted partial attributes (`class=a${b}`).

## Lists — always `each` past a few dozen rows

```js
import { each } from '@alacris/core';

html`<ul>
  ${each(
    () => todos(),                                   // source (thunk)
    (todo) => html`<li>${() => todo().text}</li>`,   // row — todo is a SIGNAL
    (t) => t.id                                      // stable identity
  )}
</ul>`
```

- The row argument is a **signal**: read it inside a thunk (`${() => todo().text}`)
  or the row goes stale.
- Always supply a key function returning a stable id. Never use array index as
  the key for data that reorders.
- Reordering moves DOM nodes (`insertBefore`) — focus, scroll and typed text
  survive. A changed row wakes only itself.
- Small static list: `${() => items().map(i => keyed(i.id, html`<li>${i.text}</li>`))}`
  is fine; it rebuilds row templates on every change, so don't use it for big or
  hot lists.

## State

- **Local component state**: `signal` / `computed` inside `setup`.
- **Shared or deep state**: `store` from `@alacris/core/store`. Mutate it like a plain
  object — `state.rows[0].label = 'x'` updates only the binding reading that
  path. Array mutators (`push`, `splice`, `sort`, ...) are atomic.
- Wrap multi-write mutations in `update(state, s => { ... })` (or `batch`) so
  observers run once.
- `unwrap(state)` for JSON.stringify / structural comparison / sending over the
  wire.
- **"Which row is selected?"** must be `selector`, never a per-row comparison:

```js
const isSelected = selector(() => state.selected);
html`<tr class=${() => (isSelected(row().id) ? 'active' : '')}>`
```

- Cross-cutting values (theme, user, router) that components deep in the tree
  need: use context, not prop-drilling:

```js
// context/theme.js
export const ThemeCtx = createContext('theme');
// provider setup():   provideTo(host, ThemeCtx, themeSignal);
// consumer setup():   const theme = consume(host, ThemeCtx, 'light');
```

Use `provideTo` inside a `setup` — it stops providing when the element goes away.
`provide` is the same thing without that, and returns the stop function itself,
for a provider that is not an element. It speaks the W3C `context-request`
protocol, so it interoperates with Lit.

## Styling rules

- Component CSS goes in `styles:` with the `css` tag. Compose sheets by
  interpolation or arrays: `styles: [reset, css`...`]`.
- **Theming contract**: declare themable values with `vars()` so consumers
  override via custom properties; expose internals deliberately with
  `part="name"`. A part is public API.
- Dynamic values go in **custom properties bound from the template**
  (`style=${() => ({ '--x': v() })}`), never by rebuilding a stylesheet.
- **Never use `!important` inside a component.** It is the one thing a consumer
  cannot override.
- To restyle components you do not own, `adoptGlobal(sheet)` pushes styles into
  every Alacris component on the page and every one created afterwards,
  applied after each component's own styles so a theme wins ties. It returns a
  function that removes them again. Use it at the app level, never from inside a
  component.
- `shadow: false` (light DOM) when the page's global CSS should style the
  component directly.

## Security rules (non-negotiable)

- Interpolated values are **always text or attribute values, never HTML**. You
  do not need to escape anything in `${}`.
- **Never bind `.innerHTML`/`.outerHTML` to data you did not author.** If you
  must render rich text, sanitize it first (e.g. DOMPurify) and say so in a
  comment.
- Do not interpolate untrusted data into `href`/`src`-like attributes without
  validating the scheme (`javascript:` URLs execute).
- Do not interpolate untrusted data into `css` templates — CSS injection is
  real. `css` is for author-written styles; runtime values belong in custom
  properties.
- The store silently drops `__proto__` keys (prototype-pollution guard) — do
  not "fix" that behavior.
- Alacris contains no `eval`/`new Function` and registers a Trusted Types
  policy named `alacris`; under a `trusted-types` CSP directive, allow it:
  `Content-Security-Policy: trusted-types alacris;`

## Performance checklist

- Hot list? → `each` + key function. Deep row data? → `store`. Selection? →
  `selector`.
- Burst of writes (loops, websocket batches) → wrap in `batch(() => ...)`.
- Reading a signal inside an effect only to pass it along → `peek()`/`untrack`
  to avoid a false dependency.
- Templates are cached **per call site** — do not build template strings
  dynamically or wrap `html` calls in ways that defeat the tag-function cache.
- Do not memoize, clone, or diff templates yourself. The library already does
  the minimal work; extra machinery makes it slower.

## Testing

- Node's built-in runner + happy-dom works:
  `node --import ./test/setup.js --test test/*.test.js` (see the Alacris repo's
  `test/setup.js` for the DOM bootstrap).
- Delegated event handlers only see events that **bubble**. Real user events
  bubble; synthetic ones need `new Event('click', { bubbles: true })`.
- Writes are synchronous — assert immediately after a write, no `await tick()`.
- For behavior a simulated DOM cannot express (custom-element upgrade timing,
  `adoptedStyleSheets`, real layout), write a browser test page.

## Common mistakes (wrong → right)

| Wrong | Right | Why |
| --- | --- | --- |
| `html`<p>${count()}</p>`` for live text | `html`<p>${count}</p>`` | calling reads once — a snapshot |
| `html`<x-child user=${user()}>`` | `html`<x-child user=${user}>`` | same snapshot rule; pass the signal so the child updates |
| `` `${todo().text}` `` in an `each` row | `${() => todo().text}` | row signal must be read in a thunk |
| `state.list = [...state.list, item]` | `state.list.push(item)` | replacing the array re-syncs everything |
| per-row `row.id === selected()` | `selector(() => selected())` | O(n) wakeups → O(1) |
| `class=a${b}` | `class="a ${b}"` | partial attribute must be quoted |
| `@click=${() => handler()}` re-created concerns | any function is fine | handlers are values; no memoizing needed |
| effects for derived values | `computed` | effects are for side effects only |
| `setTimeout` to "wait for render" | assert/read immediately | updates are synchronous |
| `.innerHTML=${userContent}` | sanitize first, or render text | XSS |
| rebuilding a stylesheet per state change | bind a custom property | one property write vs a CSS re-parse |

## Verifying your work

Before declaring a task done:

1. Components render and update from a plain static page (no bundler) — if the
   project has no build step, do not introduce one for a feature.
2. No console errors on load, interaction, and element disconnect/reconnect.
3. Lists keep focus and input state across a reorder (the `each` + key test).
4. No `!important` in any component stylesheet; themable values documented via
   `vars()`.
5. Nothing untrusted flows into `.innerHTML`, `href`, or `css` templates.
