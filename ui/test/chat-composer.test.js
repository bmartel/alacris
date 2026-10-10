// Smoke and behaviour tests for <ui-chat-composer>: sending, Stop while busy,
// Enter vs Shift+Enter and IME composition, the add menu, attachments with
// their own (non-nested) remove buttons, pasted files, the counter near
// maxlength, and the compact layout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount, unmountAll, tick } from './helpers.js';
import { themeVars } from '../src/components/ui-chat-composer.js';
import { iconPath } from '../src/util/icons.js';

const key = (el, k, init = {}) => {
  const e = new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};
const parts = (el) => {
  const root = el.shadowRoot;
  return {
    textarea: root.querySelector('textarea'),
    send: root.querySelector('.send ui-icon-button'),
    sendButton: () => root.querySelector('.send ui-icon-button').shadowRoot.querySelector('button'),
  };
};
const type = (textarea, text) => {
  textarea.value = text;
  textarea.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
};

test('ui-chat-composer: renders a labelled text area and a disabled Send while empty', async () => {
  const el = mount('<ui-chat-composer label="Message" placeholder="Ask anything"></ui-chat-composer>');
  await tick();
  const { textarea, send } = parts(el);
  assert.ok(textarea, 'a native textarea');
  assert.equal(textarea.getAttribute('aria-label'), 'Message');
  assert.equal(textarea.getAttribute('placeholder'), 'Ask anything');
  assert.equal(textarea.getAttribute('rows'), '1');
  assert.equal(textarea.getAttribute('enterkeyhint'), 'send');
  assert.equal(send.label, 'Send');
  assert.equal(send.icon, 'arrow-upward');
  assert.equal(send.disabled, true, 'nothing to send yet');
  assert.ok(themeVars.names.includes('--ui-chat-composer-bg'));
  assert.ok(iconPath('stop'), 'the Stop icon is registered');
  unmountAll();
});

test('ui-chat-composer: the placeholder names the text area when there is no label', async () => {
  const el = mount('<ui-chat-composer placeholder="Ask anything"></ui-chat-composer>');
  await tick();
  assert.equal(parts(el).textarea.getAttribute('aria-label'), 'Ask anything');
  unmountAll();
});

test('ui-chat-composer: typing emits input; Send emits send and clears', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  const { textarea, send } = parts(el);
  const inputs = [];
  let sent = null;
  el.addEventListener('input', (e) => e.detail && inputs.push(e.detail.value));
  el.addEventListener('send', (e) => (sent = e.detail));
  type(textarea, 'Hello');
  assert.equal(el.value, 'Hello');
  assert.deepEqual(inputs, ['Hello']);
  assert.equal(send.disabled, false, 'text makes Send available');
  parts(el).sendButton().click();
  assert.deepEqual(sent, { value: 'Hello', attachments: [] });
  assert.equal(el.value, '', 'the text clears after sending');
  assert.equal(inputs.at(-1), '', 'and says so');
  unmountAll();
});

test('ui-chat-composer: a cancelled send keeps the text', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  el.addEventListener('send', (e) => e.preventDefault());
  type(parts(el).textarea, 'Keep me');
  key(parts(el).textarea, 'Enter');
  assert.equal(el.value, 'Keep me');
  unmountAll();
});

test('ui-chat-composer: Enter sends, Shift+Enter does not, nor Enter while composing', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  const { textarea } = parts(el);
  let sent = 0;
  el.addEventListener('send', () => sent++);
  type(textarea, 'Line');
  const shift = key(textarea, 'Enter', { shiftKey: true });
  assert.equal(sent, 0);
  assert.equal(shift.defaultPrevented, false, 'Shift+Enter types a new line');
  textarea.dispatchEvent(new window.Event('compositionstart', { bubbles: true }));
  key(textarea, 'Enter');
  assert.equal(sent, 0, 'Enter that confirms an IME candidate does not send');
  key(textarea, 'Enter', { keyCode: 229 });
  assert.equal(sent, 0);
  textarea.dispatchEvent(new window.Event('compositionend', { bubbles: true }));
  const enter = key(textarea, 'Enter');
  assert.equal(sent, 1);
  assert.equal(enter.defaultPrevented, true);
  unmountAll();
});

