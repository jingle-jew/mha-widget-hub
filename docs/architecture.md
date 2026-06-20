# Internal Architecture

This document describes the current internal architecture of MHA Widget Hub.

MHA Widget Hub is now a modular Home Assistant frontend platform built around native MHA widgets, shared panel surfaces, registry-driven widget contracts, semantic theme tokens and Home Assistant helper modules.

It is intended for contributors and future maintainers.

---

## 1. Architecture Goal

MHA is moving toward this extension model:

```text
Add a widget:
  create widget module
  register widget module once

Add a theme:
  create theme CSS
  register theme once
```

The project should avoid requiring edits across many unrelated files for every new widget or theme.

Current architecture is already close to this:

- widgets are centralized through `WIDGET_MODULES`;
- widget definitions, renderers, previews, config manifests and CSS are collected from modules;
- config field rendering is delegated to config manifests through `renderFields`;
- widget manager entries are generated from widget definitions;
- manager visibility can be controlled through `manager.hidden` and entry `hidden` flags;
- widget-specific stored-data compatibility can live in definition storage adapters;
- themes are centralized through `THEME_REGISTRY`;
- theme CSS is loaded through `style-manifest.js`;
- live previews are delegated to widget preview renderers;
- common overlay/sheet visuals are shared through panel shell modules.

Remaining work is now mostly about:

- reducing the main custom element carefully;
- extracting reusable config field primitives;
- continuing token cleanup;
- keeping extension contracts tested and documented;
- avoiding new central branches as widgets grow.

---

## 2. Current Project Structure

```text
mha-widget-hub.js

src/admin/*
src/core/*
src/ha/*
src/i18n/*
src/layout/*
src/pages/*
src/panels/*
src/screensaver/*
src/settings/*
src/styles/*
src/system/*
src/ui/*
src/widget-config/*
src/widget-manager/*
src/widgets/*

styles/components/*
styles/core/*
styles/layout/*
styles/panels/*
styles/screensaver/*
styles/settings/*
styles/system/*
styles/themes/*
styles/widget-manager/*
styles/widgets/*

tests/*
```

---

## 3. Top-Level Runtime

The main runtime entry is:

```text
mha-widget-hub.js
```

It defines the main custom element:

```js
class MhaControlHub extends HTMLElement
```

The main file is still the application shell, but many responsibilities have been extracted into coordinators.

Its correct role is:

```text
Application shell + lifecycle + system orchestration
```

not:

```text
Widget registry
Theme registry
Config registry
Renderer registry
CSS contract
HA business logic
Panel renderer
Placement math
```

---

## 4. Runtime Coordinators

The root custom element now delegates many responsibilities to modules.

Important coordinator modules:

| Area | Module |
|---|---|
| boot/lifecycle | `src/core/boot-lifecycle-coordinator.js` |
| initial state + HA ingress | `src/core/hub-state-ingress-coordinator.js` |
| render orchestration | `src/layout/render-pipeline.js` |
| responsive dock state | `src/layout/responsive-dock-coordinator.js` |
| page UI | `src/pages/page-ui-coordinator.js` |
| settings + i18n sync | `src/settings/i18n-settings-sync.js` |
| appearance/theme settings | `src/settings/appearance-coordinator.js` |
| settings surface props | `src/settings/settings-surface-coordinator.js` |
| settings panel lifecycle | `src/settings/settings-panel-coordinator.js` |
| widget creation/config/placement flow | `src/widgets/widget-flow-coordinator.js` |
| widget interaction surface | `src/widgets/widget-interaction-surface-coordinator.js` |
| widget layout state | `src/widgets/widget-layout-state-coordinator.js` |
| widget surface sync | `src/widgets/widget-surface-coordinator.js` |
| widget resize | `src/widgets/widget-resize-coordinator.js` |
| screensaver sync | `src/screensaver/screensaver-coordinator.js` |
| screensaver settings bridge | `src/screensaver/screensaver-settings-bridge.js` |

Rule:

```text
New orchestration logic should normally start in a domain coordinator, not in mha-widget-hub.js.
```

---

## 5. Boot And Style Loading

MHA does not load CSS by manually writing every stylesheet in the main file.

The main file imports:

```js
getStyleManifest()
```

from:

```text
src/styles/style-manifest.js
```

The style manifest is composed from:

1. static core/component styles before themes;
2. registered theme CSS paths;
3. static styles after themes;
4. widget CSS paths from the widget registry;
5. final static styles such as screensaver CSS.

