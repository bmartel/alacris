import { define, html, each, signal, computed } from '@alacris/core';

let nextId = 4;

define('demo-todos', {
  styles: `
    :host { display: grid; gap: .75rem; font: inherit; max-width: 26rem }
    form { display: flex; gap: .5rem }
    input[type=text] { flex: 1; font: inherit; padding: .35rem .6rem; border-radius: 6px;
      border: 1px solid currentColor; background: transparent; color: inherit }
    button { font: inherit; padding: .35rem .7rem; border-radius: 6px; cursor: pointer;
      border: 1px solid currentColor; background: transparent; color: inherit }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem }
    li { display: flex; align-items: center; gap: .55rem; padding: .3rem .1rem }
    li[data-done] .text { text-decoration: line-through; opacity: .5 }
    .text { flex: 1 }
    .x { border: 0; background: none; cursor: pointer; opacity: .55; font-size: 1.1rem; color: inherit }
    .bar { display: flex; justify-content: space-between; opacity: .7; font-size: .85rem }
  `,
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
      items([...items(), { id: ++nextId, text, done: false }]);
      draft('');
    };
    const toggle = (id) =>
      items(items().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const remove = (id) => items(items().filter((t) => t.id !== id));
    const shuffle = () => items([...items()].sort(() => Math.random() - 0.5));

    return html`
      <form @submit=${add}>
        <input type="text" placeholder="Add something"
               .value=${draft} @input=${(e) => draft(e.target.value)} />
        <button type="submit">Add</button>
        <button type="button" @click=${shuffle}>Shuffle</button>
      </form>

      <ul>
        ${each(
          items,
          (todo) => html`
            <li ?data-done=${() => todo().done}>
              <input type="checkbox" .checked=${() => todo().done}
                     @change=${() => toggle(todo().id)} />
              <span class="text">${() => todo().text}</span>
              <button class="x" title="remove" @click=${() => remove(todo().id)}>&times;</button>
            </li>`,
          (todo) => todo.id
        )}
      </ul>

      <div class="bar">
        <span>${left} left</span>
        <span>Shuffle moves the existing nodes — the checkboxes keep their state.</span>
      </div>`;
  },
});
