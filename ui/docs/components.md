# Component catalog

Assembled from each component's file header by `scripts/catalog.mjs` — the
headers are the source of truth. 68 components. Every component
also exports `themeVars` (when it declares component tokens); `themeVars.names`
is the machine-readable custom-property list.

## `<ui-accordion-item>`

one expandable panel inside &lt;ui-accordion&gt;.

| | |
| --- | --- |
| `@prop` | {string}  value=''       — REQUIRED identity of the panel (reported in events) |
| `@prop` | {boolean} expanded=false |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  headline=''    — header text |
| `@event` | ui-accordion-toggle — header activated; detail: { value, expanded } |
| `@slot` | (default) — panel content |
| `@part` | header  — the header &lt;button&gt; |
| `@part` | content — the collapsible region |
| `@part` | body    — padded wrapper around the default slot |
| `@vars` | see `t` below (`themeVars.names`)  Expand/collapse animates block-size from the measured content height; in environments without layout (zero heights) the animation is skipped and the state applies instantly. The content region gets `hidden` only AFTER the collapse animation completes. |

Source: [`src/components/ui-accordion-item.js`](../src/components/ui-accordion-item.js)

## `<ui-accordion>`

groups &lt;ui-accordion-item&gt; panels.

  &lt;ui-accordion&gt;
    &lt;ui-accordion-item value="a" headline="First"&gt;…&lt;/ui-accordion-item&gt;
    &lt;ui-accordion-item value="b" headline="Second"&gt;…&lt;/ui-accordion-item&gt;
  &lt;/ui-accordion&gt;

| | |
| --- | --- |
| `@prop` | {boolean} multi=false — allow several panels open at once; when false, expanding one collapses the others |
| `@event` | change — a panel was toggled by the user; detail: { value } |
| `@slot` | (default) — &lt;ui-accordion-item&gt; children |
| `@vars` | see `t` below (`themeVars.names`)  Coordination rides the bubbling `ui-accordion-toggle` event from the items, so only user interaction triggers single-open collapse; programmatic `expanded` writes on an item are left alone. |

Source: [`src/components/ui-accordion.js`](../src/components/ui-accordion.js)

## `<ui-alert>`

a severity-colored callout for statuses and messages.

  &lt;ui-alert severity="success" title="Saved" dismissible @dismiss=${remove}&gt;
    Your changes are safe.
    &lt;ui-button slot="action" variant="text"&gt;Undo&lt;/ui-button&gt;
  &lt;/ui-alert&gt;

Live-region semantics: the host defaults to role="status" (announced
politely). If the alert appears dynamically in response to an event and must
interrupt, set role="alert" on the element yourself — an author-set role is
never overwritten.

Dismissing: the close button collapses the alert (height + opacity), then
emits `dismiss`. The PARENT owns the DOM and removes the element (or flips
the condition rendering it).

| | |
| --- | --- |
| `@prop` | {string}  severity='info'  — info \| success \| warning \| error |
| `@prop` | {string}  variant='tonal'  — tonal \| filled \| outlined |
| `@prop` | {boolean} dismissible=false — shows a trailing close button |
| `@prop` | {string}  icon=''  — leading icon override; defaults per severity (info → 'info', success → 'check-circle', warning → 'warning', error → 'error') |
| `@prop` | {string}  title='' — optional bold first line |
| `@event` | dismiss — close button pressed, after the collapse animation |
| `@slot` | (default) — message body |
| `@slot` | action    — trailing action, e.g. a text &lt;ui-button&gt; |
| `@part` | container, icon, title, message, action, close |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-alert.js`](../src/components/ui-alert.js)

## `<ui-app-bar>`

the Material top app bar.

  &lt;ui-app-bar variant="small" scroll-elevate&gt;
    &lt;ui-icon-button slot="navigation" icon="menu" label="Menu"&gt;&lt;/ui-icon-button&gt;
    Page title
    &lt;ui-icon-button slot="actions" icon="search" label="Search"&gt;&lt;/ui-icon-button&gt;
  &lt;/ui-app-bar&gt;

The host is position:sticky at the top. `elevated` forces the on-scroll
container tint + shadow; `scrollElevate` listens to window scroll and
applies it automatically once the page is scrolled (listener removed when
the prop turns off or the element leaves the document).

| | |
| --- | --- |
| `@prop` | {string}  variant='small' — small \| center \| medium \| large |
| `@prop` | {boolean} elevated=false  — force the scrolled container/elevation |
| `@prop` | {boolean} scrollElevate=false — auto-elevate once window is scrolled |
| `@slot` | navigation — leading icon button |
| `@slot` | (default)  — title text |
| `@slot` | actions    — trailing icon buttons |
| `@part` | bar — the header surface |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-app-bar.js`](../src/components/ui-app-bar.js)

## `<ui-autocomplete>`

a combobox with a filtering text input.

  &lt;ui-autocomplete label="Fruit" options=${['Apple', 'Banana']}
                   @change=${(e) =&gt; pick(e.detail.value)}&gt;&lt;/ui-autocomplete&gt;

Typing filters the options case-insensitively and opens a listbox panel
while there are matches. ArrowUp/Down move the active option, Enter commits
the active option (or, with `freeSolo`, the raw text), Escape closes, blur
commits an exact label match — or the raw text when `freeSolo` — and
otherwise reverts to the last committed value.

| | |
| --- | --- |
| `@prop` | {string}  label='' |
| `@prop` | {string}  value=''         — the committed value |
| `@prop` | {Array}   options=[]       — strings or { value, label } objects (JSON attribute or property) |
| `@prop` | {string}  variant='filled' — filled \| outlined |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} required=false |
| `@prop` | {string}  name=''          — form participation |
| `@prop` | {string}  placeholder='' |
| `@prop` | {boolean} freeSolo=false   — allow values not present in options |
| `@event` | input  — every keystroke; detail: { value } (the raw text) |
| `@event` | change — committed; detail: { value } |
| `@part` | field, input, label, panel |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-autocomplete.js`](../src/components/ui-autocomplete.js)

## `<ui-avatar>`

a circular avatar: image, initials, or icon.

Fallback chain: `src` image → initials from `name` (first + last word) →
`icon` → slotted content. A broken image (error event) falls back to the
initials automatically. Initials scale with the avatar (~40% of its size).

| | |
| --- | --- |
| `@prop` | {string} src=''   — image URL (object-fit: cover) |
| `@prop` | {string} name=''  — person's name; drives initials and the aria-label fallback |
| `@prop` | {string} icon=''  — registry icon shown when there is no image and no name |
| `@prop` | {string} size=''  — CSS length overriding the 40px default (sets --ui-avatar-size) |
| `@prop` | {string} label='' — accessible name; falls back to `name`, else decorative |
| `@slot` | (default) — custom content when src/name/icon are all empty |
| `@vars` | --ui-avatar-size, --ui-avatar-bg, --ui-avatar-fg, --ui-avatar-radius |

Source: [`src/components/ui-avatar.js`](../src/components/ui-avatar.js)

## `<ui-backdrop>`

a full-screen scrim behind custom overlays.

  &lt;ui-backdrop open=${open} @close=${() =&gt; open(false)}&gt;&lt;/ui-backdrop&gt;

Fades in/out, locks page scroll while open, and requests closing by
emitting `close` when the scrim is clicked — the PARENT owns the state and
flips the signal.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {boolean} invisible=false — transparent scrim (still catches clicks) |
| `@event` | close — scrim clicked; detail: { reason: 'scrim' } |
| `@part` | scrim |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-backdrop.js`](../src/components/ui-backdrop.js)

## `<ui-badge>`

a small status badge anchored to the top-end corner of its
slotted content (an icon button, a nav item, an avatar…).

Hidden while `value` is 0 unless `dot`. Counts above `max` render '99+'
style. Appearing/disappearing animates with a scale-in/out.

| | |
| --- | --- |
| `@prop` | {number}  value=0   — the count; 0 hides the badge (unless `dot`) |
| `@prop` | {number}  max=99    — counts above this render as 'max+' |
| `@prop` | {boolean} dot=false — a plain 8px dot instead of a count |
| `@prop` | {boolean} show=true — master visibility switch |
| `@prop` | {string}  label=''  — accessible meaning of the badge ('3 unread'); empty marks the badge decorative |
| `@slot` | (default) — the anchored content |
| `@part` | badge — the badge pill/dot |
| `@vars` | --ui-badge-bg, --ui-badge-fg, --ui-badge-size, --ui-badge-dot-size, --ui-badge-font |

Source: [`src/components/ui-badge.js`](../src/components/ui-badge.js)

## `<ui-bottom-app-bar>`

the Material bottom app bar.

  &lt;ui-bottom-app-bar&gt;
    &lt;ui-icon-button slot="navigation" icon="menu" label="Menu"&gt;&lt;/ui-icon-button&gt;
    &lt;ui-icon-button slot="actions" icon="search" label="Search"&gt;&lt;/ui-icon-button&gt;
    &lt;ui-fab slot="fab" icon="add"&gt;&lt;/ui-fab&gt;
  &lt;/ui-bottom-app-bar&gt;

A surface for a leading navigation icon, trailing actions, and an optional
FAB. The host flows with the page — pin it with CSS when it should hug the
viewport bottom. Distinct from &lt;ui-bottom-nav&gt;, which is destination tabs.

