/**
 * The version of the library this build of the docs describes.
 *
 * Read from the repo's package.json rather than hard-coded, so the playground
 * always installs the release the surrounding prose was written against.
 *
 * Imported rather than read through `import.meta.url`: Astro rewrites that URL
 * to the built chunk's location, and a relative walk from there quietly lands
 * on the *docs* package.json — whose version is 0.0.0. The playground then
 * asks npm for `@alacris/core@^0.0.0` and fails to install, so the assertion below
 * makes that failure loud at build time instead of silent in the browser.
 */
import pkg from '../../../package.json';

export const ALACRIS_VERSION: string = pkg.version;

if (!/^\d+\.\d+\.\d+/.test(ALACRIS_VERSION) || ALACRIS_VERSION === '0.0.0') {
  throw new Error(
    `docs: read an implausible alacris version (${ALACRIS_VERSION}) — check the package.json import in src/lib/version.ts.`
  );
}

/** A semver range for the playground's dependency on the library. */
export const ALACRIS_RANGE = `^${ALACRIS_VERSION}`;
