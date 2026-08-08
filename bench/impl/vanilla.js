// Hand-written, keyed, delegated DOM. This is the floor: no framework can beat
// it, and "as fast as Solid/Svelte" in practice means "close to this line".
import { buildData } from '../data.js';

const tpl = document.createElement('template');
tpl.innerHTML =
  '<tr><td class="col-md-1"></td><td class="col-md-4"><a class="lbl"></a></td>' +
  '<td class="col-md-1"><a class="remove">✕</a></td><td class="col-md-6"></td></tr>';

export default function vanilla(container) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.append(tbody);
  container.append(table);

  let rows = [];
  let nodes = [];
  let selected = null;

  tbody.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const tr = a.closest('tr');
    const i = nodes.indexOf(tr);
    if (a.classList.contains('remove')) api.remove(i);
    else api.select(i);
  });

  const makeRow = (row) => {
    const tr = tpl.content.firstChild.cloneNode(true);
    const tds = tr.childNodes;
    tds[0].textContent = row.id;
    tds[1].firstChild.textContent = row.label;
    return tr;
  };

  const api = {
    create(n) {
      api.clear();
      rows = buildData(n);
      nodes = new Array(n);
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) frag.append((nodes[i] = makeRow(rows[i])));
      tbody.append(frag);
    },
    append(n) {
      const extra = buildData(n);
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        rows.push(extra[i]);
        frag.append((nodes[nodes.length] = makeRow(extra[i])));
      }
      tbody.append(frag);
    },
    update() {
      for (let i = 0; i < rows.length; i += 10) {
        rows[i].label += ' !!!';
        nodes[i].childNodes[1].firstChild.textContent = rows[i].label;
      }
    },
    select(i) {
      if (selected !== null && nodes[selected]) nodes[selected].className = '';
      selected = i;
      if (nodes[i]) nodes[i].className = 'danger';
    },
    swap() {
      if (rows.length < 999) return;
      const a = 1;
      const b = 998;
      [rows[a], rows[b]] = [rows[b], rows[a]];
      const na = nodes[a];
      const nb = nodes[b];
      const after = nb.nextSibling;
      tbody.insertBefore(nb, na);
      tbody.insertBefore(na, after);
      [nodes[a], nodes[b]] = [nodes[b], nodes[a]];
    },
    remove(i) {
      if (!nodes[i]) return;
      nodes[i].remove();
      rows.splice(i, 1);
      nodes.splice(i, 1);
    },
    clear() {
      tbody.textContent = '';
      rows = [];
      nodes = [];
      selected = null;
    },
    count: () => tbody.childElementCount,
    firstLabel: () => tbody.querySelector('.lbl')?.textContent ?? '',
  };
  return api;
}
