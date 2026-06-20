# Global Surface Token Contract

This document freezes the proposed global MHA surface/effect token list before implementation.

The contract is intentionally richer than what regular users will see. The goal is to give theme developers enough control to build distinct visual systems without forcing components to know about individual themes.

Regular users should still experience a simple UI:

```text
Theme
Appearance
Accent color
Wallpaper
```

Theme developers get the deeper contract.

## Design principles

1. MHA Core defines the token vocabulary.
2. Themes provide values for the vocabulary.
3. Components consume roles, not theme-specific selectors.
4. Surfaces, borders, shadows, blur, saturation, brightness and highlights are separate ingredients.
5. Background extraction must remain separate from surface styling.
6. OneUI must remain visually stable during migration.
7. Advanced tokens are allowed, but should not make user-facing settings more complex.

## Token tiers

The contract has four tiers:

```text
Tier 1 — Canvas/background tokens
Tier 2 — Global surface/effect roles
Tier 3 — Component adapter roles
Tier 4 — Theme raw material tokens
```

### Tier 1 — Canvas/background tokens

Canvas/background tokens describe what is behind the interface.

They must remain compatible with automatic accent/background color extraction.

### Tier 2 — Global surface/effect roles

Global roles describe what a surface is for.

Examples:

```css
--mha-surface-primary
--mha-surface-panel
--mha-border-shell
--mha-blur-popup
```

### Tier 3 — Component adapter roles

Component adapters connect global roles to specific component families.

Examples:

```css
--mha-widget-shell-surface
--mha-shell-dock-surface
--mha-panel-section-surface
```

### Tier 4 — Theme raw material tokens

Theme raw tokens describe concrete material recipes.

Examples:

```css
--mha-ios-liquid-shell-surface
--mha-ios-frosted-section-surface
--mha-oneui-card-surface
```

Components should not consume Tier 4 tokens directly.

## Tier 1 — Canvas/background contract

These tokens are for page/background ownership and accent extraction.

```css
--mha-surface-canvas
--mha-canvas-background
--mha-canvas-background-image
--mha-canvas-background-overlay
--mha-canvas-background-tint
--mha-canvas-background-vibrance
--mha-canvas-background-noise
```

Compatibility aliases should continue to support existing background tokens:

