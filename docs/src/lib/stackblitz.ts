/**
 * Turns a demo into a StackBlitz project.
 *
 * There are two of them, because the two contexts have different constraints.
 *
 * - `embedProjectFor` runs *inside this page*. WebContainer-backed projects
 *   (`template: 'node'`) refuse to run in an iframe unless the embedding page
 *   is cross-origin isolated, and GitHub Pages cannot send the COOP/COEP
 *   headers that would make it so. The classic template has no such
 *   requirement, boots in a couple of seconds, and still installs `@alacris/core`
 *   from npm — which is all the embed needs to be.
 *
 * - `openProjectFor` runs on stackblitz.com, where isolation is a given. That
 *   one is a real Vite project with a package.json, so anything a visitor
 *   builds there can be forked, cloned, or copied into their own repo.
 *
 * Both run in the browser: no Node APIs here.
 */
import type { Project } from '@stackblitz/sdk';

/** The parts of a demo the playground needs. Kept structural so this module
 *  stays importable from client code without pulling in the demo sources. */
export interface PlaygroundDemo {
  id: string;
  title: string;
  blurb: string;
  code: string;
  markup: string;
}

export interface PlaygroundConfig {
  /** Semver range for the `@alacris/core` dependency, e.g. `^0.2.2`. */
  range: string;
  demos: PlaygroundDemo[];
}

/** The file the editor opens on, in both project shapes. */
export const EMBED_ENTRY = 'index.js';
export const VITE_ENTRY = 'main.js';

const STYLE = `:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #16161a;
  --muted: #6b6b76;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17181c;
    --fg: #e9e9ec;
    --muted: #9a9aa5;
  }
}

* { box-sizing: border-box }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

main {
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  display: grid;
  gap: 1.25rem;
  align-content: start;
}

h1 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.blurb {
  margin: -0.75rem 0 0;
  color: var(--muted);
}
`;

const body = (demo: PlaygroundDemo) => `    <main>
      <h1>${demo.title}</h1>
      <p class="blurb">${demo.blurb}</p>
      ${demo.markup}
    </main>`;

const README = (demo: PlaygroundDemo) => `# Alacris — ${demo.title}

${demo.blurb}

- \`${VITE_ENTRY}\` defines the component. Edit it and the preview reloads.
- \`index.html\` is where the tag is used.

Alacris needs no build step. Vite is here only so that \`import '@alacris/core'\`
resolves from \`node_modules\`; in a plain HTML page an import map does the same
job:

\`\`\`html
<script type="importmap">
  { "imports": { "@alacris/core": "https://esm.sh/@alacris/core@0.11.5" } }
</script>
<script type="module" src="./${VITE_ENTRY}"></script>
\`\`\`

Docs: https://bmartel.github.io/alacris/
`;

/**
 * The in-page embed. The classic template bundles `index.js` and injects it
 * into `index.html` itself, so there is no script tag and no package.json.
 */
export function embedProjectFor(demo: PlaygroundDemo, range: string): Project {
  return {
    title: `Alacris — ${demo.title}`,
    description: demo.blurb,
    template: 'javascript',
    dependencies: { '@alacris/core': range },
    // Reload rather than hot-replace. `customElements.define` throws if the
    // same tag name is registered twice, so re-evaluating the module in a page
    // that already ran it fails — on every save, and on every example switch.
    settings: { compile: { trigger: 'auto', action: 'refresh', clearConsole: true } },
    files: {
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Alacris — ${demo.title}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
${body(demo)}
  </body>
</html>
`,
      [EMBED_ENTRY]: demo.code.trim() + '\n',
      'style.css': STYLE,
    },
  };
}

/** The take-it-with-you version, opened in a tab on stackblitz.com. */
export function openProjectFor(demo: PlaygroundDemo, range: string): Project {
  return {
    title: `Alacris — ${demo.title}`,
    description: demo.blurb,
    // WebContainers. Dependencies come from the package.json below, not from
    // the SDK's `dependencies` field, which this template ignores.
    template: 'node',
    files: {
      'package.json':
        JSON.stringify(
          {
            name: `alacris-${demo.id}`,
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: { '@alacris/core': range },
            devDependencies: { vite: '^8.0.0' },
          },
          null,
          2
        ) + '\n',
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Alacris — ${demo.title}</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
${body(demo)}
    <script type="module" src="/${VITE_ENTRY}"></script>
  </body>
</html>
`,
      [VITE_ENTRY]: demo.code.trim() + '\n',
      'style.css': STYLE,
      'README.md': README(demo),
    },
  };
}
