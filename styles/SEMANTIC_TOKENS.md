# MHA Semantic Tokens

This file is a quick reference for the semantic design tokens used by MHA Widget Hub.

Semantic tokens describe **visual roles** instead of specific components.  
For example, prefer thinking “floating surface” or “panel surface” instead of “dock background” or “settings background”.

---

## Canonical layer tokens

These are the preferred high-level names for iOS and OneUI going forward. They are mapped to the existing semantic roles in phase 1, so older component tokens remain valid while components are migrated gradually.

| Token | Simple description | Typical consumers |
|---|---|---|
| `--mha-primary-surface` | Main glass/card layer. | widgets, settings sheet, widget manager, dock, status bar |
| `--mha-on-primary-surface` | Nested surface placed on a primary surface. | settings tiles, manager tiles, internal cards |
| `--mha-secondary-surface` | Secondary/control layer. | inputs, selects, chips, inner controls |
| `--mha-on-secondary-surface` | Deeper nested surface placed on secondary surfaces. | previews, sub-controls, stronger inner tiles |
| `--mha-primary-border` | Border for primary surfaces. | widget/panel/dock/status outlines |
| `--mha-secondary-border` | Border for nested surfaces. | settings tiles, manager tiles, controls |
| `--mha-primary-text` | Text on primary surfaces. | titles, values, main labels |
| `--mha-secondary-text` | Supporting text. | descriptions, secondary labels |
| `--mha-muted-text` | Low-emphasis text. | hints, metadata, disabled-ish helper text |
| `--mha-accent-surface` | Accent-colored surface. | active states, selected controls |
| `--mha-on-accent-surface` | Content on accent surfaces. | icons/text on accent backgrounds |

Phase 1 rule: do not delete legacy tokens. Use these tokens for new/migrated components, while legacy component aliases continue to work.

---

## Background tokens

| Token | Simple description |
|---|---|
| `--mha-bg-primary` | Main app/page background. |
| `--mha-bg-secondary` | Secondary background layer, slightly separated from the main background. |
| `--mha-bg-elevated` | Background for elevated areas that need more separation. |
| `--mha-bg-overlay` | Scrim/overlay background behind modals or panels. |

---

## Surface tokens

| Token | Simple description |
|---|---|
| `--mha-surface-primary` | Main card/widget surface. |
| `--mha-surface-secondary` | Secondary surface, often used inside widgets, panels, or controls. |
| `--mha-surface-tertiary` | Stronger nested surface for selects, inputs, or deeper controls. |
| `--mha-surface-glass` | Glass-like surface for blurred/translucent shell elements. |
| `--mha-surface-floating` | Surface for floating controls such as edit/add/dock launcher buttons. |
| `--mha-surface-panel` | Main surface for settings panels and modal sheets. |
| `--mha-surface-tonal` | Material-style tonal container surface. |

---

## Border tokens

| Token | Simple description |
|---|---|
| `--mha-border-primary` | Default visible border for widgets/cards. |
| `--mha-border-secondary` | Softer border for shell elements and panels. |
| `--mha-border-subtle` | Very subtle border for nested sections or Material surfaces. |
| `--mha-border-focus` | Focus/active border, usually based on the accent color. |

---

## Text tokens

| Token | Simple description |
|---|---|
| `--mha-text-primary` | Main readable text color. |
| `--mha-text-secondary` | Supporting labels and subtitles. |
| `--mha-text-tertiary` | Metadata, helper text, and low-emphasis details. |
| `--mha-text-disabled` | Disabled controls and unavailable placeholders. |
| `--mha-text-muted` | Compatibility alias for `--mha-text-tertiary`. |
| `--mha-text-inverse` | Text color meant to sit on inverse/contrasting surfaces. |

---

## Typography tokens

Widget typography is role-based: components should consume semantic type roles rather than hardcoded font values.

