---
title: API
description: Every export, on one page.
sidebar:
  order: 1
---

TypeScript declarations ship with the package, so your editor has all of this
too.

## `alacris`

### Reactivity

#### `signal(value, equals?)`

A readable and writable reactive value.

```js
const count = signal(0);
count();                     // read, and subscribe if inside a computation
count(5);                    // write
count.set(5);                // write, explicitly
count.update((n) => n + 1);  // write from the current value
count.peek();                // read without subscribing
```

`equals` defaults to `===`. Pass a comparator to control when a write counts as
a change.

#### `computed(fn, equals?)`

A lazy, memoised derived value. Recomputes only when read *and* a source
changed. If it lands on the same value, nothing downstream is woken.

```js
const area = computed(() => width() * height());
area();      // read
area.peek(); // read without subscribing
```

#### `effect(fn)`

Runs `fn` now, and again whenever a value it read changes. Returns a disposer.
`fn` may return a cleanup, run before the next pass and on disposal.

```js
const stop = effect(() => {
  const id = setInterval(tick, delay());
  return () => clearInterval(id);
});
stop();
```

#### `batch(fn)`

Group writes so dependents run once at the end. Returns whatever `fn` returns.

#### `untrack(fn)`

Read without creating a dependency.

#### `flush()`

Run any queued effects immediately. Rarely needed — writes apply synchronously.

#### `tracking()`

`true` while a subscriber (an effect or a computed) is collecting
dependencies — reads made now will subscribe it. For store-like integrations
that want to skip subscription bookkeeping on untracked reads; application
code rarely needs it.

#### `root(fn)`

Create an ownership scope. Returns a disposer that tears down every effect
created inside.

#### `onCleanup(fn)`

Register a teardown with the nearest enclosing effect or root.

### Templates

#### ``html`…` ``

A tagged template. Parsed once per call site. See
[template syntax](../template-syntax/).

#### ``svg`…` ``

The same, for fragments that belong inside an `<svg>`.

#### `each(source, render, key?)`

A list where each row gets its own reactive scope, created once.

```js
each(
  () => items(),                                  // source
  (item, index) => html`<li>${() => item().t}</li>`, // row; both are signals
  (item) => item.id                                // identity, optional
)
```

`index` is only created if the render function declares a second parameter.

#### `keyed(key, template)`

Give a hand-mapped list item a stable identity. Prefer `each` past a few dozen
items.

#### `render(value, container)`

Render outside a component. Returns a disposer that removes the DOM and stops
every binding.

### Styling

#### ``css`…` ``

Cached CSS. Identical text returns the same constructed stylesheet, so it is
parsed once for the whole page. Interpolating one sheet into another composes
them.

```js
const sheet = css`:host { display: block }`;
sheet.text;                       // the CSS text
sheet.sheet;                      // the CSSStyleSheet, or null if unsupported
sheet.replace(':host { … }');     // rewrite in place; every adopter updates
```

#### `vars(prefix, defaults)`

Declare the custom properties a component is themed by.

```js
const t = vars('btn', { bg: '#111', borderRadius: '8px' });
t.bg;      // 'var(--btn-bg, #111)'
t.names;   // ['--btn-bg', '--btn-border-radius']
t.prefix;  // 'btn'
```

`camelCase` keys become `kebab-case` properties.

#### `adoptGlobal(...styles)`

Push styles into every component, including ones created later. Applied after
each component's own styles, so a theme wins ties. Returns a function that
removes them.

### Components

#### `define(name, options | setup)`

Register a custom element.

```js
define('x-thing', {
  props:  { label: '', count: 0 },
  styles: css`:host { display: block }`,
  shadow: 'open',            // 'open' | 'closed' | false
  formAssociated: false,     // true: a form-associated custom element
  setup(props, host) { return html`…`; },
});

define('x-simple', () => html`<p>hi</p>`);
```

Returns the element constructor.

**Inside `setup`:**

- `props.x` — the prop as a signal (`props.x()` reads, `props.x.set(v)` writes)
- `host` — the element, with `host.props` and `host.emit`
- with `formAssociated: true`: `host.internals` — the element's
  `ElementInternals` (`setFormValue`, `setValidity`, `form`, …) — and the
  form lifecycle reactions forwarded to handlers assigned in `setup`:
  `host.onFormAssociated(form)`, `host.onFormDisabled(disabled)`,
  `host.onFormReset()`, `host.onFormStateRestore(state, mode)`. The initial
  association/disabled state precedes `setup` — read `host.internals.form`
  and `host.matches(':disabled')` for the starting state; the handlers hear
  changes from then on

**On the element:**

- `el.x` — the same prop as a DOM property
- `x="…"` — the matching attribute (`camelCase` → `kebab-case`)
- from a parent template, `x=${signal}` (or `.x=${signal}`) sets that
  property and stays live — objects and camelCase names included
- `el.emit(type, detail?, init?)` — dispatch a bubbling, composed
  `CustomEvent`; returns `false` if cancelled

## `alacris/store`

#### `store(object)`

A deeply reactive object. Reading a path subscribes to that path; writing one
wakes only those readers. Plain objects and arrays are made reactive
recursively; everything else is returned as-is.

Array mutators (`push`, `splice`, `sort`, …) apply atomically.

#### `unwrap(value)`

The raw object, with no proxy and no tracking.

#### `update(target, fn)`

Apply many mutations as one update.

#### `peek(fn)`

Read without subscribing.

#### `selector(source, equals?)`

Turn an O(n) "which one is selected?" test into an O(1) one. Returns a function
that takes a key and returns a boolean, flipping only the two keys that changed.

```js
const isSelected = selector(() => state.selected);
isSelected(row.id); // boolean
```

## `alacris/context`

#### `createContext(description?)`

A context key. Identity is what matters — import the same object in the provider
and the consumer.

#### `provide(host, context, value)`

Serve a value to descendants. `value` may be a plain value, a signal, or any
function; reactive values are pushed to subscribers when they change. Returns a
function that stops providing.

#### `consume(host, context, fallback?)`

Ask the nearest provider above `host`. Returns a read-only signal, holding
`fallback` until a provider answers.

#### `provideTo(host, context, value)`

`provide`, torn down automatically with the enclosing scope.

## `alacris/signal`

The reactive core with no DOM dependency: `signal`, `computed`, `effect`,
`batch`, `untrack`, `tracking`, `flush`, `root`, `onCleanup`.

It is a **separate build with its own graph**. If you are rendering, import your
signals from `alacris`.
