// Demo — selects, autocomplete, chips, date and time pickers.

import { html, signal } from '@alacris/core';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-select.js';
import '../src/components/ui-option.js';
import '../src/components/ui-autocomplete.js';
import '../src/components/ui-chip.js';
import '../src/components/ui-chip-set.js';
import '../src/components/ui-date-picker.js';
import '../src/components/ui-time-picker.js';
import '../src/components/ui-text.js';

export const title = 'Selects, chips & pickers';

const FRUITS = [
  'Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Fig', 'Grape',
  'Kiwi', 'Mango', 'Orange', 'Papaya', 'Peach', 'Pear', 'Plum', 'Raspberry',
];

export const section = () => {
  const flavor = signal('');
  const fruit = signal('');
  const tag = signal('');
  const size = signal('m');
  const eventDate = signal('2026-08-14');
  const deadline = signal('');
  const tripStart = signal('2026-08-14');
  const tripEnd = signal('2026-08-20');
  const alarm = signal('07:30');
  const meeting = signal('14:00');
  const clockTime = signal('09:15');

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
      </ui-chip-set>`)}

    ${block('Date picker — docked and modal', html`
      <ui-date-picker label="Event" value=${eventDate}
                      @change=${(e) => eventDate(e.detail.value)}></ui-date-picker>
      <ui-date-picker label="Deadline" variant="outlined" presentation="modal"
                      @change=${(e) => deadline(e.detail.value)}></ui-date-picker>
      <ui-date-picker label="Disabled" value="2026-08-14" disabled></ui-date-picker>
      <ui-text variant="body-sm" color="onSurfaceVariant">
        ${() => (eventDate() ? `event: ${eventDate()}` : '')}
        ${() => (deadline() ? ` deadline: ${deadline()}` : '')}
      </ui-text>`)}

    ${block('Date range picker', html`
      <ui-date-picker label="Trip" range start=${tripStart} end=${tripEnd}
                      @change=${(e) => { tripStart(e.detail.start); tripEnd(e.detail.end); }}></ui-date-picker>
      <ui-date-picker label="Stay" variant="outlined" range presentation="modal"
                      start="2026-09-01" end="2026-09-05"></ui-date-picker>
      <ui-text variant="body-sm" color="onSurfaceVariant">
        ${() => (tripStart() ? `${tripStart()} → ${tripEnd()}` : '')}
      </ui-text>`)}

    ${block('Time picker — clock and input', html`
      <ui-time-picker label="Alarm" value=${alarm}
                      @change=${(e) => alarm(e.detail.value)}></ui-time-picker>
      <ui-time-picker label="Meeting" variant="outlined" hour-cycle="24" view="input"
                      value=${meeting} @change=${(e) => meeting(e.detail.value)}></ui-time-picker>
      <ui-time-picker label="Clock" value=${clockTime}
                      @change=${(e) => clockTime(e.detail.value)}></ui-time-picker>
      <ui-text variant="body-sm" color="onSurfaceVariant">
        ${() => (alarm() ? `alarm: ${alarm()}` : '')}
        ${() => (meeting() ? ` meeting: ${meeting()}` : '')}
      </ui-text>`)}`;
};
