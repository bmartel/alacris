# Alacris starter

A small app that **uses** [`@alacris/ui`](https://www.npmjs.com/package/@alacris/ui). It is not the design system.

The published package lives in [`ui/`](../ui/) of this repo. This folder is the copy-paste starting point: install, theme, render tags, submit a form. The kitchen sink (every component plus a live theme playground) is on the docs site at [bmartel.github.io/alacris/ui](https://bmartel.github.io/alacris/ui/), and at `http://localhost:5173/ui/` after `npm run demo`.

**Docs:** [Live catalog](https://bmartel.github.io/alacris/ui/) · [Getting started](https://bmartel.github.io/alacris/ui/getting-started/) · [Using it from a framework](https://bmartel.github.io/alacris/ui/frameworks/)

## Run this example

From a clone of the [Alacris repo](https://github.com/bmartel/alacris):

```bash
npm install
npm run demo
```

Open `http://localhost:5173/starter/`. The import map in `index.html` points at the local `@alacris/core` build and the `ui/` source so you can change a component and refresh.

## Install in your project

```bash
npm install @alacris/ui
```

That pulls in `@alacris/core` as well. Theme first, so the first paint is already themed:

```js
import { applyTheme } from '@alacris/ui';

applyTheme({ seed: '#e8ad18' });
```

```html
<ui-button>Hello</ui-button>
<ui-text-field label="Email" name="email" clearable></ui-text-field>
<ui-switch label="Dark mode"></ui-switch>
```

Importing `@alacris/ui` registers every component. For a smaller page, import only what you use:

```js
import { applyTheme } from '@alacris/ui/theme';
import '@alacris/ui/components/ui-button.js';
import '@alacris/ui/components/ui-text-field.js';

applyTheme({ seed: '#e8ad18' });
```

Named controls (`ui-text-field`, `ui-switch`, `ui-checkbox`, `ui-select`, …) are **form-associated**. Give them a `name` and they submit, reset, and follow `<fieldset disabled>` like native fields — see `app.js` in this folder.

Do not also load a CDN copy of `@alacris/core` on the same page as an npm install. Two copies means two reactive graphs, and updates stop crossing the boundary.

### Without a bundler

The published package is plain ESM. Point an import map at pinned CDN builds:

```html
<script type="importmap">
{
  "imports": {
    "@alacris/core": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.3/dist/alacris.js",
    "@alacris/ui": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/index.js",
    "@alacris/ui/theme": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/theme/index.js",
    "@alacris/ui/components/": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/components/"
  }
}
</script>
<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>
```

The URLs pin `@alacris/core@0.11.3` and `@alacris/ui@0.3.0`. Never mix two versions of `@alacris/core` on one page — two copies means two reactive graphs.

## Using it from a framework

The tags are real custom elements. There is no adapter package. Register them once at the app entry, then render HTML.

Every Alacris prop is both an attribute and a property. Frameworks disagree about which they set (React 18 sets attributes; Vue, Svelte, Angular, and Solid set properties). Both paths work.

Alacris does **not** server-render shadow trees. Put content that must be visible before JavaScript in a slot. The element upgrades when the script loads; properties assigned before upgrade are replayed.

### HTML / Vite / esbuild

Same as this folder. Import `@alacris/ui` once in the entry module. Vite and esbuild resolve the specifiers with no extra config.

```js
// main.js
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });
```

### React 19

React 19 sets properties on unknown tags and maps `onX` to custom events:

```jsx
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });

export function Form() {
  return (
    <>
      <ui-text-field label="Email" name="email" />
      <ui-button onClick={() => {}}>Save</ui-button>
    </>
  );
}
```

### React 18

Every value is set as an attribute string. Primitives coerce. Objects and custom events need a ref:

```jsx
import { useEffect, useRef } from 'react';

function Form() {
  const field = useRef(null);
  useEffect(() => {
    const el = field.current;
    const on = (e) => console.log(e.detail);
    el.addEventListener('input', on);
    return () => el.removeEventListener('input', on);
  }, []);
  return <ui-text-field ref={field} label="Email" name="email" />;
}
```

### Next.js (App Router)

Mark the module that imports `@alacris/ui` as a Client Component. Custom elements do not SSR:

```jsx
'use client';
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });

export function Form() {
  return <ui-button>Save</ui-button>;
}
```

```js
// next.config.js
const nextConfig = {
  transpilePackages: ['@alacris/core', '@alacris/ui'],
};
export default nextConfig;
```

Put visible-before-JS copy in a slot, or in a sibling of the custom element, not inside the component's shadow tree.

### Vue 3 and Nuxt

```vue
<script setup>
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });
</script>

<template>
  <ui-text-field label="Email" name="email" @input="onInput" />
  <ui-button @click="onSave">Save</ui-button>
</template>
```

Tell Vue the tag is a custom element so it does not warn and does not try to resolve it as a Vue component:

```js
// vite.config.js  (Vue)
import vue from '@vitejs/plugin-vue';
export default {
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith('ui-') } } }),
  ],
};
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { compilerOptions: { isCustomElement: (t) => t.startsWith('ui-') } },
});
```

Call `applyTheme` from a client-only plugin (`<ClientOnly>` / `if (import.meta.client)`), not from a server plugin.

### Svelte and SvelteKit

```svelte
<script>
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>

<ui-text-field label="Email" name="email" />
<ui-button on:click={onSave}>Save</ui-button>
```

Svelte 5 uses `onclick` instead of `on:click`. SvelteKit: import `@alacris/ui` from a `+page.js` / layout that runs in the browser (`export const ssr = false` on that subtree, or dynamic `import()` in `onMount`).

### Angular

```ts
// main.ts
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });
```

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-form',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ui-text-field label="Email" name="email"></ui-text-field>
    <ui-button (click)="onSave()">Save</ui-button>
  `,
})
export class FormComponent {
  onSave() {}
}
```

Property bindings (`[value]="x"`) set properties. Attribute bindings (`value="x"`) set attributes. Both work.

### Solid and SolidStart

```jsx
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });

export function Form() {
  return (
    <>
      <ui-text-field label="Email" name="email" />
      <ui-button onClick={onSave}>Save</ui-button>
    </>
  );
}
```

Solid sets properties. In SolidStart, import `@alacris/ui` from a client-only island / `"use client"` equivalent so `applyTheme` does not run on the server.

### Preact

Same tags as React 19. Preact sets properties on custom elements. Use `onClick` for the native click; `addEventListener` for custom events such as `input` / `change` from `ui-text-field`.

### Astro

```astro
---
---
<ui-button>Hello</ui-button>

<script>
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>
```

The `<script>` is bundled and runs in the browser. Server-rendered markup around the tag is slotted content and is visible before hydration.

### Lit

Alacris UI is already custom elements. Import once, then use the tags in a Lit template:

```js
import { LitElement, html } from 'lit';
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });

class MyPage extends LitElement {
  render() {
    return html`<ui-button @click=${this.save}>Save</ui-button>`;
  }
}
```

Share **one** `@alacris/core` with Lit on the page. Do not import a second copy from a CDN.

## Using it from a backend

Server-rendered HTML is the easy case. Emit the tags and their attributes; the element upgrades when the module loads. Script order does not matter: properties assigned before the definition arrives are replayed.

Load **one** copy of `@alacris/core` via an import map (or your bundler), then `applyTheme`.

### Rails (import maps)

```ruby
# config/importmap.rb
pin "@alacris/core", to: "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.3/dist/alacris.js"
pin "@alacris/ui", to: "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/index.js"
```

```erb
<%# app/views/layouts/application.html.erb %>
<%= javascript_importmap_tags %>
<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>

<ui-button><%= t('save') %></ui-button>
<ui-text-field name="email" label="Email" value="<%= user.email %>"></ui-text-field>
```

With jsbundling-rails / Vite Ruby, `npm install @alacris/ui` and import from your pack the same as any other ESM package.

### Django

Put the import map and module script on the base template. Emit tags from templates:

```html
{# templates/base.html #}
<script type="importmap">
{
  "imports": {
    "@alacris/core": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.3/dist/alacris.js",
    "@alacris/ui": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/index.js"
  }
}
</script>
<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>
```

```html
<ui-text-field name="email" label="Email" value="{{ user.email }}"></ui-text-field>
<ui-button type="submit">{% trans "Save" %}</ui-button>
```

Django forms: render the widget as the custom element (a small `Widget` subclass whose `template_name` is the tag) or keep a native input and progressively enhance. Form-associated `ui-*` controls post like `<input>` when they have `name`.

### Laravel (Blade + Vite)

```js
// resources/js/app.js
import { applyTheme } from '@alacris/ui';
applyTheme({ seed: '#e8ad18' });
```

```blade
{{-- resources/views/layouts/app.blade.php --}}
@vite(['resources/js/app.js'])

<ui-button>{{ __('Save') }}</ui-button>
<ui-text-field name="email" label="Email" value="{{ old('email', $user->email) }}"></ui-text-field>
```

### Phoenix

```html
<%# lib/my_app_web/components/layouts/root.html.heex %>
<script type="importmap">
{
  "imports": {
    "@alacris/core": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.3/dist/alacris.js",
    "@alacris/ui": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/index.js"
  }
}
</script>
<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>
```

```heex
<ui-button>Save</ui-button>
<ui-text-field name="email" label="Email" value={@user.email}></ui-text-field>
```

LiveView: the tag is a DOM node. Avoid `innerHTML` replacements that destroy it; patch attributes and let the element keep its identity. For a LiveView-native runtime, see [Alacris-Go](https://github.com/bmartel/alacris-go).

### Express, Fastify, and other Node servers

Serve the same static HTML + import map as this folder. Template with any engine (`ejs`, `nunjucks`, `lit-html` on the server for markup only):

```html
<ui-button><%= label %></ui-button>
```

Do not call `applyTheme` in Node. It writes a document stylesheet.

### Go (`html/template`)

```go
t.Execute(w, user)
```

```html
<ui-text-field name="email" label="Email" value="{{.Email}}"></ui-text-field>
<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>
```

### ASP.NET / Razor

```cshtml
<ui-button>Save</ui-button>
<ui-text-field name="Email" label="Email" value="@Model.Email"></ui-text-field>

<script type="module">
  import { applyTheme } from '@alacris/ui';
  applyTheme({ seed: '#e8ad18' });
</script>
```

Add the import map in `_Layout.cshtml`. If you bundle with esbuild or Vite, `npm install @alacris/ui` and import from `wwwroot` / your pack.

### Spring / Thymeleaf

```html
<script type="importmap" th:inline="none">
{
  "imports": {
    "@alacris/core": "https://cdn.jsdelivr.net/npm/@alacris/core@0.11.3/dist/alacris.js",
    "@alacris/ui": "https://cdn.jsdelivr.net/npm/@alacris/ui@0.3.0/src/index.js"
  }
}
</script>
<ui-text-field name="email" label="Email" th:attr="value=${user.email}"></ui-text-field>
```

### HTMX

HTMX swaps HTML. Custom elements in the swapped fragment upgrade when they connect. After `htmx:afterSwap`, the new `ui-*` tags work if `@alacris/ui` is already loaded on the page.

Do not swap out the `<script type="importmap">` or reload `@alacris/core` on every request. Keep the module on the layout; swap only the body fragment.

Forms: `hx-post` on a `<form>` that contains named `ui-*` controls sends the same fields a native form would.

## Theming and motion

```js
import { createTheme, applyTheme, setScheme, toggleScheme } from '@alacris/ui/theme';

applyTheme({ seed: '#e8ad18' });
setScheme('dark');

applyTheme(createTheme({
  colors: { primary: '#e8ad18', tertiary: '#00695c' },
  typography: { brand: 'Inter, sans-serif' },
  shape: { radius: 0.5 },
}));
```

`applyTheme` writes **one** document-level stylesheet of `--ui-*` custom properties. Three places to intervene: re-theme the system, re-skin one component type (`ui-button { --ui-button-radius: 4px; }`), or `::part` on one instance.

Full guides: [theming](../ui/docs/theming.md), [motion](../ui/docs/motion.md), [component catalog](../ui/docs/components.md).

## License

MIT — same as Alacris.