| | |
| --- | --- |
| `@prop` | {string}  label='Bottom app bar' — accessible name of the toolbar |
| `@prop` | {string} fabAlign='end' — end \| center \| start — where the FAB sits |
| `@slot` | navigation — leading icon button |
| `@slot` | actions    — trailing icon buttons |
| `@slot` | fab        — optional &lt;ui-fab&gt; |
| `@part` | bar, navigation, actions, fab |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-bottom-app-bar.js`](../src/components/ui-bottom-app-bar.js)

## `<ui-bottom-nav>`

the Material navigation bar.

  &lt;ui-bottom-nav value=${route} @change=${(e) =&gt; route(e.detail.value)}&gt;
    &lt;ui-nav-item value="home" icon="home" label="Home"&gt;&lt;/ui-nav-item&gt;
    &lt;ui-nav-item value="search" icon="search" label="Search"&gt;&lt;/ui-nav-item&gt;
  &lt;/ui-bottom-nav&gt;

| | |
| --- | --- |
| `@prop` | {string} value='' — the selected item's `value` |
| `@prop` | {string} label='' — accessible name of the &lt;nav&gt; |
| `@event` | change — a destination was chosen; detail: { value } |
| `@slot` | (default) — &lt;ui-nav-item&gt; children |
| `@part` | bar — the &lt;nav&gt; container |
| `@vars` | see `t` below (`themeVars.names`)  The host is `display: block` and flows with the page — apps that want the bar pinned to the viewport position it themselves (position: fixed; bottom: 0; left: 0; right: 0). Selection reflects down: every `value` write (or slotchange) sets `selected` on the children. Keyboard: one Tab stop, arrow keys rove between items (rovingTabindex, horizontal). |

Source: [`src/components/ui-bottom-nav.js`](../src/components/ui-bottom-nav.js)

## `<ui-breadcrumbs>`

a navigation trail of slotted links.

  &lt;ui-breadcrumbs separator-icon="chevron-right"&gt;
    &lt;a href="/"&gt;Home&lt;/a&gt;
    &lt;a href="/library"&gt;Library&lt;/a&gt;
    &lt;span aria-current="page"&gt;Data&lt;/span&gt;
  &lt;/ui-breadcrumbs&gt;

| | |
| --- | --- |
| `@prop` | {string} separator='/'     — separator text between items |
| `@prop` | {string} separatorIcon=''  — registry icon name; overrides `separator` |
| `@prop` | {string} label='Breadcrumb' — accessible name of the &lt;nav&gt; |
| `@slot` | (default) — the trail items. Children MUST be elements (&lt;a&gt;, &lt;span&gt;, &lt;ui-button variant="text"&gt;, …), never bare text nodes — separators are drawn with ::slotted(*)::before, which only exists on element children. Mark the current page with aria-current="page". |
| `@part` | nav, list |
| `@vars` | see `t` below (`themeVars.names`)  Separators are rendered as generated content on every item but the first: text mode sets the `content` from a private custom property; icon mode masks a currentColor box with the icon's path, so it themes like any glyph. |

Source: [`src/components/ui-breadcrumbs.js`](../src/components/ui-breadcrumbs.js)

## `<ui-button-group>`

joins slotted &lt;ui-button&gt;s into one segmented bar.

Slotted buttons lose their own rounding (their `--ui-button-radius` is
zeroed); the group container carries the full radius and clips, and a 1px
gap lets the container's divider color show between segments — the Material
connected button group.

| | |
| --- | --- |
| `@prop` | {string} label='' — accessible name for the group |
| `@slot` | (default) — the &lt;ui-button&gt; children |
| `@part` | group — the clipping container |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-button-group.js`](../src/components/ui-button-group.js)

## `<ui-button>`

the Material common button, all five variants.

| | |
| --- | --- |
| `@prop` | {string}  variant='filled' — filled \| tonal \| outlined \| text \| elevated |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  type='button'    — button \| submit (submit reaches the enclosing form) |
| `@prop` | {string}  href=''          — renders a link styled as a button |
| `@prop` | {string}  target=''        — link target when href is set |
| `@event` | (native click bubbles; no custom event) |
| `@slot` | (default) — label |
| `@slot` | icon      — leading icon |
| `@slot` | trailing  — trailing icon |
| `@part` | control   — the &lt;button&gt;/&lt;a&gt; |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-button.js`](../src/components/ui-button.js)

## `<ui-card>`

a Material card surface.

| | |
| --- | --- |
| `@prop` | {string}  variant='elevated' — elevated \| filled \| outlined |
| `@prop` | {boolean} interactive=false  — hover elevation + ripple + button semantics |
| `@event` | action — interactive card activated (click/Enter/Space) |
| `@slot` | (default) — card body (compose freely; padding is yours via parts/vars) |
| `@slot` | media     — full-bleed media at the top |
| `@part` | container — the card surface |
| `@part` | body      — padded wrapper around the default slot |
| `@vars` | see `t` below |

Source: [`src/components/ui-card.js`](../src/components/ui-card.js)

## `<ui-carousel-item>`

one slide inside &lt;ui-carousel&gt;.

`selected` is written by the parent carousel; set the carousel's `index`
instead of this prop. Width comes from `--ui-carousel-item-basis` on the
parent (so the carousel variants can size slides without fighting `:host`).
The last item snaps to the end of the track so it can be scrolled fully into
view.

| | |
| --- | --- |
| `@prop` | {boolean} selected=false — managed by the parent &lt;ui-carousel&gt; |
| `@slot` | (default) — slide content |
| `@part` | surface — the snap item |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-carousel-item.js`](../src/components/ui-carousel-item.js)

## `<ui-carousel>`

a Material carousel: snap-scrolling slides with previous /
next controls.

  &lt;ui-carousel label="Photos" variant="multi-browse"&gt;
    &lt;ui-carousel-item&gt;One&lt;/ui-carousel-item&gt;
    &lt;ui-carousel-item&gt;Two&lt;/ui-carousel-item&gt;
  &lt;/ui-carousel&gt;

multi-browse shows several items; uncontained lets slides overflow the
frame; hero makes the selected slide dominate. Selection reflects down as
`selected` on each &lt;ui-carousel-item&gt;. Prev/next (and arrow keys) scroll
the selected slide into view; dragging the track updates `index`. The last
slide snaps to the end of the viewport so a hero (or any oversized) last
item can still become selected.

| | |
| --- | --- |
| `@prop` | {number} index=0 — the selected slide |
| `@prop` | {string} variant='multi-browse' — multi-browse \| uncontained \| hero |
| `@prop` | {string} label='' — accessible name for the region |
| `@event` | change — index moved; detail: { index } |
| `@slot` | (default) — &lt;ui-carousel-item&gt; children |
| `@part` | viewport, track, prev, next |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-carousel.js`](../src/components/ui-carousel.js)

## `<ui-checkbox>`

the Material checkbox with indeterminate support.

The interactive element is a native &lt;button role="checkbox"&gt; sized to a
40px touch target; the visible 18px box sits centered inside it. Clicking
clears `indeterminate` and toggles `checked`. The check/dash is the MD3
2px stroke mark in the 18dp icon, not the generic 24dp `check` glyph.

| | |
| --- | --- |
| `@prop` | {boolean} checked=false |
| `@prop` | {boolean} indeterminate=false — aria-checked="mixed", shows a dash |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  label=''  — visible label; also the accessible name. Empty leaves the control unnamed (authoring error). |
| `@prop` | {string}  name=''   — form field name (submits `value` while checked) |
| `@prop` | {string}  value='on' |
| `@event` | change — detail: { checked, indeterminate: false } |
| `@part` | control — the &lt;button role="checkbox"&gt; (the 40px target) |
| `@part` | box     — the visible 18px box |
| `@part` | label   — the visible label span (omit `label` and this is absent) |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-checkbox.js`](../src/components/ui-checkbox.js)

## `<ui-chip-set>`

a wrapping row of &lt;ui-chip&gt;s with roving-tabindex focus.

When any slotted chip is a filter chip the set is a listbox
(aria-multiselectable mirrors `multi`); otherwise it is a plain group.
Single-select coordination: with `multi=false`, selecting a filter chip
deselects its siblings and the set emits `change` with the selected chip's
`value`; deselecting the active chip emits `change` with ''.

| | |
| --- | --- |
| `@prop` | {string}  label='' — accessible name for the set |
| `@prop` | {boolean} multi=false — allow several filter chips selected at once |
| `@event` | change — single-select mode only; detail: { value } |
| `@slot` | (default) — &lt;ui-chip&gt; children |
| `@vars` | --ui-chip-set-gap |

Source: [`src/components/ui-chip-set.js`](../src/components/ui-chip-set.js)

## `<ui-chip>`

Material chip: assist, filter, input, and suggestion.

The HOST is the interactive element (focusable, role="button" — or
role="option" with aria-selected for filter chips) so that &lt;ui-chip-set&gt;'s
roving tabindex can move focus across plain light-DOM chips.

Filter chips toggle `selected` on click/Enter/Space and emit `change`;
assist/suggestion/input chips just let the native click bubble. A
dismissible chip animates the host collapsing, then emits `dismiss` — the
PARENT owns the list and removes the chip from the DOM; the chip never
removes itself.

| | |
| --- | --- |
| `@prop` | {string}  variant='assist' — assist \| filter \| input \| suggestion |
| `@prop` | {boolean} selected=false   — filter chips only |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  icon=''          — leading icon name (check replaces it while a filter chip is selected) |
| `@prop` | {boolean} dismissible=false — trailing remove button |
| `@prop` | {string}  value=''         — identity within a &lt;ui-chip-set&gt; |
| `@event` | change  — filter chip toggled; detail: { selected } |
| `@event` | dismiss — remove requested (after the collapse animation) |
| `@slot` | (default) — the chip label |
| `@part` | control — the chip surface |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-chip.js`](../src/components/ui-chip.js)

## `<ui-container>`

a centered max-width content wrapper.

  &lt;ui-container size="lg"&gt;…&lt;/ui-container&gt;

| | |
| --- | --- |
| `@prop` | {string}  size='md'    — sm (640px) \| md (960px) \| lg (1280px) \| xl (1536px) \| full (no max width) |
| `@prop` | {boolean} gutters=true — inline padding: space(6), space(4) under 600px |
| `@slot` | (default) |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-container.js`](../src/components/ui-container.js)

