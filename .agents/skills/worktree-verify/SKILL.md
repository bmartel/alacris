---
name: worktree-verify
description: >-
  Isolated worktree test execution, bundle/type/size verification, and local browser verification
  for `alacris` (`@alacris/core`, `@alacris/ui`, `demo/`, `bench/`, `docs/`).
---

<!-- sync-docs:ignore -->

# Worktree Verification — `alacris`

Run builds, test suites, bundle-size checks, and local browser verification inside an isolated git worktree with `core.fsmonitor=false` so the primary checkout stays clean.

---

## 1. Worktree Hygiene

```bash
git worktree add -b "<branch-name>" "<worktree-path>" origin/main
git -C "<worktree-path>" config core.fsmonitor false
```

---

## 2. Three-Layer Test & Static Verification

1. **Layer 1 — Fast `happy-dom` Unit Tests (Zero Build Step)**:
   ```bash
   # Single test file (<250ms, imports src/ directly):
   node --import ./test/setup.js --test test/signal.test.js

   # Full @alacris/core and @alacris/ui suites:
   npm test
   npm run test:ui
   ```
   *Notes*: `test/security.test.js` runs in its own process to install a Trusted Types stub before importing the renderer; `test/docs.test.js` checks export parity across `types/`, `docs/`, and `docs/public/AGENTS.md`; `test/release.test.js` verifies semantic-release note generation.

2. **Layer 2 — Production Bundle, Typecheck, Size Budget & Docs Sync**:
   ```bash
   npm run build
   npm test                        # Includes test/dist.test.js against built dist/
   npm run typecheck               # Compiles test/types.check.ts against types/*.d.ts
   node scripts/size.js --check    # Verifies exact raw/gzip and bounded brotli vs SIZE.md
   npm run sync-docs -- --check    # Verifies CDN pins, versions, and quoted sizes
   node scripts/check-pr-scope.mjs # Ensures src/ and ui/src/ are not mixed
   ```

3. **Layer 3 — Real Browser Suite, UI Catalog & Benchmarks (`npm run demo`)**:
   `npm run demo` builds `dist/` and launches `scripts/serve.js`, honoring `process.env.PORT` (default `5173`) and serving:
   - `/` -> Interactive component demo (`demo/index.html`)
   - `/demo/test.html` -> Real-browser custom-element upgrade, `adoptedStyleSheets`, listener options, and SVG layout suite
   - `/ui/` -> `@alacris/ui` interactive component catalog
   - `/bench/` -> `js-framework-benchmark` runner vs keyed vanilla DOM and framework bundles

   ```bash
   PORT=5173 npm run demo
   ```
   - Always terminate temporary local server processes immediately after verification.
   - If `docs/` was modified, run `npm --prefix docs ci && npm --prefix docs run build` to verify internal links (`scripts/check-links.mjs`).
