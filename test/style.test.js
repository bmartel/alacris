import test from 'node:test';
import assert from 'node:assert/strict';
import { css, vars, adoptGlobal } from '../src/style.js';
import { define } from '../src/define.js';
import { html, render } from '../src/html.js';
import { signal } from '../src/signal.js';

let n = 0;
const tag = () => `s-t${n++}`;
const mount = (el) => (document.body.append(el), el);

/* ------------------------------------------------------------------ css */

test('identical CSS is interned, so it parses once', () => {
  const a = css`:host { display: block }`;
  const b = css`:host { display: block }`;
  assert.equal(a, b, 'same text must return the same Sheet');
  assert.equal(a.sheet, b.sheet, 'and therefore the same CSSStyleSheet');
});

test('css composes by inlining, not by re-parsing', () => {
  const reset = css`* { box-sizing: border-box }`;
  const base = css`${reset} :host { display: block }`;
  assert.match(String(base), /box-sizing: border-box/);
  assert.match(String(base), /display: block/);
  // Composing does not disturb the original.
  assert.equal(String(reset), '* { box-sizing: border-box }');
});

test('interpolated values are stringified, nullish ones dropped', () => {
  const color = '#111';
  const sheet = css`:host { color: ${color}; border: ${null}; outline: ${false} }`;
  assert.match(String(sheet), /color: #111/);
  assert.match(String(sheet), /border: ;/);
});

test('a Sheet can be rewritten in place for every adopter at once', () => {
  const sheet = css`:host { color: red }`;
  const constructed = sheet.sheet;
  sheet.replace(':host { color: blue }');
  assert.match(String(sheet), /blue/);
  assert.equal(sheet.sheet, constructed, 'the same CSSStyleSheet object is reused');
});

/* ---------------------------------------------------------------- styles */

test('a component adopts its stylesheet', () => {
  const t = tag();
  define(t, { styles: css`:host { display: block }`, setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));
  assert.equal(el.shadowRoot.adoptedStyleSheets.length, 1);
});

test('every instance shares one stylesheet', () => {
  const t = tag();
  define(t, { styles: css`:host { color: red }`, setup: () => html`<p>x</p>` });
  const a = mount(document.createElement(t));
  const b = mount(document.createElement(t));
  assert.equal(a.shadowRoot.adoptedStyleSheets[0], b.shadowRoot.adoptedStyleSheets[0]);
});

test('two components sharing CSS share the parsed sheet', () => {
  const shared = css`:host { font: inherit }`;
  const t1 = tag();
  const t2 = tag();
  define(t1, { styles: shared, setup: () => html`<p>a</p>` });
  define(t2, { styles: shared, setup: () => html`<p>b</p>` });
  const a = mount(document.createElement(t1));
  const b = mount(document.createElement(t2));
  assert.equal(a.shadowRoot.adoptedStyleSheets[0], b.shadowRoot.adoptedStyleSheets[0]);
});

test('styles accepts an array, in order', () => {
  const reset = css`* { margin: 0 }`;
  const own = css`:host { display: grid }`;
  const t = tag();
  define(t, { styles: [reset, own], setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));
  const sheets = el.shadowRoot.adoptedStyleSheets;
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0], reset.sheet);
  assert.equal(sheets[1], own.sheet);
});

test('a plain CSS string still works', () => {
  const t = tag();
  define(t, { styles: 'p { color: red }', setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));
  assert.equal(el.shadowRoot.adoptedStyleSheets.length, 1);
});

test('nested arrays and empty slots are ignored', () => {
  const a = css`:host { color: red }`;
  const t = tag();
  define(t, { styles: [a, null, [false, undefined]], setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));
  assert.equal(el.shadowRoot.adoptedStyleSheets.length, 1);
});

/* ------------------------------------------------------------ adoptGlobal */

test('adoptGlobal reaches components that already exist', () => {
  const t = tag();
  define(t, { styles: css`:host { color: red }`, setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));
  assert.equal(el.shadowRoot.adoptedStyleSheets.length, 1);

  const theme = css`:host { color: rebeccapurple }`;
  const remove = adoptGlobal(theme);

  const sheets = el.shadowRoot.adoptedStyleSheets;
  assert.equal(sheets.length, 2);
  assert.equal(sheets[1], theme.sheet, 'a theme goes on last, so it wins ties');

  remove();
  assert.equal(el.shadowRoot.adoptedStyleSheets.length, 1);
});