Registered themes and registered widgets contribute CSS automatically.

---

## 6. Current CSS Loading Order

Current high-level order:

```text
1. core tokens
2. reusable components and system buttons
3. registered theme CSS
4. accent palettes and semantic tokens
5. core background/layout CSS
6. dock/status/grid/floating controls
7. settings, widget manager and config popup CSS
8. shared panel CSS
9. light text contract
10. widget layout/shell CSS
11. widget CSS from the widget registry
12. screensaver CSS
```

Notable current structural CSS files include:

```text
styles/layout/dock-glyph-stability.css
styles/layout/frame-alignment.css
styles/panels/panel-surface-contract.css
styles/panels/panel-frame-alignment.css
styles/panels/page-creator-sheet.css
styles/panels/page-creator-bottom.css
styles/settings/settings-bottom.css
styles/screensaver/screensaver-clock.css
styles/screensaver/screensaver-hotcorner.css
```

---

## 7. Panel Architecture

Shared panel behavior lives in:

```text
src/panels/panel-shell.js
src/panels/panel-surface-contract.js
```

The panel shell provides common overlay/sheet structure for surfaces such as:

- widget config popup;
- widget manager;
- page creator;
- settings-related panel surfaces.

The surface contract applies consistent roles and mobile presentations:

```text
popup
sheet
bottom sheet
panel surface
```

Rule:

```text
New overlays should use shared panel primitives when possible.
```

Avoid creating isolated modal/sheet structures with unrelated CSS unless the component truly needs a separate contract.

---

## 8. Storage Layer

Storage helpers live in:

```text
src/core/storage.js
src/core/storage-keys.js
src/core/mha-persistence.js
src/core/mha-state.js
```

Domain-specific storage also exists in:

```text
src/pages/page-store.js
src/settings/wallpaper-storage.js
src/settings/theme-controller.js
src/admin/entity-visibility-store.js
src/widgets/widget-storage.js
```

Rule:

```text
Storage access should be centralized through domain modules.
```

Avoid scattering raw `localStorage.getItem()` and `localStorage.setItem()` calls across unrelated features.

---

## 9. Page Architecture

Page logic lives in:

```text
src/pages/page-model.js
src/pages/page-store.js
src/pages/page-controller.js
src/pages/page-ui-coordinator.js
src/pages/page-creator.js
```

Responsibilities:

| Module | Responsibility |
|---|---|
| `page-model.js` | pure page normalization and helpers |
| `page-store.js` | persistence and migration |
| `page-controller.js` | page operations |
| `page-ui-coordinator.js` | UI-level page sync and interactions |
| `page-creator.js` | page creation/edit sheet content |

The main element should call page operations/coordinators, not duplicate page logic.

---

## 10. Layout Architecture

Layout logic lives in:

```text
src/layout/*
```

Important files:

| File | Responsibility |
|---|---|
| `layout-engine.js` | widget size contract, density, layout mode, grid presets |
| `layout-mode.js` | layout mode helpers |
| `responsive.js` | responsive breakpoint layout selection |
| `render-pipeline.js` | top-level render composition |
| `shell.js` | main visual shell creation |
| `dock.js` | dock DOM |
| `dock-controller.js` | dock props and active state sync |
| `responsive-dock-coordinator.js` | responsive dock state/orchestration |
| `mobile-dock.js` | mobile dock |
| `grid-runtime.js` | grid runtime behavior |
| `placement-controller.js` | drag/drop/edit orchestration |
| `placement-calculations.js` | placement algorithms |
| `placement-geometry.js` | geometry helpers |
| `status-bar.js` | status bar rendering/update |

---

## 11. Widget Size Contract

The public widget size contract uses a familiar mobile-widget vocabulary:

```text
2×2 = one standard square widget
4×2 = two standard squares wide
2×4 = two standard squares tall
4×4 = large square, 2 by 2 standard widget cells
```

Internally:

```text
1 logical grid cell = 2 internal grid units × 2 internal grid units
```

This is why a normal widget is usually `2×2`.

---

## 12. Responsive Layout

The responsive layout system decides:

- mobile;
- tablet;
- desktop;
- wallpanel/tablet-like mode.

It prioritizes:

1. comfortable widget size;
2. square cells;
3. good use of available area.

It intentionally does not simply fill all available width at any cost.

---

## 13. Placement Architecture

