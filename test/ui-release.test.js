// @alacris/ui publishes from ui/ with its own tag format and its own
// commit filter. If either of those points at the library by mistake, a
// feat(html) would ship a new @alacris/ui — or worse, the UI workflow would
// publish the `@alacris/core` package.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as analyzer from '@semantic-release/commit-analyzer';
import { filterCommits, scopeOf } from '../scripts/release-filter-scopes.js';

const ui = JSON.parse(readFileSync(new URL('../ui/.releaserc.json', import.meta.url), 'utf8'));
const named = (name) => {
  const found = ui.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  assert.ok(found, `${name} is missing from ui/.releaserc.json`);
  return Array.isArray(found) ? found[1] : {};
};

const analyzerOpts = named('@semantic-release/commit-analyzer');
const context = {
  cwd: process.cwd(),
  env: process.env,
  logger: { log() {} },
  lastRelease: { version: '0.1.0', gitTag: 'ui-v0.1.0' },
  nextRelease: { version: '0.2.0', gitTag: 'ui-v0.2.0' },
  options: { repositoryUrl: 'https://github.com/bmartel/alacris' },
};
const commit = (message) => ({ hash: 'a'.repeat(40), message, committerDate: '2026-01-01' });

test('UI releases are tagged and named apart from @alacris/core', () => {
  assert.equal(ui.tagFormat, 'ui-v${version}');
  assert.deepEqual(ui.branches, ['main']);
  assert.equal(named('@semantic-release/github').releaseNameTemplate, '@alacris/ui ${nextRelease.version}');
  assert.deepEqual(named('@semantic-release/git').assets, [
    'package.json',
    'CHANGELOG.md',
    'README.md',
    '../README.md',
    '../starter/README.md',
    '../docs/public/AGENTS.md',
    '../docs/src/content/docs/**/*.md',
    '../docs/src/content/docs/**/*.mdx',
    '../docs/src/lib/stackblitz.ts',
    '../demo/index.html',
  ]);
  assert.match(named('@semantic-release/git').message, /chore\(ui-release\)/);
});

test('the UI pipeline keeps only the ui scope', () => {
  const filter = ui.plugins[0];
  assert.equal(filter[0], '../scripts/release-filter-scopes.js');
  assert.deepEqual(filter[1], { include: ['ui'] });

  const kept = filterCommits(
    [commit('feat(ui): combobox'), commit('feat(html): each()'), commit('docs(starter): next.js recipe')],
    filter[1]
  );
  assert.deepEqual(kept.map((c) => c.message), ['feat(ui): combobox']);
});

test('scopeOf reads the first-line scope', () => {
  assert.equal(scopeOf('feat(ui): x'), 'ui');
  assert.equal(scopeOf('fix(html): y'), 'html');
  assert.equal(scopeOf('feat: no scope'), '');
});

test('UI-scoped commits bump @alacris/ui; library and starter-guide commits do not', async () => {
  const bumpFiltered = async (message) => {
    const commits = filterCommits([commit(message)], { include: ['ui'] });
    if (!commits.length) return null;
    return analyzer.analyzeCommits(analyzerOpts, { ...context, commits });
  };
  assert.equal(await bumpFiltered('feat(ui): add a combobox'), 'minor');
  assert.equal(await bumpFiltered('fix(ui): overlay focus'), 'patch');
  assert.equal(await bumpFiltered('perf(ui): cheaper ripple'), 'patch');
  assert.equal(await bumpFiltered('feat(html): add each()'), null);
  assert.equal(await bumpFiltered('docs(starter): add a Next.js recipe'), null);
  assert.equal(await bumpFiltered('fix: keep focus on a keyed move'), null);
  assert.equal(await bumpFiltered('feat(html)!: new renderer'), null);
  assert.equal(await bumpFiltered('docs(ui): catalog'), null);
});

test('the UI changelog title matches ui/CHANGELOG.md', () => {
  const lf = (v) => v.split(String.fromCharCode(13)).join('');
  const title = named('@semantic-release/changelog').changelogTitle;
  const changelog = readFileSync(new URL('../ui/CHANGELOG.md', import.meta.url), 'utf8');
  assert.ok(lf(changelog).startsWith(lf(title)));
});

test('the UI npm plugin publishes the ui package, not the library', () => {
  const names = ui.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert.ok(names.includes('@semantic-release/npm'));
  assert.ok(names.includes('@semantic-release/exec'));
  assert.match(
    named('@semantic-release/exec').prepareCmd,
    /sync-docs\.mjs --ui \$\{nextRelease\.version\}/,
    'UI prepare must pass --ui so a UI version cannot retarget @alacris/core'
  );
  const npm = named('@semantic-release/npm');
  assert.equal(npm.pkgRoot, undefined);
});

test('the published package lives in ui/; starter/ is not a package', () => {
  const pkg = JSON.parse(readFileSync(new URL('../ui/package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, '@alacris/ui');
  assert.equal(pkg.repository.directory, 'ui');
  try {
    readFileSync(new URL('../starter/package.json', import.meta.url));
    assert.fail('starter/package.json should not exist');
  } catch (err) {
    assert.equal(err.code, 'ENOENT');
  }
  const html = readFileSync(new URL('../starter/index.html', import.meta.url), 'utf8');
  assert.match(html, /"@alacris\/ui": "\.\.\/ui\/src\/index\.js"/);
});
