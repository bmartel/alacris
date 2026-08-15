# Changelog

All notable changes to this project are documented here. Releases are cut
automatically by [semantic-release](https://semantic-release.gitbook.io/) from
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.6.6](https://github.com/bmartel/alacris/compare/v0.6.5...v0.6.6) (2026-08-15)

### Bug Fixes

* **starter:** eliminate dead space in toggle buttons and animate checkmark selection ([a377ac8](https://github.com/bmartel/alacris/commit/a377ac89ab02e795a7b56d98bda2c1dd2eb6f5bc))

## [0.6.5](https://github.com/bmartel/alacris/compare/v0.6.4...v0.6.5) (2026-08-15)

### Bug Fixes

* **starter:** smooth search view container transitions and presence height animations ([2664eea](https://github.com/bmartel/alacris/commit/2664eeae70564cea3e20031dd106f9d1638e6ca6))

## [0.6.4](https://github.com/bmartel/alacris/compare/v0.6.3...v0.6.4) (2026-08-15)

### Bug Fixes

* **starter:** animate pickers, search, and chips to match MD3 ([914f0d9](https://github.com/bmartel/alacris/commit/914f0d9aadfa043dd92eef2870f2620dee3a3a7d))

## [0.6.3](https://github.com/bmartel/alacris/compare/v0.6.2...v0.6.3) (2026-08-15)

### Bug Fixes

* **starter:** close remaining Material Design 3 spec gaps ([aa72963](https://github.com/bmartel/alacris/commit/aa729632ed25050fa40a33c79f8fe53c9975f15d))

## [0.6.2](https://github.com/bmartel/alacris/compare/v0.6.1...v0.6.2) (2026-08-15)

### Bug Fixes

* **starter:** align components with Material Design 3 specs ([6b4b8a5](https://github.com/bmartel/alacris/commit/6b4b8a528db132ec7bfdc01c6d731e24461c145e))

## [0.6.1](https://github.com/bmartel/alacris/compare/v0.6.0...v0.6.1) (2026-08-15)

### Bug Fixes

* **starter:** align search view, carousel, and checkmarks with MD3 ([dd1b8c1](https://github.com/bmartel/alacris/commit/dd1b8c1672c0a1c6c71874c590044cd7737c2de3))

## [0.6.0](https://github.com/bmartel/alacris/compare/v0.5.0...v0.6.0) (2026-08-15)

### Features

* **starter:** complete the Material 3 catalog and fix overlay, search, slider, and carousel ([088db37](https://github.com/bmartel/alacris/commit/088db375a746453e6bf9a6bcd0fb88bf3f47a56d))

## [0.5.0](https://github.com/bmartel/alacris/compare/v0.4.0...v0.5.0) (2026-08-15)

### Features

* **define:** form-associated custom elements ([#5](https://github.com/bmartel/alacris/issues/5)) ([9a4a19a](https://github.com/bmartel/alacris/commit/9a4a19a818d94951cf57ca16d1cbfd672451a1e9))

## [0.4.0](https://github.com/bmartel/alacris/compare/v0.3.0...v0.4.0) (2026-08-15)

### Features

* **starter:** Alacris UI — a complete design-system starter ([#4](https://github.com/bmartel/alacris/issues/4)) ([f715052](https://github.com/bmartel/alacris/commit/f715052227f4f350d031667c9d46889a6f45f17e))

## [0.3.0](https://github.com/bmartel/alacris/compare/v0.2.4...v0.3.0) (2026-08-14)

### Features

* tracking(), untracked store reads allocate nothing, resilient flush ([e89f04b](https://github.com/bmartel/alacris/commit/e89f04b1ebe6effabd8d9fcee4c60888a892b8c3))

### Bug Fixes

* security and correctness fixes from a full review ([6a982b7](https://github.com/bmartel/alacris/commit/6a982b75d0132042ed26dbd4326585f76faff846))

## [0.2.4](https://github.com/bmartel/alacris/compare/v0.2.3...v0.2.4) (2026-08-14)

### Performance

* **html:** LIS keyed lists and compile-time binding paths ([620ddd0](https://github.com/bmartel/alacris/commit/620ddd0ba7223b8a6fedaec1045f6420d0801a9e))

## [0.2.3](https://github.com/bmartel/alacris/compare/v0.2.2...v0.2.3) (2026-08-13)

### Bug Fixes

* **html:** pass nested custom-element props as properties ([1bfc570](https://github.com/bmartel/alacris/commit/1bfc570c43b9b27d7cd5152a21cdfd25d3fda1a6))

## [0.2.2](https://github.com/bmartel/alacris/compare/v0.2.1...v0.2.2) (2026-08-08)

### Bug Fixes

* harden the store against prototype pollution; parse templates via Trusted Types ([68c42e1](https://github.com/bmartel/alacris/commit/68c42e130512212c2749e615772f08f6fd1bc044))

## [0.2.1](https://github.com/bmartel/alacris/compare/v0.2.0...v0.2.1) (2026-08-08)

### Bug Fixes

* **release:** pin a changelog preset that actually emits notes ([9420dc3](https://github.com/bmartel/alacris/commit/9420dc3283084923206c6a8330e2c7ec5ad8d7e0))

## [0.2.0](https://github.com/bmartel/alacris/compare/v0.1.0...v0.2.0) (2026-08-08)

<!-- Written by hand: this release shipped with empty notes because the
     configured changelog preset was incompatible with semantic-release's
     changelog writer and silently produced nothing. Fixed in 0.2.1, and
     test/release.test.js now fails if notes ever come out empty again. -->

### Features

- **style:** `css` returns a cached, constructed stylesheet. Identical CSS is
  interned, so a stylesheet is parsed once for the whole page however many
  components use it; adopting it into a shadow root is a pointer copy.
  Interpolating one sheet into another composes them without re-parsing.
- **style:** `styles` accepts a sheet, a CSS string, or an array of them.
- **style:** `Sheet.replace()` rewrites a stylesheet in place, so every element
  that adopted it reskins on a single write.
- **style:** `style=${}` accepts objects, custom properties included, and clears
  keys that stop being passed; `class=${}` accepts objects and arrays.
- **style:** `vars(prefix, defaults)` declares the custom properties a component
  is themed by, each compiling to `var(--btn-bg, #111)`, with `names` exposing
  the contract.
- **style:** `adoptGlobal(...)` pushes styles into every component including
  ones created later, applied after component styles so a theme wins ties
  without `!important`. Returns a remover.

## 0.1.0 (2026-08-08)

First public release.

### Added

- **Reactive core** — `signal`, `computed`, `effect`, `batch`, `untrack`,
  `root`, `onCleanup`, `flush`. A push/pull graph: writes push invalidation
  down, reads pull values back up. Glitch-free — a diamond dependency runs its
  effect exactly once, and a computed that re-evaluates to the same value stops
  propagation there.
- **Templates** — `html`, `svg`, `css`, `render`. Each template literal is
  parsed once per call site into a native `<template>` plus a list of binding
  positions; rendering is `cloneNode`. A function in a `${}` becomes its own
  binding, so a change writes to exactly one attribute or one text node. No
  virtual DOM and no diffing.
- **`each`** — lists where every row gets its own reactive scope, built once.
  Reordering is `insertBefore`, a changed row wakes only itself, and head/tail
  matching means appending never touches the rows already there.
- **`keyed`** — stable identity for hand-mapped lists.
- **Custom elements** — `define`, with props that are simultaneously signals,
  observed attributes and DOM properties, so an element behaves natively in
  React, Vue, Angular, Svelte and plain HTML. Properties assigned before the
  definition loads are replayed on upgrade.
- **`alacris/store`** — deeply reactive objects with path-level granularity.
  `state.rows[3].label = 'x'` updates the one text node showing it without
  re-diffing the list or rebuilding the row. Array mutators apply atomically.
  Includes `selector`, which turns an O(n) "which one is selected?" test into an
  O(1) one.
- **`alacris/context`** — the W3C community context protocol
  (`context-request` events), interoperable with `@lit/context` in both
  directions, so context crosses library boundaries as well as shadow ones.
- **Event delegation** — one listener per render root instead of one per
  binding. The listener sits on the render root rather than the document, so it
  works for detached containers, covers `composed: false` events such as
  `change`, and never double-fires across nested shadow roots.
- **`bench/`** — the standard js-framework-benchmark operations measured against
  hand-written, keyed, delegated DOM, with an output-equality check before any
  timing is taken.

### Known limitations

- Creating elements costs roughly 3–4× hand-written DOM. That is the price of
  parsing templates at runtime instead of compiling them ahead of time, and it
  is not something a runtime-only library can close. The update path is
  competitive: removing a row is 0.075 ms against vanilla's 0.010 ms, and
  selecting one sits at the floor. See [Performance](README.md#performance).
- ESM only. No CommonJS build, and none planned.
- Dynamic tag names are not supported, and neither are bindings inside
  `<textarea>` or `<title>` text.