Widget movement and placement are split into pure and runtime modules.

Pure geometry:

```text
src/layout/placement-geometry.js
```

Placement calculations:

```text
src/layout/placement-calculations.js
```

Runtime controller:

```text
src/layout/placement-controller.js
```

Widget-level orchestration:

```text
src/widgets/widget-flow-coordinator.js
src/widgets/widget-interaction-surface-coordinator.js
src/widgets/widget-placement-orchestrator.js
```

Rule:

```text
Geometry/calculation modules should stay pure and testable.
```

Controllers/coordinators can deal with DOM/runtime state.

---

## 14. Widget Architecture Overview

The widget system is centered on:

```text
src/widgets/widget-module-registry.js
```

Each real widget exports a `WIDGET_MODULE`.

Current widget modules include:

```text
empty-widget.js
clock-widget.js
simple-button-widget.js
scenes-widget.js
slider-widget.js
toggle-widget.js
toggle-slider-widget.js
toggle-buttons-widget.js
weather-widget.js
media-widget.js
```

This is the core extension point for widgets.

---

## 15. WIDGET_MODULE Contract

A widget module can contain:

```js
{
  kind,
  definition,
  renderer,
  config,
  preview,
}
```

The definition can include metadata such as:

```js
{
  component,
  category,
  manager,
  renderer,
  css,
  preview,
  aliases,
  variantAliases,
  defaultSize,
  defaultVariant,
  variants,
  variantGroups,
  config,
  capabilities,
  storage,
  shell,
  placementFlow,
  normalizeSize,
}
```

---

## 16. Widget Registry

Main file:

```text
src/widgets/widget-registry.js
```

The widget registry builds `WIDGET_REGISTRY` from `WIDGET_MODULES`.

It owns or delegates:

- widget manager metadata;
- category generation;
- alias resolution;
- variant alias resolution;
- preview renderer normalization;
- widget kind resolution;
- widget config type resolution;
- widget size normalization;
- registered variant lookup;
- stored widget contract normalization.

Widget-specific stored-data patches should use the definition storage adapter:

```js
storage: {
  normalize(widget, helpers) {
    return { ...patch };
  }
}
```

This keeps compatibility close to the widget that owns it.

---

## 17. Widget Manager Catalog Flow

The widget manager does not maintain a separate hardcoded catalog.

Flow:

```text
WIDGET_MODULES
    ↓
WIDGET_REGISTRY
    ↓
getWidgetManagerCategories()
    ↓
WIDGET_MANAGER_CATEGORIES
    ↓
createWidgetManager()
```

Manager categories are generated from widget definitions.

Each widget contributes manager entries through:

```js
definition.manager.entries
```

Current manager visibility is declarative:

```js
manager: {
  hidden: true,
}
```

or per entry:

```js
{
  ...entry,
  hidden: true,
}
```

---

## 18. Widget Renderer Registry

Renderer registration lives in:

```text
src/widgets/widget-renderer-registry.js
```

It creates `WIDGET_CONTENT_RENDERERS` from `WIDGET_MODULES`.

Renderer flow:

```text
widget
  ↓
getWidgetDefinition(widget)
  ↓
definition.renderer
  ↓
WIDGET_CONTENT_RENDERERS[rendererName]
  ↓
renderer.render({ widget, ...context })
```

Widget content rendering is no longer a giant `switch`.

---

## 19. Widget Shell

Widget shell logic lives in:

```text
src/widgets/widget-shell.js
src/widgets/widget-shell-props.js
```

The shell owns:

- outer widget wrapper;
- common dataset attributes;
- common tools;
- edit state;
- content placement.

The renderer owns widget-specific content.

---

## 20. Widget Factory

Widget creation from manager catalog entries lives in:

```text
src/widgets/widget-factory.js
```

Important function:

```js
createWidgetFromCatalogItem(item)
```

The factory resolves widget kind/definition, chooses creation defaults, applies variants and normalizes the resulting widget contract.

---

## 21. Widget Config Architecture

Config architecture is documented in detail in:

```text
docs/config-flows.md
```

Main files:

```text
src/widget-config/widget-config-registry.js
src/widget-config/widget-config-popup.js
src/widget-config/*-config.js
```

High-level flow:

```text
widget definition has config type
        ↓
widget module attaches config manifest
        ↓
widget-config-registry collects manifests from WIDGET_MODULES
        ↓
widget-config-popup creates session/draft
        ↓
manifest.renderFields() renders fields
        ↓
user edits draft
        ↓
manifest build() creates configured widget
```