test('ui-chat-composer: submit="mod-enter" sends on Ctrl/⌘+Enter only', async () => {
  const el = mount('<ui-chat-composer label="Message" submit="mod-enter"></ui-chat-composer>');
  await tick();
  const { textarea } = parts(el);
  let sent = 0;
  el.addEventListener('send', () => sent++);
  type(textarea, 'x');
  key(textarea, 'Enter');
  assert.equal(sent, 0);
  key(textarea, 'Enter', { metaKey: true });
  assert.equal(sent, 1);
  unmountAll();
});

test('ui-chat-composer: busy turns Send into Stop, and Enter does not send', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  let sent = 0;
  let stopped = 0;
  el.addEventListener('send', () => sent++);
  el.addEventListener('stop', () => stopped++);
  el.busy = true;
  const { textarea, send } = parts(el);
  assert.equal(send.icon, 'stop');
  assert.equal(send.label, 'Stop');
  assert.equal(send.disabled, false, 'Stop works with an empty field');
  type(textarea, 'Next question');
  key(textarea, 'Enter');
  assert.equal(sent, 0, 'typing ahead is fine; sending waits');
  assert.equal(el.value, 'Next question');
  parts(el).sendButton().click();
  assert.equal(stopped, 1);
  el.busy = false;
  assert.equal(send.icon, 'arrow-upward');
  unmountAll();
});

test('ui-chat-composer: labels are props, so an app can translate them', async () => {
  const el = mount('<ui-chat-composer label="Message" send-label="Envoyer" stop-label="Arrêter"></ui-chat-composer>');
  await tick();
  const { send } = parts(el);
  assert.equal(send.label, 'Envoyer');
  el.busy = true;
  assert.equal(send.label, 'Arrêter');
  assert.equal(el.shadowRoot.querySelector('.send ui-tooltip').text, 'Arrêter');
  unmountAll();
});

test('ui-chat-composer: disabled disables the text area and Send', async () => {
  const el = mount('<ui-chat-composer label="Message" value="Hi" disabled></ui-chat-composer>');
  await tick();
  const { textarea, send } = parts(el);
  assert.equal(textarea.disabled, true);
  assert.equal(send.disabled, true);
  unmountAll();
});

test('ui-chat-composer: the add button shows only with menu items, and its menu reports select', async () => {
  const bare = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  assert.equal(bare.shadowRoot.querySelector('ui-menu.add').hidden, true, 'no items, no add button');
  unmountAll();

  const el = mount(`<ui-chat-composer label="Message" add-label="Add files and more">
    <ui-menu-item slot="menu" value="file" icon="attach-file">Attach a file</ui-menu-item>
  </ui-chat-composer>`);
  await tick();
  const menu = el.shadowRoot.querySelector('ui-menu.add');
  menu.shadowRoot.querySelector('slot[name="anchor"]').dispatchEvent(new window.Event('slotchange'));
  el.shadowRoot.querySelector('slot[name="menu"]').dispatchEvent(new window.Event('slotchange'));
  await tick();
  assert.equal(menu.hidden, false);
  const add = el.shadowRoot.querySelector('ui-menu.add ui-icon-button');
  assert.equal(add.label, 'Add files and more');
  assert.equal(add.icon, 'add');
  const button = add.shadowRoot.querySelector('button');
  assert.equal(button.getAttribute('aria-haspopup'), 'menu', 'the control inside the tooltip carries the popup state');
  const chosen = [];
  el.addEventListener('select', (e) => e.detail && chosen.push(e.detail.value));
  el.querySelector('ui-menu-item').click();
  assert.deepEqual(chosen, ['file'], 'one select per choice');
  unmountAll();
});

