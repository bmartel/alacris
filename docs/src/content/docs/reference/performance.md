---
title: Performance
description: What the benchmark measures, what the numbers are, and where Alacris still pays a tax.
sidebar:
  order: 3
---

## What is measured

`bench/` in the repository runs the standard js-framework-benchmark operations
against **hand-written, keyed, delegated DOM** — the floor no library can beat,
and the line Solid and Svelte sit within roughly 1.1× of.

Two things make the numbers trustworthy:

- Every implementation is checked to render **byte-identical output** before any
  of it is timed.
- Layout is excluded, so what remains is the framework's own JS and DOM-mutation
  cost — the part a library actually controls. A toggle measures the
  layout-inclusive cost instead.

Milliseconds, median of five. Lower is better.

<table class="bench">
  <thead>
    <tr>
      <th>operation</th><th>vanilla</th><th>`.map`</th><th>`each`</th><th>`each` + store</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>create 1,000</td><td>2.90</td><td>8.60</td><td>11.90</td><td>19.60</td></tr>
    <tr><td>create 10,000</td><td>52.50</td><td>105.10</td><td>187.50</td><td>285.30</td></tr>
    <tr><td>append 1,000 to 10,000</td><td>4.60</td><td>27.90</td><td>**17.00**</td><td>45.10</td></tr>
    <tr><td>update every 10th row</td><td>0.060</td><td>1.29</td><td>0.325</td><td>**0.230**</td></tr>
    <tr><td>select a row</td><td>&lt;0.01</td><td>1.18</td><td>0.610</td><td>**0.010**</td></tr>
    <tr><td>swap 2 rows</td><td>&lt;0.01</td><td>2.22</td><td>**1.18**</td><td>1.99</td></tr>
    <tr><td>remove a row</td><td>0.010</td><td>1.38</td><td>**0.075**</td><td>1.61</td></tr>
    <tr><td>clear 1,000</td><td>0.300</td><td>1.60</td><td>**1.30**</td><td>1.60</td></tr>
  </tbody>
</table>

## What this says

**The update path is competitive.** Removing a row costs 0.075 ms against
vanilla's 0.010 ms. Selecting one, with `selector`, sits at the floor. Before
`each`, `selector` and event delegation those two operations cost 1.46 ms and
1.40 ms — roughly twenty and a hundred times more.

**Creation still costs 3–4× hand-written DOM.** That is the price of parsing
templates at runtime rather than compiling them ahead of time, and it is not
something a runtime-only library can close. Profiling the create path for 1,000
rows:

| | cost |
| --- | --- |
| `cloneNode` — the floor | 1.7 ms |
| instance setup (walk, bindings) | +3.8 ms |
| 2,000 effect nodes for reactive cells | +6.9 ms |

Svelte and Solid avoid that last row by compiling templates into imperative
code. Alacris deliberately has no build step, because being droppable into any
page without a toolchain is the property that makes it worth using. If you need
vanilla-speed construction of ten thousand rows, no runtime library will give it
to you.

**Pick the tool per shape.** `each` is best for structural churn. The store is
best for deep, targeted updates and costs more on bulk array rewrites, because
its proxy is paid per access. They compose — `each` for the list, a store for
the row data.

## Reproducing it

```sh
git clone https://github.com/bmartel/alacris.git
cd alacris
npm install
npm run demo      # then open /bench/
```

The absolute values move a lot with hardware and browser. **The ratios are the
durable part.**

## Where the speed comes from

- **No virtual DOM.** Templates are cloned from a native `<template>` — the
  fastest DOM construction path a browser offers — and structure is never
  diffed.
- **Fine-grained bindings.** Each binding is its own subscription, so a change
  writes to one attribute or one text node rather than walking a tree.
- **Lazy, glitch-free propagation.** Writes push invalidation; reads pull
  values. A diamond runs its effect once, and a computed that lands on the same
  value stops propagation there.
- **Per-row scopes.** `each` builds a row once; reordering is `insertBefore` on
  the rows that moved.
- **Event delegation.** One listener per render root instead of one per
  binding — 2 instead of 2,000 on a thousand-row table.
- **Shared setters and interned stylesheets.** Attribute setters are built once
  per template rather than per instance, and identical CSS is parsed once per
  page.

## Size

<table class="sizes">
  <thead><tr><th>file</th><th>raw</th><th>gzip</th><th>brotli</th></tr></thead>
  <tbody>
    <tr><td>`alacris.js` — everything</td><td>15.29 kB</td><td>**5.90 kB**</td><td>5.37 kB</td></tr>
    <tr><td>`store.js`</td><td>1.99 kB</td><td>**0.98 kB**</td><td>0.91 kB</td></tr>
    <tr><td>`context.js`</td><td>0.91 kB</td><td>**0.54 kB**</td><td>0.46 kB</td></tr>
    <tr><td>`signal.js` — no DOM</td><td>2.25 kB</td><td>**0.97 kB**</td><td>0.92 kB</td></tr>
  </tbody>
</table>

Add-ons import the core rather than bundling it, so there is exactly one
reactive graph at runtime. With a bundler, anything you do not import is
tree-shaken away.

Size is treated as part of the public contract: CI fails if a change moves it
without the regenerated figures being committed.
