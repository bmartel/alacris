# Bundle size

Measured on the published `dist/` output.

| file | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `alacris.dev.js` | 31.66 KB | **9.04 KB** | 8.09 KB |
| `alacris.js` | 16.89 KB | **6.59 KB** | 5.98 KB |
| `context.js` | 0.91 KB | **0.54 KB** | 0.46 KB |
| `signal.js` | 2.34 KB | **1.03 KB** | 0.96 KB |
| `store.js` | 2.14 KB | **1.03 KB** | 0.95 KB |

- `alacris.js` — everything: signals, templates, custom elements.
- `signal.js` — the reactive core on its own.
- `alacris.dev.js` — unminified, for debugging.
