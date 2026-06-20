# Global Surface Contract Proposal

This document proposes a global MHA surface system.

It is a proposal only. It does not apply CSS changes by itself.

The goal is to make future themes work like:

```text
1 theme = theme JS + manifest + theme tokens/CSS
```

without requiring every theme to patch MHA component selectors.

## Design goals

1. Components consume stable MHA roles.
2. Themes provide visual values for those roles.
3. Surface, border, blur, shadow, saturation and highlight are separate material ingredients.
4. Component-specific tokens act as adapters, not as independent design systems.
5. Existing legacy tokens can remain temporarily as aliases during migration.
6. Theme packs should not need to target `.mha-widget`, `.mha-dock`, `.mha-status-bar`, `.mha-settings-sheet`, etc. for basic material styling.

## Proposed layer model

MHA should use a layered role model:

```text
canvas
  ↓
primary surface
  ↓
on-primary surface
  ↓
secondary surface
  ↓
on-secondary surface
  ↓
control surface
  ↓
accent surface
```

Separate special-purpose roles exist for shell, panels and popups.

## Proposed global surface roles

### `--mha-surface-canvas`

Page/background base surface.

Expected consumers:

- app background fallback
- non-wallpaper page base
- empty state background

### `--mha-surface-primary`

Primary app surface.

Expected consumers:

- default widget shell
- primary cards
- major persistent surfaces when no shell-specific role is needed

### `--mha-surface-on-primary`

Nested surface placed on top of a primary surface.

Expected consumers:

- settings sections
- widget internal cards
- preview containers
- grouped config sections
- page creator content tiles when used as nested content

### `--mha-surface-secondary`

Tile-like or item-like surface.

Expected consumers:

- widget manager tiles
- selectable items
- section tiles
- reset-style buttons when they behave like tiles

### `--mha-surface-on-secondary`

Nested surface placed on secondary surfaces.

Expected consumers:

- controls inside tiles
- badges/chips inside tiles
- nested metadata bubbles

### `--mha-surface-control`

Interactive control surface.

Expected consumers:

- inputs
- selects
- non-accent buttons
- sliders/tracks where not accent-filled
- toggles in inactive states

### `--mha-surface-accent`

Accent/action surface.

Expected consumers:

- active toggles
- primary action buttons
- active page indicators
- selected controls

### `--mha-surface-panel`

Large panel/sheet surface.

Expected consumers:

- settings sheet
- widget manager sheet
- side sheets
- admin/settings panels

### `--mha-surface-popup`

Modal/popup surface.

Expected consumers:

- widget config popup
- page creator popup/sheet
- confirmation dialogs
- modal overlays

### `--mha-surface-shell`

Persistent app shell/chrome surface.

Expected consumers:

- dock
- status bar
- bottom navigation
- now bar shell
- persistent shell rails

## Proposed global border roles

Surface roles should not imply border colors. Borders are separate.

```css
--mha-border-primary
--mha-border-on-primary
--mha-border-secondary
--mha-border-on-secondary
--mha-border-control
--mha-border-accent
--mha-border-panel
--mha-border-popup
--mha-border-shell
--mha-border-subtle
--mha-border-focus
```

## Proposed global shadow roles

```css
--mha-shadow-primary
--mha-shadow-secondary
--mha-shadow-control
--mha-shadow-panel
--mha-shadow-popup
--mha-shadow-shell
--mha-shadow-none
```

Guideline:

- shell shadows should be subtle and persistent;
- panel/popup shadows can be stronger;
- controls should generally not own large shadows;
- theme variants may set shadows to `none`.

## Proposed global blur/filter roles

```css
--mha-blur-primary
--mha-blur-panel
--mha-blur-popup
--mha-blur-shell
--mha-blur-control

--mha-saturation-primary
--mha-saturation-panel
--mha-saturation-popup
--mha-saturation-shell
--mha-saturation-control

--mha-brightness-primary
--mha-brightness-panel
--mha-brightness-popup
--mha-brightness-shell
```

