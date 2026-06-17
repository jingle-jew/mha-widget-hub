# Adding widgets

MHA widgets are registry-driven. A widget should be mostly self-contained in one module file.

## Goal

To add a widget:

```text
1. Create src/widgets/my-widget.js
2. Export WIDGET_MODULE
3. Add one import/entry in src/widgets/widget-module-registry.js
4. Add an optional CSS file referenced by the widget definition
```

The rest is assembled automatically by the registries.

## Minimal widget module

```js
const renderMyWidget = ({ widget }) => {
  const root = document.createElement("div");
  root.className = "mha-widget mha-my-widget";
  root.textContent = widget.label || "My Widget";
  return root;
};

export const WIDGET_MODULE = {
  definition: {
    kind: "my-widget",
    component: "my-widget",
    category: "utilities",

    renderer: "my-widget",
    preview: "status",

    aliases: ["my-widget"],
    variantAliases: [],

    defaultSize: Object.freeze({ w: 2, h: 2 }),

    css: ["widgets/my-widget.css"],

    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          category: "utilities",
          variant: "default",
          label: "My Widget",
          size: Object.freeze({ w: 2, h: 2 }),
          description: "A simple custom widget.",
          order: 100,
        }),
      ]),
    }),
  },

  renderer: {
    kind: "my-widget",
    render: renderMyWidget,
  },
};
```

## Register the module

In `src/widgets/widget-module-registry.js`:

```js
import { WIDGET_MODULE as myWidget } from "./my-widget.js";

export const WIDGET_MODULES = Object.freeze([
  // existing modules...
  myWidget,
]);
```

## Optional CSS

Create:

```text
src/styles/widgets/my-widget.css
```

Example:

```css
.mha-my-widget {
  background: var(--mha-primary-surface);
  color: var(--mha-primary-text);
  border: 1px solid var(--mha-on-primary-surface);
}
```

Then reference it in the widget definition:

```js
css: ["widgets/my-widget.css"]
```

The style manifest will include it automatically.

## Configurable widget

A configurable widget can also export a config manifest inside `WIDGET_MODULE`.

```js
const createDraft = (widget = {}) => ({
  label: widget.label || "My Widget",
});

const buildConfig = (draft = {}) => ({
  label: draft.label || "My Widget",
});

export const WIDGET_MODULE = {
  definition: {
    kind: "my-configurable-widget",
    component: "my-configurable-widget",
    category: "utilities",
    renderer: "my-configurable-widget",
    config: "my-configurable-widget",
    preview: "status",
    aliases: ["my-configurable-widget"],
    variantAliases: [],
    defaultSize: Object.freeze({ w: 2, h: 2 }),
    css: ["widgets/my-configurable-widget.css"],
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          category: "utilities",
          variant: "default",
          label: "My Configurable Widget",
          size: Object.freeze({ w: 2, h: 2 }),
          description: "A configurable custom widget.",
          order: 100,
        }),
      ]),
    }),
  },

  renderer: {
    kind: "my-configurable-widget",
    render: renderMyConfigurableWidget,
  },

  config: {
    type: "my-configurable-widget",
    createDraft,
    buildConfig,
  },
};
```

## What is automatic?

After registration, MHA automatically wires:

- widget manager catalogue;
- widget definition registry;
- renderer registry;
- config registry;
- CSS manifest;
- fallback previews.

## Avoid

Avoid adding new switch statements, ternary chains or hardcoded widget lists when a registry-based option exists.
