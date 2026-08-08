---
title: What is Alacris?
description: The idea in two minutes, what it is good at, and an honest account of what it is not.
sidebar:
  order: 1
---

Alacris is a library for building **web components** — real custom elements —
with **signals** for state and **fine-grained DOM updates** for rendering. The
whole runtime is 6 kB gzipped, it is ESM-only, it has no dependencies, and it
needs no build step.

The name is Latin: *alacer / alacris*, brisk and quick.

## The idea

Most UI libraries re-run your component when something changes and then work out
what to touch. Alacris does the opposite. A component's `setup` runs **once**.
What it returns is a template whose dynamic positions each become their own tiny
subscription, so changing a value writes to exactly one attribute or one text
node.

```js
const count = signal(0);

html`<p>You clicked ${count} times</p>`;
//                   ^^^^^ this binding, and nothing else, updates
```

There is no virtual DOM and no diffing. Templates are parsed once per call site
into a native `<template>`, and rendering is `cloneNode` — the fastest DOM
construction path a browser offers.

## Why web components

Because the output is a tag. `<user-card>` works in React, Vue, Svelte,
Angular, Rails, Django, or a plain HTML file, with nothing to install on the
other side and no framework lock-in. That is a genuinely valuable property, and
it is why the platform feature exists.

The reason people avoid web components anyway is that the ecosystem has been
thin: no good story for rendering, for composition across a deep tree, or for
state that scales past a toy. Alacris is an attempt to fill exactly those gaps —
hence [`each`](../../guides/lists/), [context](../../guides/context/),
[the store](../../guides/state/), and a
[styling model consumers can actually use](../../guides/theming/).

## What it is good at

- **Updates.** Changing one row in a thousand-row list touches that row.
  Removing a row costs 0.075 ms against hand-written DOM's 0.010 ms; selecting
  one sits at the floor.
- **Size.** Under 6 kB for the entire runtime. The store and context add-ons
  are 0.99 kB and 0.54 kB, imported separately.
- **Adoption.** One `<script type="module">` and you have a working component.
  No toolchain, and nothing to configure.
- **Being styled by other people.** Custom properties, `::part` and adoptable
  stylesheets, so a consumer can theme your components without forking them.

## What it is not good at

It is worth being direct about this.

**Creating elements costs roughly 3–4× hand-written DOM.** Templates are parsed
at runtime rather than compiled ahead of time, and that is the price. Svelte and
Solid close this gap with a compiler; Alacris deliberately does not have one,
because "no build step" is the property that makes it droppable anywhere. If you
need vanilla-speed construction of ten thousand rows, no runtime library will
give it to you.

The update path is competitive. The create path is not. Both numbers, and the
harness that produced them, are on the
[performance page](../../reference/performance/).

**It is `0.x`.** The API is settling. It is small enough to read end to end,
which is the mitigation.

**It is ESM-only**, and there is no CommonJS build planned.

## How it compares

| | Alacris | Lit | Solid | Svelte |
| --- | --- | --- | --- | --- |
| Output | custom elements | custom elements | components | components |
| Build step | none | none | required | required |
| Reactivity | signals | reactive properties | signals | compiler |
| Rendering | fine-grained | fine-grained | fine-grained | compiled |
| Create speed | ~3–4× vanilla | ~3–4× vanilla | ~1.1× vanilla | ~1.1× vanilla |

The two runtime template libraries sit together, and the two compilers sit
together. That is not a coincidence — it is the compiler.

## Next

- [Installation](../installation/) — npm, or a CDN URL
- [Your first component](../first-component/) — the whole model in one file
