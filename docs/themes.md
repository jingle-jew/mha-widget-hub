# Themes Guide

This document describes the real theme system currently used by MHA Widget Hub.

---

## 1. Current Theme Model

MHA currently has three registered theme styles:

| Theme style id | Label | CSS file | Default icon shape | Aliases |
|---|---|---|---|---|
| `ios` | iOS | `styles/themes/ios.css` | `rounded-square` | `apple`, `liquid-glass`, `frosted-glass` |
| `oneui` | OneUI | `styles/themes/oneui.css` | `squircle` | `samsung`, `one-ui` |
| `material` | Material You | `styles/themes/material.css` | `circle` | `material-you`, `material3`, `material-3` |

The default theme style is:

```js
oneui
```

The iOS theme has an additional glass variant controlled separately:

```text
data-ios-glass="liquid"
data-ios-glass="frosted"
```

So MHA exposes these visual experiences:

- OneUI;
- Material You;
- iOS Liquid Glass;
- iOS Frosted Glass.

In the registry, Liquid and Frosted are not separate themes. They are two modes of the same `ios` theme style.

---

## 2. Theme State

Theme state is handled by:

```text
src/settings/theme-controller.js
```

The controller reads and synchronizes theme-related settings between:

- `localStorage`;
- the custom element host dataset;
- `document.documentElement.dataset`.

The synchronized attributes are:

| Dataset attribute | Meaning |
|---|---|
| `data-theme-setting` | User preference: `auto`, `dark`, or `light` |
| `data-theme` | Resolved visual mode: `dark` or `light` |
| `data-theme-style` | Visual system: `ios`, `oneui`, or `material` |
| `data-ios-glass` | iOS material mode: `liquid` or `frosted` |
| `data-accent` | Active accent key |
| `data-accent-mode` | `manual` or `auto` |
| `data-icon-shape-setting` | `auto`, `rounded-square`, `squircle`, or `circle` |
| `data-icon-shape` | Resolved icon shape |

Theme CSS should target these attributes instead of relying on JavaScript branching.

Example:

```css
:host([data-theme-style="ios"][data-ios-glass="liquid"]) {
  --mha-surface-blur: 10px;
}
```

---

## 3. Stored Theme Keys

The theme controller currently uses these local storage keys:

| Key | Purpose |
|---|---|
| `mha-theme` | Main theme mode: `auto`, `dark`, `light` |
| `mha-dev-theme` | Dev fallback for theme mode |
| `mha-theme-style` | Main visual style |
| `mha-dev-theme-style` | Dev fallback for visual style |
| `mha-ios-glass` | Main iOS glass variant |
| `mha-dev-ios-glass` | Dev fallback for iOS glass variant |
| `mha-accent-mode` | Global accent mode |
| `mha-accent-mode-{themeStyle}` | Per-theme accent mode |
| `mha-accent` | Active accent value |
| `mha-accent-{themeStyle}` | Per-theme manual accent |
| `mha-accent-auto-{themeStyle}` | Per-theme automatic accent |
| `mha-icon-shape` | Icon shape preference |

This means each visual system can remember its own accent independently.

---

## 4. Style Manifest Loading Order

Theme CSS is part of the global style manifest:

```text
src/styles/style-manifest.js
```

Current high-level order:

```text
1. Core tokens
2. Base reusable components and system controls
3. Registered theme CSS files
4. Accent palettes
5. Semantic token adapters
6. Core background/layout CSS
7. Dock/status/grid/floating-control CSS
8. Settings, widget manager and config popup CSS
9. Shared panel CSS
10. Light text contract
11. Widget layout/shell CSS
12. Widget-specific CSS from the widget registry
13. Screensaver CSS
```

Current concrete order:

