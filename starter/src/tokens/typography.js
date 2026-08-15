// Typography tokens — the Material type scale.
//
// Fifteen roles (display/headline/title/body/label × lg/md/sm), each emitted
// as granular tokens plus a `font` shorthand so a component can write
// `font: var(--ui-type-body-md)` and get weight, size, line-height and family
// in one declaration. Letter-spacing cannot ride the shorthand, so tracking is
// its own token.

export const FONT_STACKS = {
  brand: "'Roboto', system-ui, -apple-system, 'Segoe UI', sans-serif",
  plain: "'Roboto', system-ui, -apple-system, 'Segoe UI', sans-serif",
  code: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

// role: [sizePx, lineHeightPx, weight, trackingPx, family]
const SCALE = {
  'display-lg': [57, 64, 400, -0.25, 'brand'],
  'display-md': [45, 52, 400, 0, 'brand'],
  'display-sm': [36, 44, 400, 0, 'brand'],
  'headline-lg': [32, 40, 400, 0, 'brand'],
  'headline-md': [28, 36, 400, 0, 'brand'],
  'headline-sm': [24, 32, 400, 0, 'brand'],
  'title-lg': [22, 28, 400, 0, 'brand'],
  'title-md': [16, 24, 500, 0.15, 'plain'],
  'title-sm': [14, 20, 500, 0.1, 'plain'],
  'body-lg': [16, 24, 400, 0.5, 'plain'],
  'body-md': [14, 20, 400, 0.25, 'plain'],
  'body-sm': [12, 16, 400, 0.4, 'plain'],
  'label-lg': [14, 20, 500, 0.1, 'plain'],
  'label-md': [12, 16, 500, 0.5, 'plain'],
  'label-sm': [11, 16, 500, 0.5, 'plain'],
};

export const TYPE_ROLES = Object.keys(SCALE);

const rem = (px) => `${+(px / 16).toFixed(4)}rem`;

/**
 * Build the typography token map.
 *
 * config: { brand, plain, code — font stacks; scale — multiplier on sizes }
 */
export function typographyTokens({ brand, plain, code, scale = 1 } = {}) {
  const stacks = {
    brand: brand || FONT_STACKS.brand,
    plain: plain || FONT_STACKS.plain,
    code: code || FONT_STACKS.code,
  };
  const out = {
    'font-brand': stacks.brand,
    'font-plain': stacks.plain,
    'font-code': stacks.code,
  };
  for (const role of TYPE_ROLES) {
    const [size, line, weight, tracking, family] = SCALE[role];
    const fam = `var(--ui-font-${family})`;
    out[`type-${role}-size`] = rem(size * scale);
    out[`type-${role}-line`] = rem(line * scale);
    out[`type-${role}-weight`] = String(weight);
    out[`type-${role}-tracking`] = tracking ? `${tracking * scale}px` : '0';
    out[`type-${role}-font`] = fam;
    out[`type-${role}`] =
      `var(--ui-type-${role}-weight) var(--ui-type-${role}-size) / var(--ui-type-${role}-line) var(--ui-type-${role}-font)`;
  }
  return out;
}
