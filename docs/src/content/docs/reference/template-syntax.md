---
title: Template syntax
description: Every binding form, on one page.
sidebar:
  order: 2
---

## The rule

A **function** in a `${}` is a live binding. A **value** is written once.

```js
html`<p>${count}</p>`             // live
html`<p>${count()}</p>`           // a snapshot
html`<p>${() => a() + b()}</p>`   // live, derived
```

The exceptions are `@event` and `ref`, where a function is always used
literally — a handler is a handler.

## Every form

| Syntax | Binds |
| --- | --- |
| `<p>${value}</p>` | child: text, number, node, template, array, or `each` |
| `title=${value}` | attribute on a native element (removed when `null`/`undefined`/`false`); **property** on a custom element |
| `class="btn ${kind}"` | attribute built from static text plus values |
| `.value=${value}` | DOM **property**, casing preserved |
| `?disabled=${value}` | attribute present only while truthy |
| `@click=${fn}` | event listener |
| `ref=${fn}` | called with the element |

On a **custom element**, `name=${name}` and `.name=${name}` do the same thing:
they set the property, so objects, arrays and camelCase names round-trip when a
parent passes props down. Use the dot when you want a native property
(`.value` on an input, `.hidden`) or when the name would otherwise stay an
attribute (`data-*`, `aria-*`). Pass the signal, not `name()` — calling is a
snapshot and the child will not see later writes.

## Child values

| Value | Renders |
| --- | --- |
| `'text'`, `42` | a text node |
| `null`, `undefined`, `false`, `''` | nothing |
| `true` | `"true"` |
| a `Node` | the node itself |
| ``html`…` `` | a nested template |
| an array | each item in order |
| `each(...)` | a list with per-row scopes |

## Event modifiers

| Modifier | Effect |
| --- | --- |
| `.stop` | `stopPropagation()` |
| `.prevent` | `preventDefault()` |
| `.once` | fires at most once |
| `.capture` | capture phase |
| `.passive` | passive listener |

They compose: `@click.stop.prevent=${fn}`.

Bindings **without** modifiers are delegated — one listener per render root
rather than one per element. A modifier opts out and attaches a real listener.

Delegated handlers only see events that bubble. Real user events always do;
`new Event('click')` does not unless you pass `{ bubbles: true }`.

## class

```js
class=${'a b'}                              // string
class=${['a', cond && 'b']}                 // array; falsy entries dropped
class=${{ a: true, b: cond() }}             // object; truthy keys included
class=${() => ({ on: active() })}           // live
```

Nested arrays and objects are flattened. An empty result removes the attribute.

## style

```js
style=${'color: red'}                       // string
style=${{ color: 'red', width: '10px' }}    // object
style=${{ '--tone': color() }}              // custom properties
style=${() => ({ opacity: fade() })}        // live
```

A key you stop passing is cleared. Custom properties are set with
`setProperty`, so they cascade into children and across shadow boundaries.

## Not supported

```js
html`<${tag}>`                        // dynamic tag names
html`<div ${attrName}="x">`           // dynamic attribute names
html`<div ${spreadProps}>`            // spreading
html`<textarea>${value}</textarea>`   // use .value
html`<title>${value}</title>`         // use .textContent
```

An attribute containing a binding must be quoted or whole:

```js
html`<div class="a ${b}">`   // fine
html`<div class=${b}>`       // fine
html`<div class=a${b}>`      // not supported
```

Values interpolated inside an HTML comment are ignored.

The compiler throws a `SyntaxError` for unsupported bindings rather than
guessing, so these fail loudly at first render.
