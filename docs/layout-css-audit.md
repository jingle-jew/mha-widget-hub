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

## Cleanup Result

The five cleanup phases were completed without changing JavaScript layout
logic, runtime grid calculations, class names, theme values, or widget sizing.

- `shell.css` now owns host sizing, transitions, and global visibility states.
- `widget-grid.css` owns the effective shell matrix, workspace, widget area,
  runtime grid mapping, and mobile scrolling contract.
- `floating-controls.css` owns the main edit button and mobile launcher visuals.
- `status-bar.css` owns status bar containment and reserved-space tokens.
- historical declarations overridden by the effective matrix were removed.

Final approximate `!important` counts:

| File | Count |
| --- | ---: |
| `styles/layout/shell.css` | 12 |
| `styles/layout/widget-grid.css` | 29 |
| `styles/layout/floating-controls.css` | 31 |
| `styles/layout/mobile-dock.css` | 14 |
| `styles/layout/dock.css` | 4 |
| `styles/layout/status-bar.css` | 7 |
| `styles/widgets/widget-layout.css` | 0 |
| `styles/widgets/empty-widget.css` | 19 |
| `styles/settings/settings-panel.css` | 43 |

Static validation completed:

- `git diff --check`;
- `node --check mha-widget-hub.js`;
- extracted stylesheets are present in `render()` in dependency order;
- local HTTP responses are successful for the extracted stylesheets;
- the edit button DOM retains both `mha-edit-button` and
  `mha-main-edit-button`.

Browser validation completed before the final consolidation confirmed desktop
and mobile portrait grid behavior after extraction. The in-app browser became
unresponsive during final computed-style validation, and no separate headless
browser is installed. The remaining manual matrix above should therefore be
run before merging, especially mobile landscape, settings, edit movement, and
theme combinations.