## `<ui-date-picker>`

Material date picker: a text-field-style control that
opens a calendar. Docked (default) commits on day click; modal confirms
with OK / Cancel.

  &lt;ui-date-picker label="Event" value=${date}
                  @change=${(e) =&gt; date(e.detail.value)}&gt;&lt;/ui-date-picker&gt;

`value` is an ISO date string (YYYY-MM-DD), or '' for none. Typing an
ISO or locale-formatted date into the field commits on blur / Enter.
Set `range` to pick a start and end; `change` then reports
`{ start, end, value }` where `value` is `start/end`.

| | |
| --- | --- |
| `@prop` | {string}  label='' |
| `@prop` | {string}  value=''         — ISO date (YYYY-MM-DD); range: start/end |
| `@prop` | {boolean} range=false      — pick a start and end date |
| `@prop` | {string}  start=''         — range start ISO |
| `@prop` | {string}  end=''           — range end ISO |
| `@prop` | {string}  variant='filled' — filled \| outlined |
| `@prop` | {string}  presentation='docked' — docked \| modal |
| `@prop` | {string}  min=''           — inclusive ISO lower bound |
| `@prop` | {string}  max=''           — inclusive ISO upper bound |
| `@prop` | {string}  locale=''        — BCP 47 tag; empty uses the runtime locale |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} required=false |
| `@prop` | {string}  name=''          — form participation |
| `@prop` | {string}  placeholder='' |
| `@event` | change — committed; detail: { value } or { start, end, value } when range |
| `@event` | input  — field keystroke; detail: { value } (the raw text) |
| `@event` | open   — calendar visible (after the enter animation); does not bubble |
| `@event` | close  — calendar removed (after the exit animation); does not bubble |
| `@part` | field, input, label, panel, day |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-date-picker.js`](../src/components/ui-date-picker.js)

## `<ui-dialog>`

a modal dialog.

  &lt;ui-dialog open=${open} @close=${() =&gt; open(false)}&gt;
    &lt;span slot="headline"&gt;Discard draft?&lt;/span&gt;
    Your changes will be lost.
    &lt;ui-button slot="actions" variant="text"&gt;Cancel&lt;/ui-button&gt;
    &lt;ui-button slot="actions"&gt;Discard&lt;/ui-button&gt;
  &lt;/ui-dialog&gt;

Opening: set the `open` prop (pass a signal from the parent to stay live).
The dialog animates in, traps focus, and locks page scroll. It requests
closing by emitting `close` with a reason — the PARENT owns the state and
flips the signal; Escape and scrim clicks emit `close` too (unless
`persistent`).

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {boolean} persistent=false — Escape/scrim do not request closing |
| `@prop` | {string}  label=''         — accessible name if no headline slot |
| `@event` | close  — detail: { reason: 'esc' \| 'scrim' \| 'method' } |
| `@event` | opened — enter animation finished |
| `@event` | closed — exit animation finished, DOM removed |
| `@slot` | (default) — body content |
| `@slot` | headline |
| `@slot` | actions   — right-aligned buttons |
| `@part` | scrim, surface, headline, body, actions |
| `@vars` | see `t` below |

Source: [`src/components/ui-dialog.js`](../src/components/ui-dialog.js)

## `<ui-divider>`

a 1px rule separating content, horizontal or vertical.

Props reflect to host attributes so the styling is pure CSS on :host.

| | |
| --- | --- |
| `@prop` | {string}  orientation='horizontal' — horizontal \| vertical |
| `@prop` | {boolean} inset=false  — indented from the start edge (16px) |
| `@prop` | {boolean} middle=false — indented from both edges |
| `@vars` | --ui-divider-color, --ui-divider-thickness  role="separator" with aria-orientation. |

Source: [`src/components/ui-divider.js`](../src/components/ui-divider.js)

## `<ui-drawer>`

a navigation drawer, modal or standard.

  &lt;ui-drawer open=${open} @close=${() =&gt; open(false)}&gt;…nav content…&lt;/ui-drawer&gt;
  &lt;ui-drawer variant="standard" anchor="start" open=${open}&gt;…&lt;/ui-drawer&gt;

Modal: a fixed overlay — scrim plus a full-height panel that slides in from
the anchor side. Focus is trapped and page scroll locked while open. The
PARENT owns `open`: Escape and scrim clicks emit `close` with a reason and
the parent flips the signal. `opened`/`closed` fire after the enter/exit
animations settle.
Standard: an in-flow panel; the host animates its inline size open/closed —
no scrim, no trap.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {string}  variant='modal' — modal \| standard |
| `@prop` | {string}  anchor='start'  — start \| end (which edge it slides from) |
| `@prop` | {string}  label=''        — accessible name; falls back to "Navigation" |
| `@event` | close  — modal dismissed; detail: { reason: 'esc' \| 'scrim' } |
| `@event` | opened — modal enter animation finished |
| `@event` | closed — modal exit animation finished, DOM removed |
| `@slot` | (default) — drawer content |
| `@part` | surface, scrim |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-drawer.js`](../src/components/ui-drawer.js)

## `<ui-fab-menu>`

a Material FAB menu: a trigger FAB that expands related
actions stacked above it.

  &lt;ui-fab-menu&gt;
    &lt;ui-fab slot="trigger" icon="add"&gt;&lt;/ui-fab&gt;
    &lt;ui-fab icon="edit" label="Edit" size="sm"&gt;&lt;/ui-fab&gt;
    &lt;ui-fab icon="send" label="Send" size="sm"&gt;&lt;/ui-fab&gt;
  &lt;/ui-fab-menu&gt;

The PARENT may pass `open`; clicking the trigger toggles it and emits
`open`/`close`. Related actions are a disclosure of buttons (not a menu
widget) so slotted `&lt;ui-fab&gt;`s keep their native button semantics.
Escape closes and returns focus to the trigger.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {string}  label='' — accessible name for the action list |
| `@event` | open  — menu visible (after the enter animation); does not bubble |
| `@event` | close — menu removed (after the exit animation); does not bubble |
| `@slot` | trigger  — the &lt;ui-fab&gt; that toggles the menu |
| `@slot` | (default) — related &lt;ui-fab&gt; actions |
| `@part` | actions, trigger |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-fab-menu.js`](../src/components/ui-fab-menu.js)

## `<ui-fab>`

the Material floating action button, regular and extended.

A non-empty `label` renders the extended FAB (icon + text) and is always the
accessible name, extended or not.

| | |
| --- | --- |
| `@prop` | {string}  icon=''           — registry icon name (or slot custom content) |
| `@prop` | {string}  label=''          — extended-FAB text; always used as aria-label (falls back to the icon name when empty) |
| `@prop` | {string}  variant='primary' — primary \| secondary \| tertiary \| surface |
| `@prop` | {string}  size='md'         — sm (40px) \| md (56px) \| lg (96px) |
| `@prop` | {boolean} disabled=false |
| `@event` | (native click bubbles; no custom event) |
| `@slot` | (default) — custom icon content when `icon` is empty |
| `@part` | control   — the &lt;button&gt; |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-fab.js`](../src/components/ui-fab.js)

## `<ui-icon-button>`

a 40px icon button, optionally a toggle.

| | |
| --- | --- |
| `@prop` | {string}  icon=''          — registry icon name (or slot an &lt;ui-icon&gt;) |
| `@prop` | {string}  selectedIcon=''  — icon while selected (toggle mode; defaults to `icon`) |
| `@prop` | {string}  label=''         — REQUIRED accessible name |
| `@prop` | {string}  variant='standard' — standard \| filled \| tonal \| outlined |
| `@prop` | {boolean} toggle=false     — makes it a pressed-state toggle |
| `@prop` | {boolean} selected=false   — toggle state |
| `@prop` | {boolean} disabled=false |
| `@event` | change — toggle flipped; detail: { selected } |
| `@slot` | (default) — custom icon content when `icon` is empty |
| `@part` | control — the &lt;button&gt; |
| `@vars` | see `t` below |

Source: [`src/components/ui-icon-button.js`](../src/components/ui-icon-button.js)

## `<ui-icon>`

an icon from the registry, or any slotted SVG.

Names are kebab-case (`arrow-forward`). Underscores are accepted
(`arrow_forward`). `iconNames()` lists the built-in set; apps add more
with `registerIcons({ name: 'M…' })`. An unknown name logs a warning
once and renders a placeholder instead of an empty hole.

