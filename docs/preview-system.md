# Preview System

This document describes the live widget preview system currently used by MHA Widget Hub.

It is based on the current project structure:

```text
src/widget-manager/widget-manager.js

src/widgets/widget-preview-renderer.js
src/widgets/widget-preview-context.js
src/widgets/widget-preview-data.js
src/widgets/widget-preview-images.js

src/widgets/widget-registry.js
src/widgets/widget-renderers.js
src/widgets/widget-module-registry.js

styles/widget-manager/widget-manager.css

tests/widget-preview-context.test.js
tests/widget-preview-renderer.test.js
tests/widget-manager-catalog.test.js
```

---

## 1. Purpose

The preview system exists so the widget manager can show realistic widget previews without requiring each preview to be manually drawn.

Earlier static image previews are still supported, but the current direction is live previews.

A live preview is a real widget rendered in a controlled, non-interactive preview context.

This means:

- widget CSS is reused;
- widget renderer logic is reused;
- widget variants are previewed closer to production;
- preview data is fake but structured like Home Assistant state;
- previews remain safe and non-interactive.

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

from:

```text
src/widget-manager/widget-manager.js
```

The preview is inserted inside:

```html
<div class="mha-widget-manager-preview-area">
  <div class="mha-widget-manager-preview-media-frame">
    ...
  </div>
</div>
```

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

If a widget module has no preview definition, the registry falls back to:

```js
{ mode: "static" }
```

---

## 5. Current Live Preview Widgets

The following widgets currently expose live previews:

| Widget | Preview mode |
|---|---|
| `clock` | live |
| `media` | live |
| `button` / simple button | live |
| `slider` | live |
| `toggle-slider` | live |
| `toggle` | live |
| `weather` | live |

The following widgets currently remain static:

| Widget | Preview mode |
|---|---|
| `empty` | static |
| `toggle-buttons` | static |

---

## 6. Preview Context

Preview context is created in:

```text
src/widgets/widget-preview-context.js
```

The core functions are:

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

The preview mock is created by:

```js
createPreviewHassMock()
```

It includes:

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
toggle
light
slider
```

The file exports:

```js
WIDGET_PREVIEW_DATA
PREVIEW_HASS_STATES
getWidgetPreviewData(kind)
```

Current mock entities include:

| Entity id | Domain | Purpose |
|---|---|---|
| `weather.home` | weather | Weather preview |
| `light.preview` | light | Light/toggle/slider preview |
| `switch.preview` | switch | Toggle/button preview |
| `media_player.preview` | media_player | Media/volume preview |

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

This means most widgets do not need a special preview render function.

They only need `createWidget`.

---

## 11. Virtual Preview Size

The preview system does not render widgets at their final small manager-card size.

Instead, it gives every preview a virtual widget size based on a fixed unit:

```js
PREVIEW_VIRTUAL_UNIT = 112
```

A 2×2 widget therefore gets:

```text
224px × 224px
```

A 4×1 widget gets:

```text
448px × 112px
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

The preview frame receives:

```css
--mha-widget-preview-w
--mha-widget-preview-h
--mha-widget-preview-aspect
--mha-widget-preview-virtual-inline-size
--mha-widget-preview-virtual-block-size
--mha-widget-preview-scale
```

It also mirrors widget sizing values:

```css
--mha-widget-w
--mha-widget-configured-w
--mha-widget-h
```

---

## 13. Scaling Rules

Scaling is handled in:

```text
src/widgets/widget-preview-renderer.js
```

The system measures the preview frame and computes a scale that fits the virtual widget inside the available preview card.

Important current rules:

### Minimum usable frame

If the frame is smaller than `48px × 48px`, the scale update is skipped.

This prevents temporary layout states from collapsing the preview to a tiny line while the manager sheet is still settling.

### Safety insets

The system subtracts a small inset so previews do not touch clipped edges.

Current values:

| Preview type | Inline inset | Block inset |
|---|---:|---:|
| Very wide widgets | `8px` | `0px` |
| Normal widgets | `12px` | `8px` |

A widget is considered very wide when:

```js
layout.w / layout.h >= 4
```

### Shared reference scale

Horizontal and square previews share a `4×2` reference scale.

Vertical previews share a `2×4` reference scale.

This prevents smaller horizontal widgets, such as `3×1`, from appearing visually larger than `4×1` widgets in the manager.

### Scale cap

The scale is capped at:

```js
1
```

Live previews are not scaled above their virtual size.

### Minimum scale

Current minimums:

| Preview type | Minimum scale |
|---|---:|
| Very wide widgets | `0.01` |
| Other widgets | `0.08` |

