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
  layout/
  pages/
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

It should remain an orchestrator.

Most feature work should happen inside `src/` modules and `styles/`.

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
```

Depending on the current package scripts, not all commands may exist in every branch.

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

---

## 5. dev.html

`dev.html` is useful for fast frontend iteration without depending on the full Home Assistant panel lifecycle.

Use it for:

- layout testing;
- widget manager testing;
- theme testing;
- preview testing;
- responsive testing;
- visual regression checks.

Do not assume that `dev.html` is enough.

Always test final behavior inside Home Assistant too.

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
- transform scaling.

---

## 8. CSS Development Rules

MHA uses layered CSS.

Important folders:

```text
styles/core
styles/components
styles/system
styles/themes
styles/layout
styles/settings
styles/widget-manager
styles/widgets
styles/screensaver
```

General rules:

- define visual identity in theme CSS;
- consume tokens in widgets/components;
- avoid hardcoded colors;
- avoid theme-specific widget hacks;
- keep layout CSS separate from visual theme CSS;
- keep widget-specific CSS in widget files or `styles/widgets`.

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

unless the value is intentionally local.

---

## 9. Widget Development Rules

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
- aliases/variants.

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
docs/preview-system.md
docs/config-flows.md
```

---

## 10. Theme Development Rules

Theme work should start in:

```text
src/settings/theme-registry.js
styles/themes/
```

Themes should define values.

Components and widgets should consume tokens.

See:

```text
docs/themes.md
docs/theme-tokens.md
```

---

## 11. Config Flow Development Rules

Config flows currently use:

```text
src/widget-config/widget-config-registry.js
src/widget-config/widget-config-popup.js
src/widget-config/*-config.js
```

Best practices:

- keep draft state separate from widget state;
- preserve selected manager variant and size;
- display friendly entity names;
- respect MHA Admin visibility filtering;
- do not call Home Assistant services from config UI;
- disable save when invalid.

See:

```text
docs/config-flows.md
```

---

## 12. Home Assistant Abstraction Rules

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
- service actions;
- weather helpers.

Avoid scattering direct `hass.callService()` and raw entity parsing inside widgets.

---

## 13. Placement/Layout Rules

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
```

for DOM/runtime coordination.

When changing placement behavior, add or update tests.

---

## 14. Main File Rules

`mha-widget-hub.js` should coordinate modules.

It should not become the place for:

- new widget definitions;
- new theme definitions;
- new renderer logic;
- Home Assistant service logic;
- large CSS strings;
- config field rendering;
- placement math.

If a change makes the main file larger, ask whether the logic belongs in a module.

---

## 15. Manual Visual Test Matrix

For UI changes, check:

- edit mode on/off;
- widget manager open/close;
- config popup open/close;
- settings panel open/close;
- page creator popup;
- dock left;
- dock right;
- dock bottom;
- desktop layout;
- tablet layout;
- mobile layout;
- light mode;
- dark mode;
- OneUI;
- Material;
- iOS Liquid;
- iOS Frosted.

---

## 16. Cache Notes

Home Assistant frontend caching can hide changes.

When a change does not appear:

1. Hard refresh the browser.
2. Clear site cache if needed.
3. Confirm the built file was copied to the expected HA frontend path.
4. Restart Home Assistant if the panel registration changed.
5. Test in a private browser window.

Do not assume a bug is fixed until the updated frontend file is actually loaded.

---

## 17. Safe Commit Strategy

Prefer small, committable phases.

Good commit examples:

```text
docs: add preview system guide
widgets: move slider preview into widget module
themes: normalize iOS frosted surface tokens
config: add media widget config manifest
layout: fix dock bottom grid columns
```

Avoid mixing unrelated work:

```text
bad: update themes, widgets, docs, placement and HA actions
```

Small commits make regressions much easier to isolate.

---

## 18. Before Opening A Pull Request

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
- affected widgets;
- affected config flows.

Update documentation when changing extension contracts.

---

## 19. Documentation Rule

If a change affects how contributors add or modify something, update the matching doc:

| Change | Update |
|---|---|
| widget module contract | `docs/widgets.md` |
| theme contract | `docs/themes.md`, `docs/theme-tokens.md` |
| preview behavior | `docs/preview-system.md` |
| config flow behavior | `docs/config-flows.md` |
| internal architecture | `docs/architecture.md` |
| build/test/release process | `docs/development.md`, `docs/testing.md`, `docs/release-checklist.md` |

---

## 20. Development Philosophy

MHA is becoming a real frontend platform, not a single custom card.

Prefer:

```text
registry
module
manifest
token
helper
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

The goal is a stable extension architecture where widgets and themes can be added safely with minimal file changes.
