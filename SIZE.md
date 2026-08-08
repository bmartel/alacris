# Bundle size

Measured on the published `dist/` output.

| file | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `alacris.dev.js` | 24.19 KB | **6.91 KB** | 6.23 KB |
| `alacris.js` | 12.95 KB | **5.15 KB** | 4.70 KB |
| `context.js` | 0.91 KB | **0.54 KB** | 0.46 KB |
| `signal.js` | 2.25 KB | **0.97 KB** | 0.92 KB |
| `store.js` | 1.99 KB | **0.98 KB** | 0.91 KB |

- `alacris.js` — everything: signals, templates, custom elements.
- `signal.js` — the reactive core on its own.
- `alacris.dev.js` — unminified, for debugging.
