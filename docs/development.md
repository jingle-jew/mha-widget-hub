# Development Guide

This document explains how to work on MHA Widget Hub locally.

It is intended for contributors who need to run, modify, test and prepare changes safely.

---

## 1. Project Structure

Current high-level structure:

```text
mha-widget-hub.js

src/
  admin/
  core/
  ha/
  i18n/
  layout/
  pages/
  panels/
  screensaver/
  settings/
  styles/
  system/
  ui/
  widget-config/
  widget-manager/
  widgets/

styles/
  components/
  core/
  layout/
  pages/
  panels/
  screensaver/
  settings/
  system/
  themes/
  widget-manager/
  widgets/

tests/
```

The main file is:

```text
mha-widget-hub.js
```

It should remain an application shell and orchestration entry point. Most feature work should happen inside `src/` modules and `styles/`.

---

## 2. Install Dependencies

From the project root:

```bash
npm install
```

---

## 3. Development Commands

Common commands:

```bash
npm run dev
npm run build
npm test
npm run check:syntax
npm run check:sync
npm run check
npm run check:layout
```

Use:

```bash
npm run
```

to list available scripts.

---

## 4. Recommended Local Workflow

For most changes:

```bash
npm install
npm run check:syntax
npm test
npm run build
```

Then test manually in:

- `dev.html`;
- Home Assistant frontend;
- desktop;
- tablet;
- mobile.

The user/project owner prefers manual visual validation. Do not add automated browser screenshots or heavy visual comparison workflows unless explicitly requested.

---

## 5. dev.html

`dev.html` is useful for fast frontend iteration without depending on the full Home Assistant panel lifecycle.

Use it for:

- layout testing;
- widget manager testing;
- config popup testing;
- theme testing;
- preview testing;
- responsive testing;
- visual regression checks.

Do not assume that `dev.html` is enough. Always test final behavior inside Home Assistant too.

---

## 6. Home Assistant Testing

Home Assistant testing is required for:

- sidebar/panel loading;
- HACS deployment behavior;
- frontend cache behavior;
- `hass` object availability;
- real entity state;
- service calls;
- admin entity visibility;
- mobile app rendering.

Test after a frontend reload and, when relevant, after a full Home Assistant restart.

---

## 7. Browser Testing

Test at least:

- Chromium-based browser;
- Safari;
- Firefox;
- Android WebView / Home Assistant app if available;
- iOS Safari / Home Assistant app if available.

Known areas that can differ by browser:

- blur/backdrop-filter;
- viewport height units;
- safe-area insets;
- touch events;
- ResizeObserver timing;
- fixed/floating positioning;
- CSS grid sizing;
- transform scaling;
- orientation changes.

---

## 8. Render Stability Rules

The render pipeline lives in:

```text
src/layout/render-pipeline.js
```

It uses render states, critical boot styling, stylesheet settling, widget placeholders, progressive widget rendering and deferred UI mounting.

When touching render stability:

- preserve `data-render-state` behavior;
- preserve critical boot styling;
- avoid showing raw UI while styles are pending;
- avoid moving heavy secondary surfaces into the immediate render path without reason;
- prefer targeted DOM sync over full rerender when the state did not change;
- add/update tests around the specific render seam.

See:

```text
docs/rendering-pipeline.md
```

---

## 9. CSS Development Rules

MHA uses layered CSS.

Important folders:

```text
styles/core
styles/components
styles/system
styles/themes
styles/layout
styles/pages
styles/panels
styles/settings
styles/widget-manager
styles/widgets
styles/screensaver
```

General rules:

- define visual identity in theme CSS;
- consume tokens in widgets/components/panels;
- avoid hardcoded colors when a token exists;
- avoid theme-specific widget hacks;
- keep layout CSS separate from visual theme CSS;
- keep page-specific CSS in `styles/pages`;
- keep widget-specific CSS in `styles/widgets`;
- keep shared panel surfaces in `styles/panels`.

Prefer semantic tokens:

```css
--mha-primary-surface
--mha-on-primary-surface
--mha-secondary-surface
--mha-primary-text
--mha-secondary-text
--mha-primary-border
--mha-accent-surface
```

Avoid:

```css
background: rgba(...);
color: #fff;
border: 1px solid rgba(...);
```

unless the value is intentionally local and no suitable token exists.

---

## 10. Widget Development Rules

A widget should be added through a widget module.

Core file:

```text
src/widgets/widget-module-registry.js
```

A widget module should own:

- definition;
- renderer;
- config manifest if needed;
- preview renderer if needed;
- CSS metadata;
- aliases/variants;
- capabilities;
- storage normalization;
- shell behavior;
- placement flow.

Avoid adding new widget-specific branches to:

```text
mha-widget-hub.js
src/widget-manager/widget-manager.js
src/widgets/widget-shell.js
```

Use the registry system instead.

See:

```text
docs/widgets.md
docs/adding-widgets.md
docs/preview-system.md
docs/config-flows.md
```

---

## 11. Page Development Rules

Page logic lives in:

```text
src/pages/
```

Use page modules for:

- page normalization;
- page persistence;
- page type configuration;
- page creator behavior;
- page UI coordination;
- dedicated page experiences such as media pages.

Do not treat every page-level feature as a normal widget. Some screens can be page experiences backed by widgets during transition.

Current example:

```text
media-players page
        ↓
media-page-panel widget seed
        ↓
media widget renderer + page-level CSS
```

See:

```text
docs/pages.md
```

---

## 12. Theme Development Rules

Theme work should start in:

```text
src/settings/theme-registry.js
styles/themes/
```

Themes should define values. Components, pages and widgets should consume tokens.

Current visual systems:

- iOS;
- OneUI;
- Material You;
- Alexa.

See:

