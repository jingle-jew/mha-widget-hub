# Theme Tokens

This document describes the current token contract used by MHA Widget Hub.

It is based on:

```text
styles/SEMANTIC_TOKENS.md
styles/themes/semantic-tokens.css
styles/core/tokens.css
styles/themes/ios.css
styles/themes/oneui.css
styles/themes/material.css
styles/themes/accent-palettes.css
styles/widgets/*.css
styles/settings/settings-panel.css
styles/widget-manager/*.css
styles/layout/*.css
```

---

## 1. Token Philosophy

MHA is moving from component-specific visual values toward a semantic design contract.

The intended direction is:

```text
Theme CSS defines raw visual identity
        ↓
semantic-tokens.css maps those values to roles
        ↓
components/widgets consume roles or adapter tokens
```

In plain words:

- Themes decide what surfaces look like.
- Widgets decide what content they render.
- Widgets should not hardcode a theme's visual identity.

---

## 2. Canonical Layer Tokens

These are the most important high-level tokens for new work.

| Token | Role | Typical consumers |
|---|---|---|
| `--mha-primary-surface` | Main surface layer | widgets, panels, dock, status bar, manager shell |
| `--mha-on-primary-surface` | Nested surface on a primary surface | settings tiles, manager tiles, widget internal cards |
| `--mha-secondary-surface` | Secondary/control layer | inputs, selects, chips, inner controls |
| `--mha-on-secondary-surface` | Deeper nested surface | previews, sub-controls, stronger inner tiles |
| `--mha-primary-border` | Border for primary surfaces | widgets, panels, dock, status bar |
| `--mha-secondary-border` | Border for nested surfaces | tiles, controls, manager entries |
| `--mha-primary-text` | Main readable text | titles, labels, values |
| `--mha-secondary-text` | Supporting text | descriptions, helper labels |
| `--mha-muted-text` | Low-emphasis text | hints, metadata |
| `--mha-accent-surface` | Accent-colored surface | active states, toggles, selected controls |
| `--mha-on-accent-surface` | Content on accent surfaces | icons/text on accent backgrounds |

New widgets and components should prefer these tokens first.

---

## 3. Semantic Role Families

### Background tokens

| Token | Meaning |
|---|---|
| `--mha-bg-primary` | Main app/page background |
| `--mha-bg-secondary` | Slightly separated secondary background |
| `--mha-bg-elevated` | Elevated background layer |
| `--mha-bg-overlay` | Modal/panel scrim background |

### Surface tokens

| Token | Meaning |
|---|---|
| `--mha-surface-primary` | Main card/widget surface |
| `--mha-surface-secondary` | Secondary surface inside widgets/panels |
| `--mha-surface-tertiary` | Deeper nested surface |
| `--mha-surface-glass` | Glass-like shell surface |
| `--mha-surface-floating` | Floating controls |
| `--mha-surface-panel` | Settings/popup/panel surface |
| `--mha-surface-tonal` | Material-style tonal container |

### Border tokens

| Token | Meaning |
|---|---|
| `--mha-border-primary` | Default visible border |
| `--mha-border-secondary` | Softer nested border |
| `--mha-border-subtle` | Very subtle divider/border |
| `--mha-border-focus` | Active/focus border |

### Text tokens

| Token | Meaning |
|---|---|
| `--mha-text-primary` | Main text |
| `--mha-text-secondary` | Secondary text |
| `--mha-text-tertiary` | Metadata/helper text |
| `--mha-text-disabled` | Disabled/unavailable text |
| `--mha-text-muted` | Compatibility alias for tertiary text |
| `--mha-text-inverse` | Text on inverse/contrasting surfaces |

### Effect tokens

| Token | Meaning |
|---|---|
| `--mha-blur-primary` | Default blur strength |
| `--mha-blur-strong` | Stronger panel blur |
| `--mha-shadow-primary` | Main card/widget shadow |
| `--mha-shadow-floating` | Floating shell shadow |
| `--mha-shadow-panel` | Panel/sheet shadow |
| `--mha-highlight-primary` | Glass reflection/highlight |
| `--mha-highlight-subtle` | Softer highlight |

### Accent tokens

| Token | Meaning |
|---|---|
| `--mha-accent` | Main accent color |
| `--mha-accent-soft` | Subtle transparent accent |
| `--mha-accent-strong` | Stronger accent |
| `--mha-accent-contrast` | Text/icon color on accent |

---

## 4. Adapter Tokens

Adapter tokens bridge semantic roles to existing component CSS.

They are valid, but they should not become the main design language for new themes.

### Shell adapter tokens

| Token | Used for |
|---|---|
| `--mha-shell-surface` | Generic shell surface |
| `--mha-shell-status-surface` | Status bar |
| `--mha-shell-dock-surface` | Dock |
| `--mha-shell-panel-surface` | Mobile dock/panel surface |
| `--mha-shell-border` | Shell borders |
| `--mha-shell-shadow` | Shell shadows |
| `--mha-shell-blur` | Shell blur |

### Widget shell adapter tokens

| Token | Used for |
|---|---|
| `--mha-widget-shell-surface` | Main widget card |
| `--mha-widget-shell-border` | Main widget border |
| `--mha-widget-shell-shadow` | Main widget shadow |
| `--mha-widget-shell-highlight` | Widget reflection/highlight |
| `--mha-widget-control-surface` | Small controls inside widgets |
| `--mha-widget-shell-surface-edit` | Widget edit-mode surface |
| `--mha-widget-shell-border-edit` | Widget edit-mode border |

### Panel adapter tokens

| Token | Used for |
|---|---|
| `--mha-panel-scrim-bg` | Scrim behind panels |
| `--mha-panel-section-surface` | Settings/manager sections |
| `--mha-panel-control-surface` | Inputs/selects in panels |
| `--mha-panel-border` | Main panel border |
| `--mha-panel-section-border` | Section border |

### System button adapter tokens

| Token | Used for |
|---|---|
| `--mha-system-button-bg` | Floating system button background |
| `--mha-system-button-border` | Floating system button border |
| `--mha-system-button-color` | Floating system button icon/text |
| `--mha-system-button-shadow` | Floating system button shadow |
| `--mha-system-button-backdrop-filter` | Floating system button blur/filter |
| `--mha-system-button-highlight` | Floating system button highlight |
| `--mha-system-button-highlight-opacity` | Highlight intensity |

---

## 5. Legacy Compatibility Tokens

These tokens still exist and are widely used.

They should remain valid while the project migrates toward semantic roles.

| Legacy token | Prefer / maps toward |
|---|---|
| `--mha-widget-surface` | `--mha-surface-primary` / `--mha-primary-surface` |
| `--mha-widget-border` | `--mha-border-primary` / `--mha-primary-border` |
| `--mha-widget-shadow` | `--mha-shadow-primary` |
| `--mha-control-surface` | `--mha-surface-secondary` / `--mha-secondary-surface` |
| `--mha-panel-surface` | `--mha-surface-panel` |
| `--mha-panel-background` | `--mha-bg-overlay` |
| `--mha-dock-surface` | `--mha-surface-glass` |
| `--mha-statusbar-surface` | `--mha-surface-secondary` |
| `--mha-system-button-bg` | `--mha-surface-floating` |
| `--mha-surface-blur` | `--mha-blur-primary` |
| `--mha-widget-reflection` | `--mha-highlight-primary` |

Do not remove these yet.

They are still part of the compatibility layer.

---

## 6. Theme-Specific Token Families

### iOS tokens

The iOS theme uses:

```text
data-theme-style="ios"
data-ios-glass="liquid"
data-ios-glass="frosted"
```

Important iOS-related values include:

```css
--mha-surface-blur
--mha-surface-saturation
--mha-widget-reflection
--mha-widget-reflection-opacity
--mha-widget-surface
--mha-widget-surface-edit
--mha-widget-border
--mha-widget-border-edit
--mha-dock-surface
--mha-dock-slot-surface
--mha-statusbar-surface
--mha-control-surface
--mha-control-surface-edit
```

Liquid Glass should stay lighter and less blurred.

Frosted Glass should stay more opaque and classically blurred.

### OneUI tokens

OneUI uses the same semantic contract but tends to favor:

- readable surfaces;
- stronger practical contrast;
- squircle icon language;
- stable widget/card hierarchy.

OneUI also has some theme-specific adapter values prefixed with:

```css
--mha-oneui-...
```

### Material tokens

Material uses additional Material-style values, including:

```css
--mha-material-surface-container
--mha-material-surface-container-high
--mha-material-surface-container-highest
--mha-material-you-symbol-1
--mha-material-you-icon-container
```

Material should generally remain more opaque/tonal and less glass-like.

---

## 7. Widget-Specific Token Families

Some widgets still expose their own adapter tokens.

This is acceptable when the widget has a special internal visual system, but the values should still map back to semantic roles where possible.

Current notable widget token families include:

- `--mha-slider-widget-*`
- `--mha-clock-widget-*`
- `--mha-weather-widget-*`
- `--mha-simple-button-*`
- `--mha-toggle-widget-*`
- `--mha-media-*`

Rule of thumb:

```text
Widget-specific token = adapter
Theme token = source of truth
```

---

## 8. Token Usage Rules

### New theme CSS should define

```css
--mha-text
--mha-muted
--mha-widget-surface
--mha-widget-border
--mha-widget-shadow
--mha-control-surface
--mha-dock-surface
--mha-statusbar-surface
--mha-surface-blur
```

### New component CSS should consume

```css
--mha-primary-surface
--mha-on-primary-surface
--mha-secondary-surface
--mha-primary-text
--mha-secondary-text
--mha-primary-border
--mha-secondary-border
--mha-accent-surface
--mha-on-accent-surface
```

