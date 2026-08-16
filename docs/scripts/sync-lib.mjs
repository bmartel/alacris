// Copy the built library into public/lib so every runnable example on the site
// executes the real bundle, imported under its real specifier. If the docs ever
// drift from the library, the demos break loudly instead of quietly documenting
// something that no longer exists.
//
// Also copy the Alacris UI kitchen sink into public/ui so GitHub Pages can
// serve the live catalog — every component, the theme playground, nothing to
// clone. The page is the same ESM app as `npm run demo`; only the import map
// is rewritten to point at this site's `/lib/` instead of the repo `dist/`.
import { cp, mkdir, rm, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/alacris';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const libOut = fileURLToPath(new URL('../public/lib/', import.meta.url));

const uiRoot = fileURLToPath(new URL('../../ui/', import.meta.url));
const uiOut = fileURLToPath(new URL('../public/ui/', import.meta.url));

try {
  await stat(dist);
} catch {
  console.error('\n  docs: ../dist is missing — run `npm run build` in the repo root first.\n');
  process.exit(1);
}

await rm(libOut, { recursive: true, force: true });
await mkdir(libOut, { recursive: true });
await cp(dist, libOut, { recursive: true });

const libFiles = (await readdir(libOut)).sort();
console.log(`  docs: synced ${libFiles.length} files into public/lib — ${libFiles.join(', ')}`);

try {
  await stat(join(uiRoot, 'index.html'));
  await stat(join(uiRoot, 'src'));
  await stat(join(uiRoot, 'demo'));
} catch {
  console.error('\n  docs: ../ui is missing the kitchen-sink app (index.html, src/, demo/).\n');
  process.exit(1);
}

await rm(uiOut, { recursive: true, force: true });
await mkdir(uiOut, { recursive: true });
await cp(join(uiRoot, 'src'), join(uiOut, 'src'), { recursive: true });
await cp(join(uiRoot, 'demo'), join(uiOut, 'demo'), { recursive: true });

const html = catalogHtml(await readFile(join(uiRoot, 'index.html'), 'utf8'));
if (!html.includes(`${BASE}/lib/alacris.js`)) {
  console.error('\n  docs: catalog HTML rewrite failed — ui/index.html import map no longer uses ../dist/.\n');
  process.exit(1);
}
await writeFile(join(uiOut, 'index.html'), html);

const demoFiles = (await readdir(join(uiOut, 'demo'))).length;
const srcFiles = await countFiles(join(uiOut, 'src'));
console.log(`  docs: synced kitchen sink into public/ui — ${srcFiles} src files, ${demoFiles} demo files`);

/**
 * Point the kitchen sink at this site's core bundle and give the hosted page
 * a canonical URL and favicon. Local `npm run demo` keeps serving ui/index.html
 * unchanged.
 */
function catalogHtml(source) {
  let html = source.replaceAll('../dist/', `${BASE}/lib/`);
  html = html.replace(
    '<title>Alacris UI</title>',
    '<title>Alacris UI — component catalog</title>',
  );
  html = html.replace(
    /<!--[\s\S]*?-->/,
    `<!--
    Live catalog on the docs site. @alacris/core is the bundle in ${BASE}/lib/;
    @alacris/ui is the source copied next to this file. Local \`npm run demo\`
    still serves ui/index.html from the repo root.
  -->`,
  );
  html = html.replace(
    /(<meta name="viewport"[^>]*>)/,
    `$1
  <meta name="description" content="Live catalog of every Alacris UI component. Theme it, click it — nothing to install.">
  <link rel="canonical" href="https://bmartel.github.io${BASE}/ui/">
  <link rel="icon" href="../favicon.svg">`,
  );
  return html;
}

async function countFiles(dir) {
  let n = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? await countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}
