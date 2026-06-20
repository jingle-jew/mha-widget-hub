# Widget Development Guide

This document explains how widgets are added to MHA Widget Hub using the current registry-driven architecture.

MHA widgets should be native MHA widgets. Do not embed Home Assistant dashboard cards or external HACS/custom cards as widget dependencies.

---

## 1. Architecture Overview

Every widget is packaged as a `WIDGET_MODULE`.

A widget module may contain:

- definition;
- renderer;
- config manifest;
- preview metadata;
- CSS metadata;
- aliases;
- variants;
- storage normalization;
- capabilities;
- shell behavior;
- placement flow.

Flow:

```text
WIDGET_MODULE
    ↓
widget-module-registry.js
    ↓
widget-registry.js
    ↓
widget-renderer-registry.js
    ↓
Widget Manager / Grid / Preview System / Config Popup
```

The only current central widget registration seam is `src/widgets/widget-module-registry.js`.

---

## 2. Create The Widget File

Create a new file:

```text
src/widgets/my-widget.js
```

The file exports a `WIDGET_MODULE` object.

Minimal shape:

```js
export const WIDGET_MODULE = Object.freeze({
  kind: "my-widget",
  definition: MY_WIDGET_DEFINITION,
  renderer: MY_WIDGET_CONTENT_RENDERER,
  config: MY_WIDGET_CONFIG_MANIFEST,
  preview: MY_WIDGET_PREVIEW,
});
```

If a field is not needed, omit it.

---

## 3. Widget Definition

The definition describes the widget contract.

Typical fields:

```js
export const MY_WIDGET_DEFINITION = Object.freeze({
  component: "my-widget",
  category: "utilities",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({
        category: "utilities",
        variant: "default",
        label: "My Widget",
        size: freezeSize(2, 2),
        description: "Example widget",
        order: 100,
      }),
    ]),
  }),
  renderer: "my-widget",
  css: css("styles/widgets/my-widget.css"),
  preview: "my-widget",
  config: "my-widget",
  aliases: ["my-widget"],
  variantAliases: [],
  defaultVariant: "default",
  defaultSize: freezeSize(2, 2),
  variants: [
    variant("default", "Default", 2, 2),
  ],
});
```

Important fields:

| Field | Purpose |
|---|---|
| `component` | shell/component identity |
| `category` | fallback widget category |
| `manager` | widget manager behavior and catalog entries |
| `renderer` | renderer key used by the renderer registry |
| `css` | CSS paths loaded by the style manifest |
| `preview` | preview renderer key/metadata |
| `config` | config manifest type id |
| `aliases` | legacy kind/component compatibility |
| `variantAliases` | legacy variant compatibility |
| `defaultSize` | fallback widget size |
| `defaultVariant` | fallback variant |
| `variants` | available variants |
| `capabilities` | feature flags used by shell/flows |
| `storage` | widget-specific storage compatibility adapter |
| `shell` | shell behavior hints |
| `placementFlow` | creation/placement behavior |

---

## 4. Manager Entries

Manager entries control what appears in the widget manager.

Current categories:

- utilities;
- actions;
- lights;
- climate;
- media;
- security;
- system.

Each entry can define:

- category;
- variant;
- label;
- labelKey;
- description;
- descriptionKey;
- icon;
- size;
- order;
- hidden.

Use `manager.hidden: true` to hide an entire widget from the manager. Use `entry.hidden: true` to hide a single catalog entry.

Do not add widget-specific catalog branches to `widget-manager.js`.

---

## 5. Renderer

The renderer generates widget content.

Example:

```js
export const MY_WIDGET_CONTENT_RENDERER = Object.freeze({
  render({ widget, hass, interactive, isEditing }) {
    const root = document.createElement("div");
    root.className = "mha-my-widget";
    root.textContent = widget.label || "My Widget";
    return root;
  },
});
```

Keep widget-specific DOM/content logic inside the renderer.

Avoid hardcoding widget-manager behavior, theme identity, global layout behavior or Home Assistant service calls directly in the renderer.

Use helpers from `src/ha/` for Home Assistant behavior.

---

## 6. CSS

Each widget can own CSS through the widget definition:

```js
css: css("styles/widgets/my-widget.css")
```

Create:

```text
styles/widgets/my-widget.css
```

Use theme/semantic tokens whenever possible.

Prefer:

```css
background: var(--mha-primary-surface);
color: var(--mha-primary-text);
border: 1px solid var(--mha-primary-border);
```

over:

```css
background: #ffffff;
color: rgba(...);
border: 1px solid rgba(...);
```

Widget CSS should not define a separate visual identity per theme unless the exception is truly local and intentional.

---

## 7. Preview Support

MHA supports live previews.

Preferred preview shape:

