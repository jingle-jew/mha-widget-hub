# Theme tokens

MHA themes should use a shared token contract. Components consume these tokens so themes can change the visual language without rewriting widget CSS.

## Surface tokens

### `--mha-primary-surface`

Main container surface.

Used for:

- widgets;
- dock;
- status bar;
- major panels.

### `--mha-on-primary-surface`

Surface layered on top of the primary surface.

Used for:

- internal tiles;
- cards inside widgets;
- secondary blocks inside panels.

### `--mha-secondary-surface`

Form and control surface.

Used for:

- inputs;
- selects;
- inactive controls;
- configuration fields.

### `--mha-on-secondary-surface`

Surface or border layered on top of secondary surfaces.

Used for:

- form borders;
- subtle separators;
- secondary control states.

### `--mha-accent-surface`

Accent surface.

Used for:

- active toggles;
- selected segments;
- highlighted controls;
- accent UI elements.

### `--mha-overlay-surface`

Overlay surface.

Used for:

- popups;
- modals;
- scrim-backed panels;
- floating sheets.

## Text tokens

### `--mha-primary-text`

Primary text color.

Used for:

- widget titles;
- main values;
- high-emphasis labels.

### `--mha-secondary-text`

Secondary text color.

Used for:

- descriptions;
- metadata;
- muted labels;
- helper text.

## Practical mapping

```text
Primary Surface
  widgets
  dock
  status bar
  panels

On Primary Surface
  internal widget tiles
  nested cards

Secondary Surface
  inputs
  selects
  controls

Accent Surface
  active toggles
  selected chips
  highlighted controls

Overlay Surface
  popups
  modals
  sheets
```

## Guidelines

Use tokens by role, not by color.

Good:

```css
background: var(--mha-primary-surface);
color: var(--mha-primary-text);
```

Avoid:

```css
background: rgba(255, 255, 255, 0.12);
color: white;
```

A theme should decide colors. A component should decide structure.
