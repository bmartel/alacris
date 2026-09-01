// The published package contract. Guards the things that would make
// `npm install @alacris/ui` silently wrong: a private flag left on, @alacris/core
// bundled into the tarball, or an export map that does not match the files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('the package is public @alacris/ui, not a private template', () => {
  assert.equal(pkg.name, '@alacris/ui');
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.license, 'MIT');
});

test('@alacris/core is a dependency, never vendored', () => {
  assert.equal(pkg.dependencies?.['@alacris/core'], pkg.peerDependencies?.['@alacris/core']);
  assert.match(pkg.dependencies['@alacris/core'], /^\^0\.\d+/);
  assert.equal(existsSync(join(root, 'src', 'alacris.js')), false);
  assert.equal(existsSync(join(root, 'src', 'signal.js')), false);
});

test('the tarball is source ESM, not the demo or tests', () => {
  assert.deepEqual(pkg.files, ['src', 'types', 'README.md', 'LICENSE']);
  assert.ok(pkg.files.every((f) => existsSync(join(root, f))));
  assert.equal(pkg.files.includes('demo'), false);
  assert.equal(pkg.files.includes('test'), false);
});

test('entry points resolve to files that exist', () => {
  const expected = ['.', './theme', './motion', './tokens', './components/*', './src/*', './package.json'];
  assert.deepEqual(Object.keys(pkg.exports), expected);
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    if (typeof target === 'string') {
      if (target.includes('*')) continue;
      assert.ok(existsSync(join(root, target)), `${subpath} -> ${target}`);
      continue;
    }
    assert.ok(existsSync(join(root, target.default)), `${subpath} default`);
    assert.ok(existsSync(join(root, target.types)), `${subpath} types`);
  }
});

test('component modules are marked as side-effectful so bundlers keep define()', () => {
  assert.ok(pkg.sideEffects.includes('./src/index.js'));
  assert.ok(pkg.sideEffects.includes('./src/components/**/*.js'));
});

test('every ui-* file is importable through the components subpath', () => {
  const files = readdirSync(join(root, 'src', 'components'))
    .filter((f) => f.startsWith('ui-') && f.endsWith('.js'));
  assert.equal(files.length, 69);
  for (const file of files) {
    assert.ok(existsSync(join(root, 'src', 'components', file)));
  }
});