| | |
| --- | --- |
| `@prop` | {string} name=''  — registry name; empty renders the slot |
| `@prop` | {string} label='' — accessible name; empty marks the icon decorative |
| `@prop` | {string} size=''  — CSS length; overrides --ui-icon-size for this element |
| `@slot` | (default) — a custom &lt;svg&gt; when no name is given |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-icon.js`](../src/components/ui-icon.js)

## `<ui-list-item>`

one row of a &lt;ui-list&gt;.

One line (56px) by default; supplying supporting text (prop or slot) makes
it two lines (72px). `interactive` adds button semantics, a state layer and
a ripple; `href` renders the row as a link instead. Activation emits only
the native (bubbling) click — no custom event.

| | |
| --- | --- |
| `@prop` | {string}  headline=''    — primary text (or use the default slot) |
| `@prop` | {string}  supporting=''  — secondary text (or use the supporting slot) |
| `@prop` | {boolean} interactive=false — state layer + ripple + role="button" |
| `@prop` | {string}  href=''        — renders the row as an &lt;a&gt; |
| `@prop` | {boolean} selected=false — secondaryContainer background |
| `@prop` | {boolean} disabled=false |
| `@slot` | (default)  — headline content when the prop is empty |
| `@slot` | leading    — icon / avatar / checkbox |
| `@slot` | supporting — secondary line when the prop is empty |
| `@slot` | trailing   — trailing meta text or icon |
| `@part` | control — the row element (&lt;div&gt; or &lt;a&gt;) |
| `@vars` | see `t` below |

Source: [`src/components/ui-list-item.js`](../src/components/ui-list-item.js)

## `<ui-list>`

a Material list container for &lt;ui-list-item&gt; children.

| | |
| --- | --- |
| `@prop` | {string} label='' — accessible name for the list |
| `@slot` | (default) — &lt;ui-list-item&gt; elements (and &lt;ui-divider&gt;s) |
| `@vars` | --ui-list-bg, --ui-list-pad-block  role="list" on the host; items carry role="listitem". |

Source: [`src/components/ui-list.js`](../src/components/ui-list.js)

## `<ui-loading-indicator>`

the Material loading indicator: morphing dots,
distinct from determinate &lt;ui-progress&gt; / &lt;ui-spinner&gt;.

  &lt;ui-loading-indicator label="Loading"&gt;&lt;/ui-loading-indicator&gt;
  &lt;ui-loading-indicator variant="contained"&gt;&lt;/ui-loading-indicator&gt;

Always indeterminate. `contained` draws the dots on a tonal pill.

| | |
| --- | --- |
| `@prop` | {string} variant='uncontained' — uncontained \| contained |
| `@prop` | {string} label='Loading'       — accessible name |
| `@part` | track, dot |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-loading-indicator.js`](../src/components/ui-loading-indicator.js)

## `<ui-menu-item>`

one action inside &lt;ui-menu&gt;.

The host carries the `menuitem` semantics so the menu's roving tabindex can
manage it directly in the light DOM.

| | |
| --- | --- |
| `@prop` | {string}  value=''       — reported in the menu's `select` detail |
| `@prop` | {string}  icon=''        — leading registry icon |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} danger=false   — error color for destructive actions |
| `@event` | ui-menu-select — internal; detail: { value } (consumed by &lt;ui-menu&gt;) |
| `@slot` | (default) — label |
| `@slot` | icon      — custom leading icon when `icon` is empty |
| `@slot` | trailing  — trailing hint (keyboard shortcut, badge) |
| `@part` | control — the styled item surface |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-menu-item.js`](../src/components/ui-menu-item.js)

## `<ui-menu>`

a menu anchored to a slotted trigger.

  &lt;ui-menu placement="bottom-start" @select=${(e) =&gt; ...}&gt;
    &lt;ui-icon-button slot="anchor" icon="more-vert" label="More"&gt;&lt;/ui-icon-button&gt;
    &lt;ui-menu-item value="edit" icon="edit"&gt;Edit&lt;/ui-menu-item&gt;
    &lt;ui-menu-item value="delete" icon="delete" danger&gt;Delete&lt;/ui-menu-item&gt;
  &lt;/ui-menu&gt;

The "anchor" slot renders inline; clicking it toggles the menu. The panel is
position:fixed, anchored to the slotted trigger, flips when it would
overflow, and stays glued through scroll/resize. While open, focus moves to
the first item and arrows rove vertically; Escape closes and refocuses the
anchor, Tab and outside pointerdown close. Selecting an item emits `select`
and closes.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {string}  placement='bottom-start' — side[-alignment] (see util/position.js) |
| `@event` | select — an item was chosen; detail: { value } |
| `@event` | open   — panel visible (after the enter animation); does not bubble |
| `@event` | close  — panel removed (after the exit animation); does not bubble |
| `@slot` | anchor    — the trigger element |
| `@slot` | (default) — &lt;ui-menu-item&gt; children |
| `@part` | panel — the floating menu surface |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-menu.js`](../src/components/ui-menu.js)

## `<ui-nav-item>`

one destination inside &lt;ui-bottom-nav&gt; or &lt;ui-nav-rail&gt;.

| | |
| --- | --- |
| `@prop` | {string}  value=''      — REQUIRED identity of the destination |
| `@prop` | {string}  icon=''       — registry icon name |
| `@prop` | {string}  activeIcon='' — icon while selected (defaults to `icon`) |
| `@prop` | {string}  label=''      — visible label (and the accessible name) |
| `@prop` | {boolean} selected=false — managed by &lt;ui-bottom-nav&gt; |
| `@prop` | {boolean} disabled=false |
| `@event` | ui-nav-select — activated; detail: { value } |
| `@slot` | icon — custom icon content when `icon` is empty |
| `@part` | control — the &lt;button&gt; |
| `@part` | pill    — the 56×32 icon container |
| `@vars` | see `t` below (`themeVars.names`)  Focus: the host is the roving tab stop (&lt;ui-bottom-nav&gt; assigns tabindex); focus is forwarded to the inner button so Enter/Space activate natively. |

Source: [`src/components/ui-nav-item.js`](../src/components/ui-nav-item.js)

## `<ui-nav-rail>`

the Material navigation rail.

  &lt;ui-nav-rail value=${route} @change=${(e) =&gt; route(e.detail.value)}&gt;
    &lt;ui-fab slot="fab" icon="add"&gt;&lt;/ui-fab&gt;
    &lt;ui-nav-item value="home" icon="home" label="Home"&gt;&lt;/ui-nav-item&gt;
    &lt;ui-nav-item value="search" icon="search" label="Search"&gt;&lt;/ui-nav-item&gt;
  &lt;/ui-nav-rail&gt;

A compact vertical destination list (the large-screen counterpart of
&lt;ui-bottom-nav&gt;). Reuses &lt;ui-nav-item&gt;. The host flows with the page —
pin it with position: sticky/fixed yourself.

| | |
| --- | --- |
| `@prop` | {string} value='' — the selected item's `value` |
| `@prop` | {string} label='' — accessible name of the &lt;nav&gt; |
| `@prop` | {string} align='start' — start \| center \| end (where destinations sit) |
| `@event` | change — a destination was chosen; detail: { value } |
| `@slot` | menu — optional leading icon button (typically "menu") |
| `@slot` | fab  — optional FAB above the destinations |
| `@slot` | (default) — &lt;ui-nav-item&gt; children |
| `@part` | rail — the &lt;nav&gt; container |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-nav-rail.js`](../src/components/ui-nav-rail.js)

## `<ui-option>`

one choice inside &lt;ui-select&gt;.

The host itself is the option (role="option"): it lives in the select's
light DOM and is projected into the select's listbox panel. The select
drives `selected`/`active` (via their attributes) and handles activation;
the option only renders itself and its state layer.

| | |
| --- | --- |
| `@prop` | {string}  value=''       — the value this option contributes (required) |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} selected=false — set by the owning select; mirrors aria-selected |
| `@prop` | {boolean} active=false   — set by the owning select while keyboard-active |
| `@slot` | (default) — the visible label (also used by the select's field text) |
| `@part` | control — the option row |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-option.js`](../src/components/ui-option.js)

## `<ui-pagination>`

page navigation with sibling/boundary windows.

  &lt;ui-pagination count="10" page=${page} @change=${(e) =&gt; page(e.detail.page)}&gt;
  &lt;/ui-pagination&gt;

| | |
| --- | --- |
| `@prop` | {number}  page=1       — current page (1-based) |
| `@prop` | {number}  count=1      — total pages |
| `@prop` | {number}  siblings=1   — pages shown on each side of the current page |
| `@prop` | {number}  boundaries=1 — pages always shown at each end |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  label='Pagination' — accessible name of the &lt;nav&gt; |
| `@event` | change — a page was chosen (numbers, prev, next); detail: { page } |
| `@part` | nav, list |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-pagination.js`](../src/components/ui-pagination.js)

## `<ui-progress>`

Material linear progress.

  &lt;ui-progress label="Upload" value=${pct}&gt;&lt;/ui-progress&gt;   determinate
  &lt;ui-progress label="Loading"&gt;&lt;/ui-progress&gt;               indeterminate

| | |
| --- | --- |
| `@prop` | {number} value=-1 — current value; -1 (any negative) = indeterminate |
| `@prop` | {number} max=100  — value scale |
| `@prop` | {string} label='' — accessible name (aria-label on the progressbar) |
| `@part` | track — the rail |
| `@part` | bar   — the active indicator |
| `@vars` | see `t` below (`themeVars.names`)  The determinate width rides a custom property bound from the template (`--ui-progress-pct`), so a value change is one property write. The indeterminate mode is the Material two-bar translate/scale loop, written as CSS keyframes; its cycle length derives from the motion tokens so a theme's motion scale slows or stops it with everything else. |

Source: [`src/components/ui-progress.js`](../src/components/ui-progress.js)

## `<ui-radio-group>`

owns a set of slotted &lt;ui-radio&gt;s: one selected value,
one tab stop, arrow keys move AND select (ARIA APG radio group pattern).

  &lt;ui-radio-group name="size" value=${size} @change=${(e) =&gt; size.set(e.detail.value)}&gt;
    &lt;ui-radio value="s" label="Small"&gt;&lt;/ui-radio&gt;
    &lt;ui-radio value="m" label="Medium"&gt;&lt;/ui-radio&gt;
  &lt;/ui-radio-group&gt;

| | |
| --- | --- |
| `@prop` | {string}  value='' |
| `@prop` | {string}  name=''  — form participation (submits `value`) |
| `@prop` | {string}  label='' — accessible name for the group |
| `@prop` | {boolean} disabled=false — disables every radio |
| `@prop` | {string}  orientation='vertical' — vertical \| horizontal (layout only; arrows work on both axes per the APG) |
| `@event` | change — detail: { value } |
| `@slot` | (default) — the &lt;ui-radio&gt; children |
| `@part` | group — the layout container |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-radio-group.js`](../src/components/ui-radio-group.js)

