# Preview System

This document describes the live widget preview system currently used by MHA Widget Hub.

The preview system lets the widget manager show realistic widget previews without manually drawing a separate preview for every widget.

---

## 1. Purpose

A live preview is a real widget rendered in a controlled, non-interactive preview context.

This means:

- widget CSS is reused;
- widget renderer logic is reused;
- widget variants are previewed closer to production;
- preview data is fake but structured like Home Assistant state;
- previews remain safe and non-interactive.

Static previews remain supported for placeholders or widgets where live rendering is not useful.

---

## 2. Current Preview Flow

When the widget manager renders a widget entry, the flow is:

```text
widget-manager.js
    ↓
createWidgetPreview(item)
    ↓
createLiveWidgetPreview(item)
    ↓
getWidgetPreviewRenderer(item)
    ↓
createWidgetPreviewRenderContext(item)
    ↓
previewRenderer.createWidget(item, previewContext)
    ↓
previewRenderer.render(...) OR createRegisteredWidgetContent(...)
    ↓
createPreviewWidgetShell(...)
    ↓
append rendered widget content
    ↓
scale inside live preview frame
```

If no live preview is available, MHA falls back to a generic text preview.

---

## 3. Widget Manager Integration

The widget manager uses:

```js
createLiveWidgetPreview(item) || createGenericPreviewFallback(item)
```

The preview is inserted inside the widget manager preview frame.

The media frame receives:

```text
data-preview-mode="live"
```

when a live preview is successfully created.

Otherwise, it receives:

```text
data-preview-mode="fallback"
```

---

## 4. Preview Renderer Registration

Preview renderers are attached to widget modules.

Example:

```js
preview: Object.freeze({
  mode: "live",
  createWidget: createWeatherPreviewWidget,
})
```

The registry normalizes each preview renderer in:

```text
src/widgets/widget-registry.js
```

Current normalized shape:

```js
{
  mode: "live" | "static",
  createWidget,
  render,
}
```

If a widget module has no preview definition, the registry falls back to a static preview descriptor.

---

## 5. Current Live Preview Widgets

The following widgets currently expose live previews:

| Widget | Preview mode |
|---|---|
| `clock` | live |
| `media` | live |
| `button` / simple button | live |
| `scenes` | live |
| `slider` | live |
| `toggle-slider` | live |
| `toggle` | live |
| `weather` | live |

The following internal/utility widgets can remain static or fallback-based when appropriate:

| Widget | Preview mode |
|---|---|
| `empty` | static/fallback |
| `toggle-buttons` | static/fallback unless promoted to live later |

---

## 6. Preview Context

Preview context is created in:

```text
src/widgets/widget-preview-context.js
```

Core functions:

```js
createPreviewHassMock(overrides)
createWidgetRenderContext(context)
createWidgetPreviewRenderContext(item, context)
```

A preview render context forces:

```js
preview: true
interactive: false
```

and injects a mock Home Assistant object.

This is important because preview widgets should render like real widgets, but must not perform real actions.

---

## 7. Mock Home Assistant Object

The preview mock includes:

```js
{
  states: PREVIEW_HASS_STATES,
  previewData: WIDGET_PREVIEW_DATA,
  user: { name: "Preview" },
  connection: {
    subscribeEvents: () => () => undefined,
  },
  localize: (key) => key,
  callService: () => undefined,
  callWS: async () => [],
}
```

Important behavior:

- `callService()` does nothing;
- `callWS()` returns an empty array;
- `subscribeEvents()` returns a no-op unsubscribe function;
- entity state reads work through `PREVIEW_HASS_STATES`;
- no real Home Assistant service call is possible from preview context.

---

## 8. Preview Data

Preview data lives in:

```text
src/widgets/widget-preview-data.js
```

Current preview data groups:

```js
clock
weather
media
scenes
toggle
light
slider
```

Current mock entities include:

| Entity id | Domain | Purpose |
|---|---|---|
| `weather.home` | weather | Weather preview |
| `light.preview` | light | Light/toggle/slider preview |
| `switch.preview` | switch | Toggle/button preview |
| `media_player.preview` | media_player | Media/volume preview |
| `scene.preview_evening` | scene | Scenes widget mode preview |
| `scene.preview_movie` | scene | Scenes widget mode preview |
| `script.preview_sleep` | script | Scenes widget routine preview |
| `automation.preview_focus` | automation | Scenes widget routine preview |

