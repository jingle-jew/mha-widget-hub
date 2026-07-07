# Themes Guide

This document describes the current theme system used by MHA Widget Hub.

MHA themes are registry-driven visual systems. They define the raw visual language, while components, panels and widgets should consume semantic tokens instead of hardcoding one-off values.

---

## 1. Target Model

MHA themes follow this contract:

```text
1 theme = 1 registry entry + 1 or more CSS files + optional accent palette + optional dock contract
```

A minimal theme usually touches:

```text
styles/themes/my-theme.css
src/settings/theme-registry.js
```

A theme may also provide:

```text
src/settings/accent-palettes.js
styles/themes/accent-palettes.css
styles/themes/my-theme-dock.css
```

If a theme does not provide its own accent palette, MHA falls back to the default accent palette.

---

## 2. Current Registered Themes

| Theme style id | Label | Main CSS file | Default icon shape | Aliases |
|---|---|---|---|---|
| `ios` | iOS | `styles/themes/ios.css` + `styles/themes/ios-organic-wallpaper.css` | `rounded-square` | `apple`, `liquid-glass`, `frosted-glass` |
| `oneui` | OneUI | `styles/themes/oneui.css` | `squircle` | `samsung`, `one-ui` |
| `material` | Material You | `styles/themes/material.css` | `circle` | `material-you`, `material3`, `material-3` |
| `alexa` | Alexa | `styles/themes/alexa.css` | `circle` | `echo`, `amazon-alexa`, `amazon` |

The default theme style is:

```js
oneui
```

The iOS theme currently exposes two variants:

- Liquid Glass;
- Frosted Glass.

These are theme variants, not separate theme styles.

---

## 3. Theme Registry

Theme definitions live in:

```text
src/settings/theme-registry.js
```

The registry is the source of truth for:

- theme id;
- label;
- display order;
- CSS files;
- aliases;
- default icon shape;
- wallpaper metadata;
- variants;
- accent options;
- default accent;
- auto accent support;
- dock contract.

A registry entry may define:

```js
{
  id: "mytheme",
  label: "My Theme",
  order: 50,
  defaultIconShape: "rounded-square",
  css: css("styles/themes/my-theme.css"),
  wallpaper: {
    type: "advanced",
    accentSource: {
      type: "color",
      light: "#8bbdff",
      dark: "#65a8ff",
    },
  },
  variants: [],
  accents: [],
  defaultAccent: "sky",
  supportsAutoAccent: true,
  aliases: ["my-theme"],
  dock: {
    usesDock: true,
    contentBuilder: "default",
    css: ["styles/themes/my-theme-dock.css"],
    supportedPositions: ["left", "right", "bottom"],
  },
}
```

The registry normalizes definitions before exposing them to the rest of the app.

---

## 4. Dock Contracts

Theme dock behavior is part of the theme registry.

A dock contract can define:

| Field | Meaning |
|---|---|
| `usesDock` | Whether the visual system uses the standard dock. |
| `contentBuilder` | Dock content variant used by layout rendering. |
| `css` | Optional dock-specific CSS files loaded through the style manifest. |
| `supportedPositions` | Supported dock positions such as `left`, `right`, `bottom`. |

Current dock-specific CSS:

| Theme | Dock CSS |
|---|---|
| iOS | `styles/themes/ios-dock.css` |
| OneUI | `styles/themes/oneui-dock.css` |
| Material You | `styles/themes/material-dock.css` |
| Alexa | none currently registered |

Do not add dock-only theme hacks inside generic dock CSS when the behavior belongs to a theme dock contract.

---

## 5. Theme State

Theme state is handled by:

```text
src/settings/theme-controller.js
```

The controller reads and synchronizes theme settings between:

- `localStorage`;
- the custom element host dataset;
- `document.documentElement.dataset`.

Synchronized attributes include:

| Dataset attribute | Meaning |
|---|---|
| `data-theme-setting` | User preference: `auto`, `dark`, or `light` |
| `data-theme` | Resolved visual mode: `dark` or `light` |
| `data-theme-style` | Visual system: `ios`, `oneui`, `material`, or `alexa` |
| `data-theme-variant` | Generic theme variant id |
| `data-ios-glass` | Legacy iOS compatibility attribute: `liquid` or `frosted` |
| `data-accent` | Active accent key |
| `data-accent-mode` | `manual` or `auto` |
| `data-icon-shape-setting` | `auto`, `rounded-square`, `squircle`, or `circle` |
| `data-icon-shape` | Resolved icon shape |

Theme CSS should target dataset attributes instead of relying on JavaScript branching.

---

## 6. Stored Theme Keys

The theme controller uses these local storage keys:

| Key | Purpose |
|---|---|
| `mha-theme` | Main theme mode: `auto`, `dark`, `light` |
| `mha-dev-theme` | Dev fallback for theme mode |
| `mha-theme-style` | Main visual style |
| `mha-dev-theme-style` | Dev fallback for visual style |
| `mha-theme-variant` | Generic theme variant |
| `mha-theme-variant-{themeStyle}` | Per-theme variant |
| `mha-ios-glass` | Legacy iOS glass variant |
| `mha-dev-ios-glass` | Legacy dev fallback for iOS glass variant |
| `mha-accent-mode` | Global accent mode |
| `mha-accent-mode-{themeStyle}` | Per-theme accent mode |
| `mha-accent` | Active accent value |
| `mha-accent-{themeStyle}` | Per-theme manual accent |
| `mha-accent-auto-{themeStyle}` | Per-theme automatic accent |
| `mha-icon-shape` | Icon shape preference |

