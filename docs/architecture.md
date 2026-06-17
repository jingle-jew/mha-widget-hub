# Architecture

This document describes the current frontend architecture and its contracts. For product positioning and installation, start with the [main README](../README.md).

## System overview

MHA Widget Hub has two runtime layers:

1. a Home Assistant custom integration that serves static frontend files and registers the sidebar panel;
2. a browser frontend built from native ES modules, Web Components, CSS and Home Assistant's `hass` object.

The application root is `mha-widget-hub.js`. Focused modules own pages, layout, placement, widgets, settings, themes, Home Assistant bindings and persistence.

## Registry-driven model

MHA is registry-driven. Widgets and themes are declarative modules assembled by registries.

```text
src/widgets/my-widget.js
  exports WIDGET_MODULE
      ↓
src/widgets/widget-module-registry.js
  exports WIDGET_MODULES
      ↓
src/widgets/widget-registry.js
src/widgets/widget-renderer-registry.js
src/widget-config/widget-config-registry.js
src/styles/style-manifest.js
```

## Widget modules

A widget module may declare:

- `definition`;
- `renderer`;
- `config`;
- manager metadata;
- variants;
- aliases;
- default size;
- CSS files.

Example shape:

```js
export const WIDGET_MODULE = {
  definition: {
    kind: "my-widget",
    renderer: "my-widget",
    config: "my-widget",
    css: ["widgets/my-widget.css"],
    manager: { entries: [...] },
  },

  renderer: {
    kind: "my-widget",
    render,
  },

  config: {
    type: "my-widget",
    createDraft,
    buildConfig,
  },
};
```

## Widget registries

### `widget-module-registry.js`

Imports widget modules and exports `WIDGET_MODULES`. This is the single central manifest for widget modules.

### `widget-registry.js`

Assembles widget definitions from `WIDGET_MODULES`.

It owns:

- canonical `kind`;
- aliases and variant aliases;
- manager catalogue generation;
- size normalization;
- config type lookup;
- contract normalization for stored widgets.

### `widget-renderer-registry.js`

Assembles renderer manifests from `WIDGET_MODULES`.

### `widget-config-registry.js`

Assembles config manifests from `WIDGET_MODULES`.

### `style-manifest.js`

Generates CSS entries from static core styles, theme definitions and widget definitions.

## Theme architecture

```text
src/settings/theme-registry.js
      ↓
src/styles/style-manifest.js
      ↓
MHA UI
```

A theme entry declares:

- `id`;
- `label`;
- `css`;
- `defaultIconShape`;
- `order`.

The theme registry drives:

- settings panel style options;
- valid theme style IDs;
- default icon shape;
- theme CSS manifest entries.

## Extension target

Current target:

```text
Add a widget
  = one widget file
  + one import/entry in widget-module-registry.js

Add a theme
  = one CSS file
  + one entry in theme-registry.js
```

## Rendering path

```text
stored widget
  → contract normalization
  → widget registry definition
  → widget shell
  → renderer registry
  → widget module renderer
```

## Configuration path

```text
catalogue item
  → widget definition config type
  → config registry
  → widget module config manifest
  → createDraft / buildConfig
```

## Home Assistant boundary

Reusable helpers inside `src/ha` provide entity lookup, entity availability, state normalization and service calls. Widget modules should use these helpers rather than calling Home Assistant services directly when a shared abstraction exists.

## Avoid

Do not add new switch statements, ternary chains or hardcoded widget/theme lists unless there is no registry-based alternative.
