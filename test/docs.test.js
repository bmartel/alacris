// The published API surface, checked against the files that describe it.
//
// Two of those files are shipped guidance rather than prose about the library.
// `docs/public/AGENTS.md` is downloaded into other people's projects and read by
// their coding agents; `reference/api.md` is the page a reader is sent to when
// they ask what exists. A rename that misses either one does not break a build
// anywhere — it just quietly teaches the wrong thing, in every project that
// pulled the file, until someone notices by hand.
//
// So: every entry point's real exports are read from `src/`, and each one has to
// be named in the API reference, named in the agent instructions (or listed in
// UNDOCUMENTED below, with a reason), and declared in the hand-written types.
// Mentions only count inside code — backticks or a fence — because half these
// names are also ordinary English words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const at = (p) => new URL('../' + p, import.meta.url);
const read = (p) => readFileSync(at(p), 'utf8');

const pkg = JSON.parse(read('package.json'));

// The bundles are built from differently named sources; everything else is 1:1.
const SOURCE_OF = { 'alacris.js': 'index.js', 'signal.js': 'signal-public.js' };

// Subpaths that expose files rather than an API surface.
const NOT_AN_ENTRY = new Set(['./src/*', './package.json']);

/**
 * Exports a consumer is deliberately not told about in AGENTS.md. An agent
 * writing an application does not need these, and every line in that file is
 * context it spends on something else. They are still in the API reference.
 */
const UNDOCUMENTED = {
  flush: 'only needed to drain effects after bypassing batch() — not app-level',
};

const entries = [];
for (const [subpath, target] of Object.entries(pkg.exports)) {
  if (NOT_AN_ENTRY.has(subpath)) continue;
  const file = target.default.split('/').pop();
  entries.push({
    specifier: subpath === '.' ? 'alacris' : subpath.replace('./', 'alacris/'),
    source: 'src/' + (SOURCE_OF[file] ?? file),
    types: target.types,
  });
}

const surface = new Map();
for (const entry of entries) {
  const mod = await import(at(entry.source));
  surface.set(entry.specifier, { ...entry, names: Object.keys(mod).sort() });
}

/** Everything in the package, once — `signal` is exported from two entries. */
const all = [...new Set([...surface.values()].flatMap((e) => e.names))].sort();

// Inline spans and fenced blocks, so `update` the export is not satisfied by
// "updates arrive automatically" in a sentence.
const CODE = /```[\s\S]*?```|`[^`\n]+`/g;
const codeIn = (text) => (text.match(CODE) || []).join('\n');

const AGENTS = read('docs/public/AGENTS.md');
const API = read('docs/src/content/docs/reference/api.md');
const mentions = (haystack, name) => new RegExp(`\\b${name}\\b`).test(haystack);

test('the package exposes the entry points its build produces', () => {
  assert.deepEqual(
    [...surface.keys()].sort(),
    ['alacris', 'alacris/context', 'alacris/signal', 'alacris/store']
  );
});

test('the API reference documents every export', () => {
  const code = codeIn(API);
  const missing = all.filter((name) => !mentions(code, name));
  assert.deepEqual(
    missing,
    [],
    `reference/api.md never names: ${missing.join(', ')}`
  );
});

test('the agent instructions cover every export', () => {
  const code = codeIn(AGENTS);
  const missing = all.filter((name) => !mentions(code, name) && !UNDOCUMENTED[name]);
  assert.deepEqual(
    missing,
    [],
    `docs/public/AGENTS.md never names: ${missing.join(', ')}. ` +
      'Document it there, or add it to UNDOCUMENTED in this file with a reason.'
  );
});

test('the UNDOCUMENTED list has not gone stale', () => {
  const code = codeIn(AGENTS);
  for (const [name, reason] of Object.entries(UNDOCUMENTED)) {
    assert.ok(reason, `UNDOCUMENTED.${name} needs a reason`);
    assert.ok(all.includes(name), `UNDOCUMENTED lists ${name}, which is no longer exported`);
    assert.ok(
      !mentions(code, name),
      `UNDOCUMENTED lists ${name}, but AGENTS.md documents it now — drop the entry`
    );
  }
});

// The imports in the instructions are copied verbatim into real projects, so a
// name that no longer exists there is a broken import in someone else's app.
test('every import in the agent instructions resolves', () => {
  const IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"](alacris(?:\/\w+)?)['"]/g;
  const found = [...AGENTS.matchAll(IMPORT)];
  assert.ok(found.length, 'no import statements found — has the file changed shape?');

  for (const [, clause, specifier] of found) {
    const entry = surface.get(specifier);
    assert.ok(entry, `AGENTS.md imports from '${specifier}', which is not an entry point`);
    for (const part of clause.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      assert.ok(
        entry.names.includes(name),
        `AGENTS.md imports { ${name} } from '${specifier}', which does not export it`
      );
    }
  }
});

// Three exports reached a release exercised by nothing at all — they were typed,
// documented and shipped, and no test ever called them. Nobody notices that by
// reading a coverage percentage: the lines run, because something else in the
// module uses them.
test('every export is exercised by a test', () => {
  // This file imports the modules dynamically to read their shape, and
  // dist.test.js lists names to check the bundle exports them. Neither is
  // evidence that anything was called, so neither counts as coverage.
  const suites = readdirSync(new URL('.', import.meta.url))
    .filter((f) => f.endsWith('.test.js') && f !== 'docs.test.js' && f !== 'dist.test.js');

  const IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/src\/[\w-]+\.js['"]/g;
  const exercised = new Set();
  for (const file of suites) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const [, clause] of text.matchAll(IMPORT))
      for (const part of clause.split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name) exercised.add(name);
      }
  }

  const missing = all.filter((name) => !exercised.has(name));
  assert.deepEqual(missing, [], `no test imports: ${missing.join(', ')}`);
});

// The .d.ts files are authored, not generated, so nothing but this notices when
// an export is added to src/ and forgotten in types/.
test('the hand-written types declare every export', () => {
  const DECLARED = /export\s+(?:declare\s+)?(?:function|const|class|let|var)\s+([\w$]+)/g;
  const STAR = /export\s+\*\s+from\s+['"]\.\/([\w.-]+)\.js['"]/g;

  const declared = (file, seen = new Set()) => {
    if (seen.has(file)) return new Set();
    seen.add(file);
    const text = readFileSync(new URL(file, at('types/')), 'utf8');
    const names = new Set([...text.matchAll(DECLARED)].map((m) => m[1]));
    for (const [, base] of text.matchAll(STAR)) {
      for (const name of declared(base + '.d.ts', seen)) names.add(name);
    }
    return names;
  };

  for (const entry of surface.values()) {
    const names = declared(entry.types.split('/').pop());
    const missing = entry.names.filter((n) => !names.has(n));
    assert.deepEqual(missing, [], `${entry.types} does not declare: ${missing.join(', ')}`);
  }
});