Each visual style can remember its own accent independently.

---

## 7. Style Manifest Loading Order

Theme CSS is part of the global style manifest:

```text
src/styles/style-manifest.js
```

Theme CSS paths are read from the theme registry through:

```text
getThemeCssPaths()
getThemeDockCssPaths()
```

High-level order:

```text
1. Core base/tokens
2. Reusable components and system controls
3. Registered theme CSS files
4. Accent palettes and semantic token adapters
5. Surface aliases and iOS raw/surface maps
6. Core background, glass and Android edge-to-edge CSS
7. Shell, grid, status bar, dock and floating controls
8. Page-specific CSS such as media pages
9. Settings, widget manager and config popup CSS
10. Shared panel CSS
11. Light text contract
12. Widget layout/shell contracts
13. Theme dock CSS files
14. Widget CSS from the widget registry
15. Widget internals contracts
16. Screensaver CSS
```

Important consequence:

Theme files define the raw visual language. `semantic-tokens.css` maps those raw values into the canonical semantic contract. Component, panel and widget files should consume semantic tokens or adapter tokens instead of reinventing visual values.

---

## 8. Adding A New Theme

### Step 1 — Create the theme CSS

Create:

```text
styles/themes/my-theme.css
```

The file should define raw theme values such as:

```css
:host([data-theme-style="mytheme"]) {
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
:host([data-theme-style="mytheme"][data-theme="light"]) {
  ...
}

:host([data-theme-style="mytheme"][data-theme="dark"]) {
  ...
}
```

### Step 2 — Register the theme

Edit:

```text
src/settings/theme-registry.js
```

Add a normalized entry.

### Step 3 — Add variants, if needed

Variants are optional. If a theme defines variants, Settings automatically displays a variant selector.

### Step 4 — Add accent support, if needed

Accent palettes are optional.

Resolution order for accent options:

```text
registry accents
→ ACCENT_PALETTES[themeStyle]
→ DEFAULT_ACCENT_PALETTE
```

For dedicated reference colors or wallpaper-based matching, edit:

```text
src/settings/accent-palettes.js
```

For CSS application of accent variables, edit:

```text
styles/themes/accent-palettes.css
```

### Step 5 — Verify semantic adapters

Usually, no change should be needed in:

```text
styles/themes/semantic-tokens.css
```

If the new theme needs a special mapping between raw theme values and semantic roles, add a small theme-specific adapter there.

---

## 9. Theme Responsibilities

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
- variants;
- accent color behavior;
- text contrast.

Themes should not define:

- widget business logic;
- Home Assistant entity behavior;
- widget registry entries;
- widget configuration flows;
- layout algorithms.

---

## 10. Theme Notes

### iOS

The iOS theme contains two glass variants:

- Liquid Glass;
- Frosted Glass.

Liquid and Frosted are not separate registry entries. Do not add `ios-liquid` and `ios-frosted` to `theme-registry.js` unless the architecture intentionally changes.

Current direction:

- preserve glass/surface identity;
- avoid heavy colored shadows or decorative glow;
- keep Liquid lighter and more translucent;
- keep Frosted more opaque and classic.

### OneUI

OneUI is the default theme style.

Current direction:

- practical, readable surfaces;
- strong clarity;
- good contrast;
- squircle icon shape by default;
- stable reference for several widget visuals.

### Material You

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

### Alexa

Alexa is a registered visual system.

Current direction:

- ambient assistant-style surfaces;
- circular default icon shape;
- cyan/blue accent family by default;
- compatible with the standard dock positions;
- should remain native MHA, not an embedded Alexa UI clone.

---

## 11. Accent System

Accent data is split between registry metadata, JavaScript matching logic and CSS application.

JavaScript accent logic lives in:

```text
src/settings/accent-palettes.js
```

CSS application layer:

```text
styles/themes/accent-palettes.css
```

Core accent tokens:

```css
--mha-accent
--mha-accent-soft
--mha-accent-strong
--mha-accent-contrast
```

---

## 12. Icon Shape System

Default icon shapes are defined in the theme registry:

| Theme | Default shape |
|---|---|
| iOS | `rounded-square` |
| OneUI | `squircle` |
| Material You | `circle` |
| Alexa | `circle` |

The user can override with:

```text
auto
rounded-square
squircle
circle
```

When set to `auto`, the resolved shape comes from the theme registry.

---

## 13. Recommended Theme Tokens

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
```

---

## 14. Manual Theme Validation

Test:

- light mode;
- dark mode;
- auto mode;
- manual accents;
- auto accent if supported;
- variants if defined;
- icon shape `auto`;
- settings panel;
- widget manager;
- config popup;
- shared panel sheets;
- dock left/right/bottom;
- status bar;
- widgets;
- dedicated page experiences;
- screensaver/NowBar.

Also run:

```bash
npm run check
```
