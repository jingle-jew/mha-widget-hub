# Surface Reference Mapping

This document maps the future MHA surface contract roles to existing visual references in the current implementation.

The purpose is to identify the current source-of-truth surfaces before creating global aliases or migrating components.

This document intentionally does not define token values.

It identifies visual references only.

## Status

Draft.

Expected workflow:

1. Review references.
2. Adjust references if needed.
3. Validate the mapping.
4. Begin Phase 2 (non-destructive aliases).

---

# Canvas

## Purpose

Everything behind the UI.

## Reference

Current wallpaper/background system.

Includes:

- wallpaper image
- OneUI dynamic background
- Material background
- iOS background
- automatic accent extraction source

## Future role

```css
--mha-surface-canvas
```

---

# Shell

## Purpose

Persistent application chrome.

Visible even when widgets/pages change.

## Reference

Primary reference:

```text
Dock
```

Secondary validation:

```text
Status Bar
NowBar
```

## Future roles

```css
--mha-surface-shell
--mha-border-shell
--mha-shadow-shell
--mha-blur-shell
```

---

# Primary

## Purpose

Main content surface.

## Reference

Primary reference:

```text
Widget Surface
```

Examples:

- Weather widget
- Media widget
- Sensor widget
- Clock widget

## Future roles

```css
--mha-surface-primary
--mha-border-primary
--mha-shadow-primary
```

---

# On-Primary

## Purpose

Surface nested inside a primary surface.

## Reference

Primary reference:

```text
Settings Section
```

Validation examples:

```text
Nested widget sections
Preview containers
Grouped content blocks
```

## Future roles

```css
--mha-surface-on-primary
--mha-border-on-primary
```

---

# Secondary

## Purpose

Interactive tile/item surface.

## Reference

Primary reference:

```text
Widget Manager Tile
```

Validation examples:

```text
Page Creator Tile
Reset Grid Button
Selectable tiles
```

## Future roles

```css
--mha-surface-secondary
--mha-border-secondary
```

---

# On-Secondary

## Purpose

Nested surface inside a secondary surface.

## Reference

Current status:

```text
Should be the theme accent color.
```

Candidate references:

```text
Badges
Mini information chips
Nested metadata surfaces
```

## Future roles

```css
--mha-surface-on-secondary
--mha-border-on-secondary
```

---

# System Window

## Purpose

System-level MHA windows.

In MHA, panels and popups are part of the same conceptual family: system windows, similar in spirit to macOS system windows/sheets/dialogs.

They should usually share the same base material language, while keeping separate roles for elevation, size, modality and behavior.

## Reference

Primary reference:

```text
Settings Panel
```

Validation examples:

```text
Widget Manager Sheet
Widget Config Popup
Page Creator
Admin Panel
Dialogs
Future modal flows
```

## Future base roles

```css
--mha-system-window-surface
--mha-system-window-border
--mha-system-window-shadow
--mha-system-window-blur
```

These base roles may be added later if the implementation needs an explicit common parent for panel and popup tokens.

---

# Panel

## Purpose

Large structural system window.

Panels are persistent or semi-persistent system windows used for settings, management and admin flows.

## Reference

Primary reference:

```text
Settings Panel
```

Validation examples:

```text
Widget Manager Sheet
Admin Panel
```

## Future roles

```css
--mha-surface-panel
--mha-border-panel
--mha-shadow-panel
--mha-blur-panel
```

## Relationship to popup

Panel and popup should share the same system-window material family.

The separate panel role exists so MHA can tune large sheets differently from smaller focused modal windows if needed.

---

# Popup

## Purpose

Focused modal system window.

Popups belong to the same system-window family as panels, but are usually smaller, more focused and more modal.

## Reference

Primary reference:

```text
Settings Panel system-window material
```

Validation examples:

```text
Widget Config Popup
Page Creator
Dialogs
Future modal flows
```

## Future roles

```css
--mha-surface-popup
--mha-border-popup
--mha-shadow-popup
--mha-blur-popup
```

## Relationship to panel

Popup should inherit the same base material language as panel.

The separate popup role exists for differences in elevation, shadow, blur strength, scale or modality, not because popups should look like a completely unrelated theme layer.

---

# Control

## Purpose

Interactive controls.

## Reference

Primary reference:

```text
Settings Select/Input. 
```

Validation examples:

```text
Slider track
Toggle OFF state
Secondary buttons
Dropdowns
```

## Future roles

```css
--mha-surface-control
--mha-border-control
```

---

# Accent

## Purpose

Active or selected state.

## Reference

Primary reference:

```text
Current Accent Active State
```

Validation examples:

```text
Toggle ON
Selected segment
Primary action
Selected item
"Confirm/OK" buttons
```

## Future roles

```css
--mha-surface-accent
--mha-border-accent
```

---

# Scrim / Backdrop

## Purpose

Separate page content from a panel or popup.

## Reference

Primary reference:

```text
Current Panel Backdrop Layer
```

Validation examples:

```text
Settings backdrop
Widget Manager backdrop
Popup backdrop
```

## Future roles

```css
--mha-scrim-surface
--mha-backdrop-filter
```

---

# Important guardrails

## OneUI

The mapping must preserve:

- OneUI appearance
- OneUI animated background
- OneUI surface hierarchy
- OneUI background extraction
- OneUI automatic accent behavior

## Background extraction

Canvas/background ownership must remain separate from surface ownership.

The future surface contract must not become the source of truth for accent extraction.

## Migration rule

Mapping is validated.

The next phase after validation is:

```text
Phase 2 — Non-destructive global aliases
```
