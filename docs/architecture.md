# Internal Architecture

This document describes the current internal architecture of MHA Widget Hub.

It is intended for contributors and future maintainers.

It is based on the current project structure:

```text
mha-widget-hub.js

src/core/*
src/pages/*
src/layout/*
src/widgets/*
src/widget-manager/*
src/widget-config/*
src/settings/*
src/styles/*
src/ha/*
src/admin/*
src/screensaver/*
src/ui/*
src/system/*

styles/*
tests/*
```

---

## 1. Architecture Goal

MHA Widget Hub is moving toward a registry-driven architecture.

The long-term goal is:

```text
Add a widget:
  create widget module
  register widget module

Add a theme:
  create theme CSS
  register theme
```

The project should avoid requiring edits across many unrelated files for every new widget or theme.

Current architecture is already partially there:

- widgets are centralized through `WIDGET_MODULES`;
- widget definitions, renderers, previews, config manifests and CSS are collected from modules;
- themes are centralized through `THEME_REGISTRY`;
- theme CSS is loaded through `style-manifest.js`;
- widget manager entries are generated from widget definitions;
- config manifests are collected from widget modules;
- live previews are delegated to widget preview renderers.

The remaining work is mostly about removing final hardcoded branches from:

- config popup field rendering;
- some theme/component CSS exceptions;
- some legacy widget normalization paths;
- the main custom element orchestrator.

---

## 2. Top-Level Runtime

The main runtime entry is:

```text
mha-widget-hub.js
```

It defines the main custom element:

```js
class MhaControlHub extends HTMLElement
```

This file is currently the application orchestrator.

It imports and coordinates:

- storage;
- pages;
- layout;
- dock;
- settings;
- widget manager;
- widget config popup;
- theme controller;
- wallpaper controller;
- status bar;
- widgets;
- placement controller;
- grid runtime;
- screensaver;
- admin entity visibility;
- style manifest.

The main file should not become the home of widget-specific or theme-specific logic.

Its correct role is:

```text
Application shell + lifecycle + orchestration
```

not:

```text
Widget registry
Theme registry
Config registry
Renderer registry
CSS contract
HA business logic
```

---

## 3. Current High-Level Module Map

```text
mha-widget-hub.js
  ↓
src/core
  storage, storage keys, DOM lifecycle

src/pages
  page model, page store, page controller

src/layout
  shell, dock, grid runtime, responsive layout, placement

src/widgets
  widget modules, registry, renderer registry, shell, previews, variants

src/widget-manager
  widget manager catalog and UI

src/widget-config
  config manifests, config registry, config popup

src/settings
  settings panel, theme controller, theme registry, accent palettes, wallpaper

src/styles
  CSS manifest generation

src/ha
  Home Assistant entity/action abstractions

src/admin
  entity visibility and permissions

src/screensaver
  screensaver runtime/controller

src/ui
  reusable UI primitives

src/system
  system buttons and icons

styles
  actual CSS files loaded by manifest

tests
  behavior and architecture coverage
```

---

## 4. Boot And Style Loading

MHA does not load CSS by manually writing every stylesheet in the main file.

The main file imports:

```js
getStyleManifest()
```

from:

```text
src/styles/style-manifest.js
```

Then it generates stylesheet links through:

```js
createFrontendStyleLinks()
```

The style manifest is composed from:

1. static core/component styles before themes;
2. registered theme CSS paths;
3. static styles after themes;
4. widget CSS paths from the widget registry;
5. final static styles such as screensaver CSS.

Current style loading source:

```text
src/styles/style-manifest.js
```

The manifest uses:

```js
getThemeCssPaths()
```

from:

```text
src/settings/theme-registry.js
```

and:

```js
WIDGET_REGISTRY
```

from:

```text
src/widgets/widget-registry.js
```

This means registered themes and registered widgets contribute CSS automatically.

---

## 5. Critical Boot Style

The main element injects a small critical boot style directly.

Purpose:

- avoid showing raw HTML/code-like content while HA loads external styles;
- keep a styled background visible;
- hide app content until the layout and external styles are ready.

