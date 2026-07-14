# Theme Tokens

This document is the practical entry point for MHA Widget Hub theme authors.

MHA now uses a surface contract architecture:

```text
Theme raw values
  -> semantic surface roles
  -> component adapter roles
  -> concrete components
```

In plain words:

- Themes define what materials look like.
- Components consume roles.
- Components should not usually know whether the current theme is iOS, OneUI, Material, GNOME, NothingOS, etc.

## Current source of truth

Use these docs together:

| Document | Purpose |
|---|---|
| `docs/surface-token-reference.md` | Full token reference table with descriptions and guidance. |
| `docs/theme-template.css` | Copyable theme template for new themes. |
| `docs/surface-token-architecture.md` | Conceptual explanation of raw tokens, semantic tokens and adapter roles. |
| `docs/global-surface-token-contract.md` | Original contract proposal and design principles. |
| `docs/surface-migration-guardrails.md` | Safety rules used during the migration. |
| `docs/surface-consumer-audit.md` | Historical audit of consumers before/during migration. |

## Runtime loading order

The important cascade is:

```text
core tokens
component primitives
registered theme CSS
semantic-tokens.css
surface-contract aliases
iOS raw/surface maps
layout/component CSS
component contract CSS
widget CSS
widget internal contract CSS
```

That means a theme should usually feed values into semantic/contract roles and let the loaded component contracts distribute those values.

## Preferred authoring workflow

When building or adjusting a theme:

1. Define the theme identity and raw material values in the theme CSS.
2. Map those values into surface roles.
3. Map surface roles into component adapters only when needed.
4. Avoid component selectors unless the component is intentionally expressive.
5. Validate visually in light/dark and across all supported theme variants.

## Common requests and where to patch

### Change a component family globally

Example request:

> Make all popups use the same surface as panels.

Patch the popup adapter:

```css
:host([data-theme-style="example"]) {
  --mha-popup-surface: var(--mha-panel-surface);
  --mha-popup-border: var(--mha-panel-border);
  --mha-popup-shadow: var(--mha-panel-shadow);
}
```

### Change one theme only

Example request:

> In iOS Frosted, make Widget Manager previews use the Settings section surface.

Patch only that theme/context:

```css
:host([data-theme-style="ios"][data-ios-glass="frosted"]) {
  --mha-preview-surface: var(--mha-panel-section-surface);
  --mha-preview-border: var(--mha-panel-section-border);
}
```

### Change a shell relationship

Example request:

> Make the Dock use the same material as the Status Bar.

Patch the shell adapter:

```css
:host([data-theme-style="example"]) {
  --mha-shell-dock-surface: var(--mha-shell-status-surface);
}
```

## Stable role families

For the full table, see `docs/surface-token-reference.md`.

The most important families are:

| Family | Examples | Use for |
|---|---|---|
| Canvas | `--mha-surface-canvas`, `--mha-canvas-background` | App background and wallpaper-adjacent layers. |
| Core surfaces | `--mha-surface-primary`, `--mha-surface-on-primary`, `--mha-surface-secondary` | Generic card/tile layers. |
| Specialized surfaces | `--mha-surface-panel`, `--mha-surface-popup`, `--mha-surface-control`, `--mha-surface-scrim` | Panels, popups, controls, overlays. |
| Borders | `--mha-border-primary`, `--mha-border-panel`, `--mha-border-control` | Surface separation. |
| Text | `--mha-text-primary`, `--mha-text-secondary`, `--mha-text-muted` | Foreground hierarchy. |
| Effects | `--mha-shadow-panel`, `--mha-blur-panel`, `--mha-filter-panel` | Elevation and glass behavior. |
| Widget adapters | `--mha-widget-shell-surface`, `--mha-widget-control-surface` | Widget shell and internals. |
| Shell adapters | `--mha-shell-dock-surface`, `--mha-shell-status-surface` | Dock, Status Bar, mobile dock and chrome. |
| Panel/popup adapters | `--mha-panel-surface`, `--mha-popup-surface` | Settings, Widget Manager, Config Popup. |
| Tiles/previews | `--mha-tile-surface`, `--mha-preview-surface` | Settings rows, Widget Manager rows, internal tiles. |
| Controls | `--mha-control-surface`, `--mha-control-accent-surface` | Buttons, selects, inputs, active controls. |

## Legacy compatibility

Legacy tokens still exist and should remain valid while migration continues.

Examples:

```css
--mha-widget-surface
--mha-widget-border
--mha-widget-shadow
--mha-control-surface
--mha-panel-background
```

Do not remove them casually. Instead, keep mapping them toward the newer contract roles until all consumers are migrated.

## Expressive exceptions

Some widgets may intentionally keep theme-specific or component-specific styling.

Current accepted examples:

| Component | Status | Reason |
|---|---|---|
| WeatherWidget | Expressive exception | Weather is visually illustrative and may own its own background recipe. |
| ClockWidget | Mostly semantic already | Clock styling already uses dedicated semantic clock tokens. |
| iOS Liquid/Frosted refinements | Theme-specific polish | Material behavior is part of the iOS theme identity. |

Exceptions should be documented and rare.

## Adding a new theme

Start from:

```text
docs/theme-template.css
```

Then:

1. Copy it to `styles/themes/<theme-id>.css`.
2. Register the theme in `src/settings/theme-registry.js`.
3. Run:

```bash
npm run check:syntax
npm test
npm run check:package
```

4. Validate visuals manually.

Do not edit `custom_components/mha_widget_hub/frontend/`: it is an ignored build
artifact generated from the canonical root sources when needed.
