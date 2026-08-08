import { build } from 'esbuild';
import { minify } from 'terser';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { report } from './size.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const pkg = JSON.parse(readFileSync(join(root, 'package.json')));
const banner = `/*! alacris v${pkg.version} | MIT */\n`;

const bundle = (entry, min) => build({
  entryPoints: [join(root, entry)],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  minify: min,
  legalComments: 'none',
  mangleProps: min ? /^_/ : undefined,
}).then(r => r.outputFiles[0].text);

const squeeze = code => minify(code, {
  module: true,
  toplevel: true,
  ecma: 2022,
  // NOT booleans_as_integers: it rewrites `true`/`false` literals to `1`/`0`,
  // which silently breaks the `v === true` / `v === false` attribute checks
  // whenever a signal holds the number 1 or 0. It saved 13 bytes.
  compress: { passes: 4, unsafe: true, unsafe_arrows: true, unsafe_methods: true, pure_getters: true },
  // Only `_`-prefixed internals are mangled. Gzip already collapses repeated
  // identifiers, so mangling the rest bought ~10 bytes and a lot of risk.
  mangle: { toplevel: true, properties: { regex: /^_/ } },
  format: { comments: false },
}).then(r => r.code);

// esbuild first, then terser over its output: each catches things the other
// misses, and the pair is ~2% smaller after gzip than either one alone.
for (const [entry, out] of [
  ['src/index.js', 'alacris.js'],     // signals + templates + custom elements
  ['src/signal-public.js', 'signal.js'], // reactivity on its own, for non-DOM use
]) {
  const code = await squeeze(await bundle(entry, true));
  writeFileSync(join(dist, out), banner + code + '\n');
}

// The add-ons must NOT carry their own copy of the reactive core. Two copies
// means two dependency graphs: a store write notifies its own observers while
// the renderer's effects sit in the other graph listening to nothing, and
// everything silently stops updating. Leave the import external and point it
// at the core bundle, so there is exactly one graph at runtime.
for (const [entry, out] of [
  ['src/store.js', 'store.js'],
  ['src/context.js', 'context.js'],
]) {
  const raw = await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    minify: true,
    legalComments: 'none',
    mangleProps: /^_/,
    external: ['./signal.js'],
  }).then((r) => r.outputFiles[0].text);
  const code = (await squeeze(raw)).replace(/(['"])\.\/signal\.js\1/g, '"./alacris.js"');
  writeFileSync(join(dist, out), banner + code + '\n');
}

writeFileSync(join(dist, 'alacris.dev.js'), await bundle('src/index.js', false));

report();
