import {
  define, html, css, vars, adoptGlobal,
  signal, computed, effect, batch, each,
} from '@alacris/core';
import { store, selector } from '@alacris/core/store';
import { createContext, provide, consume } from '@alacris/core/context';

const base = css`
  :host { display: block; font: inherit; color: inherit; }
  button { font: inherit; padding: .45rem .85rem; border-radius: 8px; cursor: pointer;
           border: 1px solid var(--line, #ddd); background: transparent; color: inherit; }
  button:hover { border-color: var(--acc, #f5b719); }
  input[type=text] { font: inherit; padding: .4rem .65rem; border-radius: 8px;
                     border: 1px solid var(--line, #ddd); background: transparent; color: inherit; }
`;

/* ------------------------------------------------------------------ counter */
define('ala-counter', {
  props: { start: 0, step: 1 },
  styles: [base, css`
    .row { display: flex; align-items: center; gap: .75rem; }
    output { font-variant-numeric: tabular-nums; font-size: 1.6rem; min-width: 3.5ch; }
    .note { color: var(--mut, #888); font-size: .85rem; }
  `],
  setup({ start, step }, host) {
    const n = signal(start());
    const doubled = computed(() => n() * 2);
    // Follow the `start` prop whenever it changes from the outside world.
    effect(() => n(start()));

    return html`
      <div class="row">
        <button @click=${() => n(n() - step())} aria-label="decrement">−</button>
        <output>${n}</output>
        <button @click=${() => n(n() + step())} aria-label="increment">+</button>
        <button @click=${() => { n(start()); host.emit('reset', { to: start() }); }}>reset</button>
        <span class="note">doubled: ${doubled}</span>
      </div>`;
  },
});

/* ---------------------------------------------------------- nested roster */
define('ala-tag', {
  props: { label: '', count: 0 },
  styles: css`
    :host {
      display: inline-flex; align-items: center; gap: .35rem;
      font-size: .78rem; padding: .12rem .5rem; border-radius: 999px;
      border: 1px solid var(--line, #ddd); color: var(--mut, #888);
    }
    b { font-variant-numeric: tabular-nums; font-weight: 650; color: inherit; }
  `,
  setup: ({ label, count }) => html`<span>${label}</span> <b>${count}</b>`,
});

define('ala-person', {
  props: { person: null, displayName: '', highlight: false },
  styles: css`
    :host { display: block; }
    article {
      display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
      padding: .55rem .7rem; border-radius: 10px;
      border: 1px solid var(--line, #eee);
    }
    article.on { border-color: var(--acc, #f5b719); background: color-mix(in srgb, var(--acc, #f5b719) 12%, transparent); }
    strong { flex: 1; min-width: 8rem; }
    .role { color: var(--mut, #888); font-size: .85rem; }
  `,
  setup: ({ person, displayName, highlight }, host) => html`
    <article class=${() => (highlight() ? 'on' : '')} @click=${() => host.emit('pick', { id: person()?.id })}>
      <strong>${displayName}</strong>
      <span class="role">${() => person()?.role}</span>
      <ala-tag label="tags" count=${() => person()?.tags ?? 0}></ala-tag>
    </article>`,
});

define('ala-roster', {
  styles: [base, css`
    .tools { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; margin-bottom: .85rem; }
    .list { display: grid; gap: .4rem; }
    .hint { color: var(--mut, #888); font-size: .85rem; margin: .75rem 0 0; }
  `],
  setup() {
    const people = signal([
      { id: 1, name: 'Ada Lovelace', role: 'mathematician', tags: 3 },
      { id: 2, name: 'Grace Hopper', role: 'rear admiral', tags: 5 },
      { id: 3, name: 'Katherine Johnson', role: 'orbital mechanic', tags: 4 },
    ]);
    const selected = signal(1);
    const draft = computed(() => people().find((p) => p.id === selected())?.name ?? '');

    const rename = (name) => {
      people(people().map((p) => (p.id === selected() ? { ...p, name } : p)));
    };
    const bumpTags = () => {
      people(people().map((p) => (p.id === selected() ? { ...p, tags: p.tags + 1 } : p)));
    };
    const cycleRole = () => {
      const roles = ['mathematician', 'rear admiral', 'orbital mechanic', 'compiler author'];
      people(people().map((p) => {
        if (p.id !== selected()) return p;
        return { ...p, role: roles[(roles.indexOf(p.role) + 1) % roles.length] };
      }));
    };

    return html`
      <div class="tools">
        <input type="text" aria-label="rename selected"
               .value=${draft}
               @input=${(e) => rename(e.target.value)}>
        <button type="button" @click=${cycleRole}>cycle role</button>
        <button type="button" @click=${bumpTags}>+1 tag on selected</button>
      </div>
      <div class="list">
        ${each(
          people,
          (p) => html`<ala-person
            person=${p}
            displayName=${() => p().name}
            highlight=${() => selected() === p().id}
            @pick=${(e) => selected(e.detail.id)}
          ></ala-person>`,
          (p) => p.id,
        )}
      </div>
      <p class="hint">
        Selected id ${selected}. The child reads an object prop and a camelCase
        string prop — both stay live when the parent writes.
      </p>`;
  },
});