Config field rendering is now manifest-driven through `renderFields`.

The remaining improvement is to extract more reusable field primitives so manifests do not duplicate select/text/label boilerplate.

---

## 22. Widget Preview Architecture

Preview architecture is documented in detail in:

```text
docs/preview-system.md
```

Main files:

```text
src/widgets/widget-preview-renderer.js
src/widgets/widget-preview-context.js
src/widgets/widget-preview-data.js
src/widgets/widget-preview-images.js
```

Live previews should be owned by widget modules, not by the widget manager.

---

## 23. Theme Architecture

Theme architecture is documented in detail in:

```text
docs/themes.md
docs/theme-tokens.md
```

Main files:

```text
src/settings/theme-registry.js
src/settings/theme-controller.js
src/settings/accent-palettes.js
src/settings/wallpaper-accent.js
styles/themes/*
```

Current registered theme styles:

| id | Label | CSS |
|---|---|---|
| `ios` | iOS | `styles/themes/ios.css` |
| `oneui` | OneUI | `styles/themes/oneui.css` |
| `material` | Material You | `styles/themes/material.css` |

Default:

```js
oneui
```

iOS Liquid/Frosted is not two separate registry themes. It is controlled by:

```text
data-ios-glass="liquid"
data-ios-glass="frosted"
```

---

## 24. Settings Architecture

Settings modules live in:

```text
src/settings/*
```

Important modules:

| Module | Responsibility |
|---|---|
| `settings-panel.js` | settings UI rendering |
| `settings-panel-coordinator.js` | panel lifecycle/sync |
| `settings-surface-coordinator.js` | shared settings surface props |
| `appearance-coordinator.js` | appearance/theme-related state |
| `i18n-settings-sync.js` | settings state + language/i18n sync |
| `layout-mode-control.js` | layout mode controls |
| `theme-controller.js` | theme storage/dataset synchronization |
| `theme-registry.js` | registered theme styles |
| `accent-palettes.js` | accent options/reference values |
| `wallpaper-controller.js` | wallpaper UI/application |
| `wallpaper-storage.js` | wallpaper persistence |
| `wallpaper-accent.js` | wallpaper accent extraction |

Settings panel styling should consume tokens and shared panel contracts.

---

## 25. Screensaver Architecture

Screensaver logic lives in:

```text
src/screensaver/screensaver.js
src/screensaver/screensaver-controller.js
src/screensaver/screensaver-coordinator.js
src/screensaver/screensaver-orchestrator.js
src/screensaver/screensaver-settings-bridge.js
src/screensaver/nowbar-data.js
```

CSS is split across:

```text
styles/screensaver/screensaver.css
styles/screensaver/screensaver-clock.css
styles/screensaver/screensaver-hotcorner.css
```

The controller owns idle/preview state. The coordinator/orchestrator own UI synchronization. The renderer owns screensaver DOM and updates.

---

## 26. Home Assistant Abstraction Layer

Home Assistant logic lives in:

```text
src/ha/*
```

Important files:

| File | Responsibility |
|---|---|
| `entity.js` | entity id/domain/state helpers |
| `entity-access.js` | access and entity lookups |
| `entity-filters.js` | entity filtering |
| `capabilities.js` | capability detection |
| `toggle.js` | toggle behavior |
| `slider.js` | slider behavior |
| `actions.js` | generic service actions |
| `media.js` | media model/actions/artwork helpers |
| `weather.js` | weather helpers |

Widgets should use the HA abstraction layer instead of directly scattering:

```js
hass.callService(...)
hass.states[entityId]
```

This keeps HA behavior consistent and testable.

---

## 27. Admin / Entity Visibility Architecture

Admin logic lives in:

```text
src/admin/admin-panel.js
src/admin/admin-ha-api.js
src/admin/entity-permissions.js
src/admin/entity-visibility-store.js
```

Responsibilities:

- define entity visibility config;
- load/save visibility;
- filter entities for current user;
- support the dedicated MHA Admin panel.

Config flows use entity visibility filtering when building selection lists. This prevents users from selecting entities they are not allowed to see.

---

## 28. UI Primitives

Reusable UI components live in:

```text
src/ui/*
```

Current examples:

```text
button.js
icon.js
icon-symbol.js
pill.js
slider.js
slider2.js
system-buttons.js
toggle.js
```

