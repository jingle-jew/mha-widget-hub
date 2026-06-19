# Adding Widgets

MHA widgets are registry-driven. A widget should be mostly self-contained in one module file, with optional CSS and config helpers next to the existing widget/config conventions.

MHA should remain purely MHA: do not add Home Assistant dashboard cards or external HACS/custom card dependencies as widgets.

---

## Goal

To add a standard widget:

```text
1. Create src/widgets/my-widget.js
2. Export WIDGET_MODULE
3. Add one import/entry in src/widgets/widget-module-registry.js
4. Add an optional CSS file referenced by the widget definition
```

The rest is assembled automatically by the registries:

- widget manager catalog;
- widget definition registry;
- renderer registry;
- config registry;
- CSS manifest;
- preview system;
- storage normalization hooks;
- shell/placement metadata.

---

## Minimal Widget Module

```js
import {
  css,
  freezeSize,
  variant,
} from "./widget-definition-utils.js";

function renderMyWidget({ widget }) {
  const root = document.createElement("div");
  root.className = "mha-my-widget";
  root.textContent = widget.label || "My Widget";
  return root;
}

export const MY_WIDGET_DEFINITION = Object.freeze({
  component: "my-widget",
  category: "utilities",
  renderer: "my-widget",
  preview: "my-widget",
  aliases: ["my-widget"],
  variantAliases: [],
  defaultVariant: "default",
  defaultSize: freezeSize(2, 2),
  css: css("styles/widgets/my-widget.css"),
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({
        category: "utilities",
        variant: "default",
        label: "My Widget",
        size: freezeSize(2, 2),
        description: "A simple custom widget.",
        order: 100,
      }),
    ]),
  }),
  variants: [
    variant("default", "Default", 2, 2),
  ],
});

export const MY_WIDGET_RENDERER = Object.freeze({
  render: renderMyWidget,
});

function createMyWidgetPreviewWidget(item = {}) {
  return {
    ...item,
    kind: "my-widget",
    type: "my-widget",
    component: "my-widget",
    variant: item.variant || "default",
    label: item.label || "My Widget",
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "my-widget",
  definition: MY_WIDGET_DEFINITION,
  renderer: MY_WIDGET_RENDERER,
  preview: Object.freeze({
    mode: "live",
    createWidget: createMyWidgetPreviewWidget,
  }),
});
```

---

## Register The Module

In `src/widgets/widget-module-registry.js`:

```js
import { WIDGET_MODULE as myWidgetModule } from "./my-widget.js";

export const WIDGET_MODULES = Object.freeze([
  // existing modules...
  myWidgetModule,
]);
```

This is the current explicit registration seam.

---

## Optional CSS

Create:

```text
styles/widgets/my-widget.css
```

Example:

```css
.mha-my-widget {
  background: var(--mha-primary-surface);
  color: var(--mha-primary-text);
  border: 1px solid var(--mha-primary-border);
}
```

Then reference it in the widget definition:

```js
css: css("styles/widgets/my-widget.css")
```

The style manifest will include it automatically.

---

## Configurable Widget

A configurable widget can also export a config manifest inside `WIDGET_MODULE`.

```js
const createDraft = (widget = {}) => ({
  draft: {
    label: widget.label || "My Widget",
  },
});

const build = (widget = {}, draft = {}) => ({
  ...widget,
  kind: "my-configurable-widget",
  type: "my-configurable-widget",
  component: "my-configurable-widget",
  label: draft.label || "My Widget",
});

function renderFields(session, hass, visibilityConfig, onChange, helpers) {
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const input = document.createElement("input");
  input.value = session.draft.label || "";
  input.addEventListener("input", () => {
    session.draft.label = input.value;
    onChange?.(session.draft);
  });

  fields.append(helpers.createField("Display name", input));

  return {
    fields,
    canSave: true,
    isValid: () => true,
  };
}

export const MY_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "my-configurable-widget",
  title: "Configure my widget",
  hint: "Choose the display name.",
  createDraft,
  build,
  renderFields,
});

export const WIDGET_MODULE = Object.freeze({
  kind: "my-configurable-widget",
  definition: MY_WIDGET_DEFINITION,
  renderer: MY_WIDGET_RENDERER,
  config: MY_WIDGET_CONFIG_MANIFEST,
  preview: MY_WIDGET_PREVIEW,
});
```

A normal config flow should not require adding a branch to `widget-config-popup.js`. The popup delegates field rendering to `manifest.renderFields()`.

---

## Optional Storage Normalization

Use a storage adapter when old layouts or legacy fields need compatibility handling:

```js
storage: Object.freeze({
  normalize(widget = {}) {
    return {
      entityId: widget.entityId || widget.entity_id || "",
    };
  },
})
```

This keeps widget-specific compatibility inside the widget definition instead of growing central registry branches.

---

## Optional Capabilities

Use capabilities to describe behavior consumed by the shell and placement flow:

```js
capabilities: Object.freeze({
  configurable: true,
  resizable: true,
  slotConfigurable: false,
})
```

Examples:

- `configurable`: widget supports a config manifest;
- `resizable`: widget can expose resize/variant behavior;
- `slotConfigurable`: widget can configure an internal slot, like the scenes widget.

---

## Optional Placement Flow

Use `placementFlow` when the widget has special creation behavior:

```js
placementFlow: "configure-first"
```

or:

```js
placementFlow: "slot-config-first"
```

The scenes widget uses slot configuration so each internal button can be configured independently.

---

## What Is Automatic?

After registration, MHA automatically wires:

- widget manager catalogue;
- widget definition registry;
- renderer registry;
- config registry;
- CSS manifest;
- live preview path;
- fallback previews;
- shell behavior defaults;
- storage normalization defaults.

---

## Avoid

Avoid adding new switch statements, ternary chains or hardcoded widget lists when a registry-based option exists.

Avoid touching unrelated systems while adding a widget.

Avoid adding direct Home Assistant service calls inside widget renderers when a helper belongs in `src/ha/`.

Avoid hardcoded colors when a theme or semantic token already exists.