## `<ui-radio>`

one Material radio button, managed by &lt;ui-radio-group&gt;.

The interactive element is a native &lt;button role="radio"&gt; on a 40px touch
target. The radio never checks itself: it emits `ui-radio-select` and the
owning group sets `checked` back down and roves the host's tabindex (the
host forwards focus to the inner button).

| | |
| --- | --- |
| `@prop` | {string}  value=''      — REQUIRED identity within the group |
| `@prop` | {boolean} checked=false — set by the owning group |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  label=''      — visible label; also the accessible name. Empty leaves the control unnamed (authoring error). |
| `@event` | ui-radio-select — pressed; detail: { value } (consumed by ui-radio-group) |
| `@part` | control — the &lt;button role="radio"&gt; (the 40px target) |
| `@part` | circle  — the visible 20px ring |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-radio.js`](../src/components/ui-radio.js)

## `<ui-rating>`

a star rating.

A11y choice: the whole rating is ONE control — role="slider" with
aria-valuenow/-min/-max and aria-valuetext, a single tab stop, and arrow
keys adjusting the value (Home=0, End=max). The stars themselves are
pointer affordances only (hover previews, click commits), so there is no
tab-stop-per-star noise for keyboard and screen-reader users.

Clicking the star matching the current value clears the rating to 0
(MUI parity).

| | |
| --- | --- |
| `@prop` | {number}  value=0 |
| `@prop` | {number}  max=5 |
| `@prop` | {boolean} readonly=false — shows the value, no interaction |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  label='Rating' — accessible name |
| `@prop` | {string}  size=''  — CSS length for the stars (overrides --ui-icon-size) |
| `@event` | change — committed; detail: { value } |
| `@part` | root — the slider container |
| `@vars` | see `t` below (`themeVars.names`); the fill color defaults to primary |

Source: [`src/components/ui-rating.js`](../src/components/ui-rating.js)

## `<ui-search>`

Material search bar.

  &lt;ui-search label="Search mail" value=${q}
             @input=${(e) =&gt; q(e.detail.value)}
             @submit=${(e) =&gt; run(e.detail.value)}&gt;&lt;/ui-search&gt;

A pill-shaped field with a leading search icon, a trailing clear control
while there is text, and an optional trailing slot (avatar, voice, …).
Enter emits `submit`. The field chrome is the focus indicator — the inner
input has no extra outline.

`presentation="view"` opens a search view: a back control and a suggestions
list (the default slot) while open. The list overlays the page — it does
not grow the layout. Typing a query opens the view; clearing the field
(keyboard or the clear button) closes it back to the pill bar. Focus on an
empty view still shows recents, but a clear while focused stays on the bar.
The open surface is one extra-large rounded container (bar + overlay list)
with a divider between the field and the list.

| | |
| --- | --- |
| `@prop` | {string}  label='Search'   — accessible name (and the floating placeholder) |
| `@prop` | {string}  value='' |
| `@prop` | {string}  placeholder=''   — shown in the field; falls back to `label` |
| `@prop` | {string}  presentation='bar' — bar \| view |
| `@prop` | {boolean} open=false       — view / suggestions visibility |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  name=''          — form participation |
| `@event` | input  — every keystroke; detail: { value } |
| `@event` | change — committed (blur/Enter); detail: { value } |
| `@event` | submit — Enter pressed; detail: { value } |
| `@event` | clear  — the clear affordance was used |
| `@event` | open   — suggestions visible (after the enter animation); does not bubble |
| `@event` | close  — suggestions removed (after the exit animation); does not bubble |
| `@slot` | leading  — replaces the search icon |
| `@slot` | trailing — after the clear button (avatar, extra actions) |
| `@slot` | (default) — suggestion rows (ui-list-item, …). The panel is a list so those rows keep role="listitem"; it is not a listbox. |
| `@part` | bar, input, panel |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-search.js`](../src/components/ui-search.js)

## `<ui-select>`

Material select: a text-field-style field button that opens a
listbox of slotted &lt;ui-option&gt;s.

  &lt;ui-select label="Flavor" value=${flavor} @change=${(e) =&gt; flavor(e.detail.value)}&gt;
    &lt;ui-option value="vanilla"&gt;Vanilla&lt;/ui-option&gt;
    &lt;ui-option value="mint"&gt;Mint&lt;/ui-option&gt;
  &lt;/ui-select&gt;

Keyboard (APG select-only combobox): Enter/Space/ArrowDown/ArrowUp open;
arrows move the active option, Enter/Space selects it, Escape closes the
panel only — an enclosing dialog keeps its own Escape for a second press,
typing jumps to the next option starting with that letter. The panel closes
on outside pointerdown and returns focus to the field. `open`/`close` do
not bubble: they share those names with dialogs and sheets, and a bubbling
select-close looks like the sheet dismissed itself.

Past a handful of options the panel gets a filter field, because scrolling
is not a way to find one entry among several hundred. It takes focus when
the panel opens, the arrows and Enter work from it, and the options it
hides are hidden from the keyboard too. The query is dropped when the panel
closes.

| | |
| --- | --- |
| `@prop` | {string}  label='' |
| `@prop` | {string}  value=''         — the selected option's value |
| `@prop` | {string}  variant='filled' — filled \| outlined |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} required=false |
| `@prop` | {string}  name=''          — form participation |
| `@prop` | {string}  placeholder=''   — shown while nothing is selected |
| `@prop` | {string}  search='auto'    — auto \| always \| never; 'auto' shows the filter once there are searchThreshold options or more |
| `@prop` | {number}  searchThreshold=8 |
| `@prop` | {string}  searchPlaceholder='Search' |
| `@event` | change — an option was chosen; detail: { value } |
| `@event` | open   — panel enter animation finished; does not bubble |
| `@event` | close  — panel exit animation finished; does not bubble |
| `@slot` | (default) — &lt;ui-option&gt; children (projected into the panel) |
| `@part` | control — the field button (role="combobox") |
| `@part` | label, panel |
| `@vars` | see `t` below (`themeVars.names`)  Note: the combobox's aria-activedescendant references option ids in the host's light DOM; the options also carry aria-selected for AT that walks the composed tree. |

Source: [`src/components/ui-select.js`](../src/components/ui-select.js)

## `<ui-sheet>`

a Material bottom sheet.

  &lt;ui-sheet open=${open} @close=${() =&gt; open(false)}&gt;
    &lt;span slot="headline"&gt;Title&lt;/span&gt;
    Sheet body
    &lt;ui-button slot="actions" variant="text"&gt;Close&lt;/ui-button&gt;
  &lt;/ui-sheet&gt;

Modal (default): a scrim plus a panel that slides up from the bottom.
Focus is trapped and page scroll locked while open. The PARENT owns
`open`: Escape and scrim clicks emit `close` with a reason.
Standard: an in-flow panel that expands from zero height — no scrim,
no trap.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {string}  variant='modal' — modal \| standard |
| `@prop` | {boolean} persistent=false — Escape/scrim do not request closing |
| `@prop` | {string}  label=''         — accessible name if no headline slot |
| `@event` | close  — detail: { reason: 'esc' \| 'scrim' \| 'method' } |
| `@event` | opened — enter animation finished |
| `@event` | closed — exit animation finished, DOM removed |
| `@slot` | (default) — body content |
| `@slot` | headline |
| `@slot` | actions |
| `@part` | scrim, surface, handle, headline, body, actions |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-sheet.js`](../src/components/ui-sheet.js)

## `<ui-side-sheet>`

a Material side sheet for complementary content.

  &lt;ui-side-sheet open=${open} @close=${() =&gt; open(false)}&gt;
    &lt;span slot="headline"&gt;Filters&lt;/span&gt;
    Sheet body
    &lt;ui-button slot="actions" variant="text"&gt;Apply&lt;/ui-button&gt;
  &lt;/ui-side-sheet&gt;

Distinct from &lt;ui-drawer&gt; (navigation) and &lt;ui-sheet&gt; (bottom). Modal
(default): a scrim plus a panel that slides in from the end edge. Focus is
trapped and page scroll locked while open. The PARENT owns `open`. Standard:
an in-flow panel that animates its inline size — no scrim, no trap.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {string}  variant='modal' — modal \| standard |
| `@prop` | {string}  anchor='end'    — start \| end |
| `@prop` | {boolean} persistent=false — Escape/scrim do not request closing |
| `@prop` | {string}  label=''         — accessible name if no headline slot |
| `@event` | close  — detail: { reason: 'esc' \| 'scrim' \| 'method' } |
| `@event` | opened — enter animation finished |
| `@event` | closed — exit animation finished, DOM removed |
| `@slot` | (default) — body content |
| `@slot` | headline |
| `@slot` | actions |
| `@part` | scrim, surface, headline, body, actions |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-side-sheet.js`](../src/components/ui-side-sheet.js)

## `<ui-skeleton>`

a loading placeholder shape.

  &lt;ui-skeleton variant="circular" width="40px" height="40px"&gt;&lt;/ui-skeleton&gt;
  &lt;ui-skeleton width="60%"&gt;&lt;/ui-skeleton&gt;
  &lt;ui-skeleton variant="rectangular" height="120px" animation="wave"&gt;&lt;/ui-skeleton&gt;