### Avoid

```css
background: rgba(...);
color: #fff;
border: 1px solid rgba(...);
box-shadow: ...;
```

unless the value is truly local and not part of the theme system.

---

## 9. Public Contract vs Internal Tokens

### Public-ish contract

These are safe to document and use in new components:

```css
--mha-primary-surface
--mha-on-primary-surface
--mha-secondary-surface
--mha-on-secondary-surface
--mha-primary-border
--mha-secondary-border
--mha-primary-text
--mha-secondary-text
--mha-muted-text
--mha-accent-surface
--mha-on-accent-surface
--mha-bg-primary
--mha-bg-overlay
--mha-blur-primary
--mha-shadow-primary
```

### Internal / adapter layer

These are allowed but should be treated as implementation details:

```css
--mha-widget-shell-*
--mha-panel-*
--mha-shell-*
--mha-system-button-*
--mha-slider-widget-*
--mha-weather-widget-*
--mha-toggle-widget-*
--mha-simple-button-*
```

### Legacy compatibility layer

These must remain for now:

```css
--mha-widget-surface
--mha-widget-border
--mha-widget-shadow
--mha-control-surface
--mha-dock-surface
--mha-statusbar-surface
--mha-panel-surface
```

---

## 10. Extracted Token Inventory

The following inventory was extracted from the current zip by scanning `styles/` and `src/`.

It is intentionally broad. Some tokens are runtime/layout values, not public theme contract.

### accent (5 defined tokens)
- `--mha-accent` — defined in styles/core/tokens.css:46, styles/themes/accent-palettes.css:16, styles/themes/accent-palettes.css:28
- `--mha-accent-contrast` — defined in styles/themes/accent-palettes.css:19, styles/themes/accent-palettes.css:34, styles/themes/accent-palettes.css:35
- `--mha-accent-soft` — defined in styles/themes/accent-palettes.css:17, styles/themes/accent-palettes.css:106, styles/themes/semantic-tokens.css:90
- `--mha-accent-strong` — defined in styles/themes/accent-palettes.css:18, styles/themes/accent-palettes.css:107, styles/themes/semantic-tokens.css:91
- `--mha-accent-surface` — defined in styles/themes/semantic-tokens.css:77, styles/themes/semantic-tokens.css:143

### bg (15 defined tokens)
- `--mha-bg-base-1` — defined in styles/core/tokens.css:47, styles/themes/oneui.css:45, styles/themes/oneui.css:78
- `--mha-bg-base-2` — defined in styles/core/tokens.css:48, styles/themes/oneui.css:46, styles/themes/oneui.css:79
- `--mha-bg-blob-1` — defined in styles/core/tokens.css:49, styles/themes/oneui.css:50, styles/themes/oneui.css:83
- `--mha-bg-blob-2` — defined in styles/core/tokens.css:50, styles/themes/oneui.css:51, styles/themes/oneui.css:84
- `--mha-bg-blob-3` — defined in styles/core/tokens.css:51, styles/themes/oneui.css:52, styles/themes/oneui.css:85
- `--mha-bg-blob-4` — defined in styles/core/tokens.css:52, styles/themes/oneui.css:53, styles/themes/oneui.css:86
- `--mha-bg-blob-blur` — defined in styles/core/tokens.css:57
- `--mha-bg-blob-opacity` — defined in styles/core/tokens.css:56, styles/themes/oneui.css:54, styles/themes/oneui.css:87
- `--mha-bg-elevated` — defined in styles/themes/semantic-tokens.css:25
- `--mha-bg-overlay` — defined in styles/themes/semantic-tokens.css:26
- `--mha-bg-primary` — defined in styles/themes/semantic-tokens.css:23
- `--mha-bg-radial-1` — defined in styles/core/tokens.css:53, styles/themes/oneui.css:47, styles/themes/oneui.css:80
- `--mha-bg-radial-2` — defined in styles/core/tokens.css:54, styles/themes/oneui.css:48, styles/themes/oneui.css:81
- `--mha-bg-radial-3` — defined in styles/core/tokens.css:55, styles/themes/oneui.css:49, styles/themes/oneui.css:82
- `--mha-bg-secondary` — defined in styles/themes/semantic-tokens.css:24

### blur (2 defined tokens)
- `--mha-blur-primary` — defined in styles/themes/semantic-tokens.css:81, styles/themes/semantic-tokens.css:104
- `--mha-blur-strong` — defined in styles/themes/semantic-tokens.css:82

### border (5 defined tokens)
- `--mha-border-focus` — defined in styles/themes/semantic-tokens.css:41
- `--mha-border-primary` — defined in styles/themes/semantic-tokens.css:38
- `--mha-border-radius-icon` — defined in styles/components/icon.css:37, styles/components/icon.css:55, styles/components/icon.css:60
- `--mha-border-secondary` — defined in styles/themes/semantic-tokens.css:39
- `--mha-border-subtle` — defined in styles/themes/semantic-tokens.css:40

### button (7 defined tokens)
- `--mha-button-bg` — defined in styles/components/button.css:9, styles/components/button.css:34, styles/components/button.css:40
- `--mha-button-border` — defined in styles/components/button.css:11, styles/components/button.css:35, styles/components/button.css:42
- `--mha-button-color` — defined in styles/components/button.css:10, styles/components/button.css:41, styles/components/button.css:48
- `--mha-button-height` — defined in styles/components/button.css:6
- `--mha-button-padding-inline` — defined in styles/components/button.css:7
- `--mha-button-radius` — defined in styles/components/button.css:8
- `--mha-button-shadow` — defined in styles/components/button.css:12, styles/components/button.css:36, styles/components/button.css:43

### clock (18 defined tokens)
- `--mha-clock-current-opacity` — defined in styles/screensaver/screensaver.css:348
- `--mha-clock-current-x` — defined in styles/screensaver/screensaver.css:347
- `--mha-clock-digital-glyph-safe-end` — defined in styles/widgets/clock-widget.css:594
- `--mha-clock-digital-safe-inline` — defined in styles/widgets/clock-widget.css:593
- `--mha-clock-number-upright` — defined in styles/widgets/clock-widget.css:171
- `--mha-clock-widget-blur` — defined in styles/themes/semantic-tokens.css:485, styles/themes/semantic-tokens.css:505, styles/themes/semantic-tokens.css:525
- `--mha-clock-widget-center-dot` — defined in styles/themes/semantic-tokens.css:483
- `--mha-clock-widget-face-border` — defined in styles/themes/semantic-tokens.css:475, styles/themes/semantic-tokens.css:502, styles/themes/semantic-tokens.css:522
- `--mha-clock-widget-face-shadow` — defined in styles/themes/semantic-tokens.css:476, styles/themes/semantic-tokens.css:506, styles/themes/semantic-tokens.css:523
- `--mha-clock-widget-face-surface` — defined in styles/themes/semantic-tokens.css:473, styles/themes/semantic-tokens.css:498, styles/themes/semantic-tokens.css:511
- `--mha-clock-widget-face-surface-strong` — defined in styles/themes/semantic-tokens.css:474, styles/themes/semantic-tokens.css:500, styles/themes/semantic-tokens.css:513
- `--mha-clock-widget-hand` — defined in styles/themes/semantic-tokens.css:481
- `--mha-clock-widget-highlight` — defined in styles/themes/semantic-tokens.css:484, styles/themes/semantic-tokens.css:504, styles/themes/semantic-tokens.css:524
- `--mha-clock-widget-mark` — defined in styles/themes/semantic-tokens.css:479
- `--mha-clock-widget-mark-major` — defined in styles/themes/semantic-tokens.css:480
- `--mha-clock-widget-muted` — defined in styles/themes/semantic-tokens.css:472
- `--mha-clock-widget-second-hand` — defined in styles/themes/semantic-tokens.css:482
- `--mha-clock-widget-text` — defined in styles/themes/semantic-tokens.css:471

### control (9 defined tokens)
- `--mha-control-gap` — defined in styles/core/tokens.css:64
- `--mha-control-height` — defined in styles/core/tokens.css:63
- `--mha-control-icon-bubble-radius` — defined in styles/widgets/widget-layout.css:22, styles/widgets/widget-layout.css:53
- `--mha-control-icon-bubble-size` — defined in styles/widgets/widget-layout.css:20, styles/widgets/widget-layout.css:51
- `--mha-control-icon-glyph-size` — defined in styles/widgets/widget-layout.css:21, styles/widgets/widget-layout.css:52
- `--mha-control-radius` — defined in styles/core/tokens.css:27, styles/themes/oneui.css:9, styles/themes/material.css:9
- `--mha-control-surface` — defined in styles/core/tokens.css:44, styles/themes/oneui.css:37, styles/themes/oneui.css:70
- `--mha-control-surface-edit` — defined in styles/core/tokens.css:45, styles/themes/oneui.css:38, styles/themes/oneui.css:71
- `--mha-control-surface-semantic` — defined in styles/themes/semantic-tokens.css:176

