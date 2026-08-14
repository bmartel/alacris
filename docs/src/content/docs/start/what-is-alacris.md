---
title: What is Alacris?
description: The idea in two minutes, what it is good at, and an honest account of what it is not.
sidebar:
  order: 1
---

Alacris is a library for building **web components** — real custom elements —
with **signals** for state and **fine-grained DOM updates** for rendering. The
whole runtime is 6.45 kB gzipped, it is ESM-only, it has no dependencies, and it
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
  Removing a row costs 0.063 ms; selecting one sits at the vanilla floor.
- **Size.** 6.45 kB gzipped for the entire runtime. The store and context add-ons
  are 1.03 kB and 0.54 kB, imported separately.
- **Adoption.** One `<script type="module">` and you have a working component.
  No toolchain, and nothing to configure.
- **Being styled by other people.** Custom properties, `::part` and adoptable
  stylesheets, so a consumer can theme your components without forking them.

## What it is not good at

It is worth being direct about this.

**Creating elements costs roughly 1.7× hand-written DOM, 1.7× compiled Solid**
on 1,000 rows. Templates are parsed at runtime rather than compiled ahead of
time, and that is the price. Svelte and Solid close the rest of this gap with a
compiler; Alacris deliberately does not have one, because "no build step" is the
property that makes it droppable anywhere. If you need vanilla-speed construction
of ten thousand rows, no runtime library will give it to you.

The update path sits next to Solid — faster than React, Lit and Stencil on every
operation in the suite. Both numbers, and the harness that produced them, are on
the [performance page](../../reference/performance/).

**It is `0.x`.** The API is settling. It is small enough to read end to end,
which is the mitigation.

**It is ESM-only**, and there is no CommonJS build planned.

## How it compares

| | Alacris | Lit | Stencil | Solid | Svelte |
| --- | --- | --- | --- | --- | --- |
| Output | custom elements | custom elements | custom elements | components | components |
| Build step | none | none | required | required | required |
| Reactivity | signals | reactive properties | VDOM + props | signals | compiler |
| Rendering | fine-grained | fine-grained | virtual DOM | fine-grained | compiled |
| Create speed | ~1.7× vanilla | ~1.8× vanilla | ~5× vanilla | ~1.1× vanilla | compiled |

The compilers still win on create when they emit direct DOM writes (Solid).
Alacris is the faster of the two runtime-only libraries. Stencil compiles, but
to a virtual DOM, so it does not get those create numbers. The remaining gap to
Solid is a compiler — which is the one thing this library refuses.

## Next

- [Installation](../installation/) — npm, or a CDN URL
- [Your first component](../first-component/) — the whole model in one file
