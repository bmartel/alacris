<script>
  import { flushSync } from 'svelte';
  let { buildData, register } = $props();

  let rows = $state([]);
  let selected = $state(-1);

  register({
    create(n) { flushSync(() => { rows = buildData(n); selected = -1; }); },
    append(n) { flushSync(() => { rows.push(...buildData(n)); }); },
    update() {
      flushSync(() => {
        for (let i = 0; i < rows.length; i += 10) rows[i].label += ' !!!';
      });
    },
    select(i) { flushSync(() => { const r = rows[i]; if (r) selected = r.id; }); },
    swap() {
      flushSync(() => {
        if (rows.length < 999) return;
        const a = rows[1];
        rows[1] = rows[998];
        rows[998] = a;
      });
    },
    remove(i) { flushSync(() => { rows.splice(i, 1); }); },
    clear() { flushSync(() => { rows = []; selected = -1; }); },
  });
</script>

<table>
  <tbody>
    {#each rows as row (row.id)}
      <tr class={selected === row.id ? 'danger' : ''}>
        <td class="col-md-1">{row.id}</td>
        <td class="col-md-4">
          <a class="lbl" onclick={() => (selected = row.id)}>{row.label}</a>
        </td>
        <td class="col-md-1">
          <a class="remove" onclick={() => rows.splice(rows.findIndex((r) => r.id === row.id), 1)}>✕</a>
        </td>
        <td class="col-md-6"></td>
      </tr>
    {/each}
  </tbody>
</table>
