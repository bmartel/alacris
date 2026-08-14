import { Component, h, Prop } from '@stencil/core';

@Component({
  tag: 'bench-stencil',
  shadow: false,
})
export class BenchStencil {
  @Prop({ mutable: true }) rows = [];
  @Prop({ mutable: true }) selected = -1;

  render() {
    const selected = this.selected;
    return (
      <table>
        <tbody>
          {this.rows.map((row) => (
            <tr key={row.id} class={row.id === selected ? 'danger' : ''}>
              <td class="col-md-1">{row.id}</td>
              <td class="col-md-4">
                <a class="lbl" onClick={() => { this.selected = row.id; }}>
                  {row.label}
                </a>
              </td>
              <td class="col-md-1">
                <a class="remove" onClick={() => { this.rows = this.rows.filter((r) => r.id !== row.id); }}>
                  ✕
                </a>
              </td>
              <td class="col-md-6"></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
