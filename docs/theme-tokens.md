# Theme Tokens

## Purpose

Theme tokens provide a stable visual contract between widgets and themes.

Widgets consume tokens.

Themes provide values.

---

## Core Surface Tokens

### Primary Surface

Main widget surface.

Examples:

- widgets
- dock
- status bar
- panels

```css
--mha-primary-surface
```

---

### On Primary Surface

Elements displayed inside primary surfaces.

Examples:

- cards
- tiles
- grouped controls

```css
--mha-on-primary-surface
```

---

### Secondary Surface

Inputs and supporting controls.

Examples:

- select boxes
- text inputs
- secondary controls

```css
--mha-secondary-surface
```

---

### Accent Surface

Interactive emphasis.

Examples:

- toggles
- selected segments
- active states

```css
--mha-accent-surface
```

---

### Overlay Surface

Temporary UI.

Examples:

- dialogs
- popups
- overlays

```css
--mha-overlay-surface
```

---

## Text Tokens

```css
--mha-primary-text
--mha-secondary-text
```

Use these instead of hardcoded text colors.

---

## Border Tokens

Themes may provide border tokens to ensure consistent separation across widgets, panels and dialogs.

---

## Blur And Material Tokens

Themes may define:

- blur intensity;
- material opacity;
- tint levels;
- shadow depth.

Widgets should not assume specific blur values.

---

## Rules

### Widgets Should

- consume tokens;
- inherit theme styling;
- remain theme agnostic.

### Widgets Should Not

- hardcode theme colors;
- hardcode blur values;
- override theme identity.

---

## Long-Term Goal

A new theme should be able to restyle the entire launcher without modifying widget code.