This gives widgets realistic data without requiring live Home Assistant entities.

---

## 9. Creating A Live Preview For A Widget

A widget that wants live preview support should define a preview renderer in its module.

Example pattern:

```js
function createMyWidgetPreviewWidget(item = {}, context = {}) {
  return {
    ...item,
    kind: "my-widget",
    type: "my-widget",
    component: "my-widget",
    variant: item.variant || "default",
    label: item.label || "Preview Label",
    title: item.title || item.label || "Preview Label",
    w: context.size?.w || item.size?.w || 2,
    h: context.size?.h || item.size?.h || 2,
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

In most cases, `createWidget` should:

- preserve the manager-selected size;
- preserve the selected variant;
- add fake entity ids when needed;
- add fake labels/titles;
- add fake state values if the renderer expects them.

---

## 10. Custom Preview Render Function

A preview module may also provide:

```js
render({ widget, ...previewContext })
```

If `render` exists, the preview system uses it.

If `render` does not exist, the preview system calls:

```js
createRegisteredWidgetContent(previewWidget, previewContext)
```

This means most widgets do not need a special preview render function. They only need `createWidget`.

---

## 11. Virtual Preview Size

The preview system does not render widgets at their final small manager-card size.

Instead, it gives every preview a virtual widget size based on a fixed unit:

```js
PREVIEW_VIRTUAL_UNIT = 112
```

A `2×2` widget therefore gets:

```text
224px × 224px
```

This virtual size is applied inline to the real widget shell so production widget CSS and container logic behave more like they do on the dashboard.

---

## 12. Preview Layout Metadata

`getWidgetPreviewLayout(size)` returns:

```js
{
  w,
  h,
  aspectRatio,
  orientation,
  sizeKey,
  virtualInlineSize,
  virtualBlockSize,
}
```

Orientation is resolved as:

| Condition | Orientation |
|---|---|
| `h > w` | `vertical` |
| `w > h` | `horizontal` |
| `w === h` | `square` |

The preview frame receives CSS variables for preview dimensions and scale.

---

## 13. Scaling Rules

Scaling is handled in:

```text
src/widgets/widget-preview-renderer.js
```

Important current rules:

- frames smaller than `48px × 48px` skip scale updates;
- safety insets prevent clipped preview edges;
- horizontal/square previews share a `4×2` reference scale;
- vertical previews share a `2×4` reference scale;
- live previews are not scaled above their virtual size;
- very wide widgets can scale lower so they do not crop on narrow/mobile manager cards.

---

## 14. ResizeObserver

Live previews use `ResizeObserver` when available.

When the preview card changes size, the observer recomputes scale.

If `ResizeObserver` is unavailable, the preview still renders with scheduled scale updates.

---

## 15. Preview Shell

The live preview uses a real widget shell:

```html
<article class="mha-widget mha-widget-manager-live-widget-shell">
```

The shell receives production-like dataset values:

```text
data-widget-kind
data-widget-id
data-widget-configured-w
data-widget-w
data-widget-h
data-widget-size
data-preview="true"
```

It also receives inline size constraints to prevent production widget shell CSS from collapsing the preview.

This is critical: without the inline virtual size, later `.mha-widget` CSS can override the preview shell and make it appear empty or 1px tall.

---

## 16. Preview CSS

Preview CSS lives mainly in:

```text
styles/widget-manager/widget-manager.css
```

Widget-specific preview visuals should usually come from the normal widget CSS, because live previews render real widget content.

---

## 17. Testing Checklist

When adding or changing preview behavior, test:

- widget manager opens without layout jump;
- live previews render for all expected catalog entries;
- fallback previews still render for static/internal entries;
- preview interactions do not call Home Assistant services;
- previews scale correctly on desktop, tablet and mobile;
- wide, tall and square widgets remain readable;
- theme changes update preview visuals;
- widget CSS changes do not collapse preview shells.

---

## 18. Architecture Verdict

The preview system is strongly aligned with the registry-driven widget architecture.

Strengths:

- live previews reuse real renderers and CSS;
- preview context blocks real HA actions;
- preview data is centralized;
- preview metadata lives in widget modules;
- new widgets can add previews without editing the widget manager.

Remaining opportunities:

- promote any useful static/fallback widgets to live previews when it adds value;
- keep preview data updated when new widget domains are added;
- keep scaling rules conservative so visual previews remain stable across responsive layouts.
