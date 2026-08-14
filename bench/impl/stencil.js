import { forceUpdate, setPlatformHelpers } from '@stencil/core/internal/client';
import { buildData } from '../data.js';

// Side-effect: the compiled module registers <bench-stencil>.
import './stencil-app.js';

// Stencil's write queue is rAF by default; the harness times a synchronous
// window, same as React's flushSync / Lit's performUpdate. Initial load still
// goes through queueMicrotask — that is patched around append, below.
setPlatformHelpers({ raf: (cb) => cb(performance.now()) });

function flush(el) {
  forceUpdate(el);
}

export default function stencil(container) {
  const el = document.createElement('bench-stencil');
  const qm = queueMicrotask;
  queueMicrotask = (cb) => cb();
  try {
    container.append(el);
  } finally {
    queueMicrotask = qm;
  }

  return {
    create(n) { el.rows = buildData(n); el.selected = -1; flush(el); },
    append(n) { el.rows = el.rows.concat(buildData(n)); flush(el); },
    update() {
      const rows = el.rows.slice();
      for (let i = 0; i < rows.length; i += 10) {
        rows[i] = { ...rows[i], label: rows[i].label + ' !!!' };
      }
      el.rows = rows;
      flush(el);
    },
    select(i) { const r = el.rows[i]; if (r) { el.selected = r.id; flush(el); } },
    swap() {
      if (el.rows.length < 999) return;
      const rows = el.rows.slice();
      [rows[1], rows[998]] = [rows[998], rows[1]];
      el.rows = rows;
      flush(el);
    },
    remove(i) { const rows = el.rows.slice(); rows.splice(i, 1); el.rows = rows; flush(el); },
    clear() { el.rows = []; el.selected = -1; flush(el); },
    count: () => container.querySelectorAll('tbody > tr').length,
    firstLabel: () => container.querySelector('.lbl')?.textContent ?? '',
    dispose: () => el.remove(),
  };
}