```css
--mha-bg-primary
--mha-page-background
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

## Tier 2 — Global surface roles

### Core surface roles

```css
--mha-surface-primary
--mha-surface-on-primary
--mha-surface-secondary
--mha-surface-on-secondary
--mha-surface-tertiary
--mha-surface-on-tertiary
```

Meaning:

- `primary`: main top-level surfaces.
- `on-primary`: nested surface on primary.
- `secondary`: tile/item surface.
- `on-secondary`: nested content on tile/item.
- `tertiary`: deeper utility surface.
- `on-tertiary`: nested content on tertiary.

### Specialized surface roles

```css
--mha-surface-shell
--mha-surface-panel
--mha-surface-popup
--mha-surface-control
--mha-surface-control-hover
--mha-surface-control-active
--mha-surface-control-disabled
--mha-surface-accent
--mha-surface-danger
--mha-surface-warning
--mha-surface-success
--mha-surface-info
```

Meaning:

- `shell`: persistent app chrome, such as dock/status/nowbar.
- `panel`: large structural sheets/panels.
- `popup`: modal or focused popup surfaces.
- `control`: inputs, selects, inactive buttons, sliders/tracks.
- `control-hover`: hover/focus elevation for controls.
- `control-active`: active/selected controls.
- `control-disabled`: disabled controls.
- `accent`: primary action/accent material.
- status surfaces provide semantic action colors for future UI.

### Optional advanced depth roles

These are useful for theme developers but should not be required for normal components.

```css
--mha-surface-elevated
--mha-surface-sunken
--mha-surface-overlay
--mha-surface-scrim
--mha-surface-tooltip
--mha-surface-toast
--mha-surface-selection
--mha-surface-focus-ring
```

Meaning:

- `elevated`: raised surface above current layer.
- `sunken`: recessed surface, useful for sliders or wells.
- `overlay`: transparent overlay above content.
- `scrim`: blocking dim layer.
- `tooltip`: small transient hint surface.
- `toast`: notification/snackbar surface.
- `selection`: selected-item backing layer.
- `focus-ring`: focus-visible material/color.

## Tier 2 — Global border roles

### Core border roles

```css
--mha-border-primary
--mha-border-on-primary
--mha-border-secondary
--mha-border-on-secondary
--mha-border-tertiary
--mha-border-on-tertiary
```

### Specialized border roles

```css
--mha-border-shell
--mha-border-panel
--mha-border-popup
--mha-border-control
--mha-border-control-hover
--mha-border-control-active
--mha-border-control-disabled
--mha-border-accent
--mha-border-danger
--mha-border-warning
--mha-border-success
--mha-border-info
--mha-border-subtle
--mha-border-strong
--mha-border-focus
```

## Tier 2 — Global shadow roles

```css
--mha-shadow-primary
--mha-shadow-secondary
--mha-shadow-tertiary
--mha-shadow-shell
--mha-shadow-panel
--mha-shadow-popup
--mha-shadow-control
--mha-shadow-control-hover
--mha-shadow-control-active
--mha-shadow-floating
--mha-shadow-elevated
--mha-shadow-sunken
--mha-shadow-none
```

Guideline:

- Shadows describe elevation.
- A theme may set several roles to `none`.
- iOS/OneUI can use soft shadows.
- Material can use low/tonal shadows.

## Tier 2 — Global blur/filter roles

### Blur

```css
--mha-blur-primary
--mha-blur-secondary
--mha-blur-shell
--mha-blur-panel
--mha-blur-popup
--mha-blur-control
--mha-blur-overlay
```

### Saturation

```css
--mha-saturation-primary
--mha-saturation-secondary
--mha-saturation-shell
--mha-saturation-panel
--mha-saturation-popup
--mha-saturation-control
--mha-saturation-overlay
```

### Brightness

```css
--mha-brightness-primary
--mha-brightness-secondary
--mha-brightness-shell
--mha-brightness-panel
--mha-brightness-popup
--mha-brightness-control
--mha-brightness-overlay
```

### Optional filter bundles

Filter bundles are convenience tokens. They should be derived from blur/saturation/brightness tokens.

```css
--mha-filter-primary
--mha-filter-shell
--mha-filter-panel
--mha-filter-popup
--mha-filter-control
--mha-filter-overlay
```

Example:

```css
--mha-filter-shell:
  blur(var(--mha-blur-shell))
  saturate(var(--mha-saturation-shell))
  brightness(var(--mha-brightness-shell));
```

## Tier 2 — Global highlight/reflection roles

```css
--mha-highlight-primary
--mha-highlight-secondary
--mha-highlight-tertiary
--mha-highlight-shell
--mha-highlight-panel
--mha-highlight-popup
--mha-highlight-control
--mha-highlight-overlay

--mha-highlight-opacity-primary
--mha-highlight-opacity-secondary
--mha-highlight-opacity-shell
--mha-highlight-opacity-panel
--mha-highlight-opacity-popup
--mha-highlight-opacity-control
```

Guideline:

- Background/surface and highlight should stay separate.
- Themes can set highlight to `none` or opacity to `0`.
- Glass themes may use pseudo-elements to consume highlights.

## Tier 2 — Text roles

The surface contract should align with text roles, but text should remain a separate system.

```css
--mha-text-primary
--mha-text-secondary
--mha-text-tertiary
--mha-text-muted
--mha-text-disabled
--mha-text-inverse
--mha-text-accent
--mha-text-danger
--mha-text-warning
--mha-text-success
--mha-text-info
```

## Tier 2 — Radius roles

Radius should be part of the global design contract because themes differ strongly here.

```css
--mha-radius-xs
--mha-radius-sm
--mha-radius-md
--mha-radius-lg
--mha-radius-xl
--mha-radius-2xl
--mha-radius-pill
--mha-radius-circle