test('ui-chat-composer: attachments are chips with their own remove button, not nested buttons', async () => {
  const el = mount('<ui-chat-composer label="Message" remove-label="Remove"></ui-chat-composer>');
  await tick();
  el.attachments = [
    { id: 'a', name: 'report.pdf' },
    { id: 'b', name: 'photo.png', thumbnail: 'data:image/png;base64,iVBORw0KGgo=' },
  ];
  const chips = el.shadowRoot.querySelectorAll('.attachment');
  assert.equal(chips.length, 2);
  assert.equal(el.shadowRoot.querySelector('.attachments').getAttribute('aria-label'), 'Attachments');
  assert.equal(chips[0].querySelector('.name').textContent, 'report.pdf');
  assert.ok(chips[1].querySelector('img.thumb'), 'a thumbnail when given');
  for (const chip of chips) {
    assert.equal(chip.localName, 'li', 'the chip itself is not a control');
    assert.equal(chip.querySelectorAll('ui-icon-button').length, 1);
  }
  const remove = chips[0].querySelector('ui-icon-button');
  assert.equal(remove.label, 'Remove report.pdf');
  assert.equal(remove.closest('button, [role="button"]'), null, 'no control around the remove button');
  let removed = null;
  el.addEventListener('remove', (e) => (removed = e.detail?.id));
  remove.shadowRoot.querySelector('button').click();
  assert.equal(removed, 'a');
  assert.equal(parts(el).send.disabled, false, 'attachments alone can be sent');
  el.attachments = [{ id: 'b', name: 'photo.png' }];
  assert.equal(el.shadowRoot.querySelectorAll('.attachment').length, 1);
  unmountAll();
});

test('ui-chat-composer: pasted files emit files only when allowed', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  const got = [];
  el.addEventListener('files', (e) => got.push(e.detail));
  const file = new window.File(['x'], 'a.txt', { type: 'text/plain' });
  const paste = () => {
    const e = new window.Event('paste', { bubbles: true, cancelable: true });
    e.clipboardData = { files: [file] };
    parts(el).textarea.dispatchEvent(e);
    return e;
  };
  assert.equal(paste().defaultPrevented, false);
  assert.equal(got.length, 0);
  el.allowFiles = true;
  assert.equal(paste().defaultPrevented, true);
  assert.equal(got.length, 1);
  assert.equal(got[0].source, 'paste');
  assert.equal(got[0].files[0].name, 'a.txt');
  unmountAll();
});

test('ui-chat-composer: a quiet counter appears near maxlength', async () => {
  const el = mount('<ui-chat-composer label="Message" maxlength="10"></ui-chat-composer>');
  await tick();
  const { textarea } = parts(el);
  assert.equal(textarea.getAttribute('maxlength'), '10');
  type(textarea, 'abc');
  assert.equal(el.shadowRoot.querySelector('.count'), null, 'nothing to say far from the limit');
  type(textarea, 'abcdefghi');
  const count = el.shadowRoot.querySelector('.count');
  assert.ok(count);
  assert.match(count.textContent, /9\s*\/\s*10/);
  unmountAll();
});

test('ui-chat-composer: caption shows under the surface', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  const caption = el.shadowRoot.querySelector('.caption');
  assert.equal(caption.hidden, true);
  el.caption = 'Answers can be wrong.';
  assert.equal(caption.hidden, false);
  assert.match(caption.textContent, /Answers can be wrong\./);
  unmountAll();
});

test('ui-chat-composer: layout and compact are reported', async () => {
  const el = mount('<ui-chat-composer label="Message" layout="inline"></ui-chat-composer>');
  await tick();
  assert.equal(el.dataset.layout, 'inline');
  assert.ok(el.shadowRoot.querySelector('.root').classList.contains('inline'));
  const changes = [];
  el.addEventListener('layoutchange', (e) => changes.push(e.detail));
  el.layout = 'stacked';
  assert.equal(el.dataset.layout, 'stacked');
  assert.deepEqual(changes.at(-1), { layout: 'stacked', compact: false });
  assert.equal(el.hasAttribute('data-compact'), false);
  unmountAll();
});

test('ui-chat-composer: focus() focuses the text area; the surface shows focus', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  el.focus();
  const { textarea } = parts(el);
  textarea.dispatchEvent(new window.Event('focus'));
  assert.ok(el.shadowRoot.querySelector('.root').classList.contains('focused'));
  textarea.dispatchEvent(new window.Event('blur'));
  assert.equal(el.shadowRoot.querySelector('.root').classList.contains('focused'), false);
  unmountAll();
});

test('ui-chat-composer: a press on the surface around the text focuses it', async () => {
  const el = mount('<ui-chat-composer label="Message"></ui-chat-composer>');
  await tick();
  let focused = 0;
  parts(el).textarea.focus = () => focused++;
  el.shadowRoot.querySelector('.surface').dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true }));
  assert.equal(focused, 1);
  unmountAll();
});