```js
function createMyWidgetPreviewWidget(item = {}, context = {}) {
  return {
    ...item,
    kind: "my-widget",
    type: "my-widget",
    component: "my-widget",
    variant: item.variant || "default",
    label: item.label || "Preview Label",
  };
}

export const MY_WIDGET_PREVIEW = Object.freeze({
  mode: "live",
  createWidget: createMyWidgetPreviewWidget,
});
```

Most widgets should use live previews because the preview system can reuse the real widget renderer and CSS in a safe, non-interactive context.

Static previews remain available for simple or placeholder widgets.

See:

```text
docs/preview-system.md
```

---

## 8. Config Flows

Widgets may optionally provide configuration flows.

Current configurable widgets include:

- button;
- scenes;
- toggle;
- slider;
- toggle + slider;
- weather;
- media.

A configurable widget provides:

```js
export const MY_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "my-widget",
  title: "Configure my widget",
  hint: "Choose options for this widget.",
  createDraft,
  build,
  renderFields,
});
```

The config popup is generic and delegates field rendering to `renderFields`.

See:

```text
docs/config-flows.md
```

---

## 9. Capabilities

Widget definitions can expose capabilities used by shell and placement flows.

Example:

```js
capabilities: Object.freeze({
  configurable: true,
  resizable: true,
  slotConfigurable: false,
  weatherEntityConfigurable: false,
})
```

Common capability meanings:

| Capability | Purpose |
|---|---|
| `configurable` | widget supports a config flow |
| `resizable` | widget can expose size/variant controls |
| `slotConfigurable` | widget can configure a specific internal slot |
| `weatherEntityConfigurable` | widget can configure a weather entity |

Use capabilities instead of adding widget-specific checks in the shell or manager.

---

## 10. Storage Normalization

Widget definitions can provide storage compatibility through:

```js
storage: Object.freeze({
  normalize(widget = {}) {
    return {
      entityId: widget.entityId || widget.entity_id || "",
    };
  },
})
```

`normalizeWidgetContract()` applies the generic registry contract and then merges the widget-specific storage patch.

Use this for compatibility aliases, legacy fields or widget-specific stored data normalization.

Avoid growing central normalization branches in the registry.

---

## 11. Shell Behavior

Widget definitions can provide shell behavior hints:

```js
shell: Object.freeze({
  configureMode: "variant",
})
```

Use shell behavior metadata instead of hardcoding one widget kind in `widget-shell.js`.

---

## 12. Placement Flow

Widget definitions can control how placement starts:

```js
placementFlow: "configure-first"
```

or:

```js
placementFlow: "slot-config-first"
```

Examples:

- regular configurable widgets can use configure-first behavior;
- the scenes widget uses slot-config-first behavior so a specific button can be configured before placement.

---

## 13. Register The Widget

Import the widget inside:

```text
src/widgets/widget-module-registry.js
```

Example:

```js
import { WIDGET_MODULE as myWidgetModule } from "./my-widget.js";
```

Add it to:

```js
export const WIDGET_MODULES = Object.freeze([
  ...
  myWidgetModule,
]);
```

This is currently the only required registry registration step.

---

## 14. Aliases

Aliases provide backward compatibility.

Example:

```js
aliases: [
  "old-widget-name",
]
```

Variant aliases can also be mapped:

```js
variantAliases: [
  "legacy-variant",
]
```

The registry resolves aliases automatically.

---

## 15. Widget Sizes

MHA uses a public widget-size vocabulary:

```text
2×2 = standard square widget
4×2 = wide widget
2×4 = tall widget
4×4 = large widget
```

Most widgets expose a default size:

```js
defaultSize: freezeSize(2, 2)
```

Manager entries and variants may expose additional sizes.

---

## 16. Existing Widgets

Current widget modules include:

- `empty-widget`
- `clock-widget`
- `simple-button-widget`
- `scenes-widget`
- `slider-widget`
- `toggle-widget`
- `toggle-slider-widget`
- `toggle-buttons-widget`
- `weather-widget`
- `media-widget`

Good reference implementations:

| Need | Reference |
|---|---|
| simple renderer | `simple-button-widget.js` |
| HA entity config | `toggle-widget.js`, `slider-widget.js` |
| combined entity behavior | `toggle-slider-widget.js` |
| media model/actions | `media-widget.js` |
| slot config | `scenes-widget.js` |
| weather data | `weather-widget.js` |

---

## 17. Recommended Development Workflow

1. Create the widget file.
2. Define manager entries.
3. Implement renderer.
4. Add CSS if needed.
5. Add preview support.
6. Add config manifest if needed.
7. Add storage normalization if needed.
8. Register in `widget-module-registry.js`.
9. Add or update tests.
10. Verify preview rendering.
11. Verify widget manager integration.
12. Test in Home Assistant.
13. Commit as a standalone change.

---

## 18. Long-Term Goal

The target architecture remains:

```text
Add widget file
      +
Register widget module
```

A contributor should be able to add a complete widget by touching only one or two files, with CSS/config/preview/metadata discovered from the widget module.
