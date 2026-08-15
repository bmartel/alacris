// Keep the two npm packages in this repo from releasing each other.
//
// The library and @alacris/ui share a git history. Without a filter, a
// `feat(ui):` commit would bump `@alacris/core`, and a `feat(html):` commit would
// bump `@alacris/ui`. Each pipeline loads this plugin first and keeps only the
// commits that belong to it.
//
//   { exclude: ['ui', 'starter'] }   — library release
//   { include: ['ui', 'starter'] }   — UI release (`starter` is the legacy scope)

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

function apply(pluginConfig, context) {
  context.commits = filterCommits(context.commits, pluginConfig);
}

export async function analyzeCommits(pluginConfig, context) {
  apply(pluginConfig, context);
}

export async function generateNotes(pluginConfig, context) {
  apply(pluginConfig, context);
}