### dock (32 defined tokens)
- `--mha-dock-active-icon-bg` — defined in styles/themes/accent-palettes.css:176, styles/themes/accent-palettes.css:186, styles/themes/accent-palettes.css:197
- `--mha-dock-active-icon-border` — defined in styles/themes/accent-palettes.css:178, styles/themes/accent-palettes.css:188, styles/themes/accent-palettes.css:202
- `--mha-dock-active-icon-color` — defined in styles/themes/accent-palettes.css:177, styles/themes/accent-palettes.css:187, styles/themes/accent-palettes.css:212
- `--mha-dock-active-icon-shadow` — defined in styles/themes/accent-palettes.css:179, styles/themes/accent-palettes.css:189, styles/themes/accent-palettes.css:203
- `--mha-dock-active-indicator` — defined in styles/themes/accent-palettes.css:182, styles/themes/accent-palettes.css:193, styles/themes/accent-palettes.css:207
- `--mha-dock-border` — defined in styles/themes/material.css:20
- `--mha-dock-bottom` — defined in styles/core/tokens.css:77
- `--mha-dock-button-size` — defined in styles/core/tokens.css:67, styles/core/tokens.css:95, styles/core/tokens.css:96
- `--mha-dock-empty-height` — defined in styles/layout/dock.css:7, styles/layout/dock.css:81, styles/layout/dock.css:89
- `--mha-dock-empty-padding-block` — defined in styles/layout/dock.css:8, styles/layout/dock.css:117, styles/layout/dock.css:675
- `--mha-dock-empty-padding-inline` — defined in styles/layout/dock.css:9, styles/layout/dock.css:118, styles/layout/dock.css:676
- `--mha-dock-empty-width` — defined in styles/layout/dock.css:6, styles/layout/dock.css:80, styles/layout/dock.css:88
- `--mha-dock-gap` — defined in styles/core/tokens.css:66, styles/layout/dock.css:223
- `--mha-dock-horizontal-gutter` — defined in styles/layout/dock.css:222
- `--mha-dock-max-width` — defined in styles/core/tokens.css:76
- `--mha-dock-padding` — defined in styles/core/tokens.css:65, styles/layout/dock.css:224
- `--mha-dock-radius` — defined in styles/core/tokens.css:28, styles/themes/oneui.css:10, styles/themes/material.css:10
- `--mha-dock-rail-gap` — defined in styles/layout/dock.css:322
- `--mha-dock-rail-padding-block` — defined in styles/layout/dock.css:320
- `--mha-dock-rail-padding-inline` — defined in styles/layout/dock.css:321
- `--mha-dock-shadow` — defined in styles/core/tokens.css:40, styles/themes/oneui.css:33, styles/themes/ios.css:39
- `--mha-dock-slot-radius` — defined in styles/core/tokens.css:69
- `--mha-dock-slot-size` — defined in styles/core/tokens.css:68
- `--mha-dock-slot-surface` — defined in styles/core/tokens.css:42, styles/themes/oneui.css:35, styles/themes/oneui.css:68
- `--mha-dock-slot-width` — defined in styles/layout/dock.css:227
- `--mha-dock-surface` — defined in styles/core/tokens.css:41, styles/themes/oneui.css:34, styles/themes/oneui.css:67
- `--mha-dock-surface-semantic` — defined in styles/themes/semantic-tokens.css:179
- `--mha-dock-top` — defined in styles/layout/dock.css:182
- `--mha-dock-unit-size` — defined in styles/layout/widget-grid.css:197
- `--mha-dock-visible-icons` — defined in styles/layout/dock.css:221
- `--mha-dock-width` — defined in styles/layout/dock.css:226
- `--mha-dock-zone-width` — defined in styles/layout/widget-grid.css:198

### highlight (2 defined tokens)
- `--mha-highlight-primary` — defined in styles/themes/semantic-tokens.css:86, styles/themes/semantic-tokens.css:105, styles/themes/semantic-tokens.css:115
- `--mha-highlight-subtle` — defined in styles/themes/semantic-tokens.css:87

### icon (25 defined tokens)
- `--mha-icon-backdrop-filter` — defined in styles/components/icon.css:155, styles/components/icon.css:178, styles/components/icon.css:191
- `--mha-icon-bg` — defined in styles/components/icon.css:40, styles/components/icon.css:147, styles/components/icon.css:161
- `--mha-icon-border` — defined in styles/components/icon.css:42, styles/components/icon.css:150, styles/components/icon.css:163
- `--mha-icon-border-radius` — defined in styles/components/icon.css:38, styles/components/icon.css:56, styles/components/icon.css:61
- `--mha-icon-border-radius-circle` — defined in styles/components/icon.css:24
- `--mha-icon-color` — defined in styles/layout/floating-controls.css:271, styles/components/icon.css:41, styles/components/icon.css:149
- `--mha-icon-glyph-size` — defined in styles/settings/settings-panel.css:1086, styles/layout/dock.css:12, styles/layout/dock.css:232
- `--mha-icon-liquid-glass-blur` — defined in styles/components/icon.css:122
- `--mha-icon-liquid-glass-saturation` — defined in styles/components/icon.css:123
- `--mha-icon-oneui-bg-1` — defined in styles/components/icon.css:125
- `--mha-icon-oneui-bg-2` — defined in styles/components/icon.css:126
- `--mha-icon-oneui-bg-3` — defined in styles/components/icon.css:127
- `--mha-icon-oneui-bg-4` — defined in styles/components/icon.css:128
- `--mha-icon-oneui-bg-5` — defined in styles/components/icon.css:129
- `--mha-icon-oneui-bg-6` — defined in styles/components/icon.css:130
- `--mha-icon-oneui-bg-7` — defined in styles/components/icon.css:131
- `--mha-icon-oneui-bg-8` — defined in styles/components/icon.css:132
- `--mha-icon-radius-rounded-square` — defined in styles/components/icon.css:343
- `--mha-icon-shadow` — defined in styles/components/icon.css:43, styles/components/icon.css:151, styles/components/icon.css:164
- `--mha-icon-size` — defined in styles/settings/settings-panel.css:1085, styles/layout/dock.css:11, styles/layout/dock.css:82
- `--mha-icon-squircle-mask` — defined in styles/components/icon.css:31
- `--mha-icon-symbol-color` — defined in styles/layout/floating-controls.css:279, styles/components/icon-symbol.css:10, styles/components/icon-symbol.css:57
- `--mha-icon-symbol-opacity` — defined in styles/components/icon-symbol.css:11, styles/widgets/simple-button-widget.css:140, styles/widgets/simple-button-widget.css:343
- `--mha-icon-symbol-size` — defined in styles/layout/dock.css:783, styles/layout/mobile-dock.css:366, styles/components/icon-symbol.css:9
- `--mha-icon-symbol-stroke-width` — defined in styles/components/icon-symbol.css:12

### ios (32 defined tokens)
- `--mha-ios-control-active-border` — defined in styles/themes/ios.css:367, styles/themes/ios.css:390, styles/themes/ios.css:427
- `--mha-ios-control-active-surface` — defined in styles/themes/ios.css:366, styles/themes/ios.css:389, styles/themes/ios.css:426
- `--mha-ios-frosted-blur` — defined in styles/themes/ios.css:394
- `--mha-ios-frosted-border` — defined in styles/themes/ios.css:408, styles/themes/ios.css:435
- `--mha-ios-frosted-border-active` — defined in styles/themes/ios.css:409, styles/themes/ios.css:436
- `--mha-ios-frosted-shadow` — defined in styles/themes/ios.css:414, styles/themes/ios.css:441
- `--mha-ios-frosted-surface` — defined in styles/themes/ios.css:405, styles/themes/ios.css:432
- `--mha-ios-frosted-surface-active` — defined in styles/themes/ios.css:406, styles/themes/ios.css:433
- `--mha-ios-frosted-surface-muted` — defined in styles/themes/ios.css:407, styles/themes/ios.css:434
- `--mha-ios-frosted-tile-border` — defined in styles/themes/ios.css:412, styles/themes/ios.css:439
- `--mha-ios-frosted-tile-shadow` — defined in styles/themes/ios.css:413, styles/themes/ios.css:440
- `--mha-ios-frosted-tile-surface` — defined in styles/themes/ios.css:410, styles/themes/ios.css:437
- `--mha-ios-frosted-tile-surface-hover` — defined in styles/themes/ios.css:411, styles/themes/ios.css:438
- `--mha-ios-liquid-blur` — defined in styles/themes/ios.css:339
- `--mha-ios-liquid-border` — defined in styles/themes/ios.css:355, styles/themes/ios.css:377
- `--mha-ios-liquid-border-active` — defined in styles/themes/ios.css:357, styles/themes/ios.css:379
- `--mha-ios-liquid-primary-border` — defined in styles/themes/ios.css:356, styles/themes/ios.css:378
- `--mha-ios-liquid-primary-surface` — defined in styles/themes/ios.css:350, styles/themes/ios.css:372
- `--mha-ios-liquid-shadow` — defined in styles/themes/ios.css:340, styles/themes/ios.css:380
- `--mha-ios-liquid-surface` — defined in styles/themes/ios.css:349, styles/themes/ios.css:371
- `--mha-ios-liquid-surface-active` — defined in styles/themes/ios.css:353, styles/themes/ios.css:375
- `--mha-ios-liquid-surface-muted` — defined in styles/themes/ios.css:354, styles/themes/ios.css:376
- `--mha-ios-slider-fill` — defined in styles/themes/semantic-tokens.css:402, styles/themes/semantic-tokens.css:415, styles/themes/semantic-tokens.css:437
- `--mha-ios-slider-fill-shadow` — defined in styles/themes/semantic-tokens.css:405, styles/themes/semantic-tokens.css:417, styles/themes/ios.css:463
- `--mha-ios-slider-track-blur` — defined in styles/themes/semantic-tokens.css:400, styles/themes/semantic-tokens.css:413
- `--mha-ios-slider-track-border` — defined in styles/themes/semantic-tokens.css:398, styles/themes/semantic-tokens.css:411, styles/themes/semantic-tokens.css:423
- `--mha-ios-slider-track-saturation` — defined in styles/themes/semantic-tokens.css:401, styles/themes/semantic-tokens.css:414
- `--mha-ios-slider-track-surface` — defined in styles/components/slider2.css:148, styles/themes/semantic-tokens.css:399, styles/themes/semantic-tokens.css:412
- `--mha-ios-slider-widget-border` — defined in styles/widgets/slider-widget.css:310
- `--mha-ios-slider-widget-fill` — defined in styles/widgets/slider-widget.css:311, styles/widgets/slider-widget.css:514
- `--mha-ios-slider-widget-radius` — defined in styles/widgets/slider-widget.css:308
- `--mha-ios-slider-widget-surface` — defined in styles/widgets/slider-widget.css:309, styles/widgets/slider-widget.css:513, styles/widgets/slider-widget.css:521

