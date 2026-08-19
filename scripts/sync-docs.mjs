// Keep the documentation honest about the release it describes.
//
// Two kinds of fact go stale on their own, and both had:
//
// - **Pinned versions.** CDN examples are always pinned to an exact version —
//   an unpinned `unpkg.com/@alacris/core` tracks latest and can break a page
//   that was written against yesterday's API. The number in every pin is the
//   current release, not an illustration. A missing pin is a bug; this script
//   inserts one. The README once pinned 0.1.0 while npm served 0.2.2.
//
// - **Size figures.** `SIZE.md` is generated from the built bundles, but the
//   same numbers were retyped by hand into four tables, a shields.io badge and
//   half a dozen sentences — about thirty five of them, all of which move
//   together the moment the bundle does.
//
// SIZE.md is the one place a size is measured; the two package.json files are
// the places versions are set (`@alacris/core` at the root, `@alacris/ui` in
// ui/). Everything below is derived from those.
//
// Run by hand with `npm run sync-docs`, from semantic-release's prepare step so
// the release commit carries the update, and with `--check` in CI so a pull
// request cannot introduce a stale figure.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const args = process.argv.slice(2);
const check = args.includes('--check');
// semantic-release runs this from the prepare step, and for @alacris/ui it
// runs it with cwd=ui/. @semantic-release/git lists candidates with
// `git ls-files -m -o`, which from a subdirectory reports only that
// subdirectory — so every `../docs/...` asset in ui/.releaserc.json was
// silently dropped and three UI releases in a row left the pins behind and
// main red. The files are staged here instead, where their paths are already
// known and rooted at the repository. The plugin's own `git commit` carries
// no pathspec, so whatever is in the index goes into the release commit.
const stage = args.includes('--stage');
const uiFlag = args.indexOf('--ui');
const version =
  args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '--ui') ??
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`  sync-docs: '${version}' is not a version.`);
  process.exit(1);
}

// Prose and examples only, enumerated with git so generated output — the
// bundles synced into docs/public/lib, dist, node_modules — is never touched.
const SCANNED = new Set(['.md', '.mdx', '.html', '.txt', '.astro', '.ts', '.js']);

// CHANGELOG.md is a record of what *was* true at each release; rewriting a
// version or a size into it would be falsifying history. SIZE.md belongs to
// scripts/size.js, which measures rather than copies.
const OWNED_ELSEWHERE = new Set(['CHANGELOG.md', 'ui/CHANGELOG.md', 'SIZE.md']);

// A file that documents *how* any of this works needs to name a version or a
// size without having it rewritten out from under the sentence. It says so.
const IGNORE = 'sync-docs:ignore';

// ------------------------------------------------------------------ versions

const PIN = /@alacris\/core@(\d+(?:\.\d+){0,2})\b/g;
const UI_PIN = /@alacris\/ui@(\d+(?:\.\d+){0,2})\b/g;

