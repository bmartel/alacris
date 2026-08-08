import { gzipSync, brotliCompressSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const kb = n => (n / 1024).toFixed(2) + ' KB';
const pad = (s, n) => String(s).padEnd(n);

export function report() {
  if (!existsSync(dist)) throw new Error('dist/ missing — run `npm run build` first');
  const rows = readdirSync(dist).filter(f => f.endsWith('.js')).sort().map(f => {
    const buf = readFileSync(join(dist, f));
    return { file: f, raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length, brotli: brotliCompressSync(buf).length };
  });

  console.log('\n' + pad('file', 20) + pad('raw', 12) + pad('gzip', 12) + 'brotli');
  console.log('-'.repeat(54));
  for (const r of rows) console.log(pad(r.file, 20) + pad(kb(r.raw), 12) + pad(kb(r.gzip), 12) + kb(r.brotli));
  console.log();

  writeFileSync(join(root, 'SIZE.md'),
    '# Bundle size\n\nMeasured on the published `dist/` output.\n\n' +
    '| file | raw | gzip | brotli |\n| --- | ---: | ---: | ---: |\n' +
    rows.map(r => `| \`${r.file}\` | ${kb(r.raw)} | **${kb(r.gzip)}** | ${kb(r.brotli)} |`).join('\n') +
    '\n\n- `alacris.js` — everything: signals, templates, custom elements.\n' +
    '- `signal.js` — the reactive core on its own.\n' +
    '- `alacris.dev.js` — unminified, for debugging.\n');
  return rows;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) report();