--mha-radius-widget
--mha-radius-widget-inner
--mha-radius-panel
--mha-radius-popup
--mha-radius-control
--mha-radius-shell
--mha-radius-tile
```

Existing radius tokens can map to these during migration.

## Tier 2 — Motion roles

Motion is not a surface, but themes often need motion personality.

```css
--mha-motion-duration-fast
--mha-motion-duration-normal
--mha-motion-duration-slow
--mha-motion-easing-standard
--mha-motion-easing-emphasized
--mha-motion-easing-spring
```

Existing motion tokens can remain aliases.

## Tier 3 — Component adapter roles

Adapters let components consume stable names while global roles remain flexible.

### Widget shell adapters

```css
--mha-widget-shell-surface
--mha-widget-shell-border
--mha-widget-shell-shadow
--mha-widget-shell-blur
--mha-widget-shell-saturation
--mha-widget-shell-brightness
--mha-widget-shell-filter
--mha-widget-shell-highlight
--mha-widget-shell-highlight-opacity

--mha-widget-shell-surface-edit
--mha-widget-shell-border-edit
--mha-widget-shell-shadow-edit
```

### Widget internal adapters

```css
--mha-widget-section-surface
--mha-widget-section-border
--mha-widget-section-shadow
--mha-widget-control-surface
--mha-widget-control-border
--mha-widget-control-active-surface
--mha-widget-control-active-border
```

### Shell/chrome adapters

```css
--mha-shell-surface
--mha-shell-border
--mha-shell-shadow
--mha-shell-blur
--mha-shell-saturation
--mha-shell-brightness
--mha-shell-filter
--mha-shell-highlight
--mha-shell-highlight-opacity

--mha-shell-dock-surface
--mha-shell-status-surface
--mha-shell-nowbar-surface
--mha-shell-mobile-dock-surface
```

### Panel adapters

```css
--mha-panel-surface
--mha-panel-border
--mha-panel-shadow
--mha-panel-blur
--mha-panel-saturation
--mha-panel-brightness
--mha-panel-filter
--mha-panel-highlight
--mha-panel-highlight-opacity

--mha-panel-section-surface
--mha-panel-section-border
--mha-panel-section-shadow
--mha-panel-control-surface
--mha-panel-control-border
```

### Popup adapters

```css
--mha-popup-surface
--mha-popup-border
--mha-popup-shadow
--mha-popup-blur
--mha-popup-saturation
--mha-popup-brightness
--mha-popup-filter
--mha-popup-highlight
--mha-popup-highlight-opacity

--mha-popup-section-surface
--mha-popup-section-border
--mha-popup-control-surface
--mha-popup-control-border
```

### Tile adapters

```css
--mha-tile-surface
--mha-tile-surface-hover
--mha-tile-surface-active
--mha-tile-surface-selected
--mha-tile-border
--mha-tile-border-hover
--mha-tile-border-active
--mha-tile-shadow
--mha-tile-highlight
--mha-tile-highlight-opacity
```

### Control adapters

```css
--mha-control-surface
--mha-control-surface-hover
--mha-control-surface-active
--mha-control-surface-disabled
--mha-control-border
--mha-control-border-hover
--mha-control-border-active
--mha-control-border-disabled
--mha-control-shadow
--mha-control-shadow-hover
--mha-control-shadow-active
--mha-control-blur
--mha-control-saturation
--mha-control-brightness
--mha-control-filter

