# Bundle size

Measured on the published `dist/` output.

| file | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `alacris.dev.js` | 30.49 KB | **8.71 KB** | 7.80 KB |
| `alacris.js` | 16.14 KB | **6.30 KB** | 5.74 KB |
| `context.js` | 0.91 KB | **0.54 KB** | 0.46 KB |
| `signal.js` | 2.25 KB | **0.97 KB** | 0.92 KB |
| `store.js` | 2.04 KB | **0.99 KB** | 0.92 KB |

- `alacris.js` — everything: signals, templates, custom elements.
- `signal.js` — the reactive core on its own.
- `alacris.dev.js` — unminified, for debugging.