Very wide widgets are allowed to scale lower so they do not crop on narrow/mobile manager cards.

---

## 14. ResizeObserver

Live previews use `ResizeObserver` when available.

When the preview card changes size, the observer recomputes scale.

If `ResizeObserver` is unavailable, the preview still renders with its initial scheduled scale update.

The scale update is retried up to 8 times using `requestAnimationFrame` or `setTimeout`.

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

It also receives inline size constraints to prevent the production widget shell CSS from collapsing the preview.

This is critical.

Without the inline virtual size, later `.mha-widget` CSS can override the preview shell and make it appear empty or 1px tall.

---

## 16. Preview CSS

Preview CSS lives mainly in:

```text
styles/widget-manager/widget-manager.css
```

Important classes:

```css
.mha-widget-manager-live-preview
.mha-widget-manager-live-preview-stage
.mha-widget-manager-live-widget-shell
```

Important behavior:

```css
.mha-widget-manager-live-preview,
.mha-widget-manager-live-preview * {
  pointer-events: none !important;
}
```

Live previews are intentionally non-interactive.

The stage is centered and scaled:

```css
transform: translate(-50%, -50%) scale(var(--mha-widget-preview-scale, .5));
transform-origin: center;
```

Widget edit tools are hidden in previews:

```css
.mha-widget-manager-live-widget-shell .mha-widget-tools,
.mha-widget-manager-live-widget-shell .mha-widget-move-overlay,
.mha-widget-manager-live-widget-shell .mha-size-badge {
  display: none !important;
}
```

---

## 17. Static Preview Images

Static preview image support still exists in:

```text
src/widgets/widget-preview-images.js
```

Current mappings:

```js
"button:simple-button:2x1": "assets/widget-previews/button-simple-preview.png"
"weather:adaptive-weather:2x2": "assets/widget-previews/2x2-weather-widget-preview.png"
```

However, the current widget manager path primarily uses live previews or generic fallback.

Static images are useful as compatibility or future fallback, but new widgets should prefer live preview mode.

---

## 18. Generic Fallback Preview

If no live preview is available, the widget manager creates:

```html
<div class="mha-widget-manager-preview-generic-fallback">
```

It displays:

- widget title or label;
- widget description;
- size metadata through the surrounding manager card.

This fallback prevents the manager from appearing broken even when a widget has no live preview.

---

## 19. Rules For Preview-Safe Widgets

Live previews should be safe.

A widget renderer must not assume preview mode is fully interactive.

Recommended rules:

### Do

- Read data from `hass.states` safely.
- Use `context.preview` when needed.
- Use `context.interactive` before binding real interactions.
- Provide fallback labels and values.
- Use fake entity ids from `WIDGET_PREVIEW_DATA`.
- Keep preview data deterministic.

### Do not

- Call real Home Assistant services during render.
- Start timers that cannot be cleaned up.
- Subscribe to real external resources.
- Depend on actual entity availability.
- Depend on pointer/touch interaction inside preview.
- Use random data that changes every render.
- Force layout sizes that ignore preview scale.

---

## 20. Preview And Interactivity

Preview context sets:

```js
interactive: false
```

Widgets that attach event handlers should respect this.

Recommended pattern:

```js
if (!context.interactive) {
  return content;
}

button.addEventListener("click", ...);
```

The CSS also disables pointer events, but widgets should still avoid unnecessary event binding during preview.

CSS is the safety net.

Renderer logic should be the first line of defense.

---

## 21. Preview And Home Assistant Calls

Preview `hass.callService()` is a no-op.

That prevents accidental service calls.

Still, widgets should avoid calling services during render at all.

Service calls should only happen in response to user actions.

---

## 22. Preview And Entity Data

If a widget needs entity data, add a realistic mock entity to:

```text
src/widgets/widget-preview-data.js
```

Example shape:

```js
export const WIDGET_PREVIEW_DATA = Object.freeze({
  myWidget: Object.freeze({
    entityId: "sensor.preview",
    name: "Preview Sensor",
    state: "42",
  }),
});
```

Then add a matching entry to:

```js
PREVIEW_HASS_STATES
```

Example:

```js
"sensor.preview": Object.freeze({
  entity_id: "sensor.preview",
  state: "42",
  attributes: Object.freeze({
    friendly_name: "Preview Sensor",
    unit_of_measurement: "%",
  }),
})
```

This keeps preview widgets close to real Home Assistant behavior.

---

## 23. Preview And Widget Size

A preview widget should always preserve the selected manager item size.

Recommended:

```js
const size = item.size || { w: item.w, h: item.h };

return {
  ...
  w: size?.w || 2,
  h: size?.h || 2,
};
```

Do not hardcode `2×2` in `createWidget` unless the widget truly has only one possible size.

---

## 24. Preview And Variants

Manager entries can represent different variants and sizes of the same widget.

A preview should preserve:

```js
item.variant
item.size
item.label
item.title
```

Recommended:

```js
variant: item.variant || "default",
label: item.label || item.title || "Preview",
title: item.title || item.label || "Preview",
```

This ensures the manager preview matches the item the user selected.

---

## 25. Preview And Config Flows

The preview system is separate from config flows.

Current flow:

```text
User selects widget in manager
        ↓
Manager shows preview
        ↓
User clicks widget entry
        ↓
Config popup may open
        ↓
Widget draft is created
        ↓
Widget is dropped onto grid
```

Preview should not depend on config popup state.

If the widget requires configuration, `createWidget` should provide safe fake defaults.

---

## 26. Known Design Decisions

### Real widget shell in preview

The preview system intentionally uses:

```css
.mha-widget
```

inside the preview.

This allows widget CSS to behave like production.

Tradeoff:

- previews are more accurate;
- preview renderer must protect against production layout CSS overriding preview sizing.

This is why the virtual size is written inline.

### Uniform reference scaling

The preview system intentionally does not scale every widget only against its own size.

This avoids visual inconsistency in the manager.

A `3×1` widget should not look taller than a `4×1` widget just because it has less virtual width.

### Very wide widgets can scale very low

This avoids cropping on narrow/mobile manager cards.

Weather `4×1` is the important case.

---

## 27. Testing

Existing tests:

```text
tests/widget-preview-context.test.js
tests/widget-preview-renderer.test.js
tests/widget-manager-catalog.test.js
```

Recommended test coverage for preview changes:

- preview context sets `preview: true`;
- preview context sets `interactive: false`;
- mock hass contains expected states;
- live preview returns a DOM node for live widgets;
- static widgets fall back correctly;
- layout metadata is correct for 1×1, 2×2, 4×1, 1×2, 2×4;
- scale variables are set;
- manager catalog entries can all render previews or fallback safely.

---

## 28. Checklist For Adding A Live Preview

When adding or converting a widget to live preview:

1. Add or confirm preview fake data in `widget-preview-data.js`.
2. Add `createWidgetPreviewWidget()` in the widget file.
3. Preserve `item.variant`.
4. Preserve `item.size`.
5. Add safe fake entity ids.
6. Add `preview: Object.freeze({ mode: "live", createWidget })`.
7. Verify the widget appears in the manager.
8. Test narrow/mobile manager cards.
9. Test wide widgets such as `4×1`.
10. Confirm no pointer interaction works in preview.
11. Confirm no Home Assistant service is called from render.
12. Run preview tests.

---

## 29. Troubleshooting

### Preview appears as a thin line

Likely causes:

- widget shell lost its virtual size;
- production `.mha-widget` CSS overrode preview dimensions;
- frame measured too early while the sheet was still opening.

Check:

```text
applyVirtualWidgetSize()
bindPreviewScale()
.mha-widget-manager-live-widget-shell
```

### Preview is cropped horizontally

Likely causes:

- scale minimum too high;
- very wide widget not detected;
- preview CSS overflow clipping expected content.

Check:

```js
const isVeryWide = layout.w / layout.h >= 4;
const minScale = isVeryWide ? 0.01 : 0.08;
```

### Preview is too large compared to other widgets

Likely causes:

- widget uses its own size instead of manager item size;
- custom preview CSS ignores `--mha-widget-preview-scale`;
- widget has fixed pixel dimensions internally.

### Preview triggers actions

Likely causes:

- widget ignores `context.interactive`;
- event listeners are attached unconditionally;
- service calls are executed during render.

Fix by checking:

```js
if (!context.interactive) return;
```

before binding interactions.

### Preview shows unavailable entity

Likely causes:

- fake entity id not present in `PREVIEW_HASS_STATES`;
- widget uses a different entity property name;
- widget expects a specific attributes shape.

Add or adjust mock data in:

```text
src/widgets/widget-preview-data.js
```

---

## 30. Future Direction

The preview system is already strong enough to support the next architecture goal:

```text
Widget module owns:
  definition
  renderer
  config
  preview
  css
```

Target state:

```text
Add widget file
    +
Register widget module
```

The widget manager should not need custom preview logic per widget.

Static image previews should become optional fallback, not the normal path.

Longer term, widget packs should be able to ship their own preview data and preview renderer alongside the widget module.