| Role | Size tokens | Weight / rhythm tokens | Typical consumers |
|---|---|---|---|
| Widget label | `--mha-type-widget-label-size`, `--mha-type-widget-label-compact-size` | `--mha-type-widget-label-weight`, `--mha-type-widget-label-line-height`, `--mha-type-widget-label-tracking` | widget labels and primary names |
| Widget state | `--mha-type-widget-state-size`, `--mha-type-widget-state-compact-size` | `--mha-type-widget-state-weight`, `--mha-type-widget-state-line-height`, `--mha-type-widget-state-tracking` | secondary states and units |
| Widget caption | `--mha-type-widget-caption-size`, `--mha-type-widget-caption-compact-size` | `--mha-type-widget-caption-weight`, `--mha-type-widget-caption-line-height` | metadata, descriptions, supporting captions |
| Widget body | `--mha-type-widget-body-size`, `--mha-type-widget-body-lg-size`, `--mha-type-widget-body-compact-size` | `--mha-type-widget-body-weight`, `--mha-type-widget-body-line-height`, `--mha-type-widget-body-relaxed-line-height` | narrative text and longer summaries |
| Widget value/display | `--mha-type-widget-value-size`, `--mha-type-widget-display-sm`, `--mha-type-widget-display-md`, `--mha-type-widget-display-lg` | `--mha-type-widget-value-weight`, `--mha-type-widget-display-weight`, `--mha-type-widget-value-line-height`, `--mha-type-widget-value-tracking` | numeric values and large display text |
| Control text | `--mha-type-control-label-size`, `--mha-type-control-state-size` | `--mha-type-control-label-weight`, `--mha-type-control-state-weight`, `--mha-type-control-line-height`, `--mha-type-control-label-tracking`, `--mha-type-control-state-tracking` | buttons, toggles, combined controls |
| Weather text | `--mha-type-weather-temp-size`, `--mha-type-weather-temp-display-size`, `--mha-type-weather-temp-compact-size`, `--mha-type-weather-summary-size`, `--mha-type-weather-summary-temp-size`, `--mha-type-weather-summary-temp-compact-size` | `--mha-type-weather-temp-weight`, `--mha-type-weather-summary-weight` | weather temperatures and summaries |
| Chips | `--mha-type-widget-chip-size` | `--mha-type-chip-weight` | compact pills and chip labels |

Normal label, state, caption, body, unit and control text should not depend directly on `cqi`, `cqb`, `vw` or `vh`. Display roles may use container-aware sizing when the text itself is the primary visual object, such as large weather temperatures.

Text colors remain separate from typography: use `--mha-text-primary` for primary values/body, `--mha-text-secondary` for labels/units, and `--mha-text-tertiary` for low-emphasis metadata.

---

## Effect tokens

| Token | Simple description |
|---|---|
| `--mha-blur-primary` | Default backdrop blur strength. |
| `--mha-blur-strong` | Stronger blur for panels and high-emphasis glass. |
| `--mha-shadow-primary` | Default widget/card shadow. |
| `--mha-shadow-floating` | Shadow for floating shell elements. |
| `--mha-shadow-panel` | Shadow for panels and sheets. |
| `--mha-highlight-primary` | Main reflection/highlight layer for glass-like surfaces. |
| `--mha-highlight-subtle` | Softer highlight layer for flat or Material-style surfaces. |

---

## Accent tokens

| Token | Simple description |
|---|---|
| `--mha-accent` | Main accent color chosen by the user/theme. |
| `--mha-accent-soft` | Subtle transparent accent layer. |
| `--mha-accent-strong` | Stronger accent color for emphasis. |
| `--mha-accent-contrast` | Text/icon color used on accent-colored surfaces. |

---

## System button tokens

System button tokens are adapter tokens used by edit/add/floating dock buttons.  
They should map back to semantic roles instead of hardcoded component values.

