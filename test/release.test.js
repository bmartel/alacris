// The release config is code, and it fails in ways that are silent.
//
// Two real failures happened here before this file existed. The configured
// preset was never installed, so the release died with MODULE_NOT_FOUND. Then a
// preset version incompatible with semantic-release's pinned changelog writer
// produced *empty* release notes: version 0.2.0 shipped with a heading and no
// content, and nothing anywhere reported an error.
//
// So these tests assert the notes actually contain what they should, not merely
// that generation did not throw. "No chore in the output" passes trivially when
// the output is empty, which is exactly how the second bug got through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as analyzer from '@semantic-release/commit-analyzer';
import * as notes from '@semantic-release/release-notes-generator';
import { filterCommits } from '../scripts/release-filter-scopes.js';

const config = JSON.parse(readFileSync(new URL('../.releaserc.json', import.meta.url), 'utf8'));
const named = (name) => {
  const found = config.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  assert.ok(found, `${name} is missing from .releaserc.json`);
  return Array.isArray(found) ? found[1] : {};
};
const analyzerOpts = named('@semantic-release/commit-analyzer');
const notesOpts = named('@semantic-release/release-notes-generator');

const context = {
  cwd: process.cwd(),
  env: process.env,
  logger: { log() {} },
  lastRelease: { version: '1.2.3', gitTag: 'v1.2.3' },
  nextRelease: { version: '1.3.0', gitTag: 'v1.3.0' },
  options: { repositoryUrl: 'https://github.com/bmartel/alacris' },
};
const commit = (message) => ({ hash: 'a'.repeat(40), message, committerDate: '2026-01-01' });
const bump = (message) => analyzer.analyzeCommits(analyzerOpts, { ...context, commits: [commit(message)] });

test('the configured preset is installed and resolvable', async () => {
  // Guards the MODULE_NOT_FOUND failure.
  const preset = analyzerOpts.preset;
  assert.equal(preset, 'conventionalcommits');
  await assert.doesNotReject(
    () => bump('feat: something'),
    'the preset named in .releaserc.json must be a real dependency'
  );
});

test('commit types map to the documented version bumps', async () => {
  assert.equal(await bump('feat: add each()'), 'minor');
  assert.equal(await bump('fix(html): keep focus on a keyed move'), 'patch');
  assert.equal(await bump('perf(html): share attribute setters'), 'patch');
  assert.equal(await bump('refactor(store): tidy the proxy'), 'patch');
  assert.equal(await bump('revert: undo the thing'), 'patch');
});

test('ui and starter scopes never cut an @alacris/core release', async () => {
  for (const scope of ['ui', 'starter']) {
    assert.equal(await bump(`feat(${scope}): add a combobox`), null, `feat(${scope})`);
    assert.equal(await bump(`fix(${scope}): overlay focus`), null, `fix(${scope})`);
    assert.equal(await bump(`feat(${scope})!: rename a token`), null, `feat(${scope})!`);
    assert.equal(
      await bump(`fix(${scope}): token rename\n\nBREAKING CHANGE: the token moved`),
      null,
      `BREAKING ${scope}`
    );
  }
});

test('the commit filter drops ui and starter scopes before notes run', () => {
  const kept = filterCommits(
    [
      commit('feat(html): each()'),
      commit('feat(ui): combobox'),
      commit('fix(starter): overlay'),
    ],
    { exclude: ['ui', 'starter'] }
  );
  assert.deepEqual(kept.map((c) => c.message), ['feat(html): each()']);
});

test('housekeeping types do not cut a release', async () => {
  for (const type of ['docs', 'test', 'build', 'ci', 'chore']) {
    assert.equal(await bump(`${type}: some change`), null, `${type} must not release`);
  }
});

test('a breaking change is a major, however it is marked', async () => {
  assert.equal(await bump('feat(store)!: new selector signature'), 'major');
  assert.equal(
    await bump('feat(store): new selector signature\n\nBREAKING CHANGE: it takes a comparator now'),
    'major'
  );
});

test('release notes actually contain the commits', async () => {
  // The test that would have caught the empty-notes release.
  const md = await notes.generateNotes(notesOpts, {
    ...context,
    commits: [
      commit('feat(style): cached stylesheets'),
      commit('fix(html): keep focus on a keyed move'),
      commit('perf(each): batch consecutive inserts'),
    ],
  });

  assert.match(md, /Features/, 'a feat must appear under Features');
  assert.match(md, /cached stylesheets/, 'the feat subject must appear');
  assert.match(md, /Bug Fixes/, 'a fix must appear under Bug Fixes');
  assert.match(md, /keep focus on a keyed move/);
  assert.match(md, /Performance/, 'a perf must appear under Performance');
  assert.match(md, /batch consecutive inserts/);
  assert.match(md, /style/, 'the scope must be rendered');
});

test('housekeeping commits stay out of the notes', async () => {
  const md = await notes.generateNotes(notesOpts, {
    ...context,
    commits: [commit('feat: a visible feature'), commit('chore: bump a dependency'), commit('ci: tweak a workflow')],
  });
  // Assert the visible one is there *first*, so this cannot pass on empty output.
  assert.match(md, /a visible feature/);
  assert.doesNotMatch(md, /bump a dependency/);
  assert.doesNotMatch(md, /tweak a workflow/);
});

test('notes link the compare range and each commit', async () => {
  const md = await notes.generateNotes(notesOpts, {
    ...context,
    commits: [commit('feat: linkable')],
  });
  assert.match(md, /compare\/v1\.2\.3\.\.\.v1\.3\.0/, 'compare link between the two tags');
  assert.match(md, /github\.com\/bmartel\/alacris/, 'links point at the repository');
});

test('the release config still declares the plugins the workflow relies on', () => {
  const names = config.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert.equal(names[0], './scripts/release-filter-scopes.js');
  assert.deepEqual(config.plugins[0][1], { exclude: ['ui', 'starter'] });
  for (const required of [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git',
  ]) {
    assert.ok(names.includes(required), `${required} must stay in the release pipeline`);
  }
  assert.deepEqual(config.branches, ['main']);

  // The changelog header must match the file, or the plugin will not find it and
  // will prepend a second title. Compare with line endings normalised: the repo
  // is LF via .gitattributes, but a Windows checkout has CRLF on disk, and this
  // assertion is about the text, not the newlines.
  const lf = (v) => v.split(String.fromCharCode(13)).join('');
  const title = named('@semantic-release/changelog').changelogTitle;
  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.ok(
    lf(changelog).startsWith(lf(title)),
    'CHANGELOG.md must begin with the configured changelogTitle'
  );
});
