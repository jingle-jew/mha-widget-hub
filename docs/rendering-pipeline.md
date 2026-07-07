# Rendering Pipeline Guide

This document describes the current boot and render stability pipeline in MHA Widget Hub.

The render pipeline exists to prevent raw UI flashes, reduce boot hangs and keep page/layout changes visually stable while styles, widgets and secondary surfaces initialize.

---

## 1. Main Runtime File

The render pipeline lives in:

```text
src/layout/render-pipeline.js
```

It is created by:

```js
createRenderPipeline(host, options)
```

The main custom element owns application state. The pipeline owns render sequencing.

---

## 2. Render States

The host exposes render state through:

```text
data-render-state
```

Current states include:

```text
booting
stabilizing
ready
```

Expected meaning:

| State | Meaning |
|---|---|
| `booting` | First shell render is in progress. Critical style should hide raw UI. |
| `stabilizing` | App already booted, but a new render cycle is settling. |
| `ready` | Styles and deferred UI are ready enough to reveal normal interaction. |

CSS should use these states to avoid flashing incomplete UI.

---

## 3. High-Level Render Flow

Current flow:

```text
themeController.sync()
        ↓
buildRenderContext()
        ↓
prepareRenderCycle()
        ↓
applyRenderDatasetsAndRuntimeVars()
        ↓
mountRenderShell()
        ↓
mountImmediateUi()
        ↓
schedulePrimaryWidgetRender()
        ↓
awaitStylesAndFinalizeRender()
        ↓
appendDeferredUi()
```

The goal is to mount the shell quickly, keep incomplete pieces hidden and progressively replace placeholders with real widgets.

---

## 4. Critical Boot Style

The pipeline injects a critical boot style element before the rest of the frontend CSS links.

This protects against:

- unstyled shell flashes;
- raw custom element content;
- visible layout jumps before theme CSS loads;
- initial boot stalls where the UI appears half-rendered.

Do not remove the critical boot layer unless the replacement provides the same protection.

---

## 5. Style Loading And Timeout

The pipeline creates frontend stylesheet links from the style manifest and waits for them to settle.

If styles load successfully, render finalization continues normally.

If style loading fails or times out, MHA reveals the shell through a fallback path instead of hanging forever.

The timeout is intentionally a safety valve. It should not be used as a substitute for fixing broken style paths.

---

## 6. Widget Placeholders

Immediate UI mounts placeholder widgets first.

Placeholders preserve:

- grid dimensions;
- widget positions;
- configured widget size;
- visual stability while real widget content is rendered.

This reduces layout jumping and makes boot/change transitions feel intentional.

---

## 7. Progressive Widget Rendering

Widgets are rendered progressively in small batches.

Current batch behavior:

```text
mobile: 1 widget per frame
other layouts: 2 widgets per frame
```

This keeps the UI responsive during heavier widget render cycles.

When the queue completes, the host sets:

```text
data-widgets-state="ready"
```

Then it schedules square-unit sync, Home Assistant updates, edit-mode DOM sync, drop-slot sync and icon refresh.

---

## 8. Deferred UI

Some UI is intentionally appended after the primary shell and widgets begin rendering:

- non-mobile dock surfaces;
- screensaver DOM;
- settings DOM;
- widget manager;
- page creator;
- media page settings panel;
- widget config panel.

This keeps the first render focused on the visible shell and grid.

---

## 9. Media Page Backdrop State

The render pipeline also synchronizes media page backdrop data:

```text
data-active-page-type
data-media-page-active
data-media-page-background-blur
data-media-page-wallpaper
--mha-media-page-wallpaper-image
```

This allows media pages to use artwork/background styling without making the media widget own the entire shell background.

---

## 10. Development Rules

When touching the render pipeline:

1. Preserve render-state transitions.
2. Preserve the critical boot style behavior.
3. Do not move heavy secondary surfaces into the immediate render path without a reason.
4. Keep widget placeholder behavior aligned with real widget sizing.
5. Avoid forcing full rerenders when a small DOM sync is enough.
6. Add/update tests around the pipeline seam being changed.

---

## 11. Manual Validation

After render pipeline changes, manually verify:

- cold boot;
- Home Assistant frontend reload;
- switching pages;
- switching tabs;
- changing theme;
- changing orientation;
- resizing desktop browser windows;
- mobile portrait and landscape;
- edit mode on/off;
- widget manager/config surfaces;
- screensaver/NowBar.

The project owner does final visual validation manually. Avoid expensive automated visual workflows unless explicitly requested.
