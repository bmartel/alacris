---
name: solve-ticket
description: >-
  End-to-end issue resolution for `alacris` (`@alacris/core` and `@alacris/ui`) in an isolated
  git worktree using TDD (`npm test` / `npm run test:ui`), typecheck, bundle-size, and docs-sync gates.
---

<!-- sync-docs:ignore -->

# Solve Ticket — `alacris`

Follow both root [`AGENTS.md`](../../../AGENTS.md) (library and UI implementation constraints) and [`docs/public/AGENTS.md`](../../../docs/public/AGENTS.md) (consumer conventions modeled by demos and docs) throughout every task.

---

## 1. Isolated Worktree Setup & Scope Check

1. **Work in an Isolated Git Worktree**:
   - Branch from `origin/main` in a dedicated worktree rather than editing the primary checkout directly, and disable `core.fsmonitor` inside ephemeral worktrees to prevent orphan monitor processes:
     ```bash
     git worktree add -b "<branch-name>" "<worktree-path>" origin/main
     git -C "<worktree-path>" config core.fsmonitor false
     ```
2. **Package Isolation (`@alacris/core` vs `@alacris/ui`)**:
   - `@alacris/core` (`src/`, `types/`) and `@alacris/ui` (`ui/src/`, `ui/types/`) publish independently via separate release workflows.
   - **Never mix `src/`/`types/` and `ui/src/`/`ui/types/` in the same pull request** (`node scripts/check-pr-scope.mjs` enforces this in CI). Split cross-package work into separate PRs.

---

## 2. Architecture Invariants

Before editing `src/`, `types/`, or `ui/src/`, verify these constraints:

1. **Zero dependencies in `src/`** — plain ESM only, no polyfills, no `eval` or `new Function`, and static tagged-template HTML strings only (Trusted Types safety verified by `test/security.test.js`).
2. **Add-ons (`signal`, `store`, `context`) import `@alacris/core`** — never bundle a second reactive graph copy (`test/dist.test.js`).
3. **Read the comment above odd hot-path code before changing it** in `src/signal.js`, `src/html.js`, `src/define.js`, `src/store.js`, `src/style.js`, and `scripts/build.js` (`booleans_as_integers` must remain disabled; never emit `!important`).
4. **Public API parity (`test/docs.test.js`)** — any exported API change must update `src/`, hand-written `types/*.d.ts`, `test/` + `test/dist.test.js`, `docs/src/content/docs/` + `reference/api.md`, and `docs/public/AGENTS.md` (plus `docs/public/llms.txt` and `README.md` if surface shape changed).
5. **Performance claims require measurements** — include before/after numbers from `bench/` when claiming a speedup or trade-off.

---

## 3. TDD & Full Verification Gates

1. **Red -> Green Unit Tests** (writes are synchronous; assert immediately without awaiting a tick unless testing microtask-deferred teardown; dispatch synthetic delegated events with `{ bubbles: true }`):
   ```bash
   # Fast single-file test (zero build step):
   node --import ./test/setup.js --test test/<module>.test.js
   ```
2. **Full CI Quality Gates**:
   ```bash
   npm run build
   npm test
   npm run test:ui
   npm run typecheck
   node scripts/size.js --check
   npm run sync-docs -- --check
   node scripts/check-pr-scope.mjs
   ```
   - Never hand-edit version pins or bundle size tables in prose; run `npm run sync-docs` and commit regenerated `SIZE.md` with an explanation when `src/` intentionally shifts bundle size.
3. **Real-Browser Verification**:
   - For custom-element upgrade timing, `adoptedStyleSheets`, focus across keyed reorders, SVG layout, or `@alacris/ui` interactions, start `npm run demo` and verify `/demo/test.html`, `/`, and `/ui/` in a real browser.
   - If `docs/` was modified, also run `npm --prefix docs run build` to verify internal links (`scripts/check-links.mjs`).

---

## 4. Conventional Commits & Pull Request Title

- Pull requests are squash-merged so the PR title becomes the release commit parsed by `semantic-release`:
  - Format: `<type>(<scope>): <summary>` (matching `^(feat|fix|perf|refactor|revert|docs|test|build|ci|chore)(\([a-z0-9._-]+\))?!?: .+`).
  - Examples: `fix(html): keep focus when a keyed row moves`, `feat(ui): add combobox empty state`.
  - Scope `ui` publishes `@alacris/ui`, not `@alacris/core`. Avoid `!` pre-1.0 unless intentionally cutting `1.0.0`.