| Token | Simple description |
|---|---|
| `--mha-system-button-bg` | Background for floating system buttons. |
| `--mha-system-button-border` | Border for floating system buttons. |
| `--mha-system-button-color` | Text/icon color for floating system buttons. |
| `--mha-system-button-shadow` | Shadow for floating system buttons. |
| `--mha-system-button-backdrop-filter` | Blur/filter for floating system buttons. |
| `--mha-system-button-highlight` | Highlight/reflection layer for floating system buttons. |
| `--mha-system-button-highlight-opacity` | Strength of the highlight layer. |

---

## Shell tokens

Shell tokens are adapter tokens for persistent UI structure: status bar, dock, and mobile dock panel.

| Token | Simple description |
|---|---|
| `--mha-shell-surface` | Default shell surface. |
| `--mha-shell-status-surface` | Status bar surface. |
| `--mha-shell-dock-surface` | Dock surface. |
| `--mha-shell-panel-surface` | Mobile dock panel or shell panel surface. |
| `--mha-shell-border` | Border for shell elements. |
| `--mha-shell-shadow` | Shadow for shell elements. |
| `--mha-shell-blur` | Blur strength for shell elements. |

---

## Widget shell tokens

Widget shell tokens are adapter tokens for widget cards and basic widget controls.

| Token | Simple description |
|---|---|
| `--mha-widget-shell-surface` | Main widget card surface. |
| `--mha-widget-shell-border` | Main widget card border. |
| `--mha-widget-shell-shadow` | Main widget card shadow. |
| `--mha-widget-shell-highlight` | Reflection/highlight layer for widget cards. |
| `--mha-widget-control-surface` | Surface for small controls inside widgets. |
| `--mha-widget-shell-surface-edit` | Widget surface while editing. |
| `--mha-widget-shell-border-edit` | Widget border while editing or focused. |

---

## Panel tokens

Panel tokens are adapter tokens for settings panels, widget manager, and screensaver settings.

| Token | Simple description |
|---|---|
| `--mha-panel-scrim-bg` | Background scrim behind panels. |
| `--mha-panel-section-surface` | Surface for sections inside panels. |
| `--mha-panel-control-surface` | Surface for selects, inputs, and controls inside panels. |
| `--mha-panel-border` | Main panel border. |
| `--mha-panel-section-border` | Border for sections inside panels. |

---

## Compatibility aliases

Some older component-specific tokens still exist for compatibility.  
They should gradually point to semantic roles instead of being treated as independent design decisions.

| Legacy token | Prefer / maps toward |
|---|---|
| `--mha-widget-surface` | `--mha-surface-primary` |
| `--mha-widget-border` | `--mha-border-primary` |
| `--mha-widget-shadow` | `--mha-shadow-primary` |
| `--mha-control-surface` | `--mha-surface-secondary` |
| `--mha-panel-surface` | `--mha-surface-panel` |
| `--mha-panel-background` | `--mha-bg-overlay` |
| `--mha-dock-surface` | `--mha-surface-glass` |
| `--mha-statusbar-surface` | `--mha-surface-secondary` |
| `--mha-system-button-bg` | `--mha-surface-floating` |
| `--mha-surface-blur` | `--mha-blur-primary` |
| `--mha-widget-reflection` | `--mha-highlight-primary` |


---

## SliderWidget tokens

SliderWidget tokens are adapter tokens for the full-widget slider variants.

| Token | Simple description |
|---|---|
| `--mha-slider-widget-surface` | Main SliderWidget surface. |
| `--mha-slider-widget-surface-inactive` | Inactive slider/fader surface. |
| `--mha-slider-widget-surface-active` | Active slider/fader fill. |
| `--mha-slider-widget-border` | SliderWidget border. |
| `--mha-slider-widget-shadow` | SliderWidget shadow. |
| `--mha-slider-widget-text` | Main text/icon color inside SliderWidget. |
| `--mha-slider-widget-muted` | Muted/helper text inside SliderWidget. |
| `--mha-slider-widget-highlight` | Highlight/reflection layer for SliderWidget. |
| `--mha-slider-widget-blur` | Blur strength for SliderWidget glass effects. |