```text
styles/core/tokens.css

styles/components/icon.css
styles/components/icon-symbol.css
styles/components/slider.css
styles/components/toggle.css
styles/components/pill.css
styles/components/button.css
styles/system/system-buttons.css

styles/themes/ios.css
styles/themes/oneui.css
styles/themes/material.css

styles/themes/accent-palettes.css
styles/themes/semantic-tokens.css

styles/core/background.css
styles/layout/shell.css
styles/layout/widget-grid.css
styles/layout/status-bar.css
styles/layout/dock.css
styles/layout/mobile-dock.css
styles/layout/floating-controls.css
styles/layout/dock-glyph-stability.css
styles/layout/frame-alignment.css

styles/settings/settings-panel.css
styles/widget-manager/widget-manager.css
styles/widget-manager/widget-config-popup.css
styles/panels/panel-surface-contract.css
styles/panels/panel-frame-alignment.css
styles/panels/page-creator-sheet.css
styles/panels/page-creator-bottom.css
styles/settings/settings-bottom.css

styles/themes/light-text-contract.css

styles/widgets/widget-layout.css
styles/widgets/widget-shell.css

widget CSS from the widget registry

styles/screensaver/screensaver.css
styles/screensaver/screensaver-clock.css
styles/screensaver/screensaver-hotcorner.css
```

Important consequence:

Theme files define the raw visual language. `semantic-tokens.css` maps those raw values into the canonical semantic contract. Component, panel and widget files should consume semantic tokens or adapter tokens, not reinvent visual values.

---

## 5. Adding A New Theme

To add a new theme today, the minimum path is:

### Step 1 — Create the theme CSS

Create:

```text
styles/themes/my-theme.css
```

The file should define raw theme values such as:

```css
:host([data-theme-style="my-theme"]) {
  --mha-text: ...;
  --mha-muted: ...;
  --mha-widget-surface: ...;
  --mha-widget-border: ...;
  --mha-widget-shadow: ...;
  --mha-control-surface: ...;
  --mha-dock-surface: ...;
  --mha-statusbar-surface: ...;
  --mha-surface-blur: ...;
}
```

And ideally both light and dark modes:

```css
:host([data-theme-style="my-theme"][data-theme="light"]) {
  ...
}

:host([data-theme-style="my-theme"][data-theme="dark"]) {
  ...
}
```

### Step 2 — Register the theme

Edit:

```text
src/settings/theme-registry.js
```

Add a new entry:

```js
mytheme: freezeTheme({
  id: "mytheme",
  label: "My Theme",
  order: 40,
  defaultIconShape: "rounded-square",
  css: css("styles/themes/my-theme.css"),
  aliases: ["my-theme"],
}),
```

### Step 3 — Add accent support

Edit:

```text
src/settings/accent-palettes.js
```

Add options/reference colors. If the theme should support wallpaper-based automatic accents, add it to the auto-accent support list.

### Step 4 — Add CSS palette selectors

Edit:

```text
styles/themes/accent-palettes.css
```

Add selectors:

```css
:host([data-theme-style="mytheme"][data-accent="blue"]) {
  --mha-accent: #...;
}
```

### Step 5 — Verify semantic adapters

Usually, no change should be needed in:

```text
styles/themes/semantic-tokens.css
```

If the new theme needs a special mapping between raw theme values and semantic roles, add a small theme-specific adapter there.

### Step 6 — Test manually

Test:

- light mode;
- dark mode;
- auto mode;
- manual accents;
- auto accent if supported;
- icon shape `auto`;
- settings panel;
- widget manager;
- config popup;
- shared panel sheets;
- dock left/right/bottom;
- status bar;
- widgets;
- screensaver/NowBar.

---

## 6. Theme Responsibilities

A theme owns the visual language of MHA.

Themes may define:

- page background colors;
- wallpaper/background radial blobs;
- main widget surfaces;
- nested control surfaces;
- panel surfaces;
- dock surfaces;
- status bar surfaces;
- borders;
- shadows;
- blur strength;
- saturation;
- icon shape defaults;
- accent color behavior;
- text contrast.

Themes should not define:

- widget business logic;
- Home Assistant entity behavior;
- widget registry entries;
- widget configuration flows;
- layout algorithms.

---

## 7. iOS Theme Notes

The iOS theme is special because it contains two glass modes.

### Liquid Glass

Selector:

```css
:host([data-theme-style="ios"][data-ios-glass="liquid"])
```

Current direction:

- less blur;
- more translucent;
- stronger liquid/reflection feeling;
- no heavy colored shadows;
- panels and widgets share similar surface logic.

### Frosted Glass

Selector:

```css
:host([data-theme-style="ios"][data-ios-glass="frosted"])
```

Current direction:

- more classic Apple frosted material;
- stronger blur than Liquid;
- more opaque panels/tiles;
- neutral gray/white tinting;
- visually distinct from OneUI.

