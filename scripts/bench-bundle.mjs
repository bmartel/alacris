// Bundle production builds of React, Vue, Solid, Svelte, Lit and Stencil into
// bench/vendor/ so the in-repo benchmark can compare without a page-load CDN.
import { build } from 'esbuild';
import { mkdir, readFile, writeFile, access, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bench = join(root, 'bench');
const impl = join(bench, 'impl');
const vendor = join(bench, 'vendor');
const nm = join(bench, 'node_modules');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

if (!(await exists(join(nm, 'react'))) || !(await exists(join(nm, 'lit'))) || !(await exists(join(nm, '@stencil/core')))) {
  console.log('bench: installing competitor frameworks…');
  const r = spawnSync('npm', ['install'], { cwd: bench, stdio: 'inherit', shell: true });
  if (r.status) process.exit(r.status);
}

await mkdir(vendor, { recursive: true });

const define = { 'process.env.NODE_ENV': '"production"' };
const external = ['../data.js'];

async function bundle(entry, outfile, extra = {}) {
  await build({
    absWorkingDir: bench,
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    define,
    external,
    ...extra,
  });
}

await bundle(join(impl, 'react.js'), join(vendor, 'react.js'));
await bundle(join(impl, 'vue.js'), join(vendor, 'vue.js'), {
  alias: { vue: join(nm, 'vue/dist/vue.runtime.esm-browser.prod.js') },
});
await bundle(join(impl, 'lit.js'), join(vendor, 'lit.js'));

const { createRequire } = await import('node:module');
const require = createRequire(join(bench, 'package.json'));
const babel = require('@babel/core');
const solidPreset = require('babel-preset-solid');
const solidSrc = await readFile(join(impl, 'solid.jsx'), 'utf8');
const solidJs = babel.transformSync(solidSrc, {
  filename: 'solid.jsx',
  presets: [[solidPreset, { generate: 'dom', hydratable: false }]],
  babelrc: false,
  configFile: false,
}).code;
const solidTmp = join(impl, '.solid.tmp.js');
await writeFile(solidTmp, solidJs);
await bundle(solidTmp, join(vendor, 'solid.js'));
await unlink(solidTmp);

const { compile } = await import(pathToFileURL(join(nm, 'svelte/src/compiler/index.js')).href);
const svelteSrc = await readFile(join(impl, 'svelte-app.svelte'), 'utf8');
const compiled = compile(svelteSrc, {
  filename: 'svelte-app.svelte',
  generate: 'client',
  css: 'external',
  dev: false,
});
await writeFile(join(impl, 'svelte-app.js'), compiled.js.code);
await bundle(join(impl, 'svelte.js'), join(vendor, 'svelte.js'));

const stencilSrc = await readFile(join(impl, 'stencil-app.tsx'), 'utf8');
const { transpileSync } = await import(pathToFileURL(join(nm, '@stencil/core/compiler/stencil.js')).href)
  .catch(() => import(pathToFileURL(join(nm, '@stencil/core/compiler/index.js')).href));
const stencilOut = transpileSync(stencilSrc, {
  file: 'stencil-app.tsx',
  componentExport: 'customelement',
  componentMetadata: 'compilerstatic',
  coreImportPath: '@stencil/core/internal/client',
  sourceMap: false,
  style: 'inline',
  target: 'latest',
});
if (stencilOut.diagnostics?.length) {
  const fatal = stencilOut.diagnostics.filter((d) => d.level === 'error');
  if (fatal.length) {
    console.error(fatal.map((d) => d.messageText).join('\n'));
    process.exit(1);
  }
}
await writeFile(join(impl, 'stencil-app.js'), stencilOut.code);
await bundle(join(impl, 'stencil.js'), join(vendor, 'stencil.js'));

const ver = async (name) => JSON.parse(await readFile(join(nm, name, 'package.json'), 'utf8')).version;
await writeFile(join(vendor, 'versions.js'),
  'export default ' + JSON.stringify({
    react: await ver('react'),
    vue: await ver('vue'),
    'solid-js': await ver('solid-js'),
    svelte: await ver('svelte'),
    lit: await ver('lit'),
    '@stencil/core': await ver('@stencil/core'),
  }) + ';\n');

console.log('bench: vendor bundles written');
