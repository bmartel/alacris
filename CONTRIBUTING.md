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

While the package is `0.x`, a breaking change bumps the minor version rather
than the major — that is semver's rule for pre-1.0, and it is why the API is
still `0.x`.

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
4. commits those back to `main` as `chore(release): x.y.z [skip ci]`,
5. tags the commit and opens a GitHub release with the notes.

If no commit since the last tag warrants a release, it says so and stops. That
is the normal outcome for a docs-only or CI-only change.

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
