// The prebuilt files in `dist/` (scripts/build.mjs), as a page without a
// bundler loads them. Source tests cannot see what a build gets wrong: a second
// copy of a shared module, an entry point that lost an export, the reactive
// core pulled inside. `npm test` builds first, so this never runs on stale files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRIES } from '../scripts/build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const files = readdirSync(dist);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// The source is imported in a child process: this one loads the built files, and
// loading both would define every element twice.
const sourceExports = (entry) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      ['--import', './test/setup.js', '--input-type=module', '-e',
        `const m = await import(${JSON.stringify('./' + entry)}); console.log(JSON.stringify(Object.keys(m).sort()));`],
      { cwd: root, encoding: 'utf8' },
    ),
  );

test('dist is the four entry points and a few shared chunks', () => {
  for (const name of Object.keys(ENTRIES)) assert.ok(files.includes(`${name}.js`), `${name}.js`);
  const other = files.filter((f) => !Object.keys(ENTRIES).some((n) => f === `${n}.js`));
  assert.ok(other.every((f) => /^chunk-[A-Z0-9]+\.js$/.test(f)), `unexpected files: ${other}`);
  // The point of the build: a page loads a handful of files, not one per module.
  assert.ok(files.length <= 12, `${files.length} files`);
  for (const f of files) {
    assert.ok(readFileSync(join(dist, f), 'utf8').startsWith(`/*! @alacris/ui v${pkg.version} | MIT */`), f);
  }
});

test('@alacris/core is imported by name, never bundled', () => {
  let coreImports = 0;
  for (const f of files) {
    const code = readFileSync(join(dist, f), 'utf8');
    for (const [, spec] of code.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
      if (spec.startsWith('./')) {
        assert.ok(files.includes(spec.slice(2)), `${f} imports missing ${spec}`);
        continue;
      }
      assert.match(spec, /^@alacris\/core(\/(store|context|signal))?$/, `${f} imports ${spec}`);
      coreImports += 1;
    }
  }
  assert.ok(coreImports > 0);
});

test('each entry point exports exactly what its source does', async () => {
  for (const [name, entry] of Object.entries(ENTRIES)) {
    const built = Object.keys(await import(`../dist/${name}.js`)).sort();
    assert.deepEqual(built, sourceExports(entry), name);
  }
});

test('the entry points share one copy of everything', async () => {
  const index = await import('../dist/index.js');
  const theme = await import('../dist/theme.js');
  const motion = await import('../dist/motion.js');
  const tokens = await import('../dist/tokens.js');
  assert.equal(theme.scheme, index.scheme);
  assert.equal(theme.applyTheme, index.applyTheme);
  assert.equal(motion.animate, index.animate);
  assert.equal(tokens.sys, index.sys);

  // One signal behind both: a scheme set through one entry is read through the other.
  theme.setScheme('dark');
  assert.equal(index.scheme(), 'dark');
  index.setScheme('light');
  assert.equal(theme.scheme(), 'light');
});

test('the built index registers every component, and they render', async () => {
  await import('../dist/index.js');
  const tags = readdirSync(join(root, 'src', 'components'))
    .filter((f) => f.startsWith('ui-') && f.endsWith('.js'))
    .map((f) => f.slice(0, -3));
  assert.equal(tags.length, 71);
  for (const tag of tags) assert.ok(customElements.get(tag), `${tag} is not defined`);

  const host = document.createElement('div');
  host.innerHTML = '<ui-button>Save</ui-button><ui-switch label="On"></ui-switch>';
  document.body.append(host);
  await new Promise((r) => setTimeout(r, 0));
  const button = host.querySelector('ui-button');
  assert.ok(button.shadowRoot.querySelector('button'), 'ui-button rendered its control');
  assert.equal(host.querySelector('ui-switch').shadowRoot.textContent.includes('On'), true);
  host.remove();
});
