// Copy the built library into public/lib so every runnable example on the site
// executes the real bundle, imported under its real specifier. If the docs ever
// drift from the library, the demos break loudly instead of quietly documenting
// something that no longer exists.
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const out = fileURLToPath(new URL('../public/lib/', import.meta.url));

try {
  await stat(dist);
} catch {
  console.error('\n  docs: ../dist is missing — run `npm run build` in the repo root first.\n');
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(dist, out, { recursive: true });

const files = (await readdir(out)).sort();
console.log(`  docs: synced ${files.length} files into public/lib — ${files.join(', ')}`);
