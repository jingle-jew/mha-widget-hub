# Themes Guide

This document describes the current theme system used by MHA Widget Hub.

---

## 1. Target Model

MHA themes are registry-driven.

The target contract is:

```text
1 theme = 1 CSS + 1 manifest entry + optional accent palette
```

A minimal theme only needs:

```text
styles/themes/my-theme.css
src/settings/theme-registry.js
```

A theme may also provide a dedicated accent palette in:

```text
src/settings/accent-palettes.js
styles/themes/accent-palettes.css
```

If a theme does not provide its own accent palette, MHA falls back to the default accent palette.

---

## 2. Current Registered Themes

| Theme style id | Label | CSS file | Default icon shape | Aliases |
|---|---|---|---|---|
| `ios` | iOS | `styles/themes/ios.css` | `rounded-square` | `apple`, `liquid-glass`, `frosted-glass` |
| `oneui` | OneUI | `styles/themes/oneui.css` | `squircle` | `samsung`, `one-ui` |
| `material` | Material You | `styles/themes/material.css` | `circle` | `material-you`, `material3`, `material-3` |

The default theme style is:

```js
oneui
```

The iOS theme currently exposes two variants:

- Liquid Glass
- Frosted Glass

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
- auto accent support.

A registry entry may define:

```js
{
  id: "mytheme",
  label: "My Theme",
  order: 40,
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
}
```

The registry normalizes definitions before exposing them to the rest of the app.

---

## 4. Theme State

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
| `data-theme-style` | Visual system: `ios`, `oneui`, or `material` |
| `data-theme-variant` | Generic theme variant id |
| `data-ios-glass` | Legacy iOS compatibility attribute: `liquid` or `frosted` |
| `data-accent` | Active accent key |
| `data-accent-mode` | `manual` or `auto` |
| `data-icon-shape-setting` | `auto`, `rounded-square`, `squircle`, or `circle` |
| `data-icon-shape` | Resolved icon shape |

Theme CSS should target dataset attributes instead of relying on JavaScript branching.

Example:

```css
:host([data-theme-style="ios"][data-theme-variant="liquid"]) {
  --mha-surface-blur: 10px;
}
```

For now, iOS CSS may still target the legacy compatibility attribute:

```css
:host([data-theme-style="ios"][data-ios-glass="frosted"]) {
  --mha-surface-blur: 22px;
}
```

---

## 5. Stored Theme Keys

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

## 6. Style Manifest Loading Order

Theme CSS is part of the global style manifest:

```text
src/styles/style-manifest.js
```

Theme CSS paths are read from the theme registry through `getThemeCssPaths()`.

High-level order:

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

Important consequence:

Theme files define the raw visual language. `semantic-tokens.css` maps those raw values into the canonical semantic contract. Component, panel and widget files should consume semantic tokens or adapter tokens instead of reinventing visual values.

---

## 7. Adding A New Theme

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

Add a new entry:

```js
mytheme: normalizeThemeDefinition({
  id: "mytheme",
  label: "My Theme",
  order: 40,
  defaultIconShape: "rounded-square",
  css: css("styles/themes/my-theme.css"),
  defaultAccent: "sky",
  supportsAutoAccent: true,
  aliases: ["my-theme"],
}),
```

### Step 3 — Add variants, if needed

Variants are optional.

Example:

```js
variants: [
  { id: "soft", label: "Soft", order: 10, default: true },
  { id: "solid", label: "Solid", order: 20 },
],
```

If a theme defines variants, Settings automatically displays a variant selector.

### Step 4 — Add accent support, if needed

Accent palettes are optional.

A theme can provide accent options in the registry:

```js
accents: [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
],
```

If no registry accent list is provided, MHA falls back to the matching `ACCENT_PALETTES[themeStyle]` entry.

If no matching palette exists, MHA falls back to `DEFAULT_ACCENT_PALETTE`.

For dedicated reference colors or wallpaper-based matching, edit:

```text
src/settings/accent-palettes.js
```

For CSS application of accent variables, edit:

```text
styles/themes/accent-palettes.css
```

Example:

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
- variants if defined;
- icon shape `auto`;
- settings panel;
- widget manager;
- config popup;
- shared panel sheets;
- dock left/right/bottom;
- status bar;
- widgets;
- screensaver/Now Bar.

Also run:

```bash
npm run check
```

---

## 8. Theme Responsibilities

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

## 9. iOS Theme Notes

The iOS theme contains two glass variants.

### Liquid Glass

Preferred generic selector:

```css
:host([data-theme-style="ios"][data-theme-variant="liquid"])
```

Legacy compatibility selector:

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

Preferred generic selector:

```css
:host([data-theme-style="ios"][data-theme-variant="frosted"])
```

Legacy compatibility selector:

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

## 10. OneUI Theme Notes

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

## 11. Material Theme Notes

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

## 12. Accent System

Accent data is split between registry metadata, JavaScript matching logic, and CSS application.

Resolution order for accent options:

```text
registry accents
→ ACCENT_PALETTES[themeStyle]
→ DEFAULT_ACCENT_PALETTE
```

JavaScript accent logic lives in:

```text
src/settings/accent-palettes.js
```

This file defines:

- fallback accent palettes;
- reference colors;
- wallpaper color matching logic;
- default palette fallback.

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

## 13. Icon Shape System

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

## 14. Recommended Theme Tokens

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