Goal:

```text
Widgets compose primitives instead of duplicating control markup/styles.
```

---

## 29. Data Flow: Widget Creation

Typical widget creation flow:

```text
User opens widget manager
        ↓
createWidgetManager()
        ↓
WIDGET_MANAGER_CATEGORIES from registry
        ↓
User selects catalog item
        ↓
createWidgetFromCatalogItem(item)
        ↓
supportsWidgetConfiguration(widget)?
        ↓
if yes:
    createWidgetConfigSession()
    createWidgetConfigPopup()
    manifest.renderFields()
    buildConfiguredWidget()
        ↓
normalizeWidgetContract()
        ↓
place widget on grid
        ↓
save page/widget state
```

---

## 30. Data Flow: Widget Rendering

Typical widget rendering flow:

```text
Stored widget
        ↓
normalizeStoredWidgetContract()
        ↓
createWidgetShell()
        ↓
decorateWidgetShell()
        ↓
createRegisteredWidgetContent()
        ↓
renderer.render()
        ↓
widget shell content
```

---

## 31. Data Flow: Theme Application

Typical theme flow:

```text
localStorage / default values
        ↓
createThemeController(host)
        ↓
themeController.read()
        ↓
host.dataset + documentElement.dataset
        ↓
theme CSS selectors
        ↓
semantic tokens
        ↓
component/widget CSS
```

---

## 32. Tests

Current tests cover many architectural seams, including:

- registry and widget contracts;
- config manifests and config flow behavior;
- preview rendering and preview context;
- placement geometry/calculations;
- responsive layout;
- settings and appearance coordinators;
- screensaver coordinators;
- widget surface/layout/resize coordinators;
- Home Assistant helpers;
- admin visibility;
- theme token contracts;
- storage/page behavior.

Architecture changes should add or update tests around the seam being changed.

---

## 33. Current Strong Points

The architecture currently has several strong foundations:

- widget modules are real;
- registries centralize widget contracts;
- config field rendering is manifest-driven;
- manager visibility is declarative;
- style manifest gives predictable CSS order;
- shared panel shell reduces overlay divergence;
- HA abstraction exists;
- preview system is advanced;
- tests cover important seams;
- the main file has been substantially reduced through coordinators.

---

## 34. Current Weak Points

### Main element still coordinates many systems

`mha-widget-hub.js` is much smaller than before, but still imports many modules and coordinates the app shell.

This is acceptable for now. Future extractions should be small, targeted and backed by tests.

### Reusable config field primitives are still limited

Config fields are manifest-driven, but each config flow still builds much of its own DOM.

Future target:

```text
shared field primitives for select/text/json/segmented/entity controls
```

### Some normalization remains transitional

Widget-specific storage adapters exist, but legacy compatibility should continue moving toward widget-owned definitions when touched.

### Theme/component boundaries are still transitional

Semantic tokens exist, but legacy and widget-specific adapter tokens are still present.

Avoid adding new hardcoded visual exceptions outside theme/token layers.

---

## 35. What Not To Hardcode

Avoid hardcoding widget lists in:

```text
widget-manager.js
mha-widget-hub.js
widget-shell.js
```

Use:

```text
WIDGET_MODULES
WIDGET_REGISTRY
definition.manager.entries
definition.capabilities
definition.storage
definition.shell
definition.placementFlow
```

Avoid hardcoding renderer switches. Use:

```text
WIDGET_CONTENT_RENDERERS
```

Avoid hardcoding config flow decisions outside config manifests.

Avoid hardcoding HA service calls inside widget renderers. Use:

```text
src/ha/*
```

Avoid hardcoding colors inside widget CSS. Use:

```text
theme tokens
semantic tokens
adapter tokens
```

---

## 36. Recommended Refactor Direction

### Step 1 — Stabilize extension contract tests

Document and enforce:

```text
WIDGET_MODULE
WIDGET_DEFINITION
CONFIG_MANIFEST
PREVIEW_RENDERER
CSS token contract
```

### Step 2 — Extract reusable config primitives

Keep `renderFields` manifest-driven, but reduce repeated DOM boilerplate across config files.

### Step 3 — Continue widget-owned normalization

Prefer:

```js
definition.storage.normalize(widget, helpers)
```

over central compatibility branches.

### Step 4 — Continue main file extraction cautiously

Only extract one coherent responsibility at a time.

