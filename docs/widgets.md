# Widget Development Guide

This document explains how widgets are added to MHA Widget Hub using the current registry-driven architecture.

---

# Architecture Overview

Every widget is packaged as a `WIDGET_MODULE`.

A widget module contains:

- definition
- renderer
- preview configuration
- CSS
- aliases
- manager metadata

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
Widget Manager / Grid / Preview System
```

---

# Step 1 — Create the Widget File

Create a new file:

```text
src/widgets/my-widget.js
```

The file exports a `WIDGET_MODULE` object.

Example structure:

```js
export const WIDGET_MODULE = {
  kind: "my-widget",
  definition,
  renderer,
  preview,
};
```

---

# Step 2 — Widget Definition

The definition describes the widget.

Typical fields:

```js
const definition = {
  component: "my-widget",
  category: "utilities",
  manager: {
    entries: [
      {
        category: "utilities",
        variant: "my-widget",
        label: "My Widget",
        size: { w: 2, h: 2 },
        description: "Example widget"
      }
    ]
  },
  aliases: ["my-widget"],
  variantAliases: [],
  defaultSize: { w: 2, h: 2 }
};
```

---

# Manager Entries

Manager entries control what appears in the widget manager.

Current categories:

- utilities
- actions
- lights
- climate
- media
- security
- system

Each entry defines:

- category
- variant
- label
- description
- size
- order

---

# Step 3 — Renderer

The renderer generates widget content.

Example:

```js
const renderer = {
  render(context) {
    return html`
      <div>Hello MHA</div>
    `;
  }
};
```

Keep rendering logic inside the renderer.

Avoid hardcoding widget-manager behavior here.

---

# Step 4 — CSS

Each widget owns its CSS.

Example:

```js
css`
.widget-my-widget {
  display: flex;
}
`
```

Use theme tokens whenever possible.

Avoid direct colors.

Prefer:

```css
var(--mha-primary-surface)
var(--mha-primary-text)
```

instead of:

```css
#ffffff
rgba(...)
```

---

# Step 5 — Preview Support

MHA supports live previews.

Current preview modes:

```js
preview: {
  mode: "live"
}
```

or

```js
preview: {
  mode: "static"
}
```

Live previews are preferred for new widgets.

The preview system uses:

- widget-preview-renderer.js
- widget-preview-context.js
- widget-preview-data.js

to generate isolated preview instances.

---

# Step 6 — Register the Widget

Import the widget inside:

```text
src/widgets/widget-module-registry.js
```

Example:

```js
import { WIDGET_MODULE as myWidgetModule }
from "./my-widget.js";
```

Add it to:

```js
export const WIDGET_MODULES = [
  ...
  myWidgetModule
];
```

This is currently the only required registry registration step.

---

# Aliases

Aliases provide backward compatibility.

Example:

```js
aliases: [
  "old-widget-name"
]
```

Variant aliases can also be mapped.

```js
variantAliases: [
  "legacy-variant"
]
```

The registry resolves aliases automatically.

---

# Widget Sizes

Most widgets expose a default size.

Example:

```js
defaultSize: {
  w: 2,
  h: 2
}
```

Manager entries may expose additional sizes through variants.

---

# Configuration Flows

Widgets may optionally provide configuration flows.

Examples currently used in MHA:

- Toggle
- Slider
- Toggle + Slider
- Weather
- Media

Configuration flows are documented separately in:

```text
docs/config-flows.md
```

---

# Existing Widgets

Current widget modules include:

- clock-widget
- simple-button-widget
- slider-widget
- toggle-widget
- toggle-slider-widget
- toggle-buttons-widget
- weather-widget
- media-widget

These are the best reference implementations for new widgets.

---

# Recommended Development Workflow

1. Create widget file.
2. Define manager entries.
3. Implement renderer.
4. Add CSS.
5. Add preview support.
6. Register in widget-module-registry.
7. Verify preview rendering.
8. Verify widget manager integration.
9. Test in Home Assistant.
10. Commit as a standalone change.

---

# Long-Term Goal

The target architecture is:

```text
Add widget file
      +
Register widget module
```

A contributor should eventually be able to add a complete widget by touching only one or two files.