### material (37 defined tokens)
- `--mha-material-button-active-container` — defined in styles/widgets/simple-button-widget.css:638
- `--mha-material-button-active-content` — defined in styles/widgets/simple-button-widget.css:639
- `--mha-material-button-active-icon-container` — defined in styles/widgets/simple-button-widget.css:641
- `--mha-material-button-active-icon-content` — defined in styles/widgets/simple-button-widget.css:642
- `--mha-material-button-active-supporting-content` — defined in styles/widgets/simple-button-widget.css:640
- `--mha-material-button-container` — defined in styles/widgets/simple-button-widget.css:631
- `--mha-material-button-content` — defined in styles/widgets/simple-button-widget.css:632
- `--mha-material-button-icon-container` — defined in styles/widgets/simple-button-widget.css:635
- `--mha-material-button-icon-content` — defined in styles/widgets/simple-button-widget.css:636
- `--mha-material-button-supporting-content` — defined in styles/widgets/simple-button-widget.css:633
- `--mha-material-on-primary` — defined in styles/themes/material.css:29, styles/themes/material.css:81
- `--mha-material-on-primary-container` — defined in styles/themes/material.css:32, styles/themes/material.css:84
- `--mha-material-on-surface` — defined in styles/themes/material.css:46, styles/themes/material.css:98
- `--mha-material-on-surface-variant` — defined in styles/themes/material.css:47, styles/themes/material.css:99
- `--mha-material-outline` — defined in styles/themes/material.css:15
- `--mha-material-outline-variant` — defined in styles/themes/material.css:16
- `--mha-material-primary` — defined in styles/themes/material.css:28, styles/themes/material.css:79
- `--mha-material-primary-container` — defined in styles/themes/material.css:30, styles/themes/material.css:82
- `--mha-material-secondary-container` — defined in styles/themes/material.css:33, styles/themes/material.css:85
- `--mha-material-surface` — defined in styles/themes/material.css:37, styles/themes/material.css:89
- `--mha-material-surface-container` — defined in styles/themes/material.css:40, styles/themes/material.css:92
- `--mha-material-surface-container-high` — defined in styles/themes/material.css:42, styles/themes/material.css:94
- `--mha-material-surface-container-highest` — defined in styles/themes/material.css:44, styles/themes/material.css:96
- `--mha-material-surface-container-low` — defined in styles/themes/material.css:38, styles/themes/material.css:90
- `--mha-material-surface-tint` — defined in styles/themes/material.css:21
- `--mha-material-tertiary-container` — defined in styles/themes/material.css:35, styles/themes/material.css:87
- `--mha-material-tonal-background` — defined in styles/themes/material.css:130, styles/themes/material.css:137
- `--mha-material-tonal-background-soft` — defined in styles/themes/material.css:132, styles/themes/material.css:139
- `--mha-material-you-icon-container` — defined in styles/components/icon.css:142, styles/components/icon.css:195, styles/themes/accent-palettes.css:70
- `--mha-material-you-symbol-1` — defined in styles/components/icon.css:134, styles/themes/accent-palettes.css:70, styles/themes/accent-palettes.css:71
- `--mha-material-you-symbol-2` — defined in styles/components/icon.css:135
- `--mha-material-you-symbol-3` — defined in styles/components/icon.css:136
- `--mha-material-you-symbol-4` — defined in styles/components/icon.css:137
- `--mha-material-you-symbol-5` — defined in styles/components/icon.css:138
- `--mha-material-you-symbol-6` — defined in styles/components/icon.css:139
- `--mha-material-you-symbol-7` — defined in styles/components/icon.css:140
- `--mha-material-you-symbol-8` — defined in styles/components/icon.css:141

### media (4 defined tokens)
- `--mha-media-artwork-bg` — defined in styles/widgets/media-widget.css:13, styles/widgets/media-widget.css:214
- `--mha-media-artwork-radius` — defined in styles/widgets/media-widget.css:12
- `--mha-media-gap` — defined in styles/widgets/media-widget.css:11
- `--mha-media-padding` — defined in styles/widgets/media-widget.css:10

### muted (2 defined tokens)
- `--mha-muted` — defined in styles/core/tokens.css:85, styles/themes/oneui.css:23, styles/themes/oneui.css:60
- `--mha-muted-text` — defined in styles/themes/semantic-tokens.css:76, styles/themes/semantic-tokens.css:142

### on-primary (1 defined tokens)
- `--mha-on-primary-surface` — defined in styles/themes/semantic-tokens.css:68, styles/themes/semantic-tokens.css:134

### on-secondary (1 defined tokens)
- `--mha-on-secondary-surface` — defined in styles/themes/semantic-tokens.css:69, styles/themes/semantic-tokens.css:135

### oneui (3 defined tokens)
- `--mha-oneui-control-active-icon-bubble-shadow` — defined in styles/widgets/simple-button-widget.css:479
- `--mha-oneui-flat-widget-border` — defined in styles/widgets/widget-layout.css:84, styles/widgets/widget-shell.css:748
- `--mha-oneui-panel-surface` — defined in styles/themes/oneui.css:39, styles/themes/oneui.css:72