This is intentionally not part of the normal theme system.

It is a boot safety layer.

Normal visual styling belongs in:

```text
styles/*
```

---

## 6. Storage Layer

Storage helpers live in:

```text
src/core/storage.js
src/core/storage-keys.js
```

The main runtime imports:

```js
readJson
writeJson
writeStorageValue
STORAGE_KEYS
```

Storage keys include user layout and app state such as:

- widget order;
- widget sizes;
- hidden widgets;
- widget positions;
- pages;
- active page;
- dock position.

Theme-specific storage is handled mostly inside:

```text
src/settings/theme-controller.js
```

Wallpaper storage is handled in:

```text
src/settings/wallpaper-storage.js
```

Entity visibility storage is handled in:

```text
src/admin/entity-visibility-store.js
```

Rule:

```text
Storage access should be centralized through domain modules.
```

Avoid scattering raw `localStorage.getItem()` and `localStorage.setItem()` calls across unrelated features.

---

## 7. Page Architecture

Page logic lives in:

```text
src/pages/page-model.js
src/pages/page-store.js
src/pages/page-controller.js
```

Responsibilities:

### page-model.js

Owns pure page normalization and model helpers.

Examples:

```js
normalizePage()
getActivePage()
```

### page-store.js

Owns persistence and migration.

Examples:

```js
migratePageStorage()
readPages()
savePages()
readActivePageId()
```

### page-controller.js

Owns page operations.

Examples:

```js
addPage()
renamePage()
deletePage()
movePage()
selectPage()
changePageIcon()
removePageWidgetPositions()
```

The main element should call page operations, not duplicate their logic.

---

## 8. Layout Architecture

Layout logic lives in:

```text
src/layout/*
```

Important files:

| File | Responsibility |
|---|---|
| `layout-engine.js` | widget size contract, density, layout mode, grid presets |
| `responsive.js` | responsive breakpoint layout selection |
| `shell.js` | main visual shell creation |
| `dock.js` | dock DOM |
| `dock-controller.js` | dock props and active state sync |
| `mobile-dock.js` | mobile dock |
| `grid-runtime.js` | grid runtime behavior |
| `placement-controller.js` | drag/drop/edit orchestration |
| `placement-calculations.js` | placement algorithms |
| `placement-geometry.js` | geometry helpers |
| `status-bar.js` | status bar rendering/update |

---

## 9. Widget Size Contract

The public widget size contract uses a familiar mobile-widget vocabulary.

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

Important constants/functions:

```js
USER_WIDGET_SIZE_UNIT = 2
widgetSpanToLogicalCellCount()
widgetSizeToLogicalSize()
logicalSizeToWidgetSize()
getInternalGridColumnCountFromLogical()
getInternalGridRowCountFromLogical()
```

This is why a “normal” widget is usually `2×2`.

---

## 10. Responsive Layout

The responsive layout system decides:

- mobile;
- tablet;
- desktop;
- wallpanel/tablet-like mode.

The main function is:

```js
getEffectiveLayout(host)
```

The grid preset function is:

```js
getGridPreset(host, layout, metrics)
```

It chooses:

- columns;
- rows;
- cell size;
- fill ratio;
- comfort score.

The system prioritizes:

1. comfortable widget size;
2. square cells;
3. good use of available area.

It intentionally does not simply fill all available width at any cost.

---

## 11. Placement Architecture

Widget movement and placement are split into two kinds of modules.

### Pure geometry

```text
src/layout/placement-geometry.js
```

This contains low-level rectangle and collision helpers.

### Placement calculations

```text
src/layout/placement-calculations.js
```

This contains higher-level placement behavior.

### Placement controller

```text
src/layout/placement-controller.js
```

This coordinates edit/drag/drop behavior with the main UI.

Rule:

```text
Geometry/calculation modules should stay pure and testable.
```

The controller can deal with DOM/runtime state.

---

## 12. Widget Architecture Overview

The widget system is centered on:

```text
src/widgets/widget-module-registry.js
```

Each real widget exports a `WIDGET_MODULE`.

Current widget modules include:

```text
clock-widget.js
simple-button-widget.js
slider-widget.js
toggle-widget.js
toggle-slider-widget.js
toggle-buttons-widget.js
weather-widget.js
media-widget.js
```

There is also an internal empty placeholder module.

This is the core extension point for widgets.

---

## 13. WIDGET_MODULE Contract

A widget module can contain:

```js
{
  kind,
  definition,
  renderer,
  config,
  preview
}
```

### kind

Stable widget kind.

Examples:

```text
clock
button
slider
toggle
toggle-slider
weather
media
```

### definition

Widget metadata and catalog contract.

### renderer

Content renderer object.

### config

Optional config manifest.

### preview

Optional preview renderer metadata.

---

## 14. Widget Definition Contract

A widget definition typically contains:

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
  normalizeSize
}
```

Important responsibilities:

| Field | Purpose |
|---|---|
| `component` | shell/component identity |
| `category` | default manager/category grouping |
| `manager.entries` | widget manager catalog entries |
| `renderer` | renderer key used to find content renderer |
| `css` | widget CSS paths |
| `aliases` | legacy kind/component compatibility |
| `variantAliases` | legacy variant compatibility |
| `defaultSize` | fallback widget size |
| `defaultVariant` | fallback variant |
| `variants` | available variants |
| `variantGroups` | orientation-specific variants |
| `config` | config type id |
| `normalizeSize` | optional kind-specific size normalization |

---

## 15. Widget Registry

Main file:

```text
src/widgets/widget-registry.js
```

The widget registry builds:

```js
WIDGET_REGISTRY
```

from:

```js
WIDGET_MODULES
```

It owns:

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

Important functions:

```js
getWidgetManagerCategories()
resolveWidgetKind()
getWidgetDefinition()
getWidgetPreviewRenderer()
getWidgetConfigType()
isWidgetKind()
normalizeRegisteredWidgetSize()
getRegisteredWidgetVariants()
normalizeWidgetContract()
```

---

## 16. Widget Manager Catalog Flow

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

Current known special cases:

- `empty` is skipped from the normal manager;
- `toggle-buttons` is skipped from the normal manager;
- `temperature-slider` is skipped.

These special cases should eventually be represented declaratively instead of hardcoded.

---

## 17. Widget Renderer Registry

Renderer registration lives in:

```text
src/widgets/widget-renderer-registry.js
```

It creates:

```js
WIDGET_CONTENT_RENDERERS
```

from:

```js
WIDGET_MODULES
```

Renderer lookup and rendering are handled by:

```text
src/widgets/widget-renderers.js
```

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

This means widget content rendering is no longer a giant `switch`.

---

## 18. Widget Shell

Widget shell logic lives in:

```text
src/widgets/widget-shell.js
```

The shell is responsible for:

- outer widget wrapper;
- common dataset attributes;
- common tools;
- edit state;
- content placement.

Content should be delegated to:

```text
src/widgets/widget-renderers.js
```

Rule:

```text
The shell owns common widget chrome.
The renderer owns widget-specific content.
```

---

## 19. Widget Factory

Widget creation from manager catalog entries lives in:

```text
src/widgets/widget-factory.js
```

Important function:

```js
createWidgetFromCatalogItem(item)
```

Flow:

```text
manager item
  ↓
resolveWidgetKind()
  ↓
getWidgetDefinition()
  ↓
choose variant/category/base size
  ↓
normalizeWidgetForKind()
  ↓
normalizeWidgetContract()
  ↓
