// Keep the two npm packages in this repo from releasing each other.
//
// The library and @alacris/ui share a git history. Without a filter, a
// `feat(ui):` commit would bump `@alacris/core`, and a `feat(html):` commit would
// bump `@alacris/ui`. Each pipeline keeps only the commits that belong to it.
//
//   { exclude: ['ui', 'starter'] }   — library release (`starter` is a usage
//                                       guide and must not cut @alacris/core)
//   { include: ['ui'] }              — UI release from ui/
//
// This plugin *is* the commit analyzer and the notes generator for both
// pipelines: it filters, then calls @semantic-release/commit-analyzer and
// @semantic-release/release-notes-generator itself, with the options given
// under `analyzer` and `notes`. It cannot be a separate step in front of them.
// semantic-release hands every plugin its own deep copy of the context, so a
// plugin that only narrows `context.commits` changes nothing for the next one.
// That is how it was first written, and it did nothing: @alacris/ui 0.13.0 was
// cut as a minor by a `feat(core)` commit. Do not list the analyzer or the notes
// generator in a .releaserc beside this plugin; they would see every commit.
import * as analyzer from '@semantic-release/commit-analyzer';
import * as notes from '@semantic-release/release-notes-generator';

const SCOPE = /^[a-z]+(?:\(([^)]+)\))?/i;

export function scopeOf(message) {
  return message.split('\n')[0].match(SCOPE)?.[1] || '';
}

export function filterCommits(commits, { include, exclude } = {}) {
  const keep = include && new Set(include);
  const drop = exclude && new Set(exclude);
  return commits.filter((c) => {
    const scope = scopeOf(c.message);
    if (drop?.has(scope)) return false;
    if (keep) return keep.has(scope);
    return true;
  });
}

function split(pluginConfig = {}, context) {
  const { include, exclude, analyzer: analyzerOpts, notes: notesOpts, ...shared } = pluginConfig;
  return {
    shared,
    analyzerOpts,
    notesOpts,
    context: { ...context, commits: filterCommits(context.commits, { include, exclude }) },
  };
}

export async function analyzeCommits(pluginConfig, context) {
  const s = split(pluginConfig, context);
  return analyzer.analyzeCommits({ ...s.shared, ...s.analyzerOpts }, s.context);
}

export async function generateNotes(pluginConfig, context) {
  const s = split(pluginConfig, context);
  return notes.generateNotes({ ...s.shared, ...s.notesOpts }, s.context);
}
