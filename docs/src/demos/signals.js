import { define, html, signal, computed } from 'alacris';

define('demo-signals', {
  styles: `
    :host { display: grid; gap: .6rem; font: inherit }
    .row { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap }
    input { font: inherit; width: 6rem; padding: .25rem .5rem; border-radius: 6px;
            border: 1px solid currentColor; background: transparent; color: inherit }
    code { font-family: ui-monospace, monospace }
    .out { opacity: .8 }
  `,
  setup() {
    const width = signal(4);
    const height = signal(3);

    // Lazy and memoised: this only recomputes when width or height changes,
    // and only if something is actually reading it.
    const area = computed(() => width() * height());
    const label = computed(() => (area() > 20 ? 'large' : 'small'));

    const num = (sig) => (e) => sig(Number(e.target.value) || 0);

    return html`
      <div class="row">
        <label>w <input type="number" .value=${width} @input=${num(width)} /></label>
        <label>h <input type="number" .value=${height} @input=${num(height)} /></label>
      </div>
      <div class="out">
        area = <code>${area}</code> · <code>${label}</code>
      </div>`;
  },
});
