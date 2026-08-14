# Security Policy

## Supported versions

Security fixes land on the latest minor release. Older versions are not
patched — upgrading is intended to be painless (semantic versioning, no
build step, changelog in [CHANGELOG.md](CHANGELOG.md)).

| Version | Supported |
| ------- | --------- |
| latest 0.x | ✅ |
| earlier | ❌ |

## Reporting a vulnerability

Please **do not open a public issue** for a suspected vulnerability.

Report it privately via
[GitHub security advisories](https://github.com/bmartel/alacris/security/advisories/new).
You will get an acknowledgement within a few days; fixes for confirmed reports
are released as soon as they are ready and credited to the reporter unless you
prefer otherwise.

## Security model

The full model — what is guaranteed, what you opt into, and how Alacris behaves
under CSP and Trusted Types — is documented at
[bmartel.github.io/alacris/reference/security](https://bmartel.github.io/alacris/reference/security/).
The short version:

- Interpolated template values are always written as text or attribute values,
  never parsed as HTML.
- The only HTML ever parsed is the static template strings (author code); that
  parse goes through a Trusted Types policy named `alacris` where enforced.
- The store's proxy blocks `__proto__` reads and writes and inherited
  `constructor` reads, so merging untrusted JSON cannot pollute prototypes
  through it.
- No `eval`, no `new Function`, no runtime dependencies, no install scripts.

The explicit escape hatches — binding `.innerHTML`, URL attributes, and
interpolating into `css` — assert that *you* trust the value; treat anything
user-supplied that reaches them as a bug.