Important:

Liquid and Frosted are not separate registry entries. Do not add `ios-liquid` and `ios-frosted` to `theme-registry.js` unless the architecture intentionally changes.

---

## 8. OneUI Theme Notes

OneUI is currently the default theme style.

Selector:

```css
:host([data-theme-style="oneui"])
```

Current direction:

- practical, readable surfaces;
- stronger clarity than iOS Liquid;
- good contrast;
- squircle icon shape by default;
- stable reference for several widget visuals.

---

## 9. Material Theme Notes

Material is handled as:

```css
:host([data-theme-style="material"])
```

Current direction:

- opaque/tonal Material-style containers;
- circular default icon shape;
- accent-driven icon containers;
- less glass-like than iOS and OneUI;
- Material-specific tokens such as `--mha-material-surface-container`.

Material has extra palette behavior in `accent-palettes.css`, including:

```css
--mha-material-you-symbol-1
--mha-material-you-icon-container
```

These should remain Material-specific unless the design system is intentionally generalized.

---

## 10. Accent System

Accent data is split between JavaScript and CSS.

JavaScript source of truth:

```text
src/settings/accent-palettes.js
```

This file defines:

- user-facing accent options;
- reference colors;
- auto-accent support;
- wallpaper color matching logic.

CSS application layer:

```text
styles/themes/accent-palettes.css
```

This file maps:

```text
data-theme-style + data-accent
```

to CSS variables.

Core accent tokens:

```css
--mha-accent
--mha-accent-soft
--mha-accent-strong
--mha-accent-contrast
```

---

## 11. Icon Shape System

Default icon shapes are defined in the theme registry:

| Theme | Default shape |
|---|---|
| iOS | `rounded-square` |
| OneUI | `squircle` |
| Material | `circle` |

The user can override with:

```text
auto
rounded-square
squircle
circle
```

When set to `auto`, the resolved shape comes from the theme registry.

---

## 12. Recommended Theme Contract

New themes should define raw theme values, then let the semantic layer translate them.

Recommended base tokens to define:

```css
--mha-text
--mha-muted
--mha-widget-surface
--mha-widget-surface-edit
--mha-widget-border
--mha-widget-border-edit
--mha-widget-shadow
--mha-widget-reflection
--mha-widget-reflection-opacity
--mha-control-surface
--mha-control-surface-edit
--mha-dock-surface
--mha-dock-slot-surface
--mha-dock-shadow
--mha-statusbar-surface
--mha-surface-blur
--mha-surface-saturation
--mha-bg-base-1
--mha-bg-base-2
--mha-bg-radial-1
--mha-bg-radial-2
--mha-bg-radial-3
--mha-bg-blob-1
--mha-bg-blob-2
--mha-bg-blob-3
--mha-bg-blob-4
--mha-bg-blob-opacity
```

Then confirm that semantic tokens resolve correctly:

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

---

## 13. What To Avoid

Avoid adding theme-specific hacks inside:

```text
styles/widgets/*
styles/widget-manager/*
styles/settings/*
styles/panels/*
```

Unless the exception is genuinely component-specific.

Prefer this:

```css
:host([data-theme-style="mytheme"]) {
  --mha-widget-surface: ...;
}
```

over this:

```css
:host([data-theme-style="mytheme"]) .mha-weather-widget {
  background: ...;
}
```

Theme files should make widgets and panels look right through tokens.

Widgets should not need to know the theme name.

---

## 14. Current Architecture Verdict

The theme architecture is in a good transitional state.

Strengths:

- registry-driven theme list;
- centralized theme state controller;
- centralized style manifest;
- accent palettes separated from theme CSS;
- semantic token layer exists;
- iOS Liquid/Frosted uses data attributes rather than duplicated theme registrations;
- panel and screensaver CSS are now better separated from monolithic files.

Main remaining cleanup opportunities:

- reduce legacy component-specific tokens over time;
- migrate more widgets and panels toward canonical semantic tokens;
- keep exceptions centralized in theme files;
- document which tokens are public contract vs internal adapter;
- avoid growing `styles/themes/ios.css` into too many unrelated component patches.

Target state:

```text
Add theme CSS
    +
Register theme
    +
Optionally add accent palette
```

A new theme should not require touching widget renderers.
