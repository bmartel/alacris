// Demo — selects, autocomplete, and chips.

import { html, signal } from 'alacris';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-select.js';
import '../src/components/ui-option.js';
import '../src/components/ui-autocomplete.js';
import '../src/components/ui-chip.js';
import '../src/components/ui-chip-set.js';

export const title = 'Selects & chips';

const FRUITS = [
  'Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Fig', 'Grape',
  'Kiwi', 'Mango', 'Orange', 'Papaya', 'Peach', 'Pear', 'Plum', 'Raspberry',
];

export const section = () => {
  const flavor = signal('');
  const fruit = signal('');
  const tag = signal('');
  const size = signal('m');

  return html`
    ${block('Select — filled / outlined / disabled / preselected', html`
      <ui-select label="Flavor" value=${flavor}
                 @change=${(e) => flavor(e.detail.value)}>
        <ui-option value="vanilla">Vanilla</ui-option>
        <ui-option value="chocolate">Chocolate</ui-option>
        <ui-option value="mint">Mint chip</ui-option>
        <ui-option value="strawberry" disabled>Strawberry (out)</ui-option>
        <ui-option value="pistachio">Pistachio</ui-option>
      </ui-select>
      <ui-select label="Flavor" variant="outlined" placeholder="Pick one">
        <ui-option value="vanilla">Vanilla</ui-option>
        <ui-option value="chocolate">Chocolate</ui-option>
        <ui-option value="mint">Mint chip</ui-option>
      </ui-select>
      <ui-select label="Flavor" disabled>
        <ui-option value="vanilla">Vanilla</ui-option>
        <ui-option value="chocolate">Chocolate</ui-option>
      </ui-select>
      <ui-select label="Flavor" value="mint" required>
        <ui-option value="vanilla">Vanilla</ui-option>
        <ui-option value="chocolate">Chocolate</ui-option>
        <ui-option value="mint">Mint chip</ui-option>
      </ui-select>`)}

    ${block('Autocomplete — filtering, and freeSolo', html`
      <ui-autocomplete label="Fruit" options=${FRUITS}
                       @change=${(e) => fruit(e.detail.value)}></ui-autocomplete>
      <ui-autocomplete label="Tag" variant="outlined" free-solo
                       placeholder="Type anything"
                       options=${['alpha', 'beta', 'stable']}
                       @change=${(e) => tag(e.detail.value)}></ui-autocomplete>
      <ui-text variant="body-sm" color="onSurfaceVariant">
        ${() => (fruit() ? `fruit: ${fruit()}` : '')} ${() => (tag() ? `tag: ${tag()}` : '')}
      </ui-text>`)}

    ${block('Chips — the four variants', html`
      <ui-chip icon="calendar">Assist</ui-chip>
      <ui-chip variant="filter">Filter</ui-chip>
      <ui-chip variant="input" dismissible @dismiss=${(e) => e.target.remove()}>Input</ui-chip>
      <ui-chip variant="suggestion">Suggestion</ui-chip>
      <ui-chip icon="calendar" disabled>Disabled</ui-chip>`)}

    ${stackBlock('Filter chip set — single, then multi', html`
      <ui-chip-set label="Size" @change=${(e) => size(e.detail.value)}>
        <ui-chip variant="filter" value="s">Small</ui-chip>
        <ui-chip variant="filter" value="m" selected>Medium</ui-chip>
        <ui-chip variant="filter" value="l">Large</ui-chip>
      </ui-chip-set>
      <ui-text variant="body-sm" color="onSurfaceVariant">size: ${size}</ui-text>
      <ui-chip-set label="Toppings" multi>
        <ui-chip variant="filter" value="nuts">Nuts</ui-chip>
        <ui-chip variant="filter" value="sprinkles" selected>Sprinkles</ui-chip>
        <ui-chip variant="filter" value="cherry" selected>Cherry</ui-chip>
        <ui-chip variant="filter" value="fudge">Fudge</ui-chip>
      </ui-chip-set>`)}

    ${block('Dismissible input chips', html`
      <ui-chip-set label="Recipients">
        <ui-chip variant="input" icon="person" dismissible
                 @dismiss=${(e) => e.target.remove()}>Ada Lovelace</ui-chip>
        <ui-chip variant="input" icon="person" dismissible
                 @dismiss=${(e) => e.target.remove()}>Grace Hopper</ui-chip>
        <ui-chip variant="input" icon="person" dismissible
                 @dismiss=${(e) => e.target.remove()}>Katherine Johnson</ui-chip>
      </ui-chip-set>`)}`;
};