Always aria-hidden: a skeleton is decorative. Announce loading state on the
region that will receive the content (aria-busy), not on the placeholder.

| | |
| --- | --- |
| `@prop` | {string} variant='text'    — text \| circular \| rectangular |
| `@prop` | {string} width=''          — CSS length; defaults to 100% |
| `@prop` | {string} height=''         — CSS length; text defaults to 1em |
| `@prop` | {string} animation='pulse' — pulse \| wave \| none |
| `@part` | shape — the placeholder element |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-skeleton.js`](../src/components/ui-skeleton.js)

## `<ui-slider>`

a Material slider on native &lt;input type="range"&gt;s for
keyboard and screen-reader behavior.

  &lt;ui-slider label="Volume" value=${volume}
             @input=${(e) =&gt; volume.set(e.detail.value)}&gt;&lt;/ui-slider&gt;

Bind `value` (or `.value`) to a signal like any other control. `input` /
`change` report a number in `detail.value` (or `detail.start` / `detail.end`
when `range`). The host `.value` is a string, matching a native range
input, so composed-path helpers that look for `typeof node.value ===
'string'` work the same as they do for text fields.

The active track portion is painted with `--ui-slider-fill` (or start/end
when `range`) bound from the template into a gradient; the thumb's
hover/focus halo is a box-shadow state layer.

| | |
| --- | --- |
| `@prop` | {number}  value=0 |
| `@prop` | {number}  min=0 |
| `@prop` | {number}  max=100 |
| `@prop` | {number}  step=1 |
| `@prop` | {boolean} range=false — two thumbs; uses valueStart / valueEnd |
| `@prop` | {number}  valueStart=0 |
| `@prop` | {number}  valueEnd=100 |
| `@prop` | {string}  label=''   — REQUIRED accessible name (aria-label) |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} showValue=false — value bubble above the thumb while focused/dragging (animates in and out) |
| `@prop` | {string}  name=''    — form participation |
| `@event` | input  — every drag/keystroke; detail: { value } or { start, end } |
| `@event` | change — committed value; detail: { value } or { start, end } |
| `@part` | input — the native &lt;input type="range"&gt; (both, when range) |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-slider.js`](../src/components/ui-slider.js)

## `<ui-snackbar>`

a transient bottom-center message, plus `showSnackbar()`,
an imperative service that queues messages through one shared instance.

Declarative (parent owns the state):

  &lt;ui-snackbar open=${open} message="Draft saved" action="Undo"
               @action=${undo} @close=${() =&gt; open(false)}&gt;&lt;/ui-snackbar&gt;

Imperative (fire and forget; FIFO — one visible at a time):

  const { close, closed } = showSnackbar('Message archived', { action: 'Undo' });

The component requests closing by emitting `close` with a reason — the
PARENT flips `open`. `closed` fires after the exit animation finishes.

| | |
| --- | --- |
| `@prop` | {boolean} open=false |
| `@prop` | {string}  message='' |
| `@prop` | {string}  action=''      — label for a trailing text action button |
| `@prop` | {number}  duration=4000  — auto-dismiss after ms; 0 = sticky |
| `@prop` | {boolean} closeButton=false — trailing close icon button |
| `@event` | action — action button pressed |
| `@event` | close  — detail: { reason: 'timeout' \| 'action' \| 'close' \| 'method' } |
| `@event` | opened — enter animation finished |
| `@event` | closed — exit animation finished, DOM removed |
| `@part` | surface, message, action, close |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-snackbar.js`](../src/components/ui-snackbar.js)

## `<ui-spinner>`

Material circular progress.

  &lt;ui-spinner label="Loading"&gt;&lt;/ui-spinner&gt;                 indeterminate
  &lt;ui-spinner label="Upload" value=${pct}&gt;&lt;/ui-spinner&gt;     determinate
  &lt;ui-spinner label="Loading" size="24px"&gt;&lt;/ui-spinner&gt;

| | |
| --- | --- |
| `@prop` | {number} value=-1 — current value; -1 (any negative) = indeterminate |
| `@prop` | {number} max=100  — value scale |
| `@prop` | {string} size=''  — CSS length; overrides --ui-spinner-size (default 48px) |
| `@prop` | {string} label='' — accessible name (aria-label on the progressbar) |
| `@part` | progress — the progressbar wrapper |
| `@vars` | see `t` below (`themeVars.names`)  One SVG circle in a 44-unit viewBox with a 4-unit stroke, so the stroke scales with `size`. Determinate progress binds stroke-dashoffset from the value; indeterminate is the classic rotate + dash-grow loop as CSS keyframes, its cycle derived from the motion tokens. |

Source: [`src/components/ui-spinner.js`](../src/components/ui-spinner.js)

## `<ui-split-button>`

a Material split button: a primary action plus a
connected chevron that opens related actions.

  &lt;ui-split-button variant="filled" @click=${save}&gt;
    Save
    &lt;ui-menu-item slot="menu" value="draft"&gt;Save draft&lt;/ui-menu-item&gt;
    &lt;ui-menu-item slot="menu" value="copy"&gt;Save a copy&lt;/ui-menu-item&gt;
  &lt;/ui-split-button&gt;

The leading segment is the primary action (native click bubbles). Choosing
a menu item emits `select` with that item's value.

| | |
| --- | --- |
| `@prop` | {string}  variant='filled' — filled \| tonal \| outlined \| elevated |
| `@prop` | {boolean} disabled=false |
| `@event` | (native click bubbles from the leading segment) |
| `@event` | select — a menu action was chosen; detail: { value } |
| `@slot` | (default) — leading-segment label |
| `@slot` | icon      — leading icon on the primary action |
| `@slot` | menu      — &lt;ui-menu-item&gt; children |
| `@part` | group, action, chevron |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-split-button.js`](../src/components/ui-split-button.js)

## `<ui-stack>`

a flexbox layout primitive.

  &lt;ui-stack direction="row" gap="4" align="center"&gt;…&lt;/ui-stack&gt;

| | |
| --- | --- |
| `@prop` | {string}         direction='column' — row \| column \| row-reverse \| column-reverse |
| `@prop` | {number\|string}  gap=2   — a spacing step (maps to the --ui-space-N token: 1,2,3,4,5,6,7,8,10,12,16,20,24) or any raw CSS length ('1.5rem', '12px') |
| `@prop` | {string}         align=''   — align-items value ('' leaves the default) |
| `@prop` | {string}         justify='' — justify-content value |
| `@prop` | {boolean}        wrap=false — flex-wrap: wrap |
| `@slot` | (default) |
| `@vars` | (none — spacing flows from the --ui-space-* system tokens) |

Source: [`src/components/ui-stack.js`](../src/components/ui-stack.js)

## `<ui-step>`

one step inside &lt;ui-stepper&gt;.

| | |
| --- | --- |
| `@prop` | {string} label='' |
| `@prop` | {number} index=0            — 0-based position; assigned by &lt;ui-stepper&gt; |
| `@prop` | {string} state='upcoming'   — upcoming \| active \| completed; assigned by &lt;ui-stepper&gt; from its `active` prop |
| `@prop` | {string} optionalText=''    — small secondary line under the label |
| `@part` | indicator — the 24px circle |
| `@part` | label |
| `@vars` | see `t` below (`themeVars.names`)  Presentation only: the circle shows the 1-based number (or a check when completed); &lt;ui-stepper&gt; owns index/state assignment and the connectors. |

Source: [`src/components/ui-step.js`](../src/components/ui-step.js)

## `<ui-stepper>`

a horizontal stepper of &lt;ui-step&gt; children.

  &lt;ui-stepper active=${active}&gt;
    &lt;ui-step label="Cart"&gt;&lt;/ui-step&gt;
    &lt;ui-step label="Shipping" optional-text="Optional"&gt;&lt;/ui-step&gt;
    &lt;ui-step label="Payment"&gt;&lt;/ui-step&gt;
  &lt;/ui-stepper&gt;

| | |
| --- | --- |
| `@prop` | {number} active=0 — index of the active step; steps before it become `completed`, steps after it `upcoming` |
| `@slot` | (default) — &lt;ui-step&gt; children |
| `@part` | row — the flex row wrapping the slot |
| `@vars` | see `t` below (`themeVars.names`)  Presentation only — it emits nothing; wiring next/back navigation to `active` is application logic. On slotchange (and every `active` write) it assigns each child's `index`, `state`, a `data-state` attribute (used by the connector CSS), `role="listitem"`, and `aria-current="step"` on the active step. Connector lines between steps turn primary once the segment before a step is completed. |

Source: [`src/components/ui-stepper.js`](../src/components/ui-stepper.js)

## `<ui-surface>`

a themable surface (the Paper equivalent).

  &lt;ui-surface elevation="2" radius="lg" bg="surface-container"&gt;…&lt;/ui-surface&gt;

| | |
| --- | --- |
| `@prop` | {number}  elevation=0 — shadow level 0..5 (--ui-elevation-N) |
| `@prop` | {string}  radius='md' — none \| xs \| sm \| md \| lg \| xl \| full |
| `@prop` | {string}  bg='surface' — any color role name, kebab or camel ('primary-container', 'surfaceContainerHigh'); text color pairs automatically with the role's on- counterpart when one exists, falling back to on-surface |
| `@prop` | {boolean} outlined=false — 1px outline-variant border |
| `@slot` | (default) |
| `@vars` | (none — every value resolves through the system tokens) |

Source: [`src/components/ui-surface.js`](../src/components/ui-surface.js)

## `<ui-switch>`

the Material switch.