Guideline:

Blur, saturation and brightness should be separate tokens. This allows one theme to share a surface color but change blur behavior per role.

Example:

```css
.mha-dock {
  backdrop-filter:
    blur(var(--mha-blur-shell))
    saturate(var(--mha-saturation-shell))
    brightness(var(--mha-brightness-shell));
}
```

## Proposed global highlight/reflection roles

```css
--mha-highlight-primary
--mha-highlight-on-primary
--mha-highlight-secondary
--mha-highlight-panel
--mha-highlight-popup
--mha-highlight-shell
--mha-highlight-control

--mha-highlight-opacity-primary
--mha-highlight-opacity-panel
--mha-highlight-opacity-shell
```

Guideline:

Glass effects often need a surface background and an independent reflection/highlight layer. They should not be baked into every component selector.

## Proposed component adapter roles

Components should not always consume global roles directly. They should usually consume adapter tokens that default to global roles.

This gives themes and modes one narrow place to remap a component family.

### Widget shell adapters

```css
--mha-widget-shell-surface: var(--mha-surface-primary);
--mha-widget-shell-border: var(--mha-border-primary);
--mha-widget-shell-shadow: var(--mha-shadow-primary);
--mha-widget-shell-blur: var(--mha-blur-primary);
--mha-widget-shell-saturation: var(--mha-saturation-primary);
--mha-widget-shell-highlight: var(--mha-highlight-primary);
--mha-widget-shell-highlight-opacity: var(--mha-highlight-opacity-primary);
```

State adapters:

```css
--mha-widget-shell-surface-edit
--mha-widget-shell-border-edit
--mha-widget-shell-shadow-edit
```

### Shell/chrome adapters

```css
--mha-shell-surface: var(--mha-surface-shell);
--mha-shell-border: var(--mha-border-shell);
--mha-shell-shadow: var(--mha-shadow-shell);
--mha-shell-blur: var(--mha-blur-shell);
--mha-shell-saturation: var(--mha-saturation-shell);
--mha-shell-highlight: var(--mha-highlight-shell);
```

Specific shell consumers:

```css
--mha-shell-dock-surface: var(--mha-shell-surface);
--mha-shell-status-surface: var(--mha-shell-surface);
--mha-shell-nowbar-surface: var(--mha-shell-surface);
```

### Panel adapters

```css
--mha-panel-surface: var(--mha-surface-panel);
--mha-panel-border: var(--mha-border-panel);
--mha-panel-shadow: var(--mha-shadow-panel);
--mha-panel-blur: var(--mha-blur-panel);
--mha-panel-saturation: var(--mha-saturation-panel);
--mha-panel-highlight: var(--mha-highlight-panel);
```

Nested panel content:

```css
--mha-panel-section-surface: var(--mha-surface-on-primary);
--mha-panel-section-border: var(--mha-border-on-primary);
--mha-panel-control-surface: var(--mha-surface-control);
--mha-panel-control-border: var(--mha-border-control);
```

### Popup adapters

```css
--mha-popup-surface: var(--mha-surface-popup);
--mha-popup-border: var(--mha-border-popup);
--mha-popup-shadow: var(--mha-shadow-popup);
--mha-popup-blur: var(--mha-blur-popup);
--mha-popup-saturation: var(--mha-saturation-popup);
--mha-popup-highlight: var(--mha-highlight-popup);
```

### Tile adapters

```css
--mha-tile-surface: var(--mha-surface-secondary);
--mha-tile-surface-hover: var(--mha-surface-on-secondary);
--mha-tile-border: var(--mha-border-secondary);
--mha-tile-shadow: var(--mha-shadow-secondary);
--mha-tile-highlight: var(--mha-highlight-secondary);
```

### Control adapters

```css
--mha-control-surface: var(--mha-surface-control);
--mha-control-border: var(--mha-border-control);
--mha-control-shadow: var(--mha-shadow-control);
--mha-control-blur: var(--mha-blur-control);
--mha-control-saturation: var(--mha-saturation-control);
```

