# Contributing to Alacris

Thanks for taking a look. Alacris is small on purpose, so the bar for adding code
is high and the bar for adding *tests* is low — please add tests freely.

## Getting set up

```bash
git clone https://github.com/bmartel/alacris.git
cd alacris
npm install
npm test
```

There is no build step for development: `src/` is plain ESM and the tests import
it directly.

## The commands

| command | what it does |
| --- | --- |
| `npm test` | 99 tests on happy-dom — signals, rendering, lists, store, context, and the built bundle |
| `npm run build` | writes `dist/` and regenerates `SIZE.md` |
| `npm run typecheck` | compiles the type-level tests against the shipped `.d.ts` files |
| `npm run size` | re-measures `dist/` without rebuilding |
| `npm run demo` | serves the demo, the browser test suite and the benchmark on :5173 |

Before opening a pull request, run all three of `npm test`, `npm run build` and
`npm run typecheck`.

## The three test layers, and when to use each

1. **`test/*.test.js`** — the bulk of it, running on happy-dom. Fast, and where
   almost every behaviour belongs.
2. **`demo/test.html`** — things a simulated DOM cannot express: custom element
   upgrade, `adoptedStyleSheets`, real listener options, SVG layout. If happy-dom
   disagrees with a real browser, the browser is right and the test goes here.
3. **`test/dist.test.js`** — guards the *built* bundle against minifier damage,
   and in particular against the add-ons ever bundling their own copy of the
   reactive core. Two copies means two dependency graphs, and everything
   silently stops updating with no error to point at.

## Size is a feature

The core bundle size is part of the public contract. `npm run build` prints the
gzip size and rewrites `SIZE.md`; if your change moves it, say so in the pull
request and explain what the bytes bought. A few hundred bytes for a real
capability is usually fine. A few hundred bytes for a convenience wrapper
usually is not.

Anything a small app would not use belongs in an add-on entry point, next to
`store` and `context`, rather than in the core. Add-ons import the core — they
must never bundle it.

## Performance claims need numbers

`bench/` runs the standard js-framework-benchmark operations against
hand-written, keyed, delegated DOM. It verifies that every implementation
renders byte-identical output before timing any of them; please keep that check
working if you add an implementation.

If a change is meant to make something faster, include before and after numbers
from `bench/`. If it makes one thing slower to make another faster, say which,
and why the trade is worth it.

## Style

Match the surrounding code. A few conventions are load-bearing:

- Comments explain **why**, especially where the code looks odd. Most of the odd
  code in this repo is odd because of a specific bug, and the comment is what
  stops it being "simplified" back into that bug.
- No dependencies in `src/`. Not one.
- Internal properties are short (`p`, `s`, `d`) because they sit on hot paths.
  Public API names are spelled out in full.

## Reporting a bug

A failing test is the best bug report. Second best is a minimal HTML file that
reproduces it in a real browser. Please say which browser and version.