### other (102 defined tokens)
- `--mha-active-grid-rows` — defined in styles/layout/widget-grid.css:85
- `--mha-active-grid-units` — defined in styles/layout/widget-grid.css:84
- `--mha-bar-height` — defined in styles/core/tokens.css:72
- `--mha-base-surface` — defined in styles/themes/material.css:26, styles/themes/material.css:77
- `--mha-base-surface-alt` — defined in styles/themes/material.css:27, styles/themes/material.css:78
- `--mha-bottom-dock-clearance` — defined in styles/layout/widget-grid.css:199
- `--mha-bottom-dock-height` — defined in styles/layout/widget-grid.css:203
- `--mha-edit-button-bottom` — defined in styles/layout/floating-controls.css:10
- `--mha-edit-button-edge` — defined in styles/layout/floating-controls.css:9
- `--mha-edit-control-bg` — defined in styles/widgets/widget-shell.css:349
- `--mha-edit-control-border` — defined in styles/widgets/widget-shell.css:351
- `--mha-edit-control-color` — defined in styles/widgets/widget-shell.css:350
- `--mha-edit-icon-glyph-size` — defined in styles/layout/floating-controls.css:11, styles/layout/floating-controls.css:96
- `--mha-edit-outline-color` — defined in styles/widgets/widget-shell.css:95
- `--mha-floating-button-size` — defined in styles/layout/floating-controls.css:85, styles/layout/floating-controls.css:92
- `--mha-floating-edge` — defined in styles/core/tokens.css:73
- `--mha-floating-shadow` — defined in styles/core/tokens.css:39, styles/themes/oneui.css:32, styles/themes/material.css:60
- `--mha-floating-top` — defined in styles/core/tokens.css:74
- `--mha-gap-desktop` — defined in styles/core/tokens.css:17
- `--mha-gap-mobile` — defined in styles/core/tokens.css:15
- `--mha-gap-wallpanel` — defined in styles/core/tokens.css:16
- `--mha-ghost-grid-color` — defined in styles/widgets/widget-shell.css:510, styles/widgets/widget-shell.css:514
- `--mha-grid-frame-nudge-x` — defined in styles/layout/widget-grid.css:184
- `--mha-grid-gap` — defined in styles/core/tokens.css:18, styles/core/tokens.css:95, styles/core/tokens.css:96
- `--mha-grid-gap-desktop` — defined in styles/core/tokens.css:14
- `--mha-grid-gap-mobile` — defined in styles/core/tokens.css:12
- `--mha-grid-gap-tablet` — defined in styles/core/tokens.css:13
- `--mha-grid-padding-x` — defined in styles/layout/status-bar.css:206
- `--mha-layer-on-primary-surface` — defined in styles/themes/semantic-tokens.css:187
- `--mha-layer-on-secondary-surface` — defined in styles/themes/semantic-tokens.css:188
- `--mha-layer-primary-border` — defined in styles/themes/semantic-tokens.css:189
- `--mha-layer-primary-surface` — defined in styles/themes/semantic-tokens.css:184
- `--mha-layer-primary-text` — defined in styles/themes/semantic-tokens.css:191
- `--mha-layer-secondary-border` — defined in styles/themes/semantic-tokens.css:190
- `--mha-layer-secondary-surface` — defined in styles/themes/semantic-tokens.css:185
- `--mha-layer-secondary-text` — defined in styles/themes/semantic-tokens.css:192
- `--mha-layer-tertiary-surface` — defined in styles/themes/semantic-tokens.css:186
- `--mha-logical-column-min-width` — defined in styles/core/tokens.css:20
- `--mha-mobile-dock-bottom` — defined in styles/layout/mobile-dock.css:15
- `--mha-mobile-dock-edge` — defined in styles/layout/mobile-dock.css:14
- `--mha-mobile-dock-gap` — defined in styles/layout/mobile-dock.css:18
- `--mha-mobile-dock-launcher-size` — defined in styles/layout/mobile-dock.css:16
- `--mha-mobile-dock-padding` — defined in styles/layout/mobile-dock.css:19
- `--mha-mobile-dock-panel-border` — defined in styles/layout/mobile-dock.css:232, styles/layout/mobile-dock.css:245, styles/layout/mobile-dock.css:252
- `--mha-mobile-dock-panel-shadow` — defined in styles/layout/mobile-dock.css:233, styles/layout/mobile-dock.css:246, styles/layout/mobile-dock.css:253
- `--mha-mobile-dock-panel-surface` — defined in styles/layout/mobile-dock.css:231
- `--mha-mobile-dock-panel-width` — defined in styles/layout/mobile-dock.css:17
- `--mha-mobile-floating-button-icon-size` — defined in styles/layout/floating-controls.css:91
- `--mha-mobile-floating-button-size` — defined in styles/layout/floating-controls.css:90
- `--mha-mobile-grid-gutter` — defined in styles/layout/widget-grid.css:124
- `--mha-motion-duration` — defined in styles/core/tokens.css:70
- `--mha-motion-easing` — defined in styles/core/tokens.css:71
- `--mha-on-accent-surface` — defined in styles/themes/semantic-tokens.css:78, styles/themes/semantic-tokens.css:144
- `--mha-page-background` — defined in styles/themes/semantic-tokens.css:170
- `--mha-page-padding` — defined in styles/core/tokens.css:11, styles/core/tokens.css:95, styles/core/tokens.css:96
- `--mha-page-padding-desktop` — defined in styles/core/tokens.css:9
- `--mha-page-padding-mobile` — defined in styles/core/tokens.css:7
- `--mha-page-padding-tablet` — defined in styles/core/tokens.css:8
- `--mha-page-padding-wallpanel` — defined in styles/core/tokens.css:10
- `--mha-pill-bg` — defined in styles/components/pill.css:8, styles/components/pill.css:28, styles/components/pill.css:34
- `--mha-pill-border` — defined in styles/components/pill.css:10, styles/components/pill.css:30, styles/components/pill.css:36
- `--mha-pill-color` — defined in styles/components/pill.css:9, styles/components/pill.css:29, styles/components/pill.css:35
- `--mha-pill-height` — defined in styles/components/pill.css:6
- `--mha-pill-radius` — defined in styles/components/pill.css:7
- `--mha-preview-accent-soft` — defined in styles/themes/semantic-tokens.css:491
- `--mha-preview-border` — defined in styles/themes/semantic-tokens.css:489
- `--mha-preview-border-hover` — defined in styles/themes/semantic-tokens.css:490
- `--mha-preview-muted` — defined in styles/themes/semantic-tokens.css:493
- `--mha-preview-surface` — defined in styles/themes/semantic-tokens.css:487
- `--mha-preview-surface-hover` — defined in styles/themes/semantic-tokens.css:488
- `--mha-preview-text` — defined in styles/themes/semantic-tokens.css:492
- `--mha-radius-pill` — defined in styles/core/tokens.css:80
- `--mha-radius-widget` — defined in styles/core/tokens.css:78
- `--mha-radius-widget-inner` — defined in styles/core/tokens.css:79
- `--mha-square-unit` — defined in styles/core/tokens.css:81
- `--mha-square-unit-hard-min` — defined in styles/layout/widget-grid.css:86
- `--mha-square-unit-max` — defined in styles/layout/widget-grid.css:87
- `--mha-status-bar-radius` — defined in styles/core/tokens.css:30, styles/themes/oneui.css:12, styles/themes/material.css:12
- `--mha-subtle` — defined in styles/themes/light-text-contract.css:29, styles/themes/light-text-contract.css:43, styles/themes/light-text-contract.css:82
- `--mha-swatch-color` — defined in styles/settings/settings-panel.css:446, styles/settings/settings-panel.css:447, styles/settings/settings-panel.css:448
- `--mha-theme-crossfade-duration` — defined in styles/layout/shell.css:22
- `--mha-theme-crossfade-easing` — defined in styles/layout/shell.css:23
- `--mha-tool-button-size` — defined in styles/widgets/widget-shell.css:221
- `--mha-tool-fade-duration` — defined in styles/widgets/widget-shell.css:223
- `--mha-tool-gap` — defined in styles/widgets/widget-shell.css:222
- `--mha-tool-roll-duration` — defined in styles/widgets/widget-shell.css:224
- `--mha-type-clock-date-size` — defined in styles/widgets/widget-layout.css:43
- `--mha-type-clock-number-size` — defined in styles/widgets/widget-layout.css:44
- `--mha-type-clock-time-size` — defined in styles/widgets/widget-layout.css:42
- `--mha-type-control-label-size` — defined in styles/widgets/widget-layout.css:38
- `--mha-type-control-state-size` — defined in styles/widgets/widget-layout.css:39
- `--mha-type-weather-summary-size` — defined in styles/widgets/widget-layout.css:41
- `--mha-type-weather-temp-size` — defined in styles/widgets/widget-layout.css:40
- `--mha-type-widget-caption-size` — defined in styles/widgets/widget-layout.css:31
- `--mha-type-widget-chip-size` — defined in styles/widgets/widget-layout.css:32
- `--mha-type-widget-display-lg` — defined in styles/widgets/widget-layout.css:36
- `--mha-type-widget-display-md` — defined in styles/widgets/widget-layout.css:35
- `--mha-type-widget-display-sm` — defined in styles/widgets/widget-layout.css:34
- `--mha-type-widget-label-size` — defined in styles/widgets/widget-layout.css:29
- `--mha-type-widget-state-size` — defined in styles/widgets/widget-layout.css:30
- `--mha-type-widget-value-size` — defined in styles/widgets/widget-layout.css:33
- `--mha-typography-weight` — defined in styles/core/tokens.css:62

### panel (7 defined tokens)
- `--mha-panel-background-semantic` — defined in styles/themes/semantic-tokens.css:178
- `--mha-panel-border` — defined in styles/themes/semantic-tokens.css:243
- `--mha-panel-control-surface` — defined in styles/themes/semantic-tokens.css:242
- `--mha-panel-scrim-bg` — defined in styles/themes/semantic-tokens.css:240
- `--mha-panel-section-border` — defined in styles/themes/semantic-tokens.css:244
- `--mha-panel-section-surface` — defined in styles/themes/semantic-tokens.css:241
- `--mha-panel-surface-semantic` — defined in styles/themes/semantic-tokens.css:177

### primary (3 defined tokens)
- `--mha-primary-border` — defined in styles/themes/semantic-tokens.css:70, styles/themes/semantic-tokens.css:136, styles/themes/semantic-tokens.css:337
- `--mha-primary-surface` — defined in styles/themes/semantic-tokens.css:65, styles/themes/semantic-tokens.css:131, styles/themes/semantic-tokens.css:336
- `--mha-primary-text` — defined in styles/themes/semantic-tokens.css:73, styles/themes/semantic-tokens.css:139

### screensaver (1 defined tokens)
- `--mha-screensaver-interface-transition` — defined in styles/layout/shell.css:275

### secondary (3 defined tokens)
- `--mha-secondary-border` — defined in styles/themes/semantic-tokens.css:71, styles/themes/semantic-tokens.css:137
- `--mha-secondary-surface` — defined in styles/themes/semantic-tokens.css:66, styles/themes/semantic-tokens.css:132
- `--mha-secondary-text` — defined in styles/themes/semantic-tokens.css:74, styles/themes/semantic-tokens.css:140

### shadow (3 defined tokens)
- `--mha-shadow-floating` — defined in styles/themes/semantic-tokens.css:84, styles/themes/semantic-tokens.css:157, styles/themes/semantic-tokens.css:339
- `--mha-shadow-panel` — defined in styles/themes/semantic-tokens.css:85, styles/themes/semantic-tokens.css:340
- `--mha-shadow-primary` — defined in styles/themes/semantic-tokens.css:83, styles/themes/semantic-tokens.css:156, styles/themes/semantic-tokens.css:338

### shell (7 defined tokens)
- `--mha-shell-blur` — defined in styles/themes/semantic-tokens.css:267, styles/themes/semantic-tokens.css:274, styles/themes/semantic-tokens.css:281
- `--mha-shell-border` — defined in styles/themes/semantic-tokens.css:265, styles/themes/semantic-tokens.css:291, styles/themes/semantic-tokens.css:345
- `--mha-shell-dock-surface` — defined in styles/themes/semantic-tokens.css:263, styles/themes/semantic-tokens.css:289, styles/themes/semantic-tokens.css:343
- `--mha-shell-panel-surface` — defined in styles/themes/semantic-tokens.css:264, styles/themes/semantic-tokens.css:273, styles/themes/semantic-tokens.css:280
- `--mha-shell-shadow` — defined in styles/themes/semantic-tokens.css:266, styles/themes/semantic-tokens.css:292, styles/themes/semantic-tokens.css:346
- `--mha-shell-status-surface` — defined in styles/themes/semantic-tokens.css:262, styles/themes/semantic-tokens.css:288, styles/themes/semantic-tokens.css:342
- `--mha-shell-surface` — defined in styles/themes/semantic-tokens.css:261, styles/themes/semantic-tokens.css:272, styles/themes/semantic-tokens.css:279

