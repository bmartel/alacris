# Contributing to Alacris

Thanks for taking a look. Alacris is small on purpose, so the bar for adding code
is high and the bar for adding *tests* is low — please add tests freely.

If you are working with a coding agent, point it at [AGENTS.md](AGENTS.md) — it
carries the same rules as this file plus the invariants inside `src/` that look
like they want simplifying and do not. (The `AGENTS.md` the docs site *serves*
is a different document, for projects that use Alacris rather than change it.)

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
| `npm test` | 160 tests on happy-dom — signals, rendering, lists, styles, store, context, the release config, the shipped docs, and the built bundle |
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
hand-written, keyed, delegated DOM and against production React, Vue, Solid,
Svelte, Lit and Stencil (`npm run bench:bundle`). It verifies that every implementation
renders byte-identical output before timing any of them; please keep that check
working if you add an implementation.

If a change is meant to make something faster, include before and after numbers
from `bench/`. If it makes one thing slower to make another faster, say which,
and why the trade is worth it.

## The documentation site

`docs/` is an Astro + Starlight site, published to
[bmartel.github.io/alacris](https://bmartel.github.io/alacris/) on every push to
`main`. It is a standalone package, so the library's own install stays small.

```bash
npm run build          # in the repo root first — the docs run the real bundle
cd docs
npm install
npm run dev
```

Every example on the site is **live**. Demo sources live in `docs/src/demos/`
and are rendered by `<Demo>` as both a highlighted code block and a module
script, from the same string — so what a reader sees is what executed, and the
two cannot drift. The site carries an import map pointing `alacris` at the
built bundle, which `npm run build` syncs into `docs/public/lib`.

`npm run build` in `docs/` also checks every internal link and fails on a broken
one.

Two files in `docs/` are documentation *products* rather than pages about the
library: `reference/api.md`, and `public/AGENTS.md` — the instructions people
download into their own projects for their coding agents. `test/docs.test.js`
reads the real exports out of `src/` and fails if either one has stopped naming
one of them, if the hand-written `types/` have, or if an import statement in the
agent file no longer resolves. An export a consumer genuinely does not need goes
in that test's `UNDOCUMENTED` list, with a reason.

## Commit messages decide the version

Releases are automated. Every push to `main` runs
[semantic-release](https://semantic-release.gitbook.io/), which reads the commit
messages, works out the next version, publishes to npm, writes the changelog and
cuts a GitHub release. Nothing is versioned by hand.

That means the commit message *is* the release note, so it needs to follow
[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <summary>

<optional body>

<optional footer>
```

| type | released as | shows up in the changelog |
| --- | --- | --- |
| `feat` | **minor** — 0.1.0 → 0.2.0 | Features |
| `fix` | **patch** — 0.1.0 → 0.1.1 | Bug Fixes |
| `perf` | patch | Performance |
| `refactor` | patch | Refactoring |
| `revert` | patch | Reverts |
| `docs`, `test`, `build`, `ci`, `chore` | no release | hidden |

A breaking change is a **major** bump regardless of type. Mark it with a `!`
after the type, and explain the migration in a `BREAKING CHANGE:` footer:

```
feat(store)!: selector() takes a comparator instead of a key list

BREAKING CHANGE: selector(source, keys) is now selector(source, equals).
Pass a comparison function, or omit the second argument for ===.
```

Be deliberate with that marker while the package is `0.x`: semantic-release does
**not** special-case pre-1.0 versions, so a breaking change takes 0.1.0 straight
to **1.0.0**, not 0.2.0. If the API is still settling and you do not mean to
declare it stable, use a plain `feat:` and describe the change in the body
instead — and save the `!` for when 1.0 is genuinely intended.

Some real examples from this repo:

```
fix(ci): expand the test glob on POSIX shells
feat(store): add selector() for O(1) selection tracking
perf(html): share attribute setters across template instances
docs: explain why each() beats mapping an array
```

**Pull requests are squash-merged, so the PR title becomes the commit message.**
CI checks the title against the format above and fails if it does not match.

### How a release actually happens

`.github/workflows/release.yml` runs on every push to `main`. It builds, tests
and typechecks the exact commit, then runs semantic-release, which:

1. reads the commits since the last `v*` tag and decides the next version,
2. publishes to npm,
3. writes `CHANGELOG.md` and bumps `package.json`,
4. runs `npm run sync-docs` so the docs quote the version and sizes being cut,
5. commits those back to `main` as `chore(release): x.y.z [skip ci]`,
6. tags the commit and opens a GitHub release with the notes.

If no commit since the last tag warrants a release, it says so and stops. That
is the normal outcome for a docs-only or CI-only change.

### Nothing documents a version or a size by hand

<!-- sync-docs:ignore — this section names versions to explain the rule, so it
     must not be rewritten by the rule. -->

`package.json` is the only place a version is set and `SIZE.md` is the only
place a size is measured. Everything the docs say about either is derived from
those two by `scripts/sync-docs.mjs`.

**Versions.** Most examples on the site are deliberately unpinned —
`unpkg.com/alacris` always resolves to the newest release. The ones that *are*
pinned exist to show how pinning works, so the number in them is illustrative
and should be whatever shipped last. The script rewrites every `alacris@x.y.z`
in the tracked prose. The shape of a pin is its intent, so it survives:
`alacris@0.2` stays a minor pin and only becomes `alacris@0.3`, while
`alacris@0.2.1` is rewritten in full.

**Sizes.** The figures in the size tables and in the README's size badge are
rewritten from `SIZE.md`. The tables are anchored on themselves rather than on
markers — a header names the metrics, the first cell of each row names the
bundle — so which number belongs where is read off the table instead of
guessed. That works for the Markdown table in the README and for the
`<table class="sizes">` blocks in the docs alike.

A figure loose in a sentence cannot be placed automatically; nothing says which
bundle "0.97 kB" is describing. Those are checked instead: every one has to be
a figure that is currently true of *something*, and the script fails and names
the file if it is not. Editing that sentence is a person's job.

- The release runs it, so a release updates the docs with it.
- CI runs `npm run sync-docs -- --check` and fails a pull request that
  introduces a stale figure. It runs after `SIZE.md` is regenerated, so the
  sizes it compares against are the ones the commit actually produces.
- Run `npm run sync-docs` yourself if that check ever fails.
- A file that needs to name a version or a size in prose — like this one — opts
  out with a `sync-docs:ignore` marker anywhere in it.
- `CHANGELOG.md` is never touched. It records what was true at each release,
  and rewriting a number into it would be falsifying history.

The playground needs none of it: it reads the version out of `package.json` at
build time, and the demos on the site import the bundle built from the same
commit.

Because the release commit is marked `[skip ci]`, GitHub will not run push
workflows for it — so `docs.yml` also triggers on `release: published`. Without
that the site would keep serving the tree from *before* the version bump.

Publishing uses **npm trusted publishing**: the workflow exchanges its GitHub
OIDC identity for a short-lived registry token. There is no `NPM_TOKEN` secret
in this repository and there should never be one. It also means every published
tarball carries [provenance](https://docs.npmjs.com/generating-provenance-statements)
linking it back to the commit and workflow run that produced it.

The trust relationship is configured on npm, not here, and it is pinned to this
repository *and* to the filename `release.yml`. Renaming or moving that workflow
breaks publishing until the trusted publisher on npm is updated to match.

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