---

## ClockWidget tokens

ClockWidget tokens are adapter tokens for dashboard and screensaver clock variants.

| Token | Simple description |
|---|---|
| `--mha-clock-widget-text` | Main text/hand color inside ClockWidget. |
| `--mha-clock-widget-muted` | Muted date/helper text inside ClockWidget. |
| `--mha-clock-widget-face-surface` | Main analog clock face surface. |
| `--mha-clock-widget-face-surface-strong` | Stronger face surface for scientific/iOS variants. |
| `--mha-clock-widget-face-border` | Clock face border. |
| `--mha-clock-widget-face-shadow` | Clock face inset shadow. |
| `--mha-clock-widget-mark` | Minor tick mark color. |
| `--mha-clock-widget-mark-major` | Major tick mark color. |
| `--mha-clock-widget-hand` | Main hour/minute hand color. |
| `--mha-clock-widget-second-hand` | Second hand/accent color. |
| `--mha-clock-widget-center-dot` | Center dot color. |
| `--mha-clock-widget-highlight` | Highlight layer for glass clock faces. |
| `--mha-clock-widget-blur` | Blur strength for glass clock faces. |

---

## Widget Manager preview tokens

| Token | Simple description |
|---|---|
| `--mha-preview-surface` | Surface for widget manager tiles/previews. |
| `--mha-preview-surface-hover` | Hover/focus surface for widget manager tiles. |
| `--mha-preview-border` | Border for widget manager tiles/previews. |
| `--mha-preview-border-hover` | Hover/focus border for widget manager tiles. |
| `--mha-preview-accent-soft` | Soft accent layer in previews/icons. |
| `--mha-preview-text` | Main preview text color. |
| `--mha-preview-muted` | Muted preview/helper text color. |


---

## Widget content density rule

All widget content must size itself from the widget's own available rectangle.

Simple rule:

| Do | Avoid |
|---|---|
| Use the widget/card/content box as the sizing source. | Sizing widget internals from the viewport. |
| Prefer container units like `cqi`, `cqb`, `cqmin`, `cqmax`. | Using `vw`, `vh`, page width, grid width, dock offset, or shell dimensions inside widget internals. |
| Let each widget be its own sizing container. | Letting widget content know about the dashboard grid or page shell. |
| Use widget-specific adapter tokens when a widget needs a unique visual role. | Creating layout dependencies between widgets and the outer shell. |

The widget shell may know about the dashboard layout.  
The widget content must only know about the widget.


---

## WeatherWidget size contract

WeatherWidget supports three official sizes:

| Size | Role |
|---|---|
| `2x2` | Current weather compact card. |
| `3x2` | Wider current weather card; hidden from the widget manager. |
| `4x2` | Current weather plus vertical 5-day forecast stack. |

The dimension button cycles `2x2 → 3x2 → 4x2 → 2x2`. Manual resize snaps to those allowed sizes.

---

## WeatherWidget tokens

WeatherWidget tokens are adapter tokens for current weather cards.

| Token | Simple description |
|---|---|
| `--mha-weather-widget-text` | Main weather text color. |
| `--mha-weather-widget-muted` | Muted weather text color. |
| `--mha-weather-widget-temp` | Temperature color. |
| `--mha-weather-widget-border` | Weather internal border color. |
| `--mha-weather-widget-chip` | Small metric chip surface. |
| `--mha-weather-widget-chip-border` | Small metric chip border. |
| `--mha-weather-widget-sky` | Weather sky/accent color. |
| `--mha-weather-widget-sun` | Weather sun/accent color. |

---

## Rule of thumb

When adding a new component:

1. Use semantic tokens first.
2. Use adapter tokens only when the component needs its own role.
3. Avoid creating component-specific color tokens unless the component has a truly unique visual purpose.
4. Keep Material surfaces opaque unless explicitly documented otherwise.
5. Keep iOS/OneUI glass effects routed through blur/highlight/surface roles.