### simple-button (30 defined tokens)
- `--mha-simple-button-active-bg` — defined in styles/widgets/simple-button-widget.css:50, styles/widgets/simple-button-widget.css:207, styles/widgets/simple-button-widget.css:230
- `--mha-simple-button-active-border` — defined in styles/widgets/simple-button-widget.css:58, styles/widgets/simple-button-widget.css:215, styles/widgets/simple-button-widget.css:231
- `--mha-simple-button-active-highlight` — defined in styles/widgets/simple-button-widget.css:62, styles/widgets/simple-button-widget.css:219, styles/widgets/simple-button-widget.css:232
- `--mha-simple-button-active-shadow` — defined in styles/widgets/simple-button-widget.css:66, styles/widgets/simple-button-widget.css:647
- `--mha-simple-button-edge-balance` — defined in styles/widgets/simple-button-widget.css:24
- `--mha-simple-button-gap-x` — defined in styles/widgets/simple-button-widget.css:22
- `--mha-simple-button-gap-y` — defined in styles/widgets/simple-button-widget.css:23
- `--mha-simple-button-glyph-size` — defined in styles/widgets/simple-button-widget.css:28, styles/widgets/simple-button-widget.css:322, styles/widgets/simple-button-widget.css:505
- `--mha-simple-button-icon-bg` — defined in styles/widgets/simple-button-widget.css:30, styles/widgets/simple-button-widget.css:190, styles/widgets/simple-button-widget.css:195
- `--mha-simple-button-icon-border` — defined in styles/widgets/simple-button-widget.css:32, styles/widgets/simple-button-widget.css:448, styles/widgets/simple-button-widget.css:463
- `--mha-simple-button-icon-color` — defined in styles/widgets/simple-button-widget.css:31, styles/widgets/simple-button-widget.css:191, styles/widgets/simple-button-widget.css:196
- `--mha-simple-button-icon-radius` — defined in styles/widgets/simple-button-widget.css:29, styles/widgets/simple-button-widget.css:506
- `--mha-simple-button-icon-shadow` — defined in styles/themes/ios.css:156, styles/themes/ios.css:468, styles/widgets/simple-button-widget.css:33
- `--mha-simple-button-icon-size` — defined in styles/widgets/simple-button-widget.css:27, styles/widgets/simple-button-widget.css:504
- `--mha-simple-button-ios-active-bg` — defined in styles/widgets/simple-button-widget.css:227
- `--mha-simple-button-ios-active-fg` — defined in styles/widgets/simple-button-widget.css:228
- `--mha-simple-button-ios-active-muted` — defined in styles/widgets/simple-button-widget.css:229
- `--mha-simple-button-ios-home-icon-bg` — defined in styles/widgets/simple-button-widget.css:249
- `--mha-simple-button-ios-home-icon-fg` — defined in styles/widgets/simple-button-widget.css:250
- `--mha-simple-button-label-letter-spacing` — defined in styles/widgets/simple-button-widget.css:43
- `--mha-simple-button-label-size` — defined in styles/widgets/simple-button-widget.css:38
- `--mha-simple-button-label-weight` — defined in styles/widgets/simple-button-widget.css:40
- `--mha-simple-button-line-height` — defined in styles/widgets/simple-button-widget.css:42
- `--mha-simple-button-oneui-active-solid-end` — defined in styles/widgets/simple-button-widget.css:408
- `--mha-simple-button-oneui-active-solid-start` — defined in styles/widgets/simple-button-widget.css:404
- `--mha-simple-button-padding` — defined in styles/widgets/simple-button-widget.css:21
- `--mha-simple-button-square-glyph-size` — defined in styles/widgets/simple-button-widget.css:321, styles/widgets/simple-button-widget.css:604
- `--mha-simple-button-state-letter-spacing` — defined in styles/widgets/simple-button-widget.css:44
- `--mha-simple-button-state-size` — defined in styles/widgets/simple-button-widget.css:39
- `--mha-simple-button-state-weight` — defined in styles/widgets/simple-button-widget.css:41

### slider (38 defined tokens)
- `--mha-slider-control-height` — defined in styles/components/slider.css:11, styles/components/slider.css:301, styles/components/slider.css:384
- `--mha-slider-fill-bg` — defined in styles/components/slider.css:14, styles/components/slider.css:108, styles/components/slider.css:606
- `--mha-slider-h` — defined in styles/components/slider.css:10
- `--mha-slider-ios-thumb-height` — defined in styles/components/slider.css:299
- `--mha-slider-ios-thumb-radius` — defined in styles/components/slider.css:265, styles/components/slider.css:300
- `--mha-slider-ios-thumb-size` — defined in styles/components/slider.css:140
- `--mha-slider-ios-thumb-width` — defined in styles/components/slider.css:298
- `--mha-slider-ios-track-height` — defined in styles/components/slider.css:139
- `--mha-slider-ios-track-radius` — defined in styles/components/slider.css:141, styles/components/slider.css:264
- `--mha-slider-material-handle-height` — defined in styles/components/slider.css:632
- `--mha-slider-material-handle-width` — defined in styles/components/slider.css:631
- `--mha-slider-material-stop-bg` — defined in styles/components/slider.css:644, styles/components/slider.css:655
- `--mha-slider-material-stop-size` — defined in styles/components/slider.css:633
- `--mha-slider-material-track-height` — defined in styles/components/slider.css:629
- `--mha-slider-material-track-radius` — defined in styles/components/slider.css:630
- `--mha-slider-oneui-control-height` — defined in styles/components/slider.css:383
- `--mha-slider-oneui-fill-bg` — defined in styles/components/slider.css:390, styles/components/slider.css:589, styles/components/slider.css:594
- `--mha-slider-oneui-radius` — defined in styles/components/slider.css:387
- `--mha-slider-oneui-track-bg` — defined in styles/components/slider.css:389
- `--mha-slider-oneui-track-height` — defined in styles/components/slider.css:385
- `--mha-slider-oneui-track-radius` — defined in styles/components/slider.css:388
- `--mha-slider-oneui-track-width` — defined in styles/components/slider.css:386
- `--mha-slider-thumb-bg` — defined in styles/components/slider.css:15, styles/components/slider.css:101, styles/components/slider.css:109
- `--mha-slider-thumb-shadow` — defined in styles/components/slider.css:152, styles/components/slider.css:235, styles/components/slider.css:249
- `--mha-slider-track-bg` — defined in styles/components/slider.css:13, styles/components/slider.css:100, styles/components/slider.css:107
- `--mha-slider-track-fill` — defined in styles/components/slider.css:149
- `--mha-slider-track-h` — defined in styles/components/slider.css:12
- `--mha-slider-widget-blur` — defined in styles/themes/semantic-tokens.css:382, styles/themes/semantic-tokens.css:396, styles/themes/semantic-tokens.css:447
- `--mha-slider-widget-border` — defined in styles/themes/semantic-tokens.css:377, styles/themes/semantic-tokens.css:456, styles/themes/semantic-tokens.css:538
- `--mha-slider-widget-highlight` — defined in styles/themes/semantic-tokens.css:381, styles/themes/semantic-tokens.css:395, styles/themes/semantic-tokens.css:446
- `--mha-slider-widget-muted` — defined in styles/themes/semantic-tokens.css:380
- `--mha-slider-widget-padding` — defined in styles/widgets/slider-widget.css:15
- `--mha-slider-widget-safe-inset` — defined in styles/widgets/slider-widget.css:206
- `--mha-slider-widget-shadow` — defined in styles/themes/semantic-tokens.css:378, styles/themes/semantic-tokens.css:457, styles/themes/semantic-tokens.css:539
- `--mha-slider-widget-surface` — defined in styles/themes/semantic-tokens.css:374, styles/themes/semantic-tokens.css:387, styles/themes/semantic-tokens.css:443
- `--mha-slider-widget-surface-active` — defined in styles/themes/semantic-tokens.css:376, styles/themes/semantic-tokens.css:389, styles/themes/semantic-tokens.css:445
- `--mha-slider-widget-surface-inactive` — defined in styles/themes/semantic-tokens.css:375, styles/themes/semantic-tokens.css:388, styles/themes/semantic-tokens.css:444
- `--mha-slider-widget-text` — defined in styles/themes/semantic-tokens.css:379

### statusbar (9 defined tokens)
- `--mha-statusbar-height-compact` — defined in styles/layout/status-bar.css:51
- `--mha-statusbar-left-compensation` — defined in styles/layout/status-bar.css:207
- `--mha-statusbar-left-inset` — defined in styles/layout/status-bar.css:210
- `--mha-statusbar-radius` — defined in styles/core/tokens.css:29, styles/themes/oneui.css:11, styles/themes/material.css:11
- `--mha-statusbar-reserved-top` — defined in styles/core/tokens.css:75, styles/layout/widget-grid.css:88, styles/layout/widget-grid.css:123
- `--mha-statusbar-shadow-soft` — defined in styles/layout/status-bar.css:52
- `--mha-statusbar-surface` — defined in styles/core/tokens.css:43, styles/themes/oneui.css:36, styles/themes/oneui.css:69
- `--mha-statusbar-surface-semantic` — defined in styles/themes/semantic-tokens.css:180
- `--mha-statusbar-widget-gap` — defined in styles/layout/widget-grid.css:9

### surface (15 defined tokens)
- `--mha-surface-bg` — defined in styles/core/tokens.css:58, styles/core/tokens.css:105
- `--mha-surface-bg-edit` — defined in styles/core/tokens.css:59, styles/core/tokens.css:106
- `--mha-surface-blur` — defined in styles/core/tokens.css:31, styles/themes/oneui.css:13, styles/themes/material.css:13
- `--mha-surface-blur-semantic` — defined in styles/themes/semantic-tokens.css:194
- `--mha-surface-border` — defined in styles/core/tokens.css:60, styles/core/tokens.css:107
- `--mha-surface-border-edit` — defined in styles/core/tokens.css:61, styles/core/tokens.css:108
- `--mha-surface-floating` — defined in styles/themes/semantic-tokens.css:33, styles/themes/semantic-tokens.css:103, styles/themes/semantic-tokens.css:113
- `--mha-surface-floating-material-opaque` — defined in styles/themes/semantic-tokens.css:220
- `--mha-surface-glass` — defined in styles/themes/semantic-tokens.css:32, styles/themes/semantic-tokens.css:102, styles/themes/semantic-tokens.css:112
- `--mha-surface-panel` — defined in styles/themes/semantic-tokens.css:34, styles/themes/semantic-tokens.css:114, styles/themes/semantic-tokens.css:154
- `--mha-surface-primary` — defined in styles/themes/semantic-tokens.css:29, styles/themes/semantic-tokens.css:149
- `--mha-surface-saturation` — defined in styles/core/tokens.css:32, styles/themes/oneui.css:14, styles/themes/material.css:14
- `--mha-surface-secondary` — defined in styles/themes/semantic-tokens.css:30, styles/themes/semantic-tokens.css:150
- `--mha-surface-tertiary` — defined in styles/themes/semantic-tokens.css:31, styles/themes/semantic-tokens.css:151
- `--mha-surface-tonal` — defined in styles/themes/semantic-tokens.css:35, styles/themes/semantic-tokens.css:155

