// Not shipped and not executed — `npm run typecheck` compiles it to prove the
// public types describe real usage. Anything that stops type-checking here is
// a breaking change to the API surface.
import { define, html, css, keyed, render, signal, computed, effect, batch } from '../types/index.js';

const count = signal(0);
const name = signal('alacris');
const double = computed(() => count() * 2);

count(1);
count.set(2);
count.update((n) => n + 1);
const peeked: number = count.peek();
const derived: number = double();

const stop = effect(() => {
  const label: string = name();
  console.log(label, derived, peeked);
  return () => console.log('cleanup');
});
stop();

batch(() => {
  count(10);
  name('bolt');
});

const items = signal<{ id: number; text: string }[]>([]);

const dispose = render(
  html`
    <ul class="list ${name}" ?hidden=${() => items().length === 0}>
      ${() => items().map((i) => keyed(i.id, html`<li>${i.text}</li>`))}
    </ul>
  `,
  document.body
);
dispose();

define('x-typed', {
  props: { label: 'hi', max: 3, open: false },
  styles: css`
    :host {
      display: block;
    }
  `,
  shadow: 'open',
  setup({ label, max, open }, host) {
    const room: number = max() - 1;
    open.set(true);
    host.emit('ready', { room });
    return html`<p @click=${() => host.emit('poke')}>${label} ${room}</p>`;
  },
});

define('x-plain', () => html`<p>no props</p>`);

define('x-form-field', {
  formAssociated: true,
  props: { value: '' },
  setup({ value }, host) {
    host.internals?.setFormValue(value());
    host.onFormAssociated = (form: HTMLFormElement | null) => void form;
    host.onFormDisabled = (disabled: boolean) => void disabled;
    host.onFormReset = () => value.set('');
    host.onFormStateRestore = (state, mode: 'restore' | 'autocomplete') => void [state, mode];
    return html`<input .value=${value} @input=${(e: Event) => value.set((e.target as HTMLInputElement).value)}>`;
  },
});

// --- each / store / context ------------------------------------------------
import { each } from '../types/index.js';
import { store, unwrap, update as mutate, selector } from '../types/store.js';
import { createContext, provide, consume } from '../types/context.js';

interface Row { id: number; label: string; done: boolean }

const state = store({ rows: [] as Row[], selected: -1 });
state.rows.push({ id: 1, label: 'a', done: false });
state.rows[0].label = 'b';
state.selected = 1;
const rawRows: Row[] = unwrap(state.rows);
mutate(state, (d) => { d.selected = 2; });

const isSelected = selector(() => state.selected);
const picked: boolean = isSelected(1);

const list = each(
  () => state.rows,
  (row, index) => {
    const label: string = row().label;
    const i: number = index();
    return html`<li class=${() => (isSelected(row().id) ? 'on' : '')}>${label}${i}</li>`;
  },
  (r) => r.id
);
render(list, document.body);

const ThemeCtx = createContext<'light' | 'dark'>('theme');
const stopProviding = provide(document.body, ThemeCtx, 'dark');
const theme = consume(document.body, ThemeCtx, 'light');
const t: 'light' | 'dark' = theme();
stopProviding();
console.log(rawRows.length, picked, t);

// --- styling ---------------------------------------------------------------
import { vars, adoptGlobal, type Styles } from '../types/index.js';

const reset = css`*, ::before, ::after { box-sizing: border-box }`;
const tokens = vars('btn', { bg: '#111', fg: '#fff', borderRadius: '8px' });
const bg: string = tokens.bg;
const contract: readonly string[] = tokens.names;

const buttonCss = css`
  ${reset}
  :host { background: ${tokens.bg}; color: ${tokens.fg}; border-radius: ${tokens.borderRadius} }
`;
const sheetText: string = buttonCss.text;
buttonCss.replace(':host { background: black }');

const many: Styles = [reset, buttonCss, 'p { margin: 0 }', null, false];

define('x-styled-typed', {
  props: { tone: 'red' },
  styles: many,
  setup: (p) =>
    html`<button
      part="control"
      class=${() => ({ tone: true, active: p.tone() === 'red' })}
      style=${() => ({ '--btn-bg': p.tone(), opacity: 1 })}
    >ok</button>`,
});

const untheme = adoptGlobal(css`:host { font-family: system-ui }`);
untheme();
console.log(bg, contract.length, sheetText.length);
