#!/usr/bin/env node
// Fail a pull request that changes library source and UI source together.
//
// The two packages share a repo so they can be developed side by side, but
// they publish independently. A squash-merge has one commit message, so a
// mixed PR cannot correctly release both. Split it.

import { execFileSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : 'origin/main';

const files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const librarySrc = files.filter((f) => f.startsWith('src/') || f.startsWith('types/'));
const uiSrc = files.filter((f) => f.startsWith('ui/src/') || f.startsWith('ui/types/'));

if (librarySrc.length && uiSrc.length) {
  console.error('This pull request changes Alacris library source and Alacris UI source together.');
  console.error('They publish independently — split this into two PRs.');
  console.error('\nLibrary:');
  for (const f of librarySrc) console.error(`  ${f}`);
  console.error('\nUI:');
  for (const f of uiSrc) console.error(`  ${f}`);
  process.exit(1);
}

console.log('OK: library source and UI source are not mixed.');