### system (16 defined tokens)
- `--mha-system-button-backdrop-filter` — defined in styles/layout/floating-controls.css:109, styles/layout/floating-controls.css:126, styles/layout/floating-controls.css:162
- `--mha-system-button-bg` — defined in styles/layout/floating-controls.css:105, styles/layout/floating-controls.css:118, styles/layout/floating-controls.css:133
- `--mha-system-button-bg-hover` — defined in styles/system/system-buttons.css:10, styles/system/system-buttons.css:66, styles/system/system-buttons.css:77
- `--mha-system-button-bg-semantic` — defined in styles/themes/semantic-tokens.css:181
- `--mha-system-button-border` — defined in styles/layout/floating-controls.css:106, styles/layout/floating-controls.css:121, styles/layout/floating-controls.css:136
- `--mha-system-button-border-hover` — defined in styles/system/system-buttons.css:69, styles/system/system-buttons.css:80
- `--mha-system-button-color` — defined in styles/layout/floating-controls.css:107, styles/system/system-buttons.css:11, styles/system/system-buttons.css:67
- `--mha-system-button-highlight` — defined in styles/layout/floating-controls.css:111, styles/layout/floating-controls.css:128, styles/layout/floating-controls.css:163
- `--mha-system-button-highlight-opacity` — defined in styles/layout/floating-controls.css:112, styles/layout/floating-controls.css:129, styles/layout/floating-controls.css:140
- `--mha-system-button-icon-size` — defined in styles/system/system-buttons.css:8, styles/system/system-buttons.css:57, styles/system/system-buttons.css:86
- `--mha-system-button-shadow` — defined in styles/layout/floating-controls.css:108, styles/layout/floating-controls.css:123, styles/layout/floating-controls.css:137
- `--mha-system-button-size` — defined in styles/system/system-buttons.css:7, styles/system/system-buttons.css:56
- `--mha-system-icon-bg` — defined in styles/themes/accent-palettes.css:21, styles/themes/accent-palettes.css:112, styles/themes/accent-palettes.css:127
- `--mha-system-icon-border` — defined in styles/themes/accent-palettes.css:23, styles/themes/accent-palettes.css:115, styles/themes/accent-palettes.css:133
- `--mha-system-icon-color` — defined in styles/themes/accent-palettes.css:22, styles/themes/accent-palettes.css:114, styles/themes/accent-palettes.css:132
- `--mha-system-icon-shadow` — defined in styles/themes/accent-palettes.css:24, styles/themes/accent-palettes.css:116, styles/themes/accent-palettes.css:134

### tertiary (3 defined tokens)
- `--mha-tertiary-border` — defined in styles/themes/semantic-tokens.css:72, styles/themes/semantic-tokens.css:138
- `--mha-tertiary-surface` — defined in styles/themes/semantic-tokens.css:67, styles/themes/semantic-tokens.css:133
- `--mha-tertiary-text` — defined in styles/themes/semantic-tokens.css:75, styles/themes/semantic-tokens.css:141

### text (8 defined tokens)
- `--mha-text` — defined in styles/core/tokens.css:84, styles/themes/oneui.css:22, styles/themes/oneui.css:59
- `--mha-text-disabled` — defined in styles/themes/light-text-contract.css:23, styles/themes/light-text-contract.css:37, styles/themes/light-text-contract.css:52
- `--mha-text-inverse` — defined in styles/themes/light-text-contract.css:24, styles/themes/light-text-contract.css:38, styles/themes/semantic-tokens.css:49
- `--mha-text-muted` — defined in styles/themes/light-text-contract.css:30, styles/themes/light-text-contract.css:44, styles/themes/light-text-contract.css:83
- `--mha-text-primary` — defined in styles/themes/light-text-contract.css:20, styles/themes/light-text-contract.css:34, styles/themes/light-text-contract.css:49
- `--mha-text-secondary` — defined in styles/themes/light-text-contract.css:21, styles/themes/light-text-contract.css:35, styles/themes/light-text-contract.css:50
- `--mha-text-soft` — defined in styles/themes/light-text-contract.css:27, styles/themes/light-text-contract.css:41, styles/themes/light-text-contract.css:80
- `--mha-text-tertiary` — defined in styles/themes/light-text-contract.css:22, styles/themes/light-text-contract.css:36, styles/themes/light-text-contract.css:51

### toggle (35 defined tokens)
- `--mha-toggle-buttons-button-active-bg` — defined in styles/widgets/toggle-buttons-widget.css:25, styles/widgets/toggle-buttons-widget.css:114, styles/widgets/toggle-buttons-widget.css:124
- `--mha-toggle-buttons-button-active-color` — defined in styles/widgets/toggle-buttons-widget.css:26, styles/widgets/toggle-buttons-widget.css:115, styles/widgets/toggle-buttons-widget.css:125
- `--mha-toggle-buttons-button-bg` — defined in styles/widgets/toggle-buttons-widget.css:24, styles/widgets/toggle-buttons-widget.css:112, styles/widgets/toggle-buttons-widget.css:122
- `--mha-toggle-buttons-button-border` — defined in styles/widgets/toggle-buttons-widget.css:22, styles/widgets/toggle-buttons-widget.css:113, styles/widgets/toggle-buttons-widget.css:123
- `--mha-toggle-buttons-button-radius` — defined in styles/widgets/toggle-buttons-widget.css:21
- `--mha-toggle-buttons-button-shadow` — defined in styles/widgets/toggle-buttons-widget.css:23, styles/widgets/toggle-buttons-widget.css:133
- `--mha-toggle-buttons-gap` — defined in styles/widgets/toggle-buttons-widget.css:19, styles/widgets/toggle-buttons-widget.css:148
- `--mha-toggle-buttons-row-gap` — defined in styles/widgets/toggle-buttons-widget.css:20
- `--mha-toggle-h` — defined in styles/components/toggle.css:10
- `--mha-toggle-on-bg` — defined in styles/components/toggle.css:19
- `--mha-toggle-on-border` — defined in styles/components/toggle.css:20
- `--mha-toggle-padding` — defined in styles/components/toggle.css:11
- `--mha-toggle-slider-gap` — defined in styles/widgets/toggle-slider-widget.css:21
- `--mha-toggle-thumb-bg` — defined in styles/components/toggle.css:16
- `--mha-toggle-thumb-off-bg` — defined in styles/components/toggle.css:17, styles/components/toggle.css:23
- `--mha-toggle-thumb-on-bg` — defined in styles/components/toggle.css:18, styles/components/toggle.css:24
- `--mha-toggle-track-bg` — defined in styles/components/toggle.css:14
- `--mha-toggle-track-border` — defined in styles/components/toggle.css:15
- `--mha-toggle-w` — defined in styles/components/toggle.css:9
- `--mha-toggle-widget-edge-balance` — defined in styles/widgets/toggle-widget.css:20
- `--mha-toggle-widget-gap-x` — defined in styles/widgets/toggle-widget.css:19
- `--mha-toggle-widget-glyph-size` — defined in styles/widgets/toggle-buttons-widget.css:7, styles/widgets/toggle-slider-widget.css:9, styles/widgets/toggle-widget.css:23
- `--mha-toggle-widget-icon-bg` — defined in styles/widgets/toggle-buttons-widget.css:9, styles/widgets/toggle-buttons-widget.css:108, styles/widgets/toggle-buttons-widget.css:119
- `--mha-toggle-widget-icon-border` — defined in styles/widgets/toggle-buttons-widget.css:11, styles/widgets/toggle-buttons-widget.css:110, styles/widgets/toggle-slider-widget.css:13
- `--mha-toggle-widget-icon-color` — defined in styles/widgets/toggle-buttons-widget.css:10, styles/widgets/toggle-buttons-widget.css:109, styles/widgets/toggle-buttons-widget.css:120
- `--mha-toggle-widget-icon-radius` — defined in styles/widgets/toggle-buttons-widget.css:8, styles/widgets/toggle-slider-widget.css:10, styles/widgets/toggle-widget.css:24
- `--mha-toggle-widget-icon-shadow` — defined in styles/themes/ios.css:151, styles/themes/ios.css:467, styles/widgets/toggle-buttons-widget.css:12
- `--mha-toggle-widget-icon-size` — defined in styles/widgets/toggle-buttons-widget.css:6, styles/widgets/toggle-slider-widget.css:8, styles/widgets/toggle-widget.css:22
- `--mha-toggle-widget-label-size` — defined in styles/widgets/toggle-buttons-widget.css:13, styles/widgets/toggle-slider-widget.css:15, styles/widgets/toggle-widget.css:30
- `--mha-toggle-widget-label-weight` — defined in styles/widgets/toggle-buttons-widget.css:15, styles/widgets/toggle-slider-widget.css:17, styles/widgets/toggle-widget.css:32
- `--mha-toggle-widget-line-height` — defined in styles/widgets/toggle-buttons-widget.css:17, styles/widgets/toggle-slider-widget.css:19, styles/widgets/toggle-widget.css:34
- `--mha-toggle-widget-padding` — defined in styles/widgets/toggle-widget.css:18
- `--mha-toggle-widget-stack-gap` — defined in styles/widgets/toggle-buttons-widget.css:18, styles/widgets/toggle-slider-widget.css:20, styles/widgets/toggle-widget.css:35
- `--mha-toggle-widget-state-size` — defined in styles/widgets/toggle-buttons-widget.css:14, styles/widgets/toggle-slider-widget.css:16, styles/widgets/toggle-widget.css:31
- `--mha-toggle-widget-state-weight` — defined in styles/widgets/toggle-buttons-widget.css:16, styles/widgets/toggle-slider-widget.css:18, styles/widgets/toggle-widget.css:33