/* -------------------------------------------------------------------- todos */
let uid = 3;
define('ala-todos', {
  styles: [base, css`
    form { display: flex; gap: .5rem; margin-bottom: 1rem; }
    input[type=text] { flex: 1; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: flex; align-items: center; gap: .6rem; padding: .35rem 0;
         border-bottom: 1px solid var(--line, #eee); }
    li:last-child { border-bottom: 0; }
    .txt { flex: 1; }
    li.done .txt { text-decoration: line-through; opacity: .45; }
    .x { border: 0; background: none; color: var(--mut, #888); cursor: pointer; font-size: 1.1rem; padding: 0 .3rem; }
    .bar { display: flex; justify-content: space-between; color: var(--mut, #888);
           font-size: .85rem; margin-top: .9rem; gap: .5rem; flex-wrap: wrap; }
  `],
  setup() {
    const items = signal([
      { id: 1, text: 'Read the source', done: true },
      { id: 2, text: 'Drop it into a page', done: false },
      { id: 3, text: 'Ship it', done: false },
    ]);
    const draft = signal('');
    const left = computed(() => items().filter((t) => !t.done).length);

    const add = (e) => {
      e.preventDefault();
      const text = draft().trim();
      if (!text) return;
      batch(() => {
        items([...items(), { id: ++uid, text, done: false }]);
        draft('');
      });
    };
    const toggle = (id) => items(items().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const remove = (id) => items(items().filter((t) => t.id !== id));
    const shuffle = () => items([...items()].sort(() => Math.random() - .5));

    return html`
      <form @submit=${add}>
        <input type="text" placeholder="What needs doing?"
               .value=${draft} @input=${(e) => draft(e.target.value)}>
        <button type="submit">add</button>
        <button type="button" @click=${shuffle}>shuffle</button>
      </form>
      <ul>
        ${each(
          items,
          (t) => html`
            <li class=${() => (t().done ? 'done' : '')}>
              <input type="checkbox" .checked=${() => t().done} @change=${() => toggle(t().id)}>
              <span class="txt">${() => t().text}</span>
              <button class="x" title="remove" @click=${() => remove(t().id)}>×</button>
            </li>`,
          (t) => t.id,
        )}
      </ul>
      <div class="bar">
        <span>${left} left</span>
        <span>${() => items().length} total · shuffle moves the existing nodes</span>
      </div>`;
  },
});

/* -------------------------------------------------------------------- store */
define('ala-store', {
  styles: [base, css`
    table { border-collapse: collapse; width: 100%; }
    td { padding: .35rem .5rem; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
    tr.on { background: color-mix(in srgb, var(--acc, #f5b719) 16%, transparent); }
    .n { opacity: .5; width: 2rem; font-variant-numeric: tabular-nums; }
    .ctl { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; }
    .note { color: var(--mut, #888); font-size: .85rem; margin: .7rem 0 0; }
  `],
  setup() {
    const state = store({
      rows: [
        { id: 1, label: 'alpha' },
        { id: 2, label: 'bravo' },
        { id: 3, label: 'charlie' },
      ],
      selected: -1,
    });
    const isSelected = selector(() => state.selected);

    return html`
      <table>
        <tbody>
          ${each(
            () => state.rows,
            (row) => html`
              <tr class=${() => (isSelected(row().id) ? 'on' : '')}>
                <td class="n">${() => row().id}</td>
                <td>${() => row().label}</td>
                <td><button @click=${() => (state.selected = row().id)}>select</button></td>
              </tr>`,
            (row) => row.id,
          )}
        </tbody>
      </table>
      <div class="ctl">
        <button @click=${() => { state.rows[1].label += '!'; }}>rename row 2</button>
        <button @click=${() => state.rows.push({ id: state.rows.length + 1, label: 'row ' + (state.rows.length + 1) })}>add a row</button>
        <button @click=${() => (state.selected = -1)}>clear selection</button>
      </div>
      <p class="note">Renaming row 2 writes to one text node. The other rows are not consulted.</p>`;
  },
});

/* ------------------------------------------------------------------ context */
const Theme = createContext('demo-theme');

define('ala-leaf', {
  styles: css`
    :host { display: inline-block; padding: .35rem .7rem; border-radius: 8px;
            border: 1px solid currentColor; font: inherit; font-size: .9rem; }
    :host([data-theme='dark']) { background: #22222a; color: #f2f2f5; }
  `,
  setup(_p, host) {
    const theme = consume(host, Theme, 'light');
    return html`<span ref=${() => queueMicrotask(() => host.setAttribute('data-theme', theme()))}
      >theme is ${theme}</span>`;
  },
});

define('ala-middle', {
  styles: css`:host { display: block; padding-left: 1rem; border-left: 2px solid currentColor; }`,
  setup: () => html`<p style="margin:.25rem 0;opacity:.8">a component that knows nothing about themes</p>
    <ala-leaf></ala-leaf>`,
});

define('ala-provider', {
  styles: [base, css`button { justify-self: start; }`],
  setup(_p, host) {
    const theme = signal('light');
    provide(host, Theme, theme);
    return html`
      <button @click=${() => theme(theme() === 'light' ? 'dark' : 'light')}>
        toggle theme (currently ${theme})
      </button>
      <ala-middle></ala-middle>`;
  },
});

/* ----------------------------------------------------------------- styling */
const chip = vars('chip', {
  bg: '#eceef3',
  fg: '#16161a',
  dot: '#8a8a99',
  radius: '999px',
});

define('ala-chip', {
  props: { tone: '' },
  styles: css`
    :host {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .3rem .75rem; margin: 0 .35rem .35rem 0;
      background: ${chip.bg}; color: ${chip.fg};
      border-radius: ${chip.radius};
      font: inherit; font-size: .85rem;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: ${chip.dot}; }
  `,
  setup: (p) => html`
    <span class="dot" part="dot" style=${() => ({
      '--chip-dot': p.tone() === 'warn' ? '#e8a33d' : p.tone() === 'ok' ? '#3da35d' : '',
    })}></span>
    <slot></slot>`,
});

const THEME = css`
  :host { --chip-bg: #22222a; --chip-fg: #f2f2f5; --chip-radius: 6px }
`;
let dropTheme = null;
let partSheet = null;

document.getElementById('thm').onclick = () => {
  dropTheme ? (dropTheme(), (dropTheme = null)) : (dropTheme = adoptGlobal(THEME));
};
document.getElementById('prt').onclick = () => {
  if (partSheet) { partSheet.remove(); partSheet = null; return; }
  partSheet = document.createElement('style');
  partSheet.textContent = 'ala-chip::part(dot) { width: 16px; height: 16px }';
  document.head.append(partSheet);
};
document.getElementById('rst').onclick = () => {
  if (dropTheme) { dropTheme(); dropTheme = null; }
  if (partSheet) { partSheet.remove(); partSheet = null; }
};

/* --------------------------------------------------------------- benchmark */
const words = ['bright', 'quiet', 'amber', 'brisk', 'hollow', 'iron', 'lucid', 'nimble', 'raw', 'swift'];
const make = (n) => Array.from({ length: n }, (_, i) => ({
  id: i + 1,
  label: `${words[i % words.length]} ${i + 1}`,
}));

define('ala-bench', {
  styles: [base, css`
    .ctl { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; margin-bottom: .9rem; }
    .ms { color: var(--mut, #888); font-size: .85rem; font-variant-numeric: tabular-nums; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); gap: .15rem .8rem;
            max-height: 14rem; overflow: auto; font-size: .8rem;
            border-top: 1px solid var(--line, #eee); padding-top: .7rem; }
    .hit { color: var(--acc, #f5b719); }
  `],
  setup() {
    const rows = signal(make(1000));
    const ms = signal('');
    const time = (name, fn) => {
      const t0 = performance.now();
      fn();
      ms(`${name}: ${(performance.now() - t0).toFixed(1)} ms`);
    };

    return html`
      <div class="ctl">
        <button @click=${() => time('create 1k', () => rows(make(1000)))}>create 1k</button>
        <button @click=${() => time('update every 10th', () =>
          rows(rows().map((r, i) => (i % 10 ? r : { ...r, label: r.label + ' !!!' }))))}>update every 10th</button>
        <button @click=${() => time('swap rows', () => {
          const next = rows().slice();
          if (next.length > 998) { const t = next[1]; next[1] = next[998]; next[998] = t; }
          rows(next);
        })}>swap</button>
        <button @click=${() => time('reverse', () => rows(rows().slice().reverse()))}>reverse</button>
        <button @click=${() => time('clear', () => rows([]))}>clear</button>
        <span class="ms">${ms}</span>
      </div>
      <div class="grid">
        ${each(
          rows,
          (r) => html`<div class=${() => (r().label.endsWith('!!!') ? 'hit' : '')}>${() => r().label}</div>`,
          (r) => r.id,
        )}
      </div>`;
  },
});

/* ----------------------------------------------------------------- interop */
document.getElementById('poke').addEventListener('click', () => {
  document.getElementById('remote').start += 10;
});
document.getElementById('remote').addEventListener('reset', (e) => {
  console.log('reset to', e.detail.to);
});
