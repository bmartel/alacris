// Smoke tests for the data-display family:
// ui-avatar, ui-badge, ui-divider, ui-list(-item), ui-table, ui-tooltip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick, fire } from './helpers.js';

const key = (el, k) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

import '../src/components/ui-avatar.js';
import '../src/components/ui-badge.js';
import '../src/components/ui-divider.js';
import '../src/components/ui-list.js';
import '../src/components/ui-list-item.js';
import '../src/components/ui-table.js';
import '../src/components/ui-tooltip.js';
import '../src/components/ui-carousel.js';
import '../src/components/ui-carousel-item.js';

test('ui-avatar renders initials from name and labels itself', async () => {
  const el = mount('<ui-avatar name="Ada Lovelace"></ui-avatar>');
  await tick();
  const initials = el.shadowRoot.querySelector('.initials');
  assert.ok(initials, 'initials fallback renders without src');
  assert.equal(initials.textContent, 'AL');
  assert.equal(el.getAttribute('role'), 'img');
  assert.equal(el.getAttribute('aria-label'), 'Ada Lovelace');
  el.name = 'Grace';
  assert.equal(initials.textContent, 'G', 'single word gives one initial');
  el.label = 'Rear Admiral Grace Hopper';
  assert.equal(el.getAttribute('aria-label'), 'Rear Admiral Grace Hopper');
  unmountAll();
});

test('ui-avatar falls back to the icon, and size sets the host property', async () => {
  const el = mount('<ui-avatar icon="person" size="56px"></ui-avatar>');
  await tick();
  assert.ok(el.shadowRoot.querySelector('ui-icon'), 'icon fallback when no name');
  assert.equal(el.getAttribute('aria-hidden'), 'true', 'unlabeled avatar is decorative');
  assert.equal(el.style.getPropertyValue('--ui-avatar-size'), '56px');
  el.size = '';
  assert.equal(el.style.getPropertyValue('--ui-avatar-size'), '');
  unmountAll();
});

test('ui-badge shows the count, overflows at max, and hides', async () => {
  const el = mount('<ui-badge value="3" label="3 unread"><button>Inbox</button></ui-badge>');
  await tick();
  const badge = el.shadowRoot.querySelector('.badge');
  assert.ok(badge, 'badge renders for a non-zero value');
  assert.equal(badge.textContent, '3');
  assert.equal(badge.getAttribute('aria-label'), '3 unread');
  el.value = 1287;
  assert.equal(el.shadowRoot.querySelector('.badge').textContent, '99+', 'default max is 99');
  el.max = 999;
  assert.equal(el.shadowRoot.querySelector('.badge').textContent, '999+');
  el.show = false;
  await tick();
  assert.equal(el.shadowRoot.querySelector('.badge'), null, 'show=false removes the badge');
  unmountAll();
});

test('ui-badge hides at zero unless dot', async () => {
  const el = mount('<ui-badge><button>A</button></ui-badge>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.badge'), null, 'value 0 renders nothing');
  el.dot = true;
  const badge = el.shadowRoot.querySelector('.badge');
  assert.ok(badge, 'dot shows regardless of value');
  assert.ok(badge.className.includes('dot'));
  assert.equal(badge.textContent.trim(), '', 'dot carries no text');
  unmountAll();
});

test('ui-divider exposes separator semantics and reflects orientation', async () => {
  const el = mount('<ui-divider inset></ui-divider>');
  await tick();
  assert.equal(el.getAttribute('role'), 'separator');
  assert.equal(el.getAttribute('aria-orientation'), 'horizontal');
  assert.ok(el.hasAttribute('inset'));
  el.orientation = 'vertical';
  assert.equal(el.getAttribute('orientation'), 'vertical');
  assert.equal(el.getAttribute('aria-orientation'), 'vertical');
  el.middle = true;
  assert.ok(el.hasAttribute('middle'));
  unmountAll();
});

test('ui-list is a labeled list of listitems', async () => {
  const el = mount(
    '<ui-list label="People"><ui-list-item headline="Ada"></ui-list-item></ui-list>');
  await tick();
  assert.equal(el.getAttribute('role'), 'list');
  assert.equal(el.getAttribute('aria-label'), 'People');
  const item = el.querySelector('ui-list-item');
  assert.equal(item.getAttribute('role'), 'listitem');
  assert.ok(item.shadowRoot.querySelector('.headline').textContent.includes('Ada'));
  el.label = 'Crew';
  assert.equal(el.getAttribute('aria-label'), 'Crew');
  unmountAll();
});

