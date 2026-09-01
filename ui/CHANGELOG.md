# Changelog

All notable changes to **@alacris/ui** are documented here. Releases are cut
independently of the Alacris library by semantic-release, from Conventional
Commits scoped `ui` (or the legacy `starter`).

## [0.5.2](https://github.com/bmartel/alacris/compare/ui-v0.5.1...ui-v0.5.2) (2026-09-01)

### Bug Fixes

* **ui:** promote modal overlays to top layer via popover=manual (fixes [#25](https://github.com/bmartel/alacris/issues/25)) ([d94c0ba](https://github.com/bmartel/alacris/commit/d94c0ba21f82abf5ecd829ddc7572a18f1beeea9))

## [0.5.1](https://github.com/bmartel/alacris/compare/ui-v0.5.0...ui-v0.5.1) (2026-09-01)

### Bug Fixes

* **html:** dispatch delegated events on slotted children of shadow components (fixes [#23](https://github.com/bmartel/alacris/issues/23)) ([93d835c](https://github.com/bmartel/alacris/commit/93d835cdb0600b6851097e60a242e8513056325d))
* **ui:** animate dialog with WAAPI and fix sheet swipe yo-yo and drag restore (fixes [#24](https://github.com/bmartel/alacris/issues/24)) ([b3aeeca](https://github.com/bmartel/alacris/commit/b3aeeca021834c2f2686902a1e37a5ddb25ee88c))

## [0.5.0](https://github.com/bmartel/alacris/compare/ui-v0.4.7...ui-v0.5.0) (2026-09-01)

### Features

* **ui:** add velocity-controlled swipeable sheets and ui-swipe-row component ([562dc09](https://github.com/bmartel/alacris/commit/562dc094d44a60b84e07f0e53eb8eb6bc7256b86))

### Bug Fixes

* **ui:** query visible days dynamically in date picker range test ([8d2856c](https://github.com/bmartel/alacris/commit/8d2856cc86201f312d87ece26fe0527722875989))

## [0.4.7](https://github.com/bmartel/alacris/compare/ui-v0.4.6...ui-v0.4.7) (2026-08-30)

### Bug Fixes

* **ui:** use font-size 0.75rem for floating label and legend notch alignment ([98ca209](https://github.com/bmartel/alacris/commit/98ca209d92f175210defa37eb4a6a678746412ad))

## [0.4.6](https://github.com/bmartel/alacris/compare/ui-v0.4.5...ui-v0.4.6) (2026-08-30)

### Bug Fixes

* **ui:** prevent label obscuring in filled textareas and calibrate legend notch scaling ([1788111](https://github.com/bmartel/alacris/commit/1788111be3311eded2c8cc12562efe3b59ccd60c))

## [0.4.5](https://github.com/bmartel/alacris/compare/ui-v0.4.4...ui-v0.4.5) (2026-08-30)

### Bug Fixes

* **ui:** smooth floating label transitions for textareas without placeholder ([500bb37](https://github.com/bmartel/alacris/commit/500bb378ade368dce2fd54908b4c7f48140daa06))

## [0.4.4](https://github.com/bmartel/alacris/compare/ui-v0.4.3...ui-v0.4.4) (2026-08-29)

### Bug Fixes

* **ui:** normalize outlined floating label positioning across inputs and multiline textareas ([cf63387](https://github.com/bmartel/alacris/commit/cf633877714d519b2d30373948f41953115a937d))

## [0.4.3](https://github.com/bmartel/alacris/compare/ui-v0.4.2...ui-v0.4.3) (2026-08-29)

### Bug Fixes

* **ui:** apply inert to collapsed standard sheets, drawers, accordions, and dismissing elements ([ee730bc](https://github.com/bmartel/alacris/commit/ee730bc0010cf23ba1b717ca4a49ac34fdcb098c))

## [0.4.2](https://github.com/bmartel/alacris/compare/ui-v0.4.1...ui-v0.4.2) (2026-08-29)

### Bug Fixes

* **html:** deduplicate nested root event delegation and support SVG class bindings ([e23dd15](https://github.com/bmartel/alacris/commit/e23dd15aa8fe74ebbae141f923a1b8edc26ec4bd))
* **ui:** restore focus on modal close, support IME composition, and enforce hidden style ([a402a37](https://github.com/bmartel/alacris/commit/a402a370499969e47dd6ecd8560479dff7ee3e3f))

## [0.4.1](https://github.com/bmartel/alacris/compare/ui-v0.4.0...ui-v0.4.1) (2026-08-22)

### Bug Fixes

* **ui:** stop popup close from dismissing an enclosing overlay ([#22](https://github.com/bmartel/alacris/issues/22)) ([58e2d42](https://github.com/bmartel/alacris/commit/58e2d42a87214130100afb2529fa2b9f671c4424))

## [0.4.0](https://github.com/bmartel/alacris/compare/ui-v0.3.0...ui-v0.4.0) (2026-08-19)

### Features

* **ui:** let a text field tell the platform hands off ([#21](https://github.com/bmartel/alacris/issues/21)) ([89ea332](https://github.com/bmartel/alacris/commit/89ea332c280a65af769a0328d5d0d6905150c293))

### Bug Fixes

* **ci:** land the docs pins and survive a release push race ([#20](https://github.com/bmartel/alacris/issues/20)) ([5a4b3ea](https://github.com/bmartel/alacris/commit/5a4b3ea9f87c5bb4d398dcd04a083de74ec5238a))

## [0.3.0](https://github.com/bmartel/alacris/compare/ui-v0.2.4...ui-v0.3.0) (2026-08-19)

### Features

* **ui:** filter a select's options when there are many ([#19](https://github.com/bmartel/alacris/issues/19)) ([245d559](https://github.com/bmartel/alacris/commit/245d55913d2ceebabc96de172391d3295967c54e))

## [0.2.4](https://github.com/bmartel/alacris/compare/ui-v0.2.3...ui-v0.2.4) (2026-08-19)

### Bug Fixes

* **ui:** stop padding a number field's inline end ([#18](https://github.com/bmartel/alacris/issues/18)) ([b2e8489](https://github.com/bmartel/alacris/commit/b2e848953c87ce79f27706ff20cbb5f9e1da4c81))

## [0.2.3](https://github.com/bmartel/alacris/compare/ui-v0.2.2...ui-v0.2.3) (2026-08-19)

### Bug Fixes

* a number field's stepper no longer sits on its own label ([dadc841](https://github.com/bmartel/alacris/commit/dadc8414167a6946c7d066e93bbb36fd1d64a6ca))
* pin the docs CDN URLs to the published ui release ([1abbf53](https://github.com/bmartel/alacris/commit/1abbf535ab29c3341a3999f35e9da4b6586d3f3a))

## [0.2.2](https://github.com/bmartel/alacris/compare/ui-v0.2.1...ui-v0.2.2) (2026-08-19)

### Bug Fixes

* **ui:** a popup takes Escape from the dialog around it ([b2cf058](https://github.com/bmartel/alacris/commit/b2cf058dc02fe5b1773b6cdebc64534193d08bc3))

## [0.2.1](https://github.com/bmartel/alacris/compare/ui-v0.2.0...ui-v0.2.1) (2026-08-18)

### Bug Fixes

* **ui:** resolve Material icon names and bind slider values from templates ([78e5e93](https://github.com/bmartel/alacris/commit/78e5e936c4d3a9ff82f2b4d2536a8d4e7d47d8c3))

## [0.2.0](https://github.com/bmartel/alacris/compare/ui-v0.1.1...ui-v0.2.0) (2026-08-16)

### Features

* **ui:** brand the catalog shell and keep demos readable on mobile ([#11](https://github.com/bmartel/alacris/issues/11)) ([ffdd201](https://github.com/bmartel/alacris/commit/ffdd201c97d5e230583ef173cf551851f7b1a3e2))

## [0.1.1](https://github.com/bmartel/alacris/compare/ui-v0.1.0...ui-v0.1.1) (2026-08-15)

### Bug Fixes

* **starter:** morph docked search as a compact pill ([#8](https://github.com/bmartel/alacris/issues/8)) ([d203ea3](https://github.com/bmartel/alacris/commit/d203ea3182fd073459106ae4f76e8dcbc1babece))

## [0.1.0](https://github.com/bmartel/alacris/compare/ui-v0.0.0...ui-v0.1.0) (2026-08-15)

### Features

* **ui:** publish the design system as @alacris/ui ([#9](https://github.com/bmartel/alacris/issues/9)) ([9f25a37](https://github.com/bmartel/alacris/commit/9f25a37dfcc2bc915593f113e76f6b476f702737))
