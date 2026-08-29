// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const REPO = 'https://github.com/bmartel/alacris';

// GitHub Pages serves a project site from /<repo>/, so every asset and link has
// to be built with that prefix. `base` is what makes the deployed site work.
const BASE = '/alacris';

export default defineConfig({
  site: 'https://bmartel.github.io',
  base: BASE,

  redirects: {
    '/start/ui-starter': '/ui/getting-started/',
  },

  // src/lib/version.ts imports the repo's package.json, which sits above the
  // docs root. Vite refuses to serve outside its root in dev without this.
  vite: { server: { fs: { allow: ['..'] } } },

  integrations: [
    starlight({
      title: 'Alacris',
      description:
        'Web components with signals and fine-grained DOM updates, in 5.9 kB. ESM-only, zero dependencies, no build step.',
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: REPO }],
      editLink: { baseUrl: `${REPO}/edit/main/docs/` },
      lastUpdated: true,
      customCss: ['./src/styles/docs.css'],

      head: [
        // Every runnable example on this site imports the real published
        // bundle under its real specifier, so the code you read is the code
        // you can paste into your own project unchanged.
        {
          tag: 'script',
          attrs: { type: 'importmap' },
          content: JSON.stringify({
            imports: {
              '@alacris/core': `${BASE}/lib/alacris.js`,
              '@alacris/core/store': `${BASE}/lib/store.js`,
              '@alacris/core/context': `${BASE}/lib/context.js`,
              '@alacris/core/signal': `${BASE}/lib/signal.js`,
            },
          }),
        },
      ],

      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'What is Alacris?', slug: 'start/what-is-alacris' },
            { label: 'Installation', slug: 'start/installation' },
            { label: 'Your first component', slug: 'start/first-component' },
            { label: 'Playground', slug: 'playground', badge: 'Live' },
          ],
        },
        {
          label: 'Alacris UI',
          items: [
            { label: 'Component catalog', link: '/ui/', badge: 'Live' },
            { label: 'Getting started', slug: 'ui/getting-started' },
            { label: 'Components reference', slug: 'ui/components' },
            { label: 'Using it from a framework', slug: 'ui/frameworks' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Signals', slug: 'guides/signals' },
            { label: 'Templates', slug: 'guides/templates' },
            { label: 'Lists', slug: 'guides/lists' },
            { label: 'Components', slug: 'guides/components' },
            { label: 'Styling', slug: 'guides/styling' },
            { label: 'Theming for consumers', slug: 'guides/theming' },
            { label: 'State that scales', slug: 'guides/state' },
            { label: 'Context', slug: 'guides/context' },
            { label: 'Using it from a framework', slug: 'guides/frameworks' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API', slug: 'reference/api' },
            { label: 'Template syntax', slug: 'reference/template-syntax' },
            { label: 'Performance', slug: 'reference/performance' },
            { label: 'Security', slug: 'reference/security' },
            { label: 'Limitations', slug: 'reference/limitations' },
            { label: 'AI agents', slug: 'reference/agents' },
          ],
        },
      ],
    }),
  ],
});
