// Assemble docs/components.md from the component file headers.
// Each component documents itself in a leading comment block (@prop/@event/
// @slot/@part/@vars); this script is just the collator. Run after adding or
// changing components:
//
//   node scripts/catalog.mjs

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'components');

const files = (await readdir(dir)).filter((f) => f.startsWith('ui-') && f.endsWith('.js')).sort();

let out = `# Component catalog

Assembled from each component's file header by \`scripts/catalog.mjs\` — the
headers are the source of truth. ${files.length} components. Every component
also exports \`themeVars\` (when it declares component tokens); \`themeVars.names\`
is the machine-readable custom-property list.

`;

for (const file of files) {
  const text = await readFile(join(dir, file), 'utf8');
  const lines = text.split('\n');
  const header = [];
  for (const line of lines) {
    if (line.startsWith('//')) header.push(line.replace(/^\/\/ ?/, ''));
    else if (line.trim() === '') { if (header.length) header.push(''); }
    else break;
  }
  while (header.length && header[header.length - 1] === '') header.pop();

  const tag = file.replace(/\.js$/, '');
  out += `## \`<${tag}>\`\n\n`;

  const tableRows = [];
  const prose = [];
  for (const line of header) {
    const m = line.match(/^@(prop|event|slot|part|vars|cssvar)\s*(.*)$/);
    if (m) tableRows.push([m[1], m[2].trim()]);
    else if (!tableRows.length) prose.push(line);
    else tableRows[tableRows.length - 1][1] += ' ' + line.trim();
  }
  const esc = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const intro = prose.join('\n').replace(/^<ui-[a-z-]+> — /, '').trim();
  if (intro) out += esc(intro) + '\n\n';
  if (tableRows.length) {
    out += '| | |\n| --- | --- |\n';
    for (const [kind, desc] of tableRows) {
      out += `| \`@${kind}\` | ${esc(desc).replace(/\|/g, '\\|')} |\n`;
    }
    out += '\n';
  }
  out += `Source: [\`src/components/${file}\`](../src/components/${file})\n\n`;
}

await writeFile(join(root, 'docs', 'components.md'), out);
console.log(`docs/components.md — ${files.length} components`);