Candidates:

```text
home-assistant-connection controller
panel coordination refinements
remaining boot/app shell seams
```

### Step 5 — Stabilize token contracts

Keep visual identity in theme/token CSS and keep widgets consuming semantic roles.

### Step 6 — Prepare external packs

Once internal contracts are stable, widget/theme packs can become realistic.

---

## 37. Extension Target: Add Widget

Target current flow:

```text
1. Create src/widgets/my-widget.js
2. Export WIDGET_MODULE
3. Add module to WIDGET_MODULES
4. Optional: add styles/widgets/my-widget.css and reference it from the definition
```

Everything else should be discovered:

- manager entry;
- renderer;
- config manifest;
- preview;
- CSS;
- variants;
- aliases;
- capabilities;
- storage adapter;
- shell behavior;
- placement flow.

---

## 38. Extension Target: Add Theme

Target flow:

```text
1. Create styles/themes/my-theme.css
2. Add theme to THEME_REGISTRY
3. Optional: add accent palette
```

Everything else should be discovered:

- CSS path;
- settings option;
- default icon shape;
- accent behavior;
- token mapping.

---

## 39. Architecture Rules

Use these rules when contributing:

1. If a feature adds a widget, it should start in a widget module.
2. If a feature adds a theme, it should start in the theme registry and theme CSS.
3. If a feature touches Home Assistant service calls, it probably belongs in `src/ha`.
4. If a feature touches entity selection, it should respect admin visibility filtering.
5. If a feature adds UI controls used by multiple places, consider `src/ui`.
6. If a feature adds widget creation metadata, it belongs in the widget definition.
7. If a feature adds widget rendering, it belongs in the widget renderer.
8. If a feature adds widget config, it belongs in a config manifest.
9. If a feature changes visual identity, it belongs in theme/token CSS.
10. If a feature changes placement math, keep it pure and test it.
11. If a feature adds overlay/sheet UI, consider `src/panels` first.
12. If a feature adds orchestration, consider a small coordinator instead of growing the root.

---

## 40. Practical File Ownership Table

| Task | Primary file/folder |
|---|---|
| Add widget | `src/widgets/*` |
| Register widget | `src/widgets/widget-module-registry.js` |
| Add widget CSS | widget definition `css` + `styles/widgets/*` |
| Add widget manager item | widget definition `manager.entries` |
| Hide widget from manager | widget definition `manager.hidden` or entry `hidden` |
| Add widget renderer | widget module `renderer` |
| Add widget preview | widget module `preview` |
| Add widget config | `src/widget-config/*` + widget module `config` |
| Add config fields | config manifest `renderFields` |
| Add widget storage compatibility | definition `storage.normalize` |
| Add widget placement behavior | definition `placementFlow` |
| Add theme | `src/settings/theme-registry.js` + `styles/themes/*` |
| Add accent | `src/settings/accent-palettes.js` + `styles/themes/accent-palettes.css` |
| Change layout math | `src/layout/*` |
| Change page behavior | `src/pages/*` |
| Change HA entity/service logic | `src/ha/*` |
| Change admin visibility | `src/admin/*` |
| Change settings panel | `src/settings/*` |
| Change manager UI | `src/widget-manager/widget-manager.js` |
| Change config popup shell | `src/widget-config/widget-config-popup.js` + `src/panels/*` |
| Change reusable UI primitive | `src/ui/*` |
| Change screensaver | `src/screensaver/*` + `styles/screensaver/*` |

---

## 41. Summary

MHA Widget Hub currently has a healthy modular architecture in transition.

The most important widget chain is:

```text
WIDGET_MODULE
  ↓
widget-module-registry
  ↓
widget-registry
  ↓
widget-renderer-registry
  ↓
widget-manager
  ↓
widget-factory
  ↓
widget-shell
  ↓
renderer
```

The config chain is:

```text
widget definition config type
  ↓
widget module config manifest
  ↓
widget-config-registry
  ↓
widget-config-popup
  ↓
manifest.renderFields + draft/build
  ↓
configured widget
```

The theme chain is:

```text
THEME_REGISTRY
  ↓
style-manifest
  ↓
theme CSS
  ↓
accent palettes
  ↓
semantic tokens
  ↓
components/widgets
```

The project is already close to the desired “1 or 2 files” extension model. The next wins are smaller and more contract-focused: reusable config primitives, stronger tests, token stabilization and conservative root cleanup.
