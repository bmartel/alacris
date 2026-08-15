---
title: Security
description: The XSS model, CSP and Trusted Types support, prototype-pollution hardening, and the escape hatches you opt into.
sidebar:
  order: 5
---

Alacris is small enough to audit in an afternoon — the entire runtime is about
1,500 lines with zero dependencies. This page states the security model
precisely, so you know what is guaranteed and what you opt into.

## Interpolated values are never HTML

The only thing ever parsed as HTML is the **static strings** of a tagged
template — code you wrote, not data. Values in `${}` travel a different path
entirely:

- **Child positions** are written with `textContent` / `createTextNode`. A
  value of `<img onerror=...>` renders as those literal characters.
- **Attribute positions** are written with `setAttribute`. A value cannot
  terminate the attribute or open a new tag, because it is never parsed.

```js
const evil = '<img src=x onerror="alert(1)">';
html`<p>${evil}</p>`        // renders the string, harmless
html`<p title=${evil}></p>` // an attribute value, harmless
```

So there is no escaping to do, and no way to forget it. This holds for the
initial render and for every reactive update after it.

## The escape hatches, named

Three places intentionally let you hand the browser something live. Each one
is syntactically explicit — you cannot wander into them:

1. **`.innerHTML=${value}`** — a property binding assigns the property you
   named. Binding `.innerHTML` means *you* are asserting the value is safe
   HTML. Never point it at data you did not author; if you must render rich
   text, sanitize it first (for example with DOMPurify).
2. **URL attributes** — `href=${url}` writes whatever string you pass, and
   `javascript:` URLs execute on click. Validate the scheme of any
   user-supplied URL (`http:`/`https:`/`mailto:`) before binding it.
3. **`css` interpolation** — interpolating into a `css` template inlines text
   into a stylesheet. It exists so *author* sheets and `vars()` tokens
   compose. Runtime and user-influenced values belong in [custom
   properties](../../guides/styling/), which are inert values, not CSS text.

## Content Security Policy

The runtime contains no `eval`, no `new Function`, and no string-to-code path
of any kind, so a strict `script-src` policy works unmodified.

Under [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
(`require-trusted-types-for 'script'`), template parsing goes through a policy
named `alacris` that passes the static template strings through unchanged —
sound, because values never travel that path. Allow it alongside your own
policies:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types alacris
```

A `.innerHTML=${value}` binding is deliberately *not* covered by the policy:
under Trusted Types the browser will reject a plain string there unless you
pass `TrustedHTML` from your own (sanitizing) policy — which is exactly the
enforcement you turned Trusted Types on for.

## The store blocks prototype pollution

A reactive store is exactly where applications merge parsed JSON, and
`__proto__` is the one string key where a plain assignment mutates the
prototype chain instead of the object. The store's proxy refuses to walk or
write it, and closes the `constructor` route to the same place:

- `state['__proto__']` reads as `undefined` — the classic two-key gadget
  `state[a][b] = v` with attacker-controlled keys has nothing to land on.
- The inherited `constructor` also reads as `undefined`, closing the
  three-key variant `state[a][b][c] = v` that walks
  `constructor.prototype`. An **own** key named `constructor` (data you
  stored) still reads back normally.
- Assigning `__proto__` through the store (including via `Object.assign(state,
  JSON.parse(input))`, where JSON can carry an own `__proto__` key) is
  silently dropped, so the merge keeps working and the prototype chain does
  not move.
- `Object.getPrototypeOf`, `instanceof`, and normal inheritance are
  unaffected.

This is defense in depth, not permission to trust input: validate the shape of
anything you merge into state.

## Supply chain

- **Zero runtime dependencies.** What you audit is what runs.
- **No install scripts.** The package has no `postinstall` or lifecycle hooks.
- `dist/` is built in CI from the sources in the same package — `src/` ships
  alongside it, so you can diff what you serve against what you read.
- Pin CDN URLs to an exact version in production
  (`https://cdn.jsdelivr.net/npm/alacris@0.5.0/dist/alacris.js`), or use
  [subresource-integrity-capable tooling](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
  if your pipeline supports it.

## Reporting a vulnerability

Please report suspected vulnerabilities privately via
[GitHub security advisories](https://github.com/bmartel/alacris/security/advisories/new)
rather than a public issue. See
[SECURITY.md](https://github.com/bmartel/alacris/blob/main/SECURITY.md) for
the full policy.
