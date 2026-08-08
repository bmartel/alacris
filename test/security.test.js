// Security regression tests.
//
// This file installs a Trusted Types stub *before* importing the renderer, so
// it must stay its own file — `node --test` runs each file in its own process,
// which is what keeps the stub from leaking into the other suites.
import test from 'node:test';
import assert from 'node:assert/strict';

// ---- Trusted Types stub, installed before ../src/html.js is loaded ----
const created = [];
let policyName = null;
globalThis.trustedTypes = {
  createPolicy(name, rules) {
    policyName = name;
    return { createHTML: (s) => (created.push(s), rules.createHTML(s)) };
  },
};

const { html, render } = await import('../src/html.js');
const { store, unwrap } = await import('../src/store.js');
const { signal } = await import('../src/signal.js');

test('template parsing goes through a Trusted Types policy when one is enforced', () => {
  const el = document.createElement('div');
  render(html`<p class=${'x'}>${'hello'}</p>`, el);
  assert.equal(policyName, 'alacris');
  assert.equal(created.length, 1);
  assert.match(created[0], /<p /);
  assert.equal(el.querySelector('p').textContent, 'hello');
});

test('a value in a child position is text, never markup', () => {
  const el = document.createElement('div');
  const evil = '<img src=x onerror="window.__pwned = 1">';
  render(html`<p>${evil}</p>`, el);
  assert.equal(el.querySelector('img'), null);
  assert.equal(el.querySelector('p').textContent, evil);
  assert.equal(window.__pwned, undefined);
});

test('a reactive value stays text after an update', () => {
  const el = document.createElement('div');
  const v = signal('safe');
  render(html`<p>${v}</p>`, el);
  v('<script>window.__pwned = 1</script>');
  assert.equal(el.querySelector('script'), null);
  assert.equal(window.__pwned, undefined);
});

test('a value in an attribute position cannot break out of the attribute', () => {
  const el = document.createElement('div');
  const evil = '"><img src=x onerror="window.__pwned = 1">';
  render(html`<p title=${evil}></p>`, el);
  assert.equal(el.querySelector('img'), null);
  assert.equal(el.querySelector('p').getAttribute('title'), evil);
});

test('store: __proto__ reads as undefined; real prototype access still works', () => {
  const s = store({ a: 1 });
  assert.equal(s['__proto__'], undefined);
  assert.equal(Object.getPrototypeOf(s), Object.prototype);
  assert.ok(unwrap(s) instanceof Object);
});

test('store: assigning through __proto__ does not pollute Object.prototype', () => {
  const s = store({ profile: {} });
  // The classic two-key gadget: both keys attacker-controlled.
  const k1 = '__proto__', k2 = 'polluted';
  try {
    s[k1][k2] = 'yes';
  } catch {
    // throwing is also an acceptable outcome
  }
  assert.equal({}.polluted, undefined);
  delete Object.prototype.polluted;
});

test('store: an own __proto__ key from parsed JSON is dropped on merge', () => {
  const s = store({ name: 'a' });
  const json = JSON.parse('{"name":"b","__proto__":{"polluted":"yes"}}');
  Object.assign(s, json);
  assert.equal(s.name, 'b');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(unwrap(s)), Object.prototype);
});
