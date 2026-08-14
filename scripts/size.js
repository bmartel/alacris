import { gzipSync, brotliCompressSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const kb = n => (n / 1024).toFixed(2) + ' KB';
const pad = (s, n) => String(s).padEnd(n);

function measure() {
  if (!existsSync(dist)) throw new Error('dist/ missing — run `npm run build` first');
  return readdirSync(dist).filter(f => f.endsWith('.js')).sort().map(f => {
    const buf = readFileSync(join(dist, f));
    return { file: f, raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length, brotli: brotliCompressSync(buf).length };
  });
}

export function report() {
  const rows = measure();

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

// `--check`: is the committed SIZE.md current for this dist/? Raw and gzip
// must match exactly — the toolchain is locked, so they are deterministic.
// Brotli gets a ±20-byte tolerance: the encoder ships with Node, and a patch
// release can move the output a handful of bytes without anything changing.
export function check() {
  const rows = measure();
  const committed = readFileSync(join(root, 'SIZE.md'), 'utf8');
  const errors = [];

  for (const r of rows) {
    const re = new RegExp('^\\| `' + r.file.replace(/\./g, '\\.') + '` \\| ([\\d.]+) KB \\| \\*\\*([\\d.]+) KB\\*\\* \\| ([\\d.]+) KB \\|$', 'm');
    const m = re.exec(committed);
    if (!m) { errors.push(`${r.file}: no row in SIZE.md`); continue; }
    if (m[1] + ' KB' !== kb(r.raw)) errors.push(`${r.file}: raw ${m[1]} KB committed, ${kb(r.raw)} measured`);
    if (m[2] + ' KB' !== kb(r.gzip)) errors.push(`${r.file}: gzip ${m[2]} KB committed, ${kb(r.gzip)} measured`);
    if (Math.abs(parseFloat(m[3]) * 1024 - r.brotli) > 20)
      errors.push(`${r.file}: brotli ${m[3]} KB committed, ${kb(r.brotli)} measured`);
  }
  for (const [, file] of committed.matchAll(/^\| `([^`]+)` \|/gm)) {
    if (!rows.some(r => r.file === file)) errors.push(`${file}: in SIZE.md but not in dist/`);
  }

  if (errors.length) {
    console.error('SIZE.md is stale — run `npm run build` and commit it:\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  console.log('SIZE.md is current.');
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  process.argv.includes('--check') ? check() : report();
}
