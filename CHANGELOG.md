# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-08-08

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

[Unreleased]: https://github.com/bmartel/alacris/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bmartel/alacris/releases/tag/v0.1.0
