---
title: Limitations
description: What Alacris does not do, and what to use instead.
sidebar:
  order: 4
---

An honest list. Everything here is a deliberate trade or a known gap, not an
oversight.

## Creation is ~1.7× hand-written DOM

Templates are parsed at runtime. Compiled Solid sits around 1.1× vanilla;
Alacris sits around 1.7× on 1,000 rows. The remaining gap is a compiler, and
Alacris does not have one, because no build step is what makes it droppable
into any page.

The update path sits next to Solid and is faster than React, Lit and Stencil on
every operation in the suite — see [performance](../performance/). If you need
vanilla-speed construction of ten thousand rows, no runtime library will give
it to you.

## No server-side rendering

Alacris renders in the browser when the element upgrades. There is no
`renderToString`, and no hydration protocol.

In practice: put content that must be visible before JavaScript runs in a
**slot**, so the server renders it and the component composes around it.

## ESM only

There is no CommonJS build, and none is planned. Node 18+ and modern browsers
only.

## Template restrictions

Bindings go in attribute or child positions. These throw a `SyntaxError` rather
than guessing:

```js
html`<${tag}>`                        // dynamic tag names
html`<div ${attrName}="x">`           // dynamic attribute names
html`<div ${spreadProps}>`            // spreading
```

Raw-text elements (`<script>`, `<style>`, `<textarea>`, `<title>`) and nested
`<template>` elements cannot take a child binding, because the HTML parser
does not treat their contents as markup this template can reach — these throw
a `SyntaxError` too. Use a property:

```js
html`<textarea .value=${text}></textarea>`
html`<title .textContent=${title}></title>`
```

An attribute containing a binding must be quoted or whole — `class="a ${b}"` or
`class=${b}`, not `class=a${b}`. Values interpolated inside an HTML comment are
ignored.

## Delegated events need to bubble

Event bindings without modifiers attach one listener per render root. A
delegated handler therefore only sees events that **bubble**.

Real user events always do. Synthetic ones in tests do not unless you say so:

```js
el.dispatchEvent(new Event('click'));                    // not seen
el.dispatchEvent(new Event('click', { bubbles: true })); // seen
el.click();                                              // seen
```

Add any modifier — `@click.direct`, `@click.once` — to attach a real listener
instead.

## `!important` defeats theming

Not a library limitation so much as a rule: `!important` inside a component is
the one declaration a consumer cannot override. It defeats `::part`, custom
properties and `adoptGlobal` alike.

Alacris never emits it. Components should not either.

## The store is not free

Every read goes through a proxy. For bulk structural rewrites of very large
arrays, a plain signal is faster. The store wins decisively where it is designed
to — deep, targeted updates. See [state](../../guides/state/).

## One copy at a time

Two copies of the library means two reactive graphs, and signals from one will
not drive rendering in the other. With a bundler this is automatic; without one,
use an import map.

The same applies to `alacris/signal`, which is a **separate build** for non-DOM
use. If you are rendering, import your signals from `alacris`.

## It is 0.x

The API is still settling, and a breaking change will move the version to 1.0.0
rather than 0.x — semantic-release does not special-case pre-1.0.

The mitigation is that the whole library is about 900 lines and can be read end
to end in an afternoon.

## Not built in

Deliberately out of scope, because they are separable and not everyone needs
them:

- **Routing** — use any router; components are just tags
- **Forms** — no validation layer; use the platform's constraint validation
- **Animation** — use CSS transitions, the Web Animations API, or view
  transitions
- **i18n** — pass strings in, or share a translator through
  [context](../../guides/context/)