// Copy-paste CDN URLs. An unpinned host tracks latest and can break a page;
// a minor pin (`@0.11`) still floats. Examples always use the exact x.y.z.
const CDN =
  /https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm|esm\.sh)\/@alacris\/(core|ui)(?:@(\d+(?:\.\d+){0,2}))?(?=[/"'`\s<>]|$)/g;

const parts = version.split('.');
/** Rewrite a pin to the current version, keeping however precise it was. */
const reshape = (pin) => parts.slice(0, pin.split('.').length).join('.');

const uiVersion =
  uiFlag >= 0
    ? args[uiFlag + 1]
    : JSON.parse(readFileSync(join(root, 'ui/package.json'), 'utf8')).version;
const uiParts = uiVersion.split('.');
const reshapeUi = (pin) => uiParts.slice(0, pin.split('.').length).join('.');

if (!/^\d+\.\d+\.\d+/.test(uiVersion)) {
  console.error(`  sync-docs: ui '${uiVersion}' is not a version.`);
  process.exit(1);
}

function syncPins(text, note) {
  text = text.replace(PIN, (match, pin) => {
    const next = reshape(pin);
    if (next !== pin) note(`core ${pin} -> ${next}`);
    return `@alacris/core@${next}`;
  });
  return text.replace(UI_PIN, (match, pin) => {
    const next = reshapeUi(pin);
    if (next !== pin) note(`ui ${pin} -> ${next}`);
    return `@alacris/ui@${next}`;
  });
}

/** CDN URLs always pin the full current version, including ones that had none. */
function syncCdn(text, note) {
  return text.replace(CDN, (match, pkg, pin) => {
    const next = pkg === 'ui' ? uiVersion : version;
    if (pin === next) return match;
    note(`${pkg} cdn ${pin ?? 'unpinned'} -> ${next}`);
    return pin ? match.replace(/@\d+(?:\.\d+){0,2}$/, `@${next}`) : `${match}@${next}`;
  });
}

/** Leftover unpinned CDN URLs — a host this script does not rewrite, or a regex miss. */
function unpinnedCdn(text) {
  return [...text.matchAll(new RegExp(CDN.source, 'g'))]
    .filter((m) => !m[2])
    .map((m) => m[0]);
}

// --------------------------------------------------------------------- sizes

const SIZE_ROW =
  /^\|\s*`([\w.]+)`\s*\|\s*([\d.]+)\s*KB\s*\|\s*\*\*([\d.]+)\s*KB\*\*\s*\|\s*([\d.]+)\s*KB\s*\|/gm;

const sizes = new Map();
for (const [, file, raw, gzip, brotli] of readFileSync(
  join(root, 'SIZE.md'),
  'utf8'
).matchAll(SIZE_ROW)) {
  sizes.set(file, { raw, gzip, brotli });
}

if (!sizes.size) {
  console.error('  sync-docs: could not read any rows from SIZE.md.');
  process.exit(1);
}

/** Every figure that is currently true of some bundle. */
const measured = new Set([...sizes.values()].flatMap((m) => Object.values(m)));

const METRICS = ['raw', 'gzip', 'brotli'];
const FIGURE = /(\d+\.\d+)(\s*)([kK]B)/;

// Compressed output moves a rounding step when Node's zlib/brotli update —
// the same drift scripts/size.js tolerates in SIZE.md. A quoted gzip/brotli
// figure within one hundredth of a KB of the measurement is current; raw is
// deterministic and stays exact.
const close = (a, b) => Math.abs(parseFloat(a) - parseFloat(b)) <= 0.02;
const current = (was, now, metric) => (metric === 'raw' ? was === now : close(was, now));

/** Which bundle a table row is about, read from its first cell. */
function bundleOf(cell) {
  const text = cell.replace(/`/g, '');
  const subpath = text.match(/@alacris\/core\/(\w+)/); // `@alacris/core/store`
  if (subpath) return `${subpath[1]}.js`;
  const named = text.match(/([\w.]+\.js)\b/); // `dist/alacris.js`, `store.js`
  if (named) return named[1];
  return /\balacris\b/.test(text) ? 'alacris.js' : null;
}

/** Column index -> metric, read from a header row's cells. */
function columnsOf(cells) {
  const cols = new Map();
  cells.forEach((cell, i) => {
    const metric = METRICS.find((m) => new RegExp(`\\b${m}\\b`, 'i').test(cell));
    if (metric) cols.set(i, metric);
  });
  return cols.size ? cols : null;
}

/** Replace the figure in one cell, keeping the unit casing the doc chose. */
function syncCell(cell, bundle, metric, note) {
  const size = sizes.get(bundle);
  if (!size) return cell;
  return cell.replace(FIGURE, (match, was, gap, unit) => {
    if (current(was, size[metric], metric)) return match;
    note(`${bundle} ${metric} ${was} -> ${size[metric]}`);
    return `${size[metric]}${gap}${unit}`;
  });
}

/**
 * Rewrite the figures in any table that reports sizes.
 *
 * The tables are anchored on themselves rather than on markers: a header names
 * the metrics, the first cell of each row names the bundle, so which number
 * belongs where is read off the table instead of guessed. Both the Markdown
 * table in the README and the <table> blocks in the docs work this way.
 */
function syncTables(text, note) {
  const lines = text.split('\n');
  let cols = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/<th[\s>]/.test(line)) {
      cols = columnsOf([...line.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]));
      continue;
    }

    if (/<\/table>/.test(line)) {
      cols = null;
      continue;
    }

    if (cols && /<td[\s>]/.test(line)) {
      const cells = [...line.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
      const bundle = bundleOf(cells[0] ?? '');
      if (!bundle) continue;
      let col = -1;
      lines[i] = line.replace(
        /(<td[^>]*>)([\s\S]*?)(<\/td>)/g,
        (match, open, inner, close) => {
          col++;
          const metric = cols.get(col);
          return metric ? open + syncCell(inner, bundle, metric, note) + close : match;
        }
      );
      continue;
    }

    if (line.trimStart().startsWith('|')) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // the --- separator
      const cells = line.split('|').slice(1, -1);
      const header = columnsOf(cells);
      if (header && !bundleOf(cells[0] ?? '')) {
        cols = header;
        continue;
      }
      const bundle = cols && bundleOf(cells[0] ?? '');
      if (bundle) {
        lines[i] =
          '|' +
          cells
            .map((cell, col) =>
              cols.get(col) ? syncCell(cell, bundle, cols.get(col), note) : cell
            )
            .join('|') +
          '|';
      }
      continue;
    }

    if (!line.trim()) cols = null; // a blank line ends a Markdown table
  }

  return lines.join('\n');
}

const BADGE = /(img\.shields\.io\/badge\/core-)(\d+\.\d+)(%20kB)/i;

function syncBadge(text, note) {
  const core = sizes.get('alacris.js');
  if (!core) return text;
  return text.replace(BADGE, (match, prefix, was, suffix) => {
    if (current(was, core.gzip, 'gzip')) return match;
    note(`badge ${was} -> ${core.gzip}`);
    return prefix + core.gzip + suffix;
  });
}

/**
 * Figures loose in a sentence cannot be placed automatically — nothing says
 * which bundle "0.97 kB" is describing. They can still be caught: every one of
 * them should be a figure that is currently true of *something*.
 */
function strayFigures(text) {
  return [...text.matchAll(/(\d+\.\d+)\s*[kK]B/g)]
    .map((m) => m[1])
    .filter((figure) => ![...measured].some((m) => close(figure, m)));
}

// ---------------------------------------------------------------------- run

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && SCANNED.has(extname(f)) && !OWNED_ELSEWHERE.has(f));

const stale = [];
const strays = [];
const unpinned = [];

for (const file of files) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const before = readFileSync(path, 'utf8');
  if (before.includes(IGNORE)) continue;

  const changes = new Set();
  const note = (what) => changes.add(what);

  let after = syncCdn(before, note);
  after = syncPins(after, note);
  after = syncTables(after, note);
  after = syncBadge(after, note);

  if (after !== before) {
    stale.push({ file, changes: [...changes] });
    if (!check) writeFileSync(path, after);
  }

  const loose = strayFigures(after);
  if (loose.length) strays.push({ file, loose: [...new Set(loose)] });

  const floating = unpinnedCdn(after);
  if (floating.length) unpinned.push({ file, urls: [...new Set(floating)] });
}

if (stale.length) {
  console.log(`  sync-docs: ${stale.length} file(s) ${check ? 'stale' : 'updated'} for ${version}`);
  for (const { file, changes } of stale) {
    console.log(`    ${file}\n      ${changes.join('\n      ')}`);
  }
  if (stage && !check) {
    execFileSync('git', ['add', '--', ...stale.map(({ file }) => file)], { cwd: root });
    console.log(`  sync-docs: staged ${stale.length} file(s) for the release commit`);
  }
} else {
  console.log(`  sync-docs: every version and size already reads ${version}`);
}

if (strays.length) {
  console.error('\n  These figures match no current bundle size, so a sentence needs editing:');
  for (const { file, loose } of strays) {
    console.error(`    ${file}  (${loose.map((f) => `${f} kB`).join(', ')})`);
  }
}

if (unpinned.length) {
  console.error('\n  These CDN URLs are unpinned, so a later publish can break the page:');
  for (const { file, urls } of unpinned) {
    console.error(`    ${file}\n      ${urls.join('\n      ')}`);
  }
}

if (check && (stale.length || strays.length || unpinned.length)) {
  if (stale.length) console.error('\n  Run `npm run sync-docs` and commit the result.');
  process.exit(1);
}

if (strays.length || unpinned.length) process.exit(1);
