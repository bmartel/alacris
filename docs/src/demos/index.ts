/**
 * The catalogue of runnable examples.
 *
 * One entry per demo, holding the module source and the markup it renders
 * into. Everything that needs an example reads it from here — the `<Demo>`
 * blocks in the guides, the playground picker, and the StackBlitz project
 * builder — so a demo is described in exactly one place.
 */
import counter from './counter.js?raw';
import signals from './signals.js?raw';
import todos from './todos.js?raw';
import store from './store.js?raw';
import context from './context.js?raw';
import theming from './theming.js?raw';

export interface DemoSpec {
  /** Stable id. Used as the `?demo=` value on the playground page. */
  id: string;
  /** Label in the playground picker. */
  title: string;
  /** One line describing what the example is showing. */
  blurb: string;
  /** The module source, executed on the page and shipped to StackBlitz. */
  code: string;
  /** The markup the demo renders into. */
  markup: string;
}

export const demos: DemoSpec[] = [
  {
    id: 'counter',
    title: 'Counter',
    blurb: 'Attributes as props, one signal, two event bindings.',
    code: counter,
    markup: '<demo-counter start="3" step="1"></demo-counter>',
  },
  {
    id: 'signals',
    title: 'Computed',
    blurb: 'Derived values that recalculate only when something reads them.',
    code: signals,
    markup: '<demo-signals></demo-signals>',
  },
  {
    id: 'todos',
    title: 'Keyed list',
    blurb: 'each() moves the existing nodes instead of rebuilding the list.',
    code: todos,
    markup: '<demo-todos></demo-todos>',
  },
  {
    id: 'store',
    title: 'Store',
    blurb: 'A deep reactive object, with per-row subscriptions.',
    code: store,
    markup: '<demo-store></demo-store>',
  },
  {
    id: 'context',
    title: 'Context',
    blurb: 'A value read three levels down without being passed as a prop.',
    code: context,
    markup: '<demo-provider></demo-provider>',
  },
  {
    id: 'theming',
    title: 'Theming',
    blurb: 'Custom properties and ::part, so a consumer can restyle it.',
    code: theming,
    markup:
      '<demo-chip>default</demo-chip><demo-chip tone="warn">warn</demo-chip><demo-chip tone="ok">ok</demo-chip><demo-theme-switch></demo-theme-switch>',
  },
];

const byId = new Map(demos.map((d) => [d.id, d]));

export function getDemo(id: string): DemoSpec {
  const demo = byId.get(id);
  if (!demo) {
    throw new Error(
      `Unknown demo "${id}". Known demos: ${demos.map((d) => d.id).join(', ')}.`
    );
  }
  return demo;
}