test('ui-list-item interactive/selected/two-line states and click', async () => {
  const el = mount('<ui-list-item headline="Grace" supporting="Compiler"></ui-list-item>');
  await tick();
  const control = el.shadowRoot.querySelector('.control');
  assert.ok(control.className.includes('two-line'), 'supporting prop makes it two lines');
  assert.equal(control.getAttribute('role'), null, 'non-interactive rows have no button role');
  el.interactive = true;
  assert.equal(control.getAttribute('role'), 'button');
  assert.equal(control.getAttribute('tabindex'), '0');
  el.selected = true;
  assert.ok(control.className.includes('selected'));
  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  fire(control, 'click');
  assert.equal(clicks, 1, 'native click bubbles to the host');
  el.disabled = true;
  assert.equal(control.getAttribute('tabindex'), null, 'disabled removes the tab stop');
  assert.equal(control.getAttribute('aria-disabled'), 'true');
  unmountAll();
});

test('ui-list-item href renders a link row', async () => {
  const el = mount('<ui-list-item headline="Docs" href="/docs"></ui-list-item>');
  await tick();
  const a = el.shadowRoot.querySelector('a.control');
  assert.ok(a, 'href renders an <a> control');
  assert.equal(a.getAttribute('href'), '/docs');
  unmountAll();
});

test('ui-table keeps its light-DOM table and reflects props', async () => {
  const el = mount(
    '<ui-table><table><thead><tr><th>Name</th></tr></thead>' +
    '<tbody><tr><td>Frozen yogurt</td></tr></tbody></table></ui-table>');
  await tick();
  assert.equal(el.shadowRoot, null, 'light DOM — no shadow root');
  const table = el.querySelector('table');
  assert.ok(table, 'slotted table survives the empty render');
  assert.equal(el.querySelector('td').textContent, 'Frozen yogurt');
  el.dense = true;
  assert.ok(el.hasAttribute('dense'), 'dense reflects for CSS');
  el.stickyHeader = true;
  assert.ok(el.hasAttribute('sticky-header'), 'stickyHeader reflects kebab-cased');
  el.dense = false;
  assert.ok(!el.hasAttribute('dense'));
  unmountAll();
});

test('ui-tooltip shows on focus, renders the text, hides on blur', async () => {
  const el = mount('<ui-tooltip text="Save changes" delay="0"><button>Save</button></ui-tooltip>');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'closed by default');
  fire(el, 'focusin');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel, 'focus shows immediately');
  assert.equal(panel.getAttribute('role'), 'tooltip');
  assert.ok(panel.className.includes('plain'));
  assert.ok(panel.textContent.includes('Save changes'));
  fire(el, 'focusout');
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'blur hides');
  unmountAll();
});

test('ui-tooltip hides on Escape and supports rich content', async () => {
  const el = mount(
    '<ui-tooltip rich delay="0"><span slot="content">Details</span><button>More</button></ui-tooltip>');
  await tick();
  fire(el, 'focusin');
  const panel = el.shadowRoot.querySelector('.panel');
  assert.ok(panel.className.includes('rich'));
  assert.ok(panel.querySelector('slot[name="content"]'), 'rich mode renders the content slot');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  assert.equal(el.shadowRoot.querySelector('.panel'), null, 'Escape hides');
  unmountAll();
});

test('ui-carousel next/prev move index and emit change', async () => {
  const el = mount(`
    <ui-carousel label="Photos">
      <ui-carousel-item>One</ui-carousel-item>
      <ui-carousel-item>Two</ui-carousel-item>
      <ui-carousel-item>Three</ui-carousel-item>
    </ui-carousel>`);
  await tick();
  const items = [...el.querySelectorAll('ui-carousel-item')];
  assert.equal(items[0].selected, true);
  assert.equal(items[0].hasAttribute('selected'), true);
  let detail = null;
  el.addEventListener('change', (e) => (detail = e.detail));
  fire(el.shadowRoot.querySelector('[part=next]').shadowRoot.querySelector('button'), 'click');
  assert.equal(el.index, 1);
  assert.equal(detail.index, 1);
  assert.equal(items[1].selected, true);
  assert.equal(items[1].hasAttribute('selected'), true);
  assert.equal(items[0].hasAttribute('selected'), false);
  fire(el.shadowRoot.querySelector('[part=prev]').shadowRoot.querySelector('button'), 'click');
  assert.equal(el.index, 0);
  key(el.shadowRoot.querySelector('.root'), 'ArrowRight');
  assert.equal(el.index, 1);
  unmountAll();
});