--mha-control-accent-surface
--mha-control-accent-border
--mha-control-accent-shadow
```

### Scrim/backdrop adapters

```css
--mha-scrim-surface
--mha-scrim-opacity
--mha-backdrop-blur
--mha-backdrop-saturation
--mha-backdrop-brightness
--mha-backdrop-filter
```

These are specifically for blurring/dimming the page when panels/popups are open.

## Tier 4 — Theme raw material naming convention

Theme raw tokens should use a theme namespace and material role.

Recommended pattern:

```css
--mha-theme-<theme-id>-<material-role>-<property>
```

For built-in themes, shorter aliases are acceptable:

```css
--mha-ios-liquid-shell-surface
--mha-ios-liquid-shell-border
--mha-ios-liquid-shell-shadow
--mha-ios-liquid-shell-blur
--mha-ios-liquid-shell-saturation
--mha-ios-liquid-shell-highlight

--mha-ios-frosted-section-surface
--mha-ios-frosted-tile-surface
--mha-ios-frosted-control-surface

--mha-oneui-shell-surface
--mha-oneui-panel-surface
--mha-oneui-tile-surface

--mha-material-surface-container
--mha-material-surface-container-high
```

## Recommended minimal implementation set for Phase 2

Phase 2 should not introduce every advanced token at once in CSS.

For the first non-destructive implementation, add only this stable set:

### Global surfaces

```css
--mha-surface-canvas
--mha-surface-primary
--mha-surface-on-primary
--mha-surface-secondary
--mha-surface-on-secondary
--mha-surface-tertiary
--mha-surface-control
--mha-surface-accent
--mha-surface-panel
--mha-surface-popup
--mha-surface-shell
--mha-surface-scrim
```

### Borders

```css
--mha-border-on-primary
--mha-border-on-secondary
--mha-border-control
--mha-border-panel
--mha-border-popup
--mha-border-shell
--mha-border-strong
```

### Shadows

```css
--mha-shadow-secondary
--mha-shadow-control
--mha-shadow-popup
--mha-shadow-shell
--mha-shadow-none
```

### Filters

```css
--mha-blur-shell
--mha-blur-panel
--mha-blur-popup
--mha-blur-control
--mha-blur-overlay

--mha-saturation-primary
--mha-saturation-shell
--mha-saturation-panel
--mha-saturation-popup
--mha-saturation-control
--mha-saturation-overlay

--mha-brightness-primary
--mha-brightness-shell
--mha-brightness-panel
--mha-brightness-popup
--mha-brightness-control
--mha-brightness-overlay
```

### Highlights

```css
--mha-highlight-shell
--mha-highlight-panel
--mha-highlight-popup
--mha-highlight-control
--mha-highlight-opacity-primary
--mha-highlight-opacity-shell
--mha-highlight-opacity-panel
--mha-highlight-opacity-popup
--mha-highlight-opacity-control
```

### Adapter additions

```css
--mha-widget-shell-blur
--mha-widget-shell-saturation
--mha-widget-shell-brightness
--mha-widget-shell-filter
--mha-widget-shell-highlight-opacity

--mha-shell-saturation
--mha-shell-brightness
--mha-shell-filter
--mha-shell-highlight-opacity

--mha-panel-filter
--mha-popup-filter

--mha-tile-surface
--mha-tile-surface-hover
--mha-tile-surface-active
--mha-tile-border
--mha-tile-shadow

--mha-scrim-surface
--mha-backdrop-filter
```

## User-facing simplicity rule

Advanced token richness must not become user-facing complexity.

Users should choose:

- theme;
- appearance light/dark;
- accent color or automatic accent;
- wallpaper/background;
- maybe density or glass variant if intentionally exposed.

Developers/theme authors can use the expanded token contract.

## Success criteria

This token list is successful if:

1. OneUI can remain visually unchanged during migration.
2. Background extraction remains functional.
3. iOS Liquid/Frosted can be mapped cleanly without random component overrides.
4. Future themes can style MHA without component selector patches.
5. Components can migrate gradually through adapter tokens.
6. Extra dev flexibility does not leak into the regular user UI.
