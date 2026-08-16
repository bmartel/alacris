// Verify every internal link in the built site resolves to a page or a file
// that exists. Broken links are the most common docs defect and the easiest to
// miss, because the build succeeds either way.
import { readdir, readFile, access } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const BASE = '/alacris';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const all = await walk(root);
const pages = all.filter((p) => p.endsWith('.html'));

const routeOf = (p) => {
  const rel = relative(root, p).split(sep).join('/');
  return '/' + rel.replace(/index\.html$/, '');
};
const routes = new Set(pages.map(routeOf));

if (!routes.has('/ui/')) {
  console.error('\n  kitchen-sink catalog missing at /ui/ — docs/scripts/sync-lib.mjs should copy ui/ into public/ui.\n');
  process.exit(1);
}

const broken = [];
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (!raw.startsWith(BASE)) continue; // external, anchor, or mailto
    const clean = raw.split('#')[0].split('?')[0];
    let target = clean.slice(BASE.length) || '/';

    if (/\.[a-z0-9]+$/i.test(target)) {
      try {
        await access(join(root, target));
      } catch {
        broken.push([relative(root, page), raw, 'missing file']);
      }
      continue;
    }
    if (!target.endsWith('/')) target += '/';
    if (!routes.has(target)) broken.push([relative(root, page), raw, 'missing page']);
  }
}

console.log(`  checked ${pages.length} pages`);
if (broken.length) {
  console.error(`\n  ${broken.length} broken internal link(s):\n`);
  for (const [page, href, why] of broken) console.error(`    ${page}\n      -> ${href}  (${why})`);
  process.exit(1);
}
console.log('  no broken internal links');
