# Pages Guide

This document describes the current page system in MHA Widget Hub.

MHA pages are not only collections of widgets. The project now supports standard widget-grid pages and dedicated page experiences that can use specialized configuration, styling and runtime behavior.

---

## 1. Page Types

Current page types live in:

```text
src/pages/page-types.js
```

Current public types:

```text
grid
media-players
```

### Grid pages

A grid page is the default MHA page model.

It contains widgets arranged through the widget grid, using widget positions, sizes, variants and the standard edit flow.

### Media players pages

A media players page is a dedicated page experience for media playback.

It is currently implemented as a hybrid model:

```text
page type: media-players
        ↓
normalized as a grid page for runtime compatibility
        ↓
media-page-panel widget seed
        ↓
media widget renderer + page-level media styling
```

This preserves the normal widget/grid pipeline while allowing the page to behave visually like a dedicated media surface.

---

## 2. Current Hybrid Media Page Model

The current media page intentionally bridges two concepts:

1. a page-level experience;
2. a special media widget variant used as the rendered panel.

The seed widget is created by:

```text
createMediaPageWidgetSeed()
```

It uses:

```text
kind: media
variant: media-page-panel
responsiveSizeMode: media-page-panel
```

This means the page media experience is not just a normal 2x2 or 4x2 widget. It is a widget-backed page panel.

---

## 3. Why The Hybrid Model Exists

The hybrid model keeps the media page compatible with existing systems:

- widget rendering;
- widget config;
- Home Assistant media helpers;
- grid positioning;
- page persistence;
- preview/config conventions;
- theme/widget CSS loading.

It also avoids creating a second independent renderer for media playback before the page architecture is ready for fully native page-level surfaces.

---

## 4. Future Direction

The long-term direction can be:

```text
page owns the media layout directly
        ↓
media blocks are placed by the page renderer
        ↓
widgets become optional page supplements
```

This would make media pages more like app screens than widget containers.

Do not make that jump casually. Moving media controls directly onto the page grid would affect:

- page rendering;
- edit mode;
- widget placement;
- media configuration;
- responsive layout;
- persistence/migration;
- tests.

A safe migration should happen behind a clear page contract, not as a one-off widget exception.

---

## 5. Page Configuration

Media page config currently includes:

```text
enabledPlayerIds
defaultPlayerId
selectedPlayerId
visualStyle
blurBackground
```

These settings describe which media players are available, which player is selected and how strongly the page uses the media artwork/background experience.

---

## 6. Theme Support

Dedicated media page experiences are only enabled for supported themes.

Current supported theme families:

```text
oneui
ios
material
```

Alexa can expose media styling visually, but page support should be confirmed against the current `supportsMediaPageTheme()` contract before relying on it as a dedicated media page theme.

---

## 7. Development Rules

When changing page behavior:

1. Keep page normalization in `src/pages/page-model.js` and `src/pages/page-types.js`.
2. Keep page UI orchestration in page coordinators.
3. Avoid hardcoding page-specific behavior directly in the main element.
4. Avoid turning widgets into page renderers unless the widget definition clearly declares that behavior.
5. Add or update tests for page normalization and rendering pipeline behavior.

---

## 8. Manual Validation

For page changes, manually verify:

- creating a standard grid page;
- creating a media page;
- switching between pages;
- rotating between portrait and landscape;
- desktop/tablet/mobile layouts;
- edit mode;
- widget manager availability;
- media player selection;
- artwork/background behavior;
- OneUI, iOS, Material and Alexa visual systems where applicable.