```text
docs/themes.md
docs/theme-tokens.md
```

---

## 13. Config Flow Development Rules

Config flows currently use:

```text
src/widget-config/widget-config-registry.js
src/widget-config/widget-config-popup.js
src/widget-config/*-config.js
```

Config field rendering should live in the config manifest through:

```js
renderFields(session, hass, visibilityConfig, onChange, helpers)
```

Best practices:

- keep draft state separate from widget state;
- preserve selected manager variant and size;
- display friendly entity names;
- respect MHA Admin visibility filtering;
- do not call Home Assistant services from config UI;
- disable save when invalid;
- keep field rendering inside the manifest instead of adding popup branches.

See:

```text
docs/config-flows.md
```

---

## 14. Panel Development Rules

Shared panel/overlay primitives live in:

```text
src/panels/
styles/panels/
```

Use the panel shell and panel surface contract for popup/sheet surfaces when possible.

Good candidates:

- config popup;
- widget manager;
- page creator;
- settings-related panels.

Avoid inventing a separate modal contract unless the visual/behavioral needs are truly different.

---

## 15. Coordinator Development Rules

The main file now delegates to domain coordinators.

When adding orchestration, first ask whether it belongs in one of these areas:

```text
src/core/*coordinator.js
src/layout/*coordinator.js
src/pages/*coordinator.js
src/settings/*coordinator.js
src/screensaver/*coordinator.js
src/widgets/*coordinator.js
```

A coordinator should:

- keep a narrow responsibility;
- preserve existing behavior;
- expose small methods called by the root;
- be testable without full visual automation where practical.

Avoid turning a coordinator into a second giant root file.

---

## 16. Home Assistant Abstraction Rules

Use helpers from:

```text
src/ha/
```

for:

- entity lookup;
- domain parsing;
- availability;
- toggle behavior;
- slider behavior;
- media helpers;
- weather helpers;
- service actions.

Avoid scattering direct `hass.callService()` and raw entity parsing inside widgets.

---

## 17. Placement/Layout Rules

Placement math should stay pure and testable.

Use:

```text
src/layout/placement-geometry.js
src/layout/placement-calculations.js
```

for logic.

Use:

```text
src/layout/placement-controller.js
src/widgets/widget-placement-orchestrator.js
src/widgets/widget-flow-coordinator.js
```

for DOM/runtime coordination.

When changing placement behavior, add or update tests.

---

## 18. Main File Rules

`mha-widget-hub.js` should coordinate modules.

It should not become the place for:

- new widget definitions;
- new theme definitions;
- new renderer logic;
- Home Assistant service logic;
- large CSS strings;
- config field rendering;
- placement math;
- panel DOM contracts;
- reusable widget state logic;
- page-specific rendering logic.

If a change makes the main file larger, ask whether the logic belongs in a module or coordinator.

---

## 19. Manual Visual Test Matrix

For UI changes, check:

- edit mode on/off;
- widget manager open/close;
- config popup open/close;
- settings panel open/close;
- page creator popup;
- panels as bottom sheets on mobile;
- dock left;
- dock right;
- dock bottom;
- desktop layout;
- tablet layout;
- mobile layout;
- mobile portrait;
- mobile landscape;
- light mode;
- dark mode;
- OneUI;
- Material;
- Alexa;
- iOS Liquid;
- iOS Frosted;
- standard grid pages;
- dedicated media page;
- screensaver;
- NowBar;
- widget add/configure/move/resize/remove flows.

The final visual judgment is manual.

---

## 20. Cache Notes

Home Assistant frontend caching can hide changes.

When a change does not appear:

1. Hard refresh the browser.
2. Clear site cache if needed.
3. Confirm the built file was copied to the expected HA frontend path.
4. Restart Home Assistant if the panel registration changed.
5. Test in a private browser window.

Do not assume a bug is fixed until the updated frontend file is actually loaded.

---

## 21. Safe Commit Strategy

Prefer small, committable phases.

Good commit examples:

```text
docs: update config flow guide
widgets: add live preview for media widget
themes: normalize iOS frosted surface tokens
config: add scenes widget config manifest
layout: fix dock bottom grid columns
```

Avoid mixing unrelated work:

```text
bad: update themes, widgets, docs, placement and HA actions
```

Small commits make regressions much easier to isolate.

---

## 22. Before Opening A Pull Request

Run:

```bash
npm run check:syntax
npm test
npm run build
```

Then manually test:

- `dev.html`;
- Home Assistant panel;
- at least one desktop viewport;
- at least one mobile/tablet viewport;
- affected themes;
- affected pages;
- affected widgets;
- affected config flows.

Update documentation when changing extension contracts.

---

## 23. Documentation Rule

If a change affects how contributors add or modify something, update the matching doc:

| Change | Update |
|---|---|
| widget module contract | `docs/widgets.md`, `docs/adding-widgets.md` |
| theme contract | `docs/themes.md`, `docs/theme-tokens.md` |
| page behavior | `docs/pages.md`, `docs/architecture.md` |
| render pipeline behavior | `docs/rendering-pipeline.md`, `docs/architecture.md` |
| preview behavior | `docs/preview-system.md` |
| config flow behavior | `docs/config-flows.md` |
| panel/surface behavior | `docs/architecture.md`, `docs/development.md` |
| internal architecture | `docs/architecture.md` |
| build/test/release process | `docs/development.md`, `docs/testing.md`, `docs/release-checklist.md` |

---

## 24. Development Philosophy

MHA is becoming a real frontend platform, not a single custom card.

Prefer:

```text
registry
module
manifest
token
helper
coordinator
test
```

over:

```text
switch
hardcoded list
inline CSS
duplicated logic
one-off exception
```

The goal is a stable extension architecture where widgets, themes and page experiences can be added safely with minimal file changes.
