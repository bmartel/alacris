// Point every pinned `alacris@x.y.z` in the repo at the current version.
//
// Most references on the site are deliberately unpinned — `unpkg.com/alacris`
// always resolves to the newest release and needs no maintenance. The pinned
// ones exist to *show* how to pin, so the version in them is illustrative:
// it should be whatever shipped last, and nobody should have to remember to
// update it. Left alone they rot, and they had: the README pinned 0.1.0 and
// the docs pinned 0.2.1 while npm was serving 0.2.2.
//
// The shape of a pin is its intent, so it is preserved. `alacris@0.2` stays a
// minor pin, `alacris@0.2.1` stays exact; only the numbers are rewritten.
//
// Run by hand with `npm run sync-version`, from semantic-release's prepare
// step so the release commit carries the update, and with `--check` in CI so a
// pull request cannot introduce a stale one.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const args = process.argv.slice(2);
const check = args.includes('--check');
const version =
  args.find((a) => !a.startsWith('-')) ??
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`  sync-version: '${version}' is not a version.`);
  process.exit(1);
}

// Prose and examples only. Enumerated with git so generated output — the
// bundles synced into docs/public/lib, dist, node_modules — is never touched.
const SCANNED = new Set(['.md', '.mdx', '.html', '.txt', '.astro', '.ts', '.js']);

const PIN = /\balacris@(\d+(?:\.\d+){0,2})\b/g;

// A file that documents *how* pinning works needs to name a version without
// having it rewritten out from under the sentence. Such a file says so.
const IGNORE = 'sync-version:ignore';

const parts = version.split('.');
/** Rewrite a pin to the current version, keeping however precise it was. */
const reshape = (pin) => parts.slice(0, pin.split('.').length).join('.');

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && SCANNED.has(extname(f)));

const stale = [];

for (const file of files) {
  const path = join(root, file);
  const before = readFileSync(path, 'utf8');
  if (before.includes(IGNORE)) continue;
  const found = new Set();
  const after = before.replace(PIN, (match, pin) => {
    const next = reshape(pin);
    if (next !== pin) found.add(`${pin} -> ${next}`);
    return `alacris@${next}`;
  });
  if (after === before) continue;
  stale.push({ file, changes: [...found] });
  if (!check) writeFileSync(path, after);
}

if (!stale.length) {
  console.log(`  sync-version: every pin already reads ${version}`);
  process.exit(0);
}

const label = check ? 'stale' : 'updated';
console.log(`  sync-version: ${stale.length} file(s) ${label} for ${version}`);
for (const { file, changes } of stale) {
  console.log(`    ${file}  (${changes.join(', ')})`);
}

if (check) {
  console.error('\n  Run `npm run sync-version` and commit the result.\n');
  process.exit(1);
}