Accent controls:

```css
--mha-control-accent-surface: var(--mha-surface-accent);
--mha-control-accent-border: var(--mha-border-accent);
```

## Proposed theme mapping model

A theme should define raw theme values, then map them to MHA global roles.

Example for iOS Liquid:

```css
:host([data-theme-style="ios"][data-ios-glass="liquid"]) {
  /* Raw theme material values */
  --mha-ios-liquid-shell-surface: linear-gradient(...);
  --mha-ios-liquid-shell-border: rgba(...);
  --mha-ios-liquid-shell-blur: 6px;
  --mha-ios-liquid-shell-saturation: 190%;

  --mha-ios-liquid-section-surface: rgba(...);
  --mha-ios-liquid-tile-surface: rgba(...);
  --mha-ios-liquid-control-surface: rgba(...);

  /* Global contract mapping */
  --mha-surface-shell: var(--mha-ios-liquid-shell-surface);
  --mha-border-shell: var(--mha-ios-liquid-shell-border);
  --mha-blur-shell: var(--mha-ios-liquid-shell-blur);
  --mha-saturation-shell: var(--mha-ios-liquid-shell-saturation);

  --mha-surface-primary: var(--mha-ios-liquid-shell-surface);
  --mha-surface-on-primary: var(--mha-ios-liquid-section-surface);
  --mha-surface-secondary: var(--mha-ios-liquid-tile-surface);
  --mha-surface-control: var(--mha-ios-liquid-control-surface);
}
```

Then a mode-specific adapter can say:

```css
:host([data-theme-style="ios"][data-ios-glass="liquid"]) {
  --mha-widget-shell-surface: var(--mha-surface-shell);
}

:host([data-theme-style="ios"][data-ios-glass="frosted"]) {
  --mha-widget-shell-surface: var(--mha-surface-on-primary);
}
```

The widget component remains unchanged.

## Proposed component consumption map

### Widgets

Use:

- `--mha-widget-shell-surface`
- `--mha-widget-shell-border`
- `--mha-widget-shell-shadow`
- `--mha-widget-shell-blur`
- `--mha-widget-shell-saturation`
- `--mha-widget-shell-highlight`

### Dock

Use:

- `--mha-shell-dock-surface`
- `--mha-shell-border`
- `--mha-shell-shadow`
- `--mha-shell-blur`
- `--mha-shell-saturation`
- `--mha-shell-highlight`

### Status bar

Use:

- `--mha-shell-status-surface`
- `--mha-shell-border`
- `--mha-shell-shadow`
- `--mha-shell-blur`
- `--mha-shell-saturation`
- `--mha-shell-highlight`

### Settings sheet

Use:

- `--mha-panel-surface`
- `--mha-panel-border`
- `--mha-panel-shadow`
- `--mha-panel-blur`
- `--mha-panel-saturation`

### Settings sections

Use:

- `--mha-panel-section-surface`
- `--mha-panel-section-border`

### Widget Manager sheet

Use:

- `--mha-panel-surface`
- `--mha-panel-border`
- `--mha-panel-shadow`
- `--mha-panel-blur`
- `--mha-panel-saturation`

### Widget Manager tiles

Use:

- `--mha-tile-surface`
- `--mha-tile-surface-hover`
- `--mha-tile-border`
- `--mha-tile-shadow`

### Widget Manager preview box

Use one of these depending on final design decision:

Option A — preview box is nested panel content:

- `--mha-panel-section-surface`
- `--mha-panel-section-border`

Option B — preview box represents the widget material:

- `--mha-widget-shell-surface`
- `--mha-widget-shell-border`

This decision should be made visually before migration.

### Widget Config popup

Use:

- `--mha-popup-surface`
- `--mha-popup-border`
- `--mha-popup-shadow`
- `--mha-popup-blur`
- `--mha-popup-saturation`

### Widget Config groups

Use:

- `--mha-panel-section-surface` or `--mha-popup-section-surface`
- `--mha-panel-section-border` or `--mha-popup-section-border`