### weather (29 defined tokens)
- `--mha-weather-bg-end` — defined in styles/widgets/weather-widget.css:15, styles/widgets/weather-widget.css:34, styles/widgets/weather-widget.css:302
- `--mha-weather-bg-glow` — defined in styles/widgets/weather-widget.css:16, styles/widgets/weather-widget.css:35, styles/widgets/weather-widget.css:303
- `--mha-weather-bg-start` — defined in styles/widgets/weather-widget.css:14, styles/widgets/weather-widget.css:33, styles/widgets/weather-widget.css:301
- `--mha-weather-bolt` — defined in styles/widgets/weather-widget.css:403
- `--mha-weather-chip-bg` — defined in styles/widgets/weather-widget.css:19, styles/widgets/weather-widget.css:36, styles/widgets/weather-widget.css:306
- `--mha-weather-chip-border` — defined in styles/widgets/weather-widget.css:20, styles/widgets/weather-widget.css:37, styles/widgets/weather-widget.css:307
- `--mha-weather-chip-size` — defined in styles/widgets/weather-widget.css:24
- `--mha-weather-cloud` — defined in styles/widgets/weather-widget.css:399, styles/widgets/weather-widget.css:410
- `--mha-weather-cloud-shade` — defined in styles/widgets/weather-widget.css:400, styles/widgets/weather-widget.css:411
- `--mha-weather-corner-safe-offset-y` — defined in styles/widgets/weather-widget.css:756
- `--mha-weather-fog` — defined in styles/widgets/weather-widget.css:404, styles/widgets/weather-widget.css:413
- `--mha-weather-icon-size` — defined in styles/widgets/weather-widget.css:21, styles/widgets/weather-widget.css:115, styles/widgets/weather-widget.css:168
- `--mha-weather-moon` — defined in styles/widgets/weather-widget.css:398
- `--mha-weather-muted` — defined in styles/widgets/weather-widget.css:18, styles/widgets/weather-widget.css:305, styles/widgets/weather-widget.css:349
- `--mha-weather-rain` — defined in styles/widgets/weather-widget.css:401, styles/widgets/weather-widget.css:412
- `--mha-weather-snow` — defined in styles/widgets/weather-widget.css:402
- `--mha-weather-sun` — defined in styles/widgets/weather-widget.css:396, styles/widgets/weather-widget.css:408
- `--mha-weather-sun-core` — defined in styles/widgets/weather-widget.css:397, styles/widgets/weather-widget.css:409
- `--mha-weather-temp-compact-size` — defined in styles/widgets/weather-widget.css:23
- `--mha-weather-temp-size` — defined in styles/widgets/weather-widget.css:22, styles/widgets/weather-widget.css:119, styles/widgets/weather-widget.css:172
- `--mha-weather-text` — defined in styles/widgets/weather-widget.css:17, styles/widgets/weather-widget.css:304, styles/widgets/weather-widget.css:348
- `--mha-weather-widget-border` — defined in styles/themes/semantic-tokens.css:596
- `--mha-weather-widget-chip` — defined in styles/themes/semantic-tokens.css:597, styles/themes/semantic-tokens.css:605, styles/themes/semantic-tokens.css:611
- `--mha-weather-widget-chip-border` — defined in styles/themes/semantic-tokens.css:598, styles/themes/semantic-tokens.css:606, styles/themes/semantic-tokens.css:612
- `--mha-weather-widget-muted` — defined in styles/themes/semantic-tokens.css:594
- `--mha-weather-widget-sky` — defined in styles/themes/semantic-tokens.css:599
- `--mha-weather-widget-sun` — defined in styles/themes/semantic-tokens.css:600
- `--mha-weather-widget-temp` — defined in styles/themes/semantic-tokens.css:595, styles/themes/semantic-tokens.css:626
- `--mha-weather-widget-text` — defined in styles/themes/semantic-tokens.css:593

### widget (31 defined tokens)
- `--mha-widget-area-padding-x` — defined in styles/layout/status-bar.css:205
- `--mha-widget-area-top-gutter` — defined in styles/layout/widget-grid.css:59
- `--mha-widget-bg` — defined in styles/core/tokens.css:82, styles/core/tokens.css:103
- `--mha-widget-bg-edit` — defined in styles/core/tokens.css:83, styles/core/tokens.css:104
- `--mha-widget-border` — defined in styles/core/tokens.css:35, styles/themes/oneui.css:26, styles/themes/oneui.css:63
- `--mha-widget-border-edit` — defined in styles/core/tokens.css:36, styles/themes/oneui.css:27, styles/themes/oneui.css:64
- `--mha-widget-border-semantic` — defined in styles/themes/semantic-tokens.css:173
- `--mha-widget-compact-inner-radius` — defined in styles/core/tokens.css:24, styles/themes/oneui.css:6, styles/themes/material.css:6
- `--mha-widget-compact-radius` — defined in styles/core/tokens.css:23, styles/themes/oneui.css:5, styles/themes/material.css:5
- `--mha-widget-content-gap` — defined in styles/widgets/widget-layout.css:13
- `--mha-widget-content-inset` — defined in styles/widgets/widget-layout.css:11, styles/widgets/widget-layout.css:49
- `--mha-widget-control-surface` — defined in styles/themes/semantic-tokens.css:315, styles/themes/semantic-tokens.css:323, styles/themes/semantic-tokens.css:352
- `--mha-widget-gap` — defined in styles/core/tokens.css:19
- `--mha-widget-inner-highlight` — defined in styles/core/tokens.css:37, styles/themes/oneui.css:17, styles/themes/oneui.css:28
- `--mha-widget-inner-padding` — defined in styles/widgets/widget-layout.css:12, styles/widgets/widget-layout.css:50
- `--mha-widget-inner-radius` — defined in styles/core/tokens.css:22, styles/themes/oneui.css:4, styles/themes/material.css:4
- `--mha-widget-manager-live-preview-block-size` — defined in styles/widget-manager/widget-manager.css:165
- `--mha-widget-manager-live-preview-inline-size` — defined in styles/widget-manager/widget-manager.css:164
- `--mha-widget-manager-preview-block-size` — defined in styles/widget-manager/widget-manager.css:162, styles/widget-manager/widget-manager.css:663
- `--mha-widget-manager-preview-inline-size` — defined in styles/widget-manager/widget-manager.css:163
- `--mha-widget-pill-inner-radius` — defined in styles/core/tokens.css:26, styles/themes/oneui.css:8, styles/themes/material.css:8
- `--mha-widget-pill-radius` — defined in styles/core/tokens.css:25, styles/themes/oneui.css:7, styles/themes/material.css:7
- `--mha-widget-radius` — defined in styles/core/tokens.css:21, styles/themes/oneui.css:3, styles/themes/material.css:3
- `--mha-widget-reflection` — defined in styles/themes/ios.css:16, styles/themes/ios.css:175, styles/themes/ios.css:185
- `--mha-widget-reflection-opacity` — defined in styles/themes/ios.css:15, styles/themes/ios.css:174, styles/themes/ios.css:184
- `--mha-widget-reflection-semantic` — defined in styles/themes/semantic-tokens.css:195
- `--mha-widget-shadow` — defined in styles/core/tokens.css:38, styles/themes/oneui.css:29, styles/themes/oneui.css:66
- `--mha-widget-shadow-semantic` — defined in styles/themes/semantic-tokens.css:174
- `--mha-widget-surface` — defined in styles/core/tokens.css:33, styles/themes/oneui.css:24, styles/themes/oneui.css:61
- `--mha-widget-surface-edit` — defined in styles/core/tokens.css:34, styles/themes/oneui.css:25, styles/themes/oneui.css:62
- `--mha-widget-surface-semantic` — defined in styles/themes/semantic-tokens.css:172

### widget-shell (6 defined tokens)
- `--mha-widget-shell-border` — defined in styles/themes/oneui.css:15, styles/themes/semantic-tokens.css:312, styles/themes/ios.css:397
- `--mha-widget-shell-border-edit` — defined in styles/themes/oneui.css:16, styles/themes/semantic-tokens.css:317, styles/themes/ios.css:398
- `--mha-widget-shell-highlight` — defined in styles/themes/semantic-tokens.css:314, styles/themes/semantic-tokens.css:324, styles/themes/semantic-tokens.css:329
- `--mha-widget-shell-shadow` — defined in styles/themes/semantic-tokens.css:313, styles/themes/semantic-tokens.css:362, styles/widgets/widget-layout.css:88
- `--mha-widget-shell-surface` — defined in styles/themes/semantic-tokens.css:311, styles/themes/semantic-tokens.css:322, styles/themes/semantic-tokens.css:351
- `--mha-widget-shell-surface-edit` — defined in styles/themes/semantic-tokens.css:316, styles/themes/ios.css:253, styles/themes/ios.css:282

