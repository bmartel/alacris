// Demo — theme tokens: the three tiers, live swatches, and a component override.

import { html, signal } from 'alacris';
import { sys } from '../src/tokens/sys.js';
import { TYPE_ROLES } from '../src/tokens/typography.js';
import { RADIUS_KEYS, ELEVATION_LEVELS, SPACE_STEPS } from '../src/tokens/system.js';
import { block, stackBlock } from './helpers.js';
import '../src/components/ui-text.js';
import '../src/components/ui-button.js';
import '../src/components/ui-alert.js';

export const title = 'Theme tokens';

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const copied = signal('');

const copy = (name) => {
  copied.set(name);
  try { navigator.clipboard?.writeText(name); } catch { /* demo only */ }
};

const COLOR_GROUPS = [
  {
    label: 'Brand',
    roles: [
      'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
      'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
      'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
    ],
  },
  {
    label: 'Status',
    roles: [
      'error', 'onError', 'errorContainer', 'onErrorContainer',
      'success', 'onSuccess', 'successContainer', 'onSuccessContainer',
      'warning', 'onWarning', 'warningContainer', 'onWarningContainer',
      'info', 'onInfo', 'infoContainer', 'onInfoContainer',
    ],
  },
  {
    label: 'Surface',
    roles: [
      'surface', 'surfaceDim', 'surfaceBright',
      'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
      'surfaceContainerHigh', 'surfaceContainerHighest',
      'onSurface', 'onSurfaceVariant', 'outline', 'outlineVariant',
      'inverseSurface', 'inverseOnSurface', 'inversePrimary',
    ],
  },
];

/** Foreground that belongs on this role — never the role itself (that made on* labels vanish). */
const inkFor = (role) => {
  if (role.startsWith('inverseOn')) return sys.color.inverseSurface;
  if (role.startsWith('on')) {
    const rest = role.slice(2);
    return sys.color[rest[0].toLowerCase() + rest.slice(1)] || sys.color.surface;
  }
  const paired = 'on' + role[0].toUpperCase() + role.slice(1);
  return sys.color[paired] || sys.color.onSurface;
};

const swatch = (role) => {
  const name = `--ui-color-${kebab(role)}`;
  return html`
    <button type="button" class="token-swatch" title=${name}
            style=${{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: sys.space(2),
              minInlineSize: '9rem',
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: sys.color.onSurface,
              textAlign: 'start',
              cursor: 'pointer',
              font: sys.type.labelSm,
            }}
            @click.capture=${() => copy(name)}>
      <span style=${{
        display: 'grid',
        placeItems: 'center',
        blockSize: '3rem',
        borderRadius: sys.radius.sm,
        background: sys.color[role],
        color: inkFor(role),
        border: `1px solid ${sys.color.outlineVariant}`,
        font: sys.type.titleSm,
      }}>Aa</span>
      <span>${role}</span>
      <span style=${{ color: sys.color.onSurfaceVariant }}>
        ${() => copied() === name ? 'Copied' : name}
      </span>
    </button>`;
};

export const section = () => html`
  ${stackBlock('Three tiers', html`
    <ui-text variant="body-md" color="onSurfaceVariant">
      Reference palettes are generated from the seed. System roles
      (<code>sys.color.primary</code>, <code>sys.radius.md</code>) inherit
      through every shadow. Component vars such as
      <code>--ui-button-filled-bg</code> are the public override contract.
    </ui-text>
    <ui-alert severity="info" title="Where to change what">
      Seed, density, shape, and motion live in the playground. A single
      component gets a CSS custom property. A ground-up redesign edits
      <code>src/tokens/</code>.
    </ui-alert>`)}

  ${COLOR_GROUPS.map((g) => stackBlock(g.label + ' color', html`
    <ui-text variant="body-sm" color="onSurfaceVariant">Click a swatch to copy its custom property.</ui-text>
    <div style=${{ display: 'flex', flexWrap: 'wrap', gap: sys.space(2) }}>
      ${g.roles.map(swatch)}
    </div>`))}

  ${stackBlock('Type roles', html`
    ${TYPE_ROLES.map((role) => html`
      <div style=${{ display: 'flex', alignItems: 'baseline', gap: sys.space(4), flexWrap: 'wrap' }}>
        <ui-text variant="label-sm" color="onSurfaceVariant" style="inline-size:7rem">${role}</ui-text>
        <ui-text variant=${role}>Hamburgefonstiv</ui-text>
      </div>`)}`)}

  ${block('Shape', html`
    ${RADIUS_KEYS.map((k) => html`
      <div style=${{
        background: sys.color.primaryContainer,
        color: sys.color.onPrimaryContainer,
        borderRadius: sys.radius[k],
        padding: `${sys.space(5)} ${sys.space(6)}`,
        font: sys.type.labelMd,
      }}>${k}</div>`)}`)}

  ${block('Elevation', html`
    ${ELEVATION_LEVELS.map((n) => html`
      <div style=${{
        background: sys.color.surfaceContainerLowest,
        boxShadow: sys.elevation[n],
        borderRadius: sys.radius.md,
        padding: `${sys.space(5)} ${sys.space(6)}`,
        font: sys.type.labelMd,
      }}>${n}</div>`)}`)}

  ${block('Space (4px grid)', html`
    ${SPACE_STEPS.map((n) => html`
      <div style=${{ display: 'flex', alignItems: 'center', gap: sys.space(2) }}>
        <ui-text variant="label-sm" color="onSurfaceVariant" style="inline-size:2.5rem">${n}</ui-text>
        <div style=${{
          inlineSize: sys.space(n),
          blockSize: sys.space(4),
          background: sys.color.primary,
          borderRadius: sys.radius.xs,
        }}></div>
      </div>`)}`)}

  ${stackBlock('Component override', html`
    <ui-text variant="body-md" color="onSurfaceVariant">
      System tokens cascade. A component token pulls one piece away without
      touching the rest of the page:
    </ui-text>
    <div style=${{ display: 'flex', flexWrap: 'wrap', gap: sys.space(3), alignItems: 'center' }}>
      <ui-button>Default fill</ui-button>
      <ui-button style="--ui-button-filled-bg: var(--ui-color-tertiary); --ui-button-filled-fg: var(--ui-color-on-tertiary)">
        Tertiary fill
      </ui-button>
      <ui-button style="--ui-button-radius: 4px">Squared</ui-button>
    </div>
    <ui-text variant="label-sm" color="onSurfaceVariant">
      <code>ui-button { --ui-button-filled-bg: var(--ui-color-tertiary); }</code>
    </ui-text>`)}
`;