new widget object with generated id
```

The generated id pattern includes:

```text
widget-{category}-{variant}-{timestamp}-{random}
```

This factory should remain the default entry point for creating new widgets from catalog items.

---

## 20. Widget Contract Normalization

Stored widgets may come from old versions.

The registry normalizes them through:

```js
normalizeWidgetContract(widget, normalizeBaseSize)
```

It ensures:

- stable `kind`;
- stable `type`;
- correct `component`;
- category fallback;
- variant fallback;
- normalized `w` and `h`.

It also includes kind-specific compatibility handling for:

- clock weather variant;
- slider `sliderAction`;
- toggle entity id;
- button entity id;
- weather entity id;
- toggle-slider `lightEntityId` and `sliderMode`.

This is legacy compatibility logic.

It is acceptable in the registry, but should not grow endlessly.

---

## 21. Widget Variant Architecture

Variant helpers live in:

```text
src/widgets/widget-variants.js
```

Purpose:

- choose next available variant;
- support orientation/size-dependent variants;
- keep variant behavior out of widget shell code.

Widget definitions may expose:

```js
variants
variantGroups
variantAliases
```

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

## 23. Widget Config Architecture

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
user edits draft
        ↓
manifest build() creates configured widget
```

Strength:

```text
Config manifests are already collected from widget modules.
```

Remaining gap:

```text
Field renderers still live centrally in widget-config-popup.js.
```

Target:

```text
Config manifest should own field renderer.
```

---

## 24. Widget Manager Architecture

Main file:

```text
src/widget-manager/widget-manager.js
```

Responsibilities:

- render widget category navigation;
- render manager entries;
- render previews;
- handle widget selection;
- provide selected catalog item back to main runtime.

The manager should not know widget internals.

It should consume:

```text
registry metadata + preview renderer output
```

---

## 25. Theme Architecture

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

Theme registry:

```js
THEME_REGISTRY
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

iOS Liquid/Frosted is not two separate registry themes.

It is controlled by:

```text
data-ios-glass="liquid"
data-ios-glass="frosted"
```

---

## 26. Theme Controller

Main file:

```text
src/settings/theme-controller.js
```

Responsibilities:

- read theme settings;
- store theme settings;
- resolve auto/dark/light;
- sync dataset attributes on host and document;
- handle theme style;
- handle iOS glass variant;
- handle accent mode and accent value;
- handle icon shape preference.

CSS should react to dataset attributes such as:

```text
data-theme-setting
data-theme
data-theme-style
data-ios-glass
data-accent
data-accent-mode
data-icon-shape-setting
data-icon-shape
```

Rule:

```text
Theme behavior should be driven by state attributes and CSS variables.
```

not JavaScript conditionals inside widget renderers.

---

## 27. Accent Architecture

Accent logic lives in:

```text
src/settings/accent-palettes.js
src/settings/wallpaper-accent.js
styles/themes/accent-palettes.css
```

JavaScript owns:

- accent option lists;
- reference colors;
- wallpaper color extraction/matching;
- per-theme accent support.

CSS owns:

- actual variable application through selectors.

Important accent variables include:

```css
--mha-accent
--mha-accent-soft
--mha-accent-strong
--mha-accent-contrast
```

---

## 28. Wallpaper Architecture

Wallpaper logic lives in:

```text
src/settings/wallpaper-controller.js
src/settings/wallpaper-storage.js
src/settings/wallpaper-accent.js
```

Responsibilities:

- manage custom wallpapers;
- store light/dark wallpapers locally;
- apply wallpaper CSS variables;
- support accent extraction.

Wallpaper is intentionally frontend/local.

There is no backend sync layer in the current architecture.

---

## 29. Settings Panel Architecture

Main file:

```text
src/settings/settings-panel.js
```

Responsibilities:

- render settings UI;
- theme selection;
- iOS glass selection;
- accent selection;
- dock position;
- wallpaper settings;
- page-related settings when relevant.

Settings panel styling:

```text
styles/settings/settings-panel.css
```

The settings panel should consume theme tokens and not define separate theme identities.

---

## 30. Style Architecture

Style manifest:

```text
src/styles/style-manifest.js
```

CSS folders:

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

Current conceptual CSS layers:

| Folder | Purpose |
|---|---|
| `core` | base tokens/background |
| `components` | reusable UI primitives |
| `system` | system controls |
| `themes` | visual systems and token mapping |
| `layout` | shell/grid/dock/status layout |
| `settings` | settings panel |
| `widget-manager` | manager and config popup |
| `widgets` | widget shell/layout/widget-specific CSS |
| `screensaver` | screensaver |

Rule:

```text
Theme files define visual identity.
Component/widget CSS consumes tokens.
```

---

## 31. Semantic Token Architecture

Semantic token mapping lives in:

```text
styles/themes/semantic-tokens.css
styles/SEMANTIC_TOKENS.md
```

The intended flow:

```text
theme raw variables
    ↓