| | |
| --- | --- |
| `@prop` | {boolean} checked=false |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  label=''  — visible label; also the accessible name. Empty leaves the control unnamed (authoring error). |
| `@prop` | {string}  name=''   — form field name (submits 'on'/value while checked) |
| `@prop` | {string}  value='on' |
| `@prop` | {boolean} icons=false — show check/close glyphs in the handle |
| `@event` | change — detail: { checked } |
| `@part` | control — the switch track (role="switch") |
| `@part` | handle |
| `@vars` | see `t` below |

Source: [`src/components/ui-switch.js`](../src/components/ui-switch.js)

## `<ui-tab-panel>`

the content pane paired with a &lt;ui-tab&gt;.

Slot it into &lt;ui-tabs slot="panels"&gt;. The parent sets `active` when its
`value` matches; do not set `active` yourself. The panel is hidden while
inactive and fades in when it becomes active.

| | |
| --- | --- |
| `@prop` | {string}  value=''      — REQUIRED; matched against the tabs' value |
| `@prop` | {boolean} active=false  — managed by the parent &lt;ui-tabs&gt; |
| `@slot` | (default) — panel content |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-tab-panel.js`](../src/components/ui-tab-panel.js)

## `<ui-tab>`

one tab inside &lt;ui-tabs&gt;.

The host element carries the `tab` semantics (role, aria-selected,
focusability) so &lt;ui-tabs&gt;' roving tabindex can manage it directly in the
light DOM. `selected` is written by the parent &lt;ui-tabs&gt;; do not set it
yourself — set the tabs' `value` instead.

| | |
| --- | --- |
| `@prop` | {string}  value=''       — REQUIRED; matched against the tabs' value |
| `@prop` | {string}  icon=''        — leading registry icon |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} selected=false — managed by the parent &lt;ui-tabs&gt; |
| `@event` | ui-tab-select — internal; detail: { value } (consumed by &lt;ui-tabs&gt;) |
| `@slot` | (default) — label |
| `@part` | control — the styled tab surface |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-tab.js`](../src/components/ui-tab.js)

## `<ui-table-footer>`

pagination and row-count for &lt;ui-table&gt;.
Composes &lt;ui-pagination&gt; for the page window and a rows-per-page &lt;select&gt;.

  &lt;ui-table-footer page=${page} page-size="10" row-count=${n}
                   @page=${(e) =&gt; page(e.detail.page)}&gt;&lt;/ui-table-footer&gt;

| | |
| --- | --- |
| `@prop` | {number}  page=1 |
| `@prop` | {number}  pageSize=0       — 0 hides the pager and shows a total only |
| `@prop` | {number}  rowCount=0 |
| `@prop` | {Array}   pageSizeOptions=[] — default 5, 10, 25 |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  label='Table pagination' |
| `@event` | page — page or page-size changed; detail: { page, pageSize } |
| `@part` | footer, range |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-table-footer.js`](../src/components/ui-table-footer.js)

## `<ui-table-toolbar>`

DataGrid chrome: title, selection count, quick filter,
column visibility, density, and CSV export. Built from &lt;ui-search&gt;,
&lt;ui-icon-button&gt;, &lt;ui-menu&gt;, and &lt;ui-checkbox&gt;.

  &lt;ui-table-toolbar headline="Nutrition" quick-filter column-menu
                    density-menu csv-export
                    columns=${cols} hidden-columns=${hidden}
                    @filter=${…} @density=${…}
                    @column-visibility=${…} @export=${…}&gt;
    &lt;ui-button slot="actions"&gt;Add&lt;/ui-button&gt;
  &lt;/ui-table-toolbar&gt;

| | |
| --- | --- |
| `@prop` | {string}  headline='' |
| `@prop` | {string}  supporting='' |
| `@prop` | {number}  selectedCount=0  — when &gt;0 the bar switches to the "N selected" selection state |
| `@prop` | {string}  filter=''        — quick-filter value |
| `@prop` | {boolean} quickFilter=false |
| `@prop` | {boolean} columnMenu=false |
| `@prop` | {boolean} densityMenu=false |
| `@prop` | {boolean} csvExport=false |
| `@prop` | {Array}   columns=[]       — { key, label } (JSON or property) |
| `@prop` | {Array}   hiddenColumns=[] |
| `@prop` | {string}  density='standard' — compact \| standard \| comfortable |
| `@prop` | {boolean} disabled=false |
| `@event` | filter             — quick filter changed; detail: { value } |
| `@event` | density            — density chosen; detail: { density } |
| `@event` | column-visibility  — a column was toggled; detail: { hidden } |
| `@event` | export             — export requested; detail: { format: 'csv' } |
| `@slot` | headline  — replaces the headline text |
| `@slot` | supporting |
| `@slot` | actions   — extra trailing controls (after the built-in tools) |
| `@part` | bar, titles, tools |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-table-toolbar.js`](../src/components/ui-table-toolbar.js)

## `<ui-table>`

Material data-table / DataGrid.

Markup mode — pass a native &lt;table&gt; (adopted into the shadow so cells can
be themed). `data-sortable` / `data-numeric` decorate headers.

  &lt;ui-table label="Nutrition"&gt;
    &lt;table&gt;…&lt;/table&gt;
  &lt;/ui-table&gt;

Data mode — `columns` + `rows`. The grid is `role="table"` (Alacris cannot
bind inside native &lt;tr&gt;). Pipeline (filter → sort → group → paginate →
aggregate) lives in `util/table.js`. Chrome is &lt;ui-table-toolbar&gt; and
&lt;ui-table-footer&gt;, composed from search, menus, checkboxes, and pagination.

  &lt;ui-table headline="Trades" columns=${cols} rows=${rows}
            selectable="multiple" group-by="commodity"
            quick-filter column-menu density-menu csv-export
            page-size="10"&gt;&lt;/ui-table&gt;

Column objects: { key, label, numeric, sortable, width, hidden, align,
  aggregate: 'sum'|'avg'|'min'|'max'|'count', render(row, col), sortValue(row) }

| | |
| --- | --- |
| `@prop` | {string}  label='' |
| `@prop` | {string}  headline='' |
| `@prop` | {string}  supporting='' |
| `@prop` | {string}  variant='outlined' — outlined \| standard |
| `@prop` | {string}  density='standard' — compact \| standard \| comfortable |
| `@prop` | {boolean} dense=false        — alias for density="compact" |
| `@prop` | {boolean} stickyHeader=false |
| `@prop` | {boolean} stickyFirst=false |
| `@prop` | {boolean} striped=false |
| `@prop` | {boolean} loading=false |
| `@prop` | {string}  maxHeight='' |
| `@prop` | {string}  selectable='none'  — none \| single \| multiple |
| `@prop` | {Array}   selected=[] |
| `@prop` | {Array}   columns=[] |
| `@prop` | {Array}   rows=[] |
| `@prop` | {object}  getRowId=null      — (row, index) =&gt; id |
| `@prop` | {string}  sortBy='' |
| `@prop` | {string}  sortDir='asc'      — asc \| desc |
| `@prop` | {string}  sortMode='client'  — client \| server |
| `@prop` | {string}  filter='' |
| `@prop` | {string}  groupBy=''         — column key to group rows |
| `@prop` | {Array}   expandedGroups=[]  — empty means all groups expanded |
| `@prop` | {Array}   hiddenColumns=[] |
| `@prop` | {number}  page=1 |
| `@prop` | {number}  pageSize=0         — 0 shows every row |
| `@prop` | {number}  rowCount=0 |
| `@prop` | {string}  paginationMode='client' — client \| server |
| `@prop` | {Array}   pageSizeOptions=[] |
| `@prop` | {boolean} quickFilter=false |
| `@prop` | {boolean} columnMenu=false |
| `@prop` | {boolean} densityMenu=false |
| `@prop` | {boolean} csvExport=false |
| `@prop` | {string}  csvFileName='table.csv' |
| `@prop` | {string}  emptyText='No results' |
| `@event` | change            — selection; detail: { selected } |
| `@event` | sort              — detail: { key, dir } |
| `@event` | page              — detail: { page, pageSize } |
| `@event` | filter            — detail: { value } |
| `@event` | density           — detail: { density } |
| `@event` | column-visibility — detail: { hidden } |
| `@event` | group             — a group was toggled; detail: { key, expanded, expandedGroups } |
| `@event` | row-click         — detail: { id, row } |
| `@event` | export            — CSV produced; detail: { format, filename } |
| `@slot` | (default) — native &lt;table&gt; (markup mode) |
| `@slot` | toolbar   — replaces the default &lt;ui-table-toolbar&gt; |
| `@slot` | headline, supporting, actions — projected into the default toolbar |
| `@slot` | footer    — replaces the default &lt;ui-table-footer&gt; |
| `@slot` | empty |
| `@part` | container, table |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-table.js`](../src/components/ui-table.js)

## `<ui-tabs>`

Material tabs: a tab bar with an animated active indicator.

  &lt;ui-tabs value="one" label="Demo tabs" @change=${(e) =&gt; ...}&gt;
    &lt;ui-tab value="one" icon="home"&gt;One&lt;/ui-tab&gt;
    &lt;ui-tab value="two"&gt;Two&lt;/ui-tab&gt;
    &lt;ui-tab-panel slot="panels" value="one"&gt;…&lt;/ui-tab-panel&gt;
    &lt;ui-tab-panel slot="panels" value="two"&gt;…&lt;/ui-tab-panel&gt;
  &lt;/ui-tabs&gt;

Tabs go in the default slot, panels in the "panels" slot. The parent
reflects `selected` onto each &lt;ui-tab&gt; and `active` onto each
&lt;ui-tab-panel&gt;, and wires aria-controls/aria-labelledby ids between them.
Activation is AUTOMATIC per the ARIA APG: arrow keys move focus AND select
(one Tab stop for the whole bar via roving tabindex).

| | |
| --- | --- |
| `@prop` | {string} value='' — the selected tab's value |
| `@prop` | {string} variant='primary' — primary \| secondary |
| `@prop` | {string} label='' — accessible name for the tablist |
| `@event` | change — user selected a tab; detail: { value } |
| `@slot` | (default) — &lt;ui-tab&gt; children |
| `@slot` | panels    — &lt;ui-tab-panel&gt; children |
| `@part` | tablist, indicator |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-tabs.js`](../src/components/ui-tabs.js)