test('adoptGlobal reaches components created afterwards', () => {
  const theme = css`:host { letter-spacing: 0.01em }`;
  const remove = adoptGlobal(theme);
  const t = tag();
  define(t, { styles: css`:host { display: block }`, setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));

  const sheets = el.shadowRoot.adoptedStyleSheets;
  assert.equal(sheets.length, 2);
  assert.equal(sheets[1], theme.sheet, 'theme last');
  remove();
  assert.equal(el.shadowRoot.adoptedStyleSheets.length, 1);
});

test('a component with no styles of its own still receives the theme', () => {
  const theme = css`:host { color: teal }`;
  const remove = adoptGlobal(theme);
  const t = tag();
  define(t, { setup: () => html`<p>x</p>` });
  const el = mount(document.createElement(t));
  assert.deepEqual([...el.shadowRoot.adoptedStyleSheets], [theme.sheet]);
  remove();
});

/* ------------------------------------------------------------------ vars */

test('vars builds var() references with inline defaults', () => {
  const t = vars('btn', { bg: '#111', fg: '#fff', borderRadius: '8px' });
  assert.equal(t.bg, 'var(--btn-bg, #111)');
  assert.equal(t.fg, 'var(--btn-fg, #fff)');
  assert.equal(t.borderRadius, 'var(--btn-border-radius, 8px)', 'camelCase becomes kebab-case');
});

test('vars exposes the contract without polluting the tokens', () => {
  const t = vars('card', { bg: 'white', pad: '1rem' });
  assert.deepEqual(t.names, ['--card-bg', '--card-pad']);
  assert.equal(t.prefix, 'card');
  assert.deepEqual(Object.keys(t), ['bg', 'pad'], 'names/prefix are not enumerable');
});

test('vars drops straight into a css template', () => {
  const t = vars('btn', { bg: '#111' });
  const sheet = css`:host { background: ${t.bg} }`;
  assert.equal(String(sheet), ':host { background: var(--btn-bg, #111) }');
});

/* -------------------------------------------------- style / class bindings */

test('class accepts an object', () => {
  const el = document.createElement('div');
  const on = signal(true);
  render(html`<p class=${() => ({ base: true, active: on(), off: false })}></p>`, el);
  assert.equal(el.querySelector('p').getAttribute('class'), 'base active');
  on(false);
  assert.equal(el.querySelector('p').getAttribute('class'), 'base');
});

test('class accepts an array, nested and sparse', () => {
  const el = document.createElement('div');
  render(html`<p class=${['a', null, ['b', { c: true, d: false }]]}></p>`, el);
  assert.equal(el.querySelector('p').getAttribute('class'), 'a b c');
});

test('an empty class removes the attribute', () => {
  const el = document.createElement('div');
  const on = signal(true);
  render(html`<p class=${() => ({ a: on() })}></p>`, el);
  assert.equal(el.querySelector('p').getAttribute('class'), 'a');
  on(false);
  assert.equal(el.querySelector('p').hasAttribute('class'), false);
});

test('style accepts an object, including custom properties', () => {
  const el = document.createElement('div');
  const c = signal('red');
  render(html`<p style=${() => ({ color: c(), '--tone': c() })}></p>`, el);
  const p = el.querySelector('p');
  assert.equal(p.style.color, 'red');
  assert.equal(p.style.getPropertyValue('--tone'), 'red');
  c('blue');
  assert.equal(p.style.color, 'blue');
  assert.equal(p.style.getPropertyValue('--tone'), 'blue');
});

test('a key dropped from the style object is cleared', () => {
  const el = document.createElement('div');
  const wide = signal(true);
  render(html`<p style=${() => (wide() ? { color: 'red', width: '10px' } : { color: 'red' })}></p>`, el);
  const p = el.querySelector('p');
  assert.equal(p.style.width, '10px');
  wide(false);
  assert.equal(p.style.width, '', 'the removed key must not stick');
  assert.equal(p.style.color, 'red');
});

test('a style string still works', () => {
  const el = document.createElement('div');
  const s = signal('color: red');
  render(html`<p style=${s}></p>`, el);
  assert.equal(el.querySelector('p').getAttribute('style'), 'color: red');
  s(null);
  assert.equal(el.querySelector('p').hasAttribute('style'), false);
});

test('a component sets its own theme properties from a signal', () => {
  const t = tag();
  define(t, {
    props: { tone: 'red' },
    styles: css`:host { color: var(--tone-color, black) }`,
    setup: (p) => html`<i style=${() => ({ '--tone-color': p.tone() })}>x</i>`,
  });
  const el = mount(document.createElement(t));
  const i = el.shadowRoot.querySelector('i');
  assert.equal(i.style.getPropertyValue('--tone-color'), 'red');
  el.tone = 'blue';
  assert.equal(i.style.getPropertyValue('--tone-color'), 'blue');
});
