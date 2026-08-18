// CDN examples that float to latest can break a page overnight. Every URL
// that loads @alacris/core or @alacris/ui from a known host has to pin the
// current release, and `npm run sync-docs -- --check` is what keeps them there.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const core = JSON.parse(read('package.json')).version;
const ui = JSON.parse(read('ui/package.json')).version;

const CDN =
  /https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm|esm\.sh)\/@alacris\/(core|ui)(?:@(\d+(?:\.\d+){0,2}))?(?=[/"'`\s<>]|$)/g;

const IGNORE = 'sync-docs:ignore';
const SCANNED = new Set(['.md', '.mdx', '.html', '.txt', '.astro', '.ts', '.js']);
const OWNED_ELSEWHERE = new Set(['CHANGELOG.md', 'ui/CHANGELOG.md', 'SIZE.md']);

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && SCANNED.has(extname(f)) && !OWNED_ELSEWHERE.has(f));

test('CDN URLs in tracked docs pin the current core and ui releases', () => {
  const seen = { core: 0, ui: 0 };
  for (const file of files) {
    const text = read(file);
    if (text.includes(IGNORE)) continue;
    for (const [, pkg, pin] of text.matchAll(CDN)) {
      const expected = pkg === 'ui' ? ui : core;
      assert.equal(
        pin,
        expected,
        `${file}: ${pkg} CDN pin is '${pin ?? 'missing'}', want ${expected}`
      );
      seen[pkg]++;
    }
  }
  assert.ok(seen.core > 0, 'no @alacris/core CDN URLs found — did the install examples move?');
  assert.ok(seen.ui > 0, 'no @alacris/ui CDN URLs found — did the UI install examples move?');
});