If popup-specific sections are needed later, add:

```css
--mha-popup-section-surface: var(--mha-surface-on-primary);
--mha-popup-section-border: var(--mha-border-on-primary);
```

### Widget Config controls

Use:

- `--mha-control-surface`
- `--mha-control-border`
- `--mha-control-shadow`

### Page Creator sheet

Use:

- `--mha-popup-surface` if treated as modal/popup;
- `--mha-panel-surface` if treated as side/bottom sheet.

Current DOM role says popup, so the first migration should use popup tokens.

### Page Creator icon tiles

Use:

- `--mha-tile-surface`
- `--mha-tile-border`
- `--mha-tile-surface-hover`

## Proposed migration phases

### Phase 1 — Documentation and audit

- Document current consumers.
- Document token architecture.
- Document proposed global contract.

No CSS changes.

### Phase 2 — Non-destructive global aliases

Add new global tokens to `semantic-tokens.css` while mapping them to existing tokens.

Example:

```css
:host,
:root {
  --mha-surface-canvas: var(--mha-bg-primary);
  --mha-surface-on-primary: var(--mha-on-primary-surface, var(--mha-surface-secondary));
  --mha-surface-control: var(--mha-control-surface, var(--mha-surface-tertiary));
  --mha-surface-shell: var(--mha-shell-surface, var(--mha-surface-glass));
  --mha-surface-popup: var(--mha-surface-panel);
}
```

The goal is zero visual change.

### Phase 3 — iOS raw material extraction

Pick current reference surfaces and extract their material values into iOS raw tokens.

For each material level, extract:

- surface background
- border
- shadow
- blur
- saturation
- highlight

No component migration yet.

### Phase 4 — iOS global role mapping

Map iOS Liquid/Frosted raw tokens to the global contract.

Still avoid component selector changes where possible.

### Phase 5 — Component-family migration

Migrate consumers one family at a time:

1. widgets
2. dock
3. status bar
4. settings sheet
5. settings sections
6. widget manager sheet
7. widget manager tiles
8. widget manager preview box
9. widget config popup
10. widget config groups/controls
11. page creator sheet/tiles

### Phase 6 — Remove conflicting overrides

Remove hardcoded theme-specific component overrides only after each family visually matches expectations.

### Phase 7 — Theme package readiness

After iOS is migrated, verify that a future theme can provide values without touching core component selectors.

## Open design decisions

### Should panel and popup be separate?

Recommended: yes.

Reason:

- panels/sheets are structural UI;
- popups/modals are transient, focused UI;
- they may need different blur, shadow and elevation.

### Should shell and primary be separate?

Recommended: yes.

Reason:

- shell includes dock/status/nowbar chrome;
- primary includes ordinary top-level surfaces such as widgets/cards;
- some themes may want them identical, but the contract should not force that.

### Should widget shell use primary or shell?

Recommended default:

```css
--mha-widget-shell-surface: var(--mha-surface-primary);
```

Theme variants can override the adapter:

```css
/* Liquid */
--mha-widget-shell-surface: var(--mha-surface-shell);

/* Frosted */
--mha-widget-shell-surface: var(--mha-surface-on-primary);
```

### Should preview boxes represent real widgets or nested preview containers?

Undecided.

Two valid options:

1. Preview box uses section surface and contains a live widget preview.
2. Preview box uses widget surface to show a material sample.

This should be decided visually.

## Non-goals

This proposal does not attempt to:

- redesign iOS Liquid or Frosted visually;
- change layout or geometry;
- remove all legacy tokens immediately;
- force OneUI/Material into the same visual behavior;
- eliminate component adapter tokens.

## Success criteria

The contract is successful when:

1. A component can be styled by role without knowing the active theme.
2. A theme can provide role values without patching component selectors.
3. iOS Liquid and Frosted can differ through token mappings, not random overrides.
4. OneUI and Material can keep their personalities using the same global vocabulary.
5. Future theme packs can be added with minimal core changes.
