import { mount, unmount } from 'svelte';
import App from './svelte-app.js';
import { buildData } from '../data.js';

export default function svelte(container) {
  let api;
  const app = mount(App, {
    target: container,
    props: { buildData, register(a) { api = a; } },
  });
  api.dispose = () => unmount(app);
  api.count = () => container.querySelectorAll('tbody > tr').length;
  api.firstLabel = () => container.querySelector('.lbl')?.textContent ?? '';
  return api;
}
