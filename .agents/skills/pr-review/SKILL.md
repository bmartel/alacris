---
name: pr-review
description: >-
  Differential, proof-gated PR review workflow for `alacris` (`@alacris/core` & `@alacris/ui`)
  comparing `head` against `merge-base` across reactive, bundle-size, type, and browser invariants.
---

<!-- sync-docs:ignore -->

# Proof-Gated Differential PR Review — `alacris`

Treat every initial concern as an unproven hypothesis until reproduced differentially (`head` vs `merge-base`) and independently verified against changed hunks.

---

## 1. Differential Staging (`head` vs `merge-base`)

1. Inspect the exact diff and changed files against `merge-base`:
   ```bash
   BASE_SHA="$(git merge-base HEAD origin/main)"
   git diff --stat "$BASE_SHA"...HEAD
   ```
2. Stage clean paired checkouts or worktrees (with `core.fsmonitor=false`) when reproducing runtime, test, or bundle-size regressions across `base` and `head`.

---

## 2. `alacris` Domain Review Lenses

Verify changed hunks across these repository-specific invariants and reproduce any suspected defect on both `base` and `head`:

1. **Reactive Core & Renderer Invariants (`src/`)**:
   - Zero dependencies in `src/`; add-ons (`signal`, `store`, `context`) must import `@alacris/core` rather than bundling a second reactive graph (`test/dist.test.js`).
   - `src/signal.js`: `notify` never flushes inline (diamond glitch freedom); link arrays start `null`; `effectNode`/`rerun` handle dead nodes safely.
   - `src/html.js`: template strings stay static (Trusted Types soundness, `test/security.test.js`) and cached per call-site `WeakMap`; `SOLE` child optimization preserves the anchor-free `textContent` fast path; `Each` snapshots tracked and diffs untracked; delegated listeners stay scoped to the render root.
   - `src/define.js`: `coerce(null, default)` returns `false` for removed boolean attributes; teardown stays microtask-deferred so DOM moves do not dispose effects; pre-upgrade properties replay in the constructor.
   - `src/store.js` & `src/style.js`: `__proto__` prototype-pollution hardening preserved; array mutators remain batched; zero `!important` declarations emitted anywhere.
   - `scripts/build.js`: Terser `booleans_as_integers` stays disabled; only `_`-prefixed internals are mangled.
2. **Package Isolation, Bundle Size & Public API Contract**:
   - `node scripts/check-pr-scope.mjs`: confirms `src/`/`types/` and `ui/src/`/`ui/types/` are not mixed in one PR, and PR title follows Conventional Commits (`(ui)` scope reserved for `@alacris/ui`).
   - Full verification suite passes on `head`:
     ```bash
     npm run build
     npm test
     npm run test:ui
     npm run typecheck
     node scripts/size.js --check
     npm run sync-docs -- --check
     ```
   - Any public export change updates `types/*.d.ts`, `docs/src/content/docs/`, `reference/api.md`, and `docs/public/AGENTS.md` (`test/docs.test.js`).
3. **Real-Browser Behavior**:
   - For custom-element upgrade timing, `adoptedStyleSheets`, RTL/keyboard roving tabindex, overlay positioning, SVG layout, or `@alacris/ui` visual changes, compare `base` vs `head` via `npm run demo` (`/demo/test.html` and `/ui/`).

---

## 3. Inline, Actionable Reporting

- Report only reproduced, actionable findings (`Critical`, `Major`, `Minor`) anchored to changed diff hunks.
- Include concrete `**Repro:**` steps (using standard `node --import ./test/setup.js --test ...` or `npm test` commands) and a minimal `**Fix:**` recommendation.
- Clean up any temporary review worktrees and local demo server processes once review completes.
