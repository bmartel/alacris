// Prebuilt files for pages that load @alacris/ui without a bundler.
//
// `src/` is the package: about a hundred plain ESM files, and the default every
// export points at. Loaded straight from an import map that is a hundred
// requests before the first component is defined. This writes the same four
// entry points into `dist/` as a handful of files, for that one case.
//
// The entry points are built together, with code splitting, so what they share
// (the theme signals, the token registry, every `define()`) lives in one chunk
// that all of them import. Built one by one, each would carry its own copy:
// `setScheme` from `dist/theme.js` would move a signal nothing rendered by
// `dist/index.js` listens to, and loading two of them would define every
// element twice.
//
// `@alacris/core` stays an import, never bundled. One reactive graph per page.
import { build } from 'esbuild';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Entry name in `dist/` -> source module. Mirrors the package's named entry points. */
export const ENTRIES = {
  index: 'src/index.js',
  theme: 'src/theme/index.js',
  motion: 'src/motion/index.js',
  tokens: 'src/tokens/index.js',
};

export async function buildDist(outdir = join(root, 'dist')) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  rmSync(outdir, { recursive: true, force: true });
  const result = await build({
    absWorkingDir: root,
    entryPoints: ENTRIES,
    outdir,
    bundle: true,
    splitting: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    // Whitespace, syntax and local names only. No property mangling: element
    // props, attributes and `::part` names are public and must survive as written.
    minify: true,
    legalComments: 'none',
    chunkNames: 'chunk-[hash]',
    external: ['@alacris/core', '@alacris/core/*'],
    banner: { js: `/*! @alacris/ui v${pkg.version} | MIT */` },
    metafile: true,
    logLevel: 'warning',
  });
  return Object.entries(result.metafile.outputs).map(([file, out]) => ({
    file,
    bytes: out.bytes,
    entry: Boolean(out.entryPoint),
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await buildDist();
  for (const f of files.sort((a, b) => Number(b.entry) - Number(a.entry) || a.file.localeCompare(b.file))) {
    console.log(`${f.file.padEnd(28)} ${(f.bytes / 1024).toFixed(1).padStart(7)} kB${f.entry ? '' : '  (shared)'}`);
  }
}