## `<ui-text-field>`

Material text field, filled and outlined, floating label.

| | |
| --- | --- |
| `@prop` | {string}  variant='filled' — filled \| outlined |
| `@prop` | {string}  label='' |
| `@prop` | {string}  value='' |
| `@prop` | {string}  type='text'      — any native input type; 'textarea' renders one |
| `@prop` | {string}  placeholder='' |
| `@prop` | {string}  helper=''        — supporting text under the field |
| `@prop` | {string}  error=''         — error message; non-empty switches to error state |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} required=false |
| `@prop` | {boolean} clearable=false  — trailing ✕ while there is content |
| `@prop` | {string}  name=''          — form participation |
| `@prop` | {number}  maxlength=0      — &gt;0 shows a character counter and enforces it |
| `@prop` | {number}  rows=3 |
| `@prop` | {string}  autocomplete=''   — absent unless set; 'off' keeps the browser's saved-value list out of a field whose contents are not a name, an address or a password |
| `@prop` | {string}  autocapitalize='' — 'off' for anything case-sensitive |
| `@prop` | {string}  autocorrect=''    — 'off' to stop substitutions |
| `@prop` | {string}  spellcheck=''     — 'false' for code and query syntax |
| `@prop` | {string}  inputmode='' |
| `@prop` | {string}  enterkeyhint=''           — textarea rows |
| `@event` | input  — every keystroke;   detail: { value } |
| `@event` | change — committed (blur/Enter); detail: { value } |
| `@event` | clear  — the clear affordance was used |
| `@slot` | leading  — icon before the input |
| `@slot` | trailing — icon after the input (replaced by ✕ while clearable+content) |
| `@part` | field, input, label, helper |
| `@vars` | see `t` below |

Source: [`src/components/ui-text-field.js`](../src/components/ui-text-field.js)

## `<ui-text>`

typography, the type scale as an element.

  &lt;ui-text variant="headline-md" as="h2"&gt;Section&lt;/ui-text&gt;

| | |
| --- | --- |
| `@prop` | {string} variant='body-md' — any type role: display\|headline\|title\|body\|label × lg\|md\|sm |
| `@prop` | {string} color=''          — a color role name ('primary', 'onSurfaceVariant', …) |
| `@slot` | (default) |
| `@vars` | (uses the --ui-type-* system tokens directly)  Semantics: &lt;ui-text&gt; is styling only. Keep real headings in your markup (`&lt;h2&gt;&lt;ui-text variant="headline-md"&gt;…&lt;/ui-text&gt;&lt;/h2&gt;`) or set an ARIA role on the host when the document outline needs one. |

Source: [`src/components/ui-text.js`](../src/components/ui-text.js)

## `<ui-time-picker>`

Material time picker: a text-field-style control that
opens an hour/minute chooser. Value is a 24-hour `HH:mm` string.

  &lt;ui-time-picker label="Alarm" value=${time}
                  @change=${(e) =&gt; time(e.detail.value)}&gt;&lt;/ui-time-picker&gt;

The keyboard icon in the panel toggles between the analog dial and the
digital hour/minute grids (MD3 input-method toggle). Hour and minute
faces crossfade; the clock hand rotates with the motion tokens.

| | |
| --- | --- |
| `@prop` | {string}  label='' |
| `@prop` | {string}  value=''         — 24-hour HH:mm, or '' for none |
| `@prop` | {string}  variant='filled' — filled \| outlined |
| `@prop` | {string}  view='clock'     — clock \| input (dial vs digital grid) |
| `@prop` | {string}  hourCycle='12'   — 12 \| 24 |
| `@prop` | {number}  minuteStep=5     — minute choices (1, 5, or 15 typical) |
| `@prop` | {string}  locale=''        — BCP 47 tag; empty uses the runtime locale |
| `@prop` | {boolean} disabled=false |
| `@prop` | {boolean} required=false |
| `@prop` | {string}  name=''          — form participation |
| `@prop` | {string}  placeholder='' |
| `@event` | change — committed; detail: { value } |
| `@event` | input  — field keystroke; detail: { value } (the raw text) |
| `@event` | open   — panel visible (after the enter animation); does not bubble |
| `@event` | close  — panel removed (after the exit animation); does not bubble |
| `@part` | field, input, label, panel, dial |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-time-picker.js`](../src/components/ui-time-picker.js)

## `<ui-toggle-button>`

one Material segmented button, used inside
&lt;ui-toggle-group&gt; (the group draws the outlined container and dividers;
standalone the segment is a flat pill).

Selecting animates a leading check icon in smoothly via width and scale transitions,
adhering to Material Design 3. When an icon is already present, selecting smoothly
crossfades and morphs between the custom icon and the checkmark in both directions.
The button does not own its selection: it emits `ui-toggle` and the group
(or any parent) sets `selected` back down.

| | |
| --- | --- |
| `@prop` | {string}  value=''       — REQUIRED identity within the group |
| `@prop` | {boolean} selected=false — set by the owning group |
| `@prop` | {boolean} disabled=false |
| `@prop` | {string}  icon=''        — optional leading icon |
| `@event` | ui-toggle — pressed; detail: { value } (consumed by ui-toggle-group) |
| `@slot` | (default) — label |
| `@part` | control   — the &lt;button&gt; |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-toggle-button.js`](../src/components/ui-toggle-button.js)

## `<ui-toggle-group>`

Material segmented buttons: an outlined container that
owns the selection of its slotted &lt;ui-toggle-button&gt;s.

  &lt;ui-toggle-group value=${align} @change=${(e) =&gt; align.set(e.detail.value)}&gt;
    &lt;ui-toggle-button value="left"&gt;Left&lt;/ui-toggle-button&gt;
    &lt;ui-toggle-button value="right"&gt;Right&lt;/ui-toggle-button&gt;
  &lt;/ui-toggle-group&gt;

Single-select by default (`value` is the selected string, '' for none;
pressing the selected segment deselects it). With `multi`, `value` is an
array (a JSON array string works as an attribute). Buttons are natural tab
stops — no roving tabindex, per the toolbar-of-toggle-buttons pattern.

| | |
| --- | --- |
| `@prop` | {string\|array} value=''   — selected value, or array when `multi` |
| `@prop` | {boolean} multi=false     — multiple segments may be selected |
| `@prop` | {boolean} disabled=false  — disables every segment |
| `@prop` | {string}  label=''        — accessible name for the group |
| `@event` | change — selection changed; detail: { value } (string, or array when multi) |
| `@slot` | (default) — the &lt;ui-toggle-button&gt; children |
| `@part` | group — the outlined clipping container |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-toggle-group.js`](../src/components/ui-toggle-group.js)

## `<ui-toolbar>`

a Material contextual toolbar: a floating strip of icon
actions, optionally with an attached FAB.

  &lt;ui-toolbar label="Selection"&gt;
    &lt;ui-icon-button icon="edit" label="Edit"&gt;&lt;/ui-icon-button&gt;
    &lt;ui-icon-button icon="delete" label="Delete"&gt;&lt;/ui-icon-button&gt;
    &lt;ui-fab slot="fab" icon="add" size="sm"&gt;&lt;/ui-fab&gt;
  &lt;/ui-toolbar&gt;

| | |
| --- | --- |
| `@prop` | {string} label='' — accessible name for the toolbar |
| `@slot` | (default) — icon buttons and other actions |
| `@slot` | fab       — optional &lt;ui-fab&gt; attached to the end |
| `@part` | bar, actions, fab |
| `@vars` | see `t` below (`themeVars.names`) |

Source: [`src/components/ui-toolbar.js`](../src/components/ui-toolbar.js)

## `<ui-tooltip>`

a plain (or rich) tooltip on hover/focus around its target.

  &lt;ui-tooltip text="Save changes"&gt;&lt;ui-button&gt;Save&lt;/ui-button&gt;&lt;/ui-tooltip&gt;

Shows after `delay` ms on pointerenter (timer cancelled on leave) and
immediately on focusin; hides on pointerleave, focusout, and Escape. The
panel is position: fixed, anchored to the host with position()/autoUpdate,
flipping to the opposite side when it would overflow the viewport.

a11y: `aria-describedby` cannot point across shadow boundaries, so the
association is not programmatic — the panel carries role="tooltip" and the
target keeps its own accessible name. Give the target a matching
label/aria-label when the tooltip is the only description.

| | |
| --- | --- |
| `@prop` | {string}  text=''      — plain tooltip content |
| `@prop` | {string}  position='top' — top \| bottom \| left \| right |
| `@prop` | {number}  delay=500    — hover show delay (ms); focus shows instantly |
| `@prop` | {boolean} rich=false   — renders the `content` slot in a surface panel instead of the text pill |
| `@slot` | (default) — the target |
| `@slot` | content   — rich tooltip content (title/body/actions) when `rich` |
| `@part` | panel — the tooltip surface |
| `@vars` | see `t` below |

Source: [`src/components/ui-tooltip.js`](../src/components/ui-tooltip.js)

