# Bundle size

Measured on the published `dist/` output.

| file | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `alacris.dev.js` | 32.07 KB | **9.18 KB** | 8.21 KB |
| `alacris.js` | 17.17 KB | **6.69 KB** | 6.09 KB |
| `context.js` | 0.91 KB | **0.54 KB** | 0.46 KB |
| `signal.js` | 2.34 KB | **1.03 KB** | 0.96 KB |
| `store.js` | 2.14 KB | **1.03 KB** | 0.95 KB |

- `alacris.js` — everything: signals, templates, custom elements.
- `signal.js` — the reactive core on its own.
- `alacris.dev.js` — unminified, for debugging.