semantic tokens
    ↓
component/widget adapter tokens
    ↓
actual CSS usage
```

Canonical token direction:

```css
--mha-primary-surface
--mha-on-primary-surface
--mha-secondary-surface
--mha-on-secondary-surface
--mha-primary-border
--mha-secondary-border
--mha-primary-text
--mha-secondary-text
--mha-accent-surface
--mha-on-accent-surface
```

Avoid expanding widget-specific tokens unless the widget truly needs a private visual adapter.

---

## 32. Home Assistant Abstraction Layer

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
| `weather.js` | weather helpers |

Widgets should use the HA abstraction layer instead of directly scattering:

```js
hass.callService(...)
hass.states[entityId]
```

This keeps HA behavior consistent and testable.

---

## 33. Admin / Entity Visibility Architecture

Admin logic lives in:

```text
src/admin/admin-panel.js
src/admin/entity-permissions.js
src/admin/entity-visibility-store.js
```

Responsibilities:

- define entity visibility config;
- load/save visibility;
- filter entities for current user;
- support the dedicated MHA Admin panel.

The config flow uses entity visibility filtering when building selection lists.

This prevents users from selecting entities they are not allowed to see.

---

## 34. UI Primitives

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

These should become the preferred building blocks for repeated UI patterns.

Goal:

```text
Widgets compose primitives instead of duplicating control markup/styles.
```

---

## 35. System Controls

System-level buttons/icons live in:

```text
src/system/*
```

Examples:

```text
index.js
system-buttons.js
system-icons.js
```

These are not widget content.

They are app/system chrome.

---

## 36. Screensaver Architecture

Screensaver logic lives in:

```text
src/screensaver/screensaver.js
src/screensaver/screensaver-controller.js
```

The controller owns idle behavior.

The renderer owns screensaver DOM and updates.

Screensaver CSS:

```text
styles/screensaver/screensaver.css
```

---

## 37. DOM Lifecycle

DOM cleanup helpers live in:

```text
src/core/dom-lifecycle.js
```

The main runtime imports:

```js
destroyDomSubtree()
```

Use this kind of helper when replacing dynamic UI sections that may contain event listeners, observers, timers, or nested state.

Avoid manual partial cleanup scattered across unrelated functions.

---

## 38. Data Flow: Widget Creation

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
    buildConfiguredWidget()
        ↓
normalizeWidgetContract()
        ↓
place widget on grid
        ↓
save page/widget state
```

Important:

The catalog item should preserve:

- kind;
- variant;
- size;
- label/title;
- category.

The config flow should preserve those values by spreading the original widget.

---

## 39. Data Flow: Widget Rendering

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

The renderer receives a render context created through:

```text
src/widgets/widget-preview-context.js
```

Despite the name, this module also creates the standard widget render context.

---

## 40. Data Flow: Widget Preview

Typical preview flow:

```text
Manager catalog item
        ↓
createLiveWidgetPreview()
        ↓
getWidgetPreviewRenderer()
        ↓
createWidgetPreviewRenderContext()
        ↓
previewRenderer.createWidget()
        ↓
previewRenderer.render() or normal registered widget renderer
        ↓
preview shell
        ↓
scaled in widget manager
```

Preview details are documented separately in:

```text
docs/preview-system.md
```

---

## 41. Data Flow: Theme Application

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

Theme style CSS is loaded by:

```text
style-manifest.js
```

using paths from:

```text
theme-registry.js
```

---

## 42. Data Flow: CSS Loading

Full CSS flow:

```text
getStyleManifest()
    ↓
static styles before themes
    ↓
getThemeCssPaths()
    ↓
static styles after themes
    ↓
getWidgetStyleManifestEntries()
    ↓
screensaver CSS
    ↓
main element injects link tags
```

This allows:

- new themes to add CSS through theme registry;
- new widgets to add CSS through widget definition;
- load order to remain predictable.

---

## 43. Data Flow: Entity Selection

Typical entity config flow:

```text
hass.states
    ↓
getEntityOptionsByDomain()
    ↓
isEntityAvailable()
    ↓
filterEntitiesForCurrentUser()
    ↓
friendly labels via getEntityDisplayName()
    ↓
config popup select options
    ↓
draft
    ↓
build widget config
```

Main helper file:

```text
src/widget-config/light-options.js
```

This file is currently broader than its name.

Future name suggestion:

```text
src/widget-config/entity-options.js
```

---

## 44. Tests

Current tests cover many architectural seams, including:

```text
dom-lifecycle.test.js
placement-controller.test.js
entity-visibility-store.test.js
page-store.test.js
page-model.test.js
widget-manager-catalog.test.js
entity-permissions.test.js
widget-preview-context.test.js
storage.test.js
responsive-layout.test.js
placement-calculations.test.js
page-controller.test.js
ios-surface-tokens.test.js
widget-factory.test.js
wallpaper-storage.test.js
ha-bindings.test.js
screensaver-controller.test.js
theme-text-tokens.test.js
widget-preview-renderer.test.js
placement-geometry.test.js
```

Architecture changes should add or update tests around:

- registry generation;
- widget normalization;
- config manifest lookup;
- preview rendering;
- theme token contracts;
- placement calculations;
- page persistence;
- HA action helpers.

---

## 45. Current Strong Points

The architecture already has several strong foundations:

- widget modules are real;
- registries are centralizing behavior;
- style manifest gives predictable CSS order;
- HA abstraction exists;
- preview system is advanced;
- config flows have clean draft/build separation;
- tests cover important seams.

---

## 46. Current Weak Points

### Main element still orchestrates a lot

`mha-widget-hub.js` is much smaller than before, but still imports many modules and coordinates many responsibilities.

This is acceptable for now, but future extractions should continue.

Possible future modules:

```text
app-lifecycle-controller
widget-grid-controller
secondary-ui-controller
boot-controller
```

### Config popup still has central type branching

Adding a new config flow still requires editing:

```text
src/widget-config/widget-config-popup.js
```

Target:

```text
manifest.renderFields()
```

### Some manager exclusions are hardcoded

Examples:

```text
empty
toggle-buttons
temperature-slider
```

Target:

```js
manager: {
  hidden: true
}
```

or:

```js
manager: {
  entries: []
}
```

with no special-case code.

### Some normalization is kind-specific

`normalizeWidgetContract()` still contains widget-specific branches.

This is useful for compatibility, but should not become a dumping ground.

Future target:

```js
definition.normalizeContract(widget, base)
```

### Theme/component boundaries are still transitional

Theme tokens exist, but legacy and widget-specific adapter tokens are still present.

This is normal during migration.

Avoid adding new hardcoded visual exceptions outside theme/token layers.

---

## 47. What Not To Hardcode

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
```

Avoid hardcoding renderer switches.

Use:

```text
WIDGET_CONTENT_RENDERERS
```

Avoid hardcoding theme CSS paths outside:

```text
theme-registry.js
style-manifest.js
```

Avoid hardcoding config flow decisions outside:

```text
config manifests
```

Current exception:

```text
widget-config-popup.js
```

but this should shrink over time.

Avoid hardcoding HA service calls inside widget renderers.

Use:

```text
src/ha/*
```

Avoid hardcoding colors inside widget CSS.

Use:

```text
theme tokens
semantic tokens
adapter tokens
```

---

## 48. Recommended Refactor Direction

### Step 1 — Complete config modularity

Move field renderers into config manifests.

Target:

```js
config: {
  type,
  title,
  hint,
  createDraft,
  build,
  renderFields
}
```

Result:

```text
New config flow no longer edits widget-config-popup.js.
```

### Step 2 — Move kind-specific normalization into definitions

Target:

```js
definition.normalizeContract(widget, helpers)
```

Result:

```text
normalizeWidgetContract() becomes generic.
```

### Step 3 — Make manager exclusions declarative

Target:

```js
manager: {
  visible: false
}
```

or no manager entries.

Result:

```text
getWidgetManagerCategories() does not know special widget names.
```

### Step 4 — Continue main file extraction

Extract orchestration chunks from:

```text
mha-widget-hub.js
```

Candidates:

```text
boot-controller
widget-grid-controller
panel-controller
home-assistant-connection-controller
```

### Step 5 — Stabilize public extension contracts

Document and enforce:

```text
WIDGET_MODULE
THEME_REGISTRY entry
CONFIG_MANIFEST
PREVIEW_RENDERER
CSS token contract
```

### Step 6 — Prepare external packs

Once the internal registry contracts are stable, widget/theme packs can become realistic.

---

## 49. Extension Target: Add Widget

Target final flow:

```text
1. Create src/widgets/my-widget.js
2. Export WIDGET_MODULE
3. Add module to WIDGET_MODULES
```

Everything else should be discovered:

- manager entry;
- renderer;
- config manifest;
- preview;
- CSS;
- variants;
- aliases.

Today this is almost true.

Remaining blockers:

- config field rendering may require central popup edit;
- any unusual normalization may require central registry edit;
- any manager special behavior may require central manager/registry edit.

---

## 50. Extension Target: Add Theme

Target final flow:

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

Today this is mostly true.

Remaining blockers:

- new accent CSS selectors still need `accent-palettes.css`;
- special semantic mapping may need `semantic-tokens.css`;
- components must keep consuming tokens instead of direct theme selectors.

---

## 51. Extension Target: Widget Packs

Future widget packs would ideally provide:

```text
widget module
widget CSS
config manifest
preview renderer
preview data
optional assets
```

The internal architecture already points in this direction.

The missing piece is dynamic discovery/loading.

Current registry is static:

```text
WIDGET_MODULES
```

That is acceptable for now.

Static registry is safer and easier to test.

---

## 52. Extension Target: Theme Packs

Future theme packs would ideally provide:

```text
theme definition
theme CSS
accent palette
semantic adapter overrides if needed
assets
```

Current registry is static:

```text
THEME_REGISTRY
```

Again, this is acceptable for now.

Do not jump to plugin loading until the internal contracts are stable.

---

## 53. Architecture Rules

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

---

## 54. Practical File Ownership Table

| Task | Primary file/folder |
|---|---|
| Add widget | `src/widgets/*` |
| Register widget | `src/widgets/widget-module-registry.js` |
| Add widget CSS | widget definition `css` + `styles/widgets/*` |
| Add widget manager item | widget definition `manager.entries` |
| Add widget renderer | widget module `renderer` |
| Add widget preview | widget module `preview` |
| Add widget config | `src/widget-config/*` + widget module `config` |
| Add theme | `src/settings/theme-registry.js` + `styles/themes/*` |
| Add accent | `src/settings/accent-palettes.js` + `styles/themes/accent-palettes.css` |
| Change layout math | `src/layout/*` |
| Change page behavior | `src/pages/*` |
| Change HA entity/service logic | `src/ha/*` |
| Change admin visibility | `src/admin/*` |
| Change settings panel | `src/settings/settings-panel.js` |
| Change manager UI | `src/widget-manager/widget-manager.js` |
| Change config popup shell | `src/widget-config/widget-config-popup.js` |
| Change reusable UI primitive | `src/ui/*` |

---

## 55. Summary

MHA Widget Hub currently has a healthy modular architecture in transition.

The most important architectural chain is:

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
draft/build
  ↓
configured widget
```

The preview chain is:

```text
widget module preview renderer
  ↓
widget-preview-renderer
  ↓
mock preview context
  ↓
real widget renderer
  ↓
scaled manager preview
```

The project is already close to the desired “1 or 2 files” extension model.

The next architectural wins are:

1. make config field rendering manifest-driven;
2. make widget-specific normalization definition-driven;
3. make manager visibility/special cases declarative;
4. continue reducing the main custom element;
5. keep visual identity in theme/token layers.
