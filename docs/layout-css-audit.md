# Layout CSS Audit

## Scope

This cleanup covers the ownership and cascade of:

- `.mha-shell`
- `.mha-workspace`
- `.mha-widget-area`
- `.mha-grid`
- `.mha-status-bar`
- `.mha-dock`
- `.mha-mobile-dock`
- `.mha-edit-button`
- `.mha-main-edit-button`

It must not change runtime grid calculations, widget sizing, drag/drop, drop
slots, mobile scrolling, settings behavior, or theme values.

## Baseline

The current layout is functionally stable. Its effective grid model begins in
the `CLEAN SHELL MATRIX RESET` section of `styles/layout/shell.css`.

The main maintenance risks are:

- legacy shell and grid declarations remain before the effective matrix model;
- `.mha-grid` overflow changes from `auto` to `hidden`, `clip`, then `visible`;
- mobile scrolling is ultimately owned by `.mha-widget-area`;
- status bar constraints are split between `shell.css` and `status-bar.css`;
- edit button rules are spread across several shape, surface, and cascade fixes;
- the mobile dock launcher is defined as a shell, then as icon-only, then as a
  widget-surface floating button.

Approximate `!important` counts before cleanup:

| File | Count |
| --- | ---: |
| `styles/layout/shell.css` | 100 |
| `styles/layout/mobile-dock.css` | 30 |
| `styles/layout/dock.css` | 4 |
| `styles/layout/status-bar.css` | 0 |
| `styles/widgets/widget-layout.css` | 0 |
| `styles/widgets/empty-widget.css` | 19 |
| `styles/settings/settings-panel.css` | 43 |

## Target Ownership

- `shell.css`: host viewport, shell structure, global transitions and state.
- `widget-grid.css`: workspace, widget area, grid matrix, mobile grid scrolling.
- `status-bar.css`: status bar layout, sizing, clipping, and responsive rules.
- `dock.css`: tablet and desktop dock.
- `mobile-dock.css`: mobile dock panel and behavior.
- `floating-controls.css`: main edit button and mobile floating launcher visuals.

## Cleanup Phases

1. Record this audit and baseline.
2. Extract the effective widget/grid model without changing declarations.
3. Extract floating control rules without changing declarations.
4. Remove only legacy declarations proven to be overridden.
5. Validate all layouts, themes, and interaction states.

## Required Validation

- desktop;
- tablet portrait and landscape;
- mobile portrait with 4 runtime units;
- mobile landscape with 8 runtime units;
- status bar alignment and clipping;
- tablet/desktop dock alignment;
- widget-area gaps and square matrix sizing;
- mobile vertical scrolling;
- edit mode;
- desktop/tablet movement;
- drop slots;
- settings panel and scrim;
- screensaver and responsive relayout;
- OneUI, iOS, and Material You in light and dark modes.
