# Surface Token Reference

This document is the working reference for the MHA Widget Hub surface/token contract.

The goal of the contract is to let themes define visual identity while components consume stable roles. In other words:

```text
Theme raw values
  -> semantic surface roles
  -> component adapter roles
  -> concrete components
```

Use this reference when creating a theme, adjusting a surface, or deciding whether a component should use a global role or a component adapter.

## How to read this table

| Column | Meaning |
|---|---|
| Token | CSS custom property name. |
| Family | Logical group. |
| Description | What the token is for. |
| Typical consumers | Where it is expected to be used. |
| Theme author guidance | Whether a theme should normally set it directly. |

## Token reference

### Canvas and background roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-surface-canvas` | Canvas | Top-level visual canvas behind the whole UI. | App background, root surfaces. | Set when the theme owns the full canvas. |
| `--mha-canvas-background` | Canvas | Base background color or material for the app canvas. | `.mha-background`, page root. | Set for theme-specific canvas color. |
| `--mha-canvas-background-image` | Canvas | Optional image/gradient background layer. | Wallpaper/background system. | Optional. Avoid if wallpaper extraction should dominate. |
| `--mha-canvas-background-overlay` | Canvas | Overlay layer above the canvas. | Background tint/scrim overlays. | Optional. Useful for darkening/lightening wallpapers. |
| `--mha-canvas-background-tint` | Canvas | Color tint applied to the canvas. | Wallpaper/theme blending. | Optional. |
| `--mha-canvas-background-vibrance` | Canvas | Saturation/vibrance strength for canvas effects. | Background effects. | Optional. |
| `--mha-canvas-background-noise` | Canvas | Optional noise/texture layer. | Background effects. | Optional. Use sparingly. |
| `--mha-bg-primary` | Legacy/semantic background | Main app/page background alias used before the surface contract. | Root background, fallback surfaces. | Keep compatible. Prefer setting contract canvas roles in new themes. |
| `--mha-bg-secondary` | Legacy/semantic background | Secondary background layer. | Secondary shells, fallback sections. | Compatibility token. |
| `--mha-bg-elevated` | Legacy/semantic background | Elevated background layer. | Elevated panels/cards. | Compatibility token. |
| `--mha-bg-overlay` | Legacy/semantic background | Modal or scrim background. | Scrims, overlays, screensaver shade fallbacks. | Still useful as fallback for `--mha-surface-scrim`. |

### Core surface roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-surface-primary` | Core surface | Main card/widget/panel surface role. | Widgets, shell surfaces, primary panels. | Yes. This is one of the main theme levers. |
| `--mha-surface-on-primary` | Core surface | Nested surface placed on top of a primary surface. | Tiles, preview cards, internal cards. | Usually derived from `--mha-on-primary-surface`. |
| `--mha-surface-secondary` | Core surface | Secondary surface layer. | Controls, inner tiles, settings sections. | Yes, especially for tonal/matte themes. |
| `--mha-surface-on-secondary` | Core surface | Nested surface on secondary surface. | Deep controls, subcards. | Usually derived. |
| `--mha-surface-tertiary` | Core surface | Tertiary/deeper nested layer. | Subtle controls, tertiary containers. | Optional. |
| `--mha-surface-on-tertiary` | Core surface | Nested surface on tertiary layer. | Rare/deep nesting. | Usually derived. |
| `--mha-primary-surface` | Compatibility semantic | Main semantic surface used by legacy and migrated consumers. | Widgets, Settings, Widget Manager, Status Bar, Dock. | Keep mapped. New themes should feed it through the contract. |
| `--mha-on-primary-surface` | Compatibility semantic | Surface layered on the primary surface. | Manager rows, settings rows, internal tiles. | Important bridge for existing consumers. |
| `--mha-secondary-surface` | Compatibility semantic | Secondary semantic surface. | Controls, inputs, chips. | Keep mapped. |
| `--mha-on-secondary-surface` | Compatibility semantic | Surface layered on secondary. | Stronger nested controls. | Optional/derived. |
| `--mha-accent-surface` | Compatibility semantic | Accent-colored surface. | Active states, selected controls, toggles. | Map to theme accent. |
| `--mha-on-accent-surface` | Compatibility semantic | Text/icon color on accent surfaces. | Icons/text on active controls. | Must contrast with `--mha-accent-surface`. |

### Specialized surface roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-surface-shell` | Specialized surface | Generic app chrome/shell surface. | Dock, Status Bar, floating chrome. | Usually derived from shell adapter tokens. |
| `--mha-surface-panel` | Specialized surface | Main panel/sheet surface. | Settings, Widget Manager sheet, Page Creator. | Yes. Main panel lever. |
| `--mha-surface-popup` | Specialized surface | Popup/dialog surface. | Widget Config Popup, smaller overlays. | Usually maps to panel unless popups need distinction. |
| `--mha-surface-control` | Specialized surface | Interactive control background. | Inputs, selects, buttons, chips. | Yes for themes with distinct controls. |
| `--mha-surface-control-hover` | Specialized surface | Hover state for controls. | Buttons, controls. | Usually derived. |
| `--mha-surface-control-active` | Specialized surface | Active/pressed/selected control surface. | Active buttons, toggles. | Usually maps to accent. |
| `--mha-surface-control-disabled` | Specialized surface | Disabled control surface. | Disabled controls. | Usually derived. |
| `--mha-surface-accent` | Specialized surface | Contract-level accent surface. | Active states and accent surfaces. | Usually maps to `--mha-accent`. |
| `--mha-surface-danger` | Specialized surface | Danger/destructive surface. | Delete/destructive actions. | Optional. |
| `--mha-surface-warning` | Specialized surface | Warning surface. | Warning states. | Optional. |
| `--mha-surface-success` | Specialized surface | Success surface. | Success states. | Optional. |
| `--mha-surface-info` | Specialized surface | Informational surface. | Info states. | Optional. |

### Advanced surface roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-surface-elevated` | Advanced surface | Elevated/floating surface. | Floating panels, elevated controls. | Optional. |
| `--mha-surface-sunken` | Advanced surface | Inset/sunken surface. | Sliders, recessed controls. | Optional. |
| `--mha-surface-overlay` | Advanced surface | Generic overlay layer. | Modals, overlays. | Usually derived from overlay/scrim tokens. |
| `--mha-surface-scrim` | Advanced surface | Scrim/backdrop surface. | Panel scrims, mobile dock scrim, screensaver shade. | Yes when theme needs specific overlay behavior. |
| `--mha-surface-tooltip` | Advanced surface | Tooltip surface. | Future tooltip components. | Optional. |
| `--mha-surface-toast` | Advanced surface | Toast/notification surface. | Future toast components. | Optional. |
| `--mha-surface-selection` | Advanced surface | Selected item background. | Selected rows, active tiles. | Usually derived from accent. |
| `--mha-surface-focus-ring` | Advanced surface | Focus ring color/surface. | Keyboard focus states. | Must be visible and accessible. |

### Border roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-border-primary` | Border | Main visible border. | Widgets, panels, shell. | Yes. |
| `--mha-border-on-primary` | Border | Border for nested surfaces on primary. | Tiles, inner cards. | Usually derived. |
| `--mha-border-secondary` | Border | Softer nested border. | Controls, rows, chips. | Yes/derived. |
| `--mha-border-on-secondary` | Border | Border for nested secondary surfaces. | Deep controls. | Usually derived. |
| `--mha-border-tertiary` | Border | Tertiary subtle border. | Subtle dividers. | Optional. |
| `--mha-border-on-tertiary` | Border | Border on tertiary surfaces. | Deep nesting. | Optional. |
| `--mha-border-shell` | Border | Border for app chrome/shell. | Dock, Status Bar, floating controls. | Usually mapped by shell adapters. |
| `--mha-border-panel` | Border | Border for panels/sheets. | Settings, Manager, Page Creator. | Yes if panel borders differ. |
| `--mha-border-popup` | Border | Border for popups/dialogs. | Widget Config Popup. | Usually maps to panel border. |
| `--mha-border-control` | Border | Border for controls. | Inputs, selects, buttons. | Yes if controls need visible boundaries. |
| `--mha-border-control-hover` | Border | Hover border for controls. | Buttons, inputs. | Usually derived. |
| `--mha-border-control-active` | Border | Active/focused control border. | Active controls. | Usually maps to accent/focus. |
| `--mha-border-control-disabled` | Border | Disabled control border. | Disabled controls. | Usually derived. |
| `--mha-border-accent` | Border | Accent border. | Active states. | Usually maps to accent. |
| `--mha-border-danger` | Border | Danger border. | Destructive actions. | Optional. |
| `--mha-border-warning` | Border | Warning border. | Warning states. | Optional. |
| `--mha-border-success` | Border | Success border. | Success states. | Optional. |
| `--mha-border-info` | Border | Info border. | Info states. | Optional. |
| `--mha-border-subtle` | Border | Very subtle border/divider. | Soft dividers, low-emphasis cards. | Yes for refined themes. |
| `--mha-border-strong` | Border | Stronger border. | High contrast separation. | Optional. |
| `--mha-border-focus` | Border | Focus ring/accent border. | Keyboard focus, active controls. | Must remain visible. |
| `--mha-primary-border` | Compatibility semantic | Main semantic border. | Legacy widgets/panels. | Keep mapped. |
| `--mha-secondary-border` | Compatibility semantic | Secondary semantic border. | Rows, controls. | Keep mapped. |
| `--mha-tertiary-border` | Compatibility semantic | Tertiary semantic border. | Subtle nested items. | Optional. |

### Text roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-text-primary` | Text | Main readable text. | Titles, values, labels. | Yes. Must be readable on primary surfaces. |
| `--mha-text-secondary` | Text | Secondary text. | Descriptions, metadata. | Yes. |
| `--mha-text-tertiary` | Text | Lower-emphasis text. | Hints, helper labels. | Optional. |
| `--mha-text-muted` | Text | Muted compatibility text. | Legacy hints/metadata. | Usually maps to tertiary. |
| `--mha-text-disabled` | Text | Disabled/unavailable text. | Disabled controls/entities. | Yes/derived. |
| `--mha-text-inverse` | Text | Text on inverse/strong surfaces. | Accent/inverse surfaces. | Optional. |
| `--mha-text-accent` | Text | Accent-colored text. | Links, highlighted labels. | Usually maps to accent. |
| `--mha-text-danger` | Text | Danger text. | Destructive actions. | Optional. |
| `--mha-text-warning` | Text | Warning text. | Warning states. | Optional. |
| `--mha-text-success` | Text | Success text. | Success states. | Optional. |
| `--mha-text-info` | Text | Info text. | Info states. | Optional. |
| `--mha-primary-text` | Compatibility semantic | Main semantic text. | Legacy consumers. | Keep mapped to `--mha-text-primary`. |
| `--mha-secondary-text` | Compatibility semantic | Secondary semantic text. | Legacy consumers. | Keep mapped to `--mha-text-secondary`. |
| `--mha-muted-text` | Compatibility semantic | Muted semantic text. | Legacy consumers. | Keep mapped. |

### Radius roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-radius-xs` | Radius | Extra small radius. | Tiny chips/dividers. | Optional. |
| `--mha-radius-sm` | Radius | Small radius. | Small controls. | Optional. |
| `--mha-radius-md` | Radius | Medium radius. | Controls/cards. | Optional. |
| `--mha-radius-lg` | Radius | Large radius. | Panels/cards. | Optional. |
| `--mha-radius-xl` | Radius | Extra large radius. | Large cards/sheets. | Optional. |
| `--mha-radius-2xl` | Radius | Very large radius. | Large rounded sheets. | Optional. |
| `--mha-radius-pill` | Radius | Pill/full radius. | Pills, toggles, status bar. | Yes for theme geometry. |
| `--mha-radius-circle` | Radius | Circle radius. | Circular icons/buttons. | Usually `50%`. |
| `--mha-radius-widget` | Radius | Main widget radius. | Widget shell. | Yes. |
| `--mha-radius-widget-inner` | Radius | Inner widget radius. | Internal widget tiles. | Yes/derived. |
| `--mha-radius-panel` | Radius | Panel/sheet radius. | Settings, Manager, popups. | Yes. |
| `--mha-radius-popup` | Radius | Popup radius. | Widget Config Popup. | Usually maps to panel. |
| `--mha-radius-control` | Radius | Control radius. | Inputs, selects, buttons. | Yes. |
| `--mha-radius-shell` | Radius | Shell/chrome radius. | Dock, Status Bar. | Yes. |
| `--mha-radius-tile` | Radius | Tile/preview radius. | Manager tiles, settings rows. | Yes/derived. |

### Motion roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-motion-duration-fast` | Motion | Fast transition duration. | Hover/focus. | Optional. |
| `--mha-motion-duration-normal` | Motion | Standard transition duration. | Common transitions. | Optional. |
| `--mha-motion-duration-slow` | Motion | Slower transition duration. | Large panels/animations. | Optional. |
| `--mha-motion-easing-standard` | Motion | Standard easing curve. | Common transitions. | Optional. |
| `--mha-motion-easing-emphasized` | Motion | Emphasized easing curve. | Larger/expressive transitions. | Optional. |
| `--mha-motion-easing-spring` | Motion | Spring-like easing curve. | Playful transitions. | Optional. |

### Shadow roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-shadow-primary` | Shadow | Main card/widget shadow. | Widgets, cards. | Yes if theme uses elevation. |
| `--mha-shadow-secondary` | Shadow | Secondary shadow. | Tiles, nested surfaces. | Usually derived. |
| `--mha-shadow-tertiary` | Shadow | Tertiary/deep nested shadow. | Rare. | Optional. |
| `--mha-shadow-shell` | Shadow | Shell/chrome shadow. | Dock, Status Bar, floating controls. | Usually maps to shell adapter. |
| `--mha-shadow-panel` | Shadow | Panel/sheet shadow. | Settings, Manager. | Yes. |
| `--mha-shadow-popup` | Shadow | Popup/dialog shadow. | Widget Config Popup. | Usually maps to panel. |
| `--mha-shadow-control` | Shadow | Control shadow. | Buttons, controls. | Optional. Often `none`. |
| `--mha-shadow-control-hover` | Shadow | Control hover shadow. | Buttons/controls. | Optional. |
| `--mha-shadow-control-active` | Shadow | Control active shadow. | Active controls. | Optional. |
| `--mha-shadow-floating` | Shadow | Floating chrome shadow. | Floating controls, dock. | Yes if theme uses elevation. |
| `--mha-shadow-elevated` | Shadow | Strong elevated shadow. | Elevated panels. | Optional. |
| `--mha-shadow-sunken` | Shadow | Inset shadow. | Recessed controls. | Optional. |
| `--mha-shadow-none` | Shadow | Explicit no-shadow token. | Material/flat themes. | Use to communicate intentional flatness. |

### Blur, saturation, brightness and filters

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-blur-primary` | Effect | Default blur strength. | Widgets, glass surfaces. | Yes for glass themes. |
| `--mha-blur-secondary` | Effect | Secondary blur strength. | Nested surfaces. | Usually derived. |
| `--mha-blur-shell` | Effect | Shell blur. | Dock, Status Bar. | Optional/direct if shell differs. |
| `--mha-blur-panel` | Effect | Panel blur. | Settings/Manager. | Yes for glass/frosted themes. |
| `--mha-blur-popup` | Effect | Popup blur. | Widget Config Popup. | Usually maps to panel. |
| `--mha-blur-control` | Effect | Control blur. | Controls/chips. | Optional. |
| `--mha-blur-overlay` | Effect | Overlay/scrim blur. | Panel backdrop. | Optional. |
| `--mha-saturation-primary` | Effect | Default saturation filter. | Glass materials. | Yes for glass themes. |
| `--mha-saturation-secondary` | Effect | Secondary saturation. | Nested glass. | Usually derived. |
| `--mha-saturation-shell` | Effect | Shell saturation. | Dock/Status Bar. | Optional. |
| `--mha-saturation-panel` | Effect | Panel saturation. | Settings/Manager. | Optional. |
| `--mha-saturation-popup` | Effect | Popup saturation. | Popups. | Optional. |
| `--mha-saturation-control` | Effect | Control saturation. | Controls. | Optional. |
| `--mha-saturation-overlay` | Effect | Overlay saturation. | Scrims/backdrops. | Optional. |
| `--mha-brightness-primary` | Effect | Default brightness filter. | Glass materials. | Optional. |
| `--mha-brightness-secondary` | Effect | Secondary brightness. | Nested surfaces. | Usually derived. |
| `--mha-brightness-shell` | Effect | Shell brightness. | Dock/Status Bar. | Optional. |
| `--mha-brightness-panel` | Effect | Panel brightness. | Settings/Manager. | Optional. |
| `--mha-brightness-popup` | Effect | Popup brightness. | Popups. | Optional. |
| `--mha-brightness-control` | Effect | Control brightness. | Controls. | Optional. |
| `--mha-brightness-overlay` | Effect | Overlay brightness. | Backdrops/scrims. | Optional. |
| `--mha-filter-primary` | Filter bundle | Combined blur/saturation/brightness for primary surfaces. | Generic glass effects. | Usually derived. |
| `--mha-filter-shell` | Filter bundle | Combined filter for shell. | Dock/Status Bar. | Usually derived. |
| `--mha-filter-panel` | Filter bundle | Combined filter for panels. | Settings/Manager. | Usually derived. |
| `--mha-filter-popup` | Filter bundle | Combined filter for popups. | Widget Config Popup. | Usually derived. |
| `--mha-filter-control` | Filter bundle | Combined filter for controls. | Controls. | Usually derived. |
| `--mha-filter-overlay` | Filter bundle | Combined filter for overlays. | Scrims/backdrops. | Usually derived. |

### Highlight and reflection roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-highlight-primary` | Highlight | Main reflection/highlight layer. | Glass widgets, shells. | Yes for glass themes. |
| `--mha-highlight-secondary` | Highlight | Secondary highlight. | Nested tiles. | Usually derived. |
| `--mha-highlight-tertiary` | Highlight | Tertiary highlight. | Rare/deep nesting. | Optional. |
| `--mha-highlight-shell` | Highlight | Shell highlight. | Dock/Status Bar. | Optional. |
| `--mha-highlight-panel` | Highlight | Panel highlight. | Settings/Manager. | Optional. |
| `--mha-highlight-popup` | Highlight | Popup highlight. | Widget Config Popup. | Optional. |
| `--mha-highlight-control` | Highlight | Control highlight. | Buttons/controls. | Optional. |
| `--mha-highlight-overlay` | Highlight | Overlay highlight. | Backdrops. | Usually `none`. |
| `--mha-highlight-opacity-primary` | Highlight | Opacity for primary highlights. | Widgets/glass. | Yes for glass themes. |
| `--mha-highlight-opacity-secondary` | Highlight | Opacity for secondary highlights. | Nested surfaces. | Usually derived. |
| `--mha-highlight-opacity-shell` | Highlight | Shell highlight opacity. | Dock/Status Bar. | Optional. |
| `--mha-highlight-opacity-panel` | Highlight | Panel highlight opacity. | Settings/Manager. | Optional. |
| `--mha-highlight-opacity-popup` | Highlight | Popup highlight opacity. | Popups. | Optional. |
| `--mha-highlight-opacity-control` | Highlight | Control highlight opacity. | Controls. | Optional. |

### Component adapter tokens

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-widget-shell-surface` | Widget shell adapter | Main widget card surface. | `.mha-widget`. | Important. Usually maps to `--mha-surface-primary`. |
| `--mha-widget-shell-border` | Widget shell adapter | Main widget border. | `.mha-widget`. | Important. |
| `--mha-widget-shell-shadow` | Widget shell adapter | Main widget shadow. | `.mha-widget`. | Important for elevation themes. |
| `--mha-widget-shell-blur` | Widget shell adapter | Widget blur amount. | Widget shell filter. | Usually derived. |
| `--mha-widget-shell-saturation` | Widget shell adapter | Widget saturation. | Widget shell filter. | Usually derived. |
| `--mha-widget-shell-brightness` | Widget shell adapter | Widget brightness. | Widget shell filter. | Usually derived. |
| `--mha-widget-shell-filter` | Widget shell adapter | Widget backdrop/filter bundle. | Widget shell. | Usually derived. |
| `--mha-widget-shell-highlight` | Widget shell adapter | Widget reflection layer. | Widget pseudo-elements. | Yes for glass themes. |
| `--mha-widget-shell-highlight-opacity` | Widget shell adapter | Widget reflection opacity. | Widget pseudo-elements. | Yes for glass themes. |
| `--mha-widget-shell-surface-edit` | Widget shell adapter | Widget edit-mode surface. | Widgets in edit mode. | Optional. |
| `--mha-widget-shell-border-edit` | Widget shell adapter | Widget edit-mode border. | Widgets in edit mode. | Optional. |
| `--mha-widget-shell-shadow-edit` | Widget shell adapter | Widget edit-mode shadow. | Widgets in edit mode. | Optional. |
| `--mha-widget-section-surface` | Widget internals adapter | Internal widget section surface. | Media/Scenes/slider internals. | Usually derived. |
| `--mha-widget-section-border` | Widget internals adapter | Internal widget section border. | Internal widget cards. | Usually derived. |
| `--mha-widget-section-shadow` | Widget internals adapter | Internal widget section shadow. | Internal widget cards. | Usually derived. |
| `--mha-widget-control-surface` | Widget internals adapter | Control surface inside widgets. | Buttons, slider controls, media controls. | Important. |
| `--mha-widget-control-border` | Widget internals adapter | Control border inside widgets. | Internal controls. | Optional. |
| `--mha-widget-control-shadow` | Widget internals adapter | Control shadow inside widgets. | Internal controls. | Optional. |
| `--mha-widget-control-active-surface` | Widget internals adapter | Active widget control surface. | Active buttons/toggles. | Usually accent. |
| `--mha-widget-control-active-border` | Widget internals adapter | Active widget control border. | Active controls. | Optional. |
| `--mha-widget-control-accent-surface` | Widget internals adapter | Accent surface inside widgets. | Media primary button, scenes active state. | Usually accent. |
| `--mha-widget-control-accent-border` | Widget internals adapter | Accent border inside widgets. | Active widget controls. | Optional. |
| `--mha-widget-control-accent-shadow` | Widget internals adapter | Accent control shadow. | Active controls. | Optional. |
| `--mha-widget-chip-surface` | Widget internals adapter | Chip/metadata surface inside widgets. | Media chips, widget metadata. | Usually derived from tile surface. |
| `--mha-widget-chip-border` | Widget internals adapter | Chip/metadata border. | Media chips. | Optional. |
| `--mha-widget-chip-shadow` | Widget internals adapter | Chip/metadata shadow. | Media chips. | Optional. |
| `--mha-widget-icon-bubble-surface` | Widget internals adapter | Icon bubble surface. | Button/Toggle/Scenes icons. | Important for icon-heavy themes. |
| `--mha-widget-icon-bubble-border` | Widget internals adapter | Icon bubble border. | Icon bubbles. | Optional. |
| `--mha-widget-icon-bubble-shadow` | Widget internals adapter | Icon bubble shadow. | Icon bubbles. | Optional. |

### Shell/chrome adapter tokens

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-shell-surface` | Shell adapter | Generic shell/chrome surface. | Dock, Status Bar, floating controls. | Important. |
| `--mha-shell-border` | Shell adapter | Generic shell border. | Dock, Status Bar. | Important. |
| `--mha-shell-shadow` | Shell adapter | Generic shell shadow. | Dock, Status Bar, floating controls. | Important for elevation. |
| `--mha-shell-blur` | Shell adapter | Generic shell blur. | Dock/Status Bar. | Usually derived. |
| `--mha-shell-saturation` | Shell adapter | Generic shell saturation. | Dock/Status Bar. | Usually derived. |
| `--mha-shell-brightness` | Shell adapter | Generic shell brightness. | Dock/Status Bar. | Usually derived. |
| `--mha-shell-filter` | Shell adapter | Generic shell filter bundle. | Dock/Status Bar. | Usually derived. |
| `--mha-shell-highlight` | Shell adapter | Shell reflection/highlight. | Dock/Status Bar. | Optional. |
| `--mha-shell-highlight-opacity` | Shell adapter | Shell reflection opacity. | Dock/Status Bar. | Optional. |
| `--mha-shell-dock-surface` | Shell adapter | Dock-specific shell surface. | Desktop/tablet/mobile dock. | Set if Dock differs from Status Bar. |
| `--mha-shell-status-surface` | Shell adapter | Status Bar-specific shell surface. | Status Bar. | Set if Status Bar differs from Dock. |
| `--mha-shell-nowbar-surface` | Shell adapter | NowBar shell surface. | NowBar/screensaver. | Optional. |
| `--mha-shell-mobile-dock-surface` | Shell adapter | Mobile dock shell surface. | Expanded mobile dock. | Optional. |
| `--mha-shell-panel-surface` | Shell adapter | Shell-owned panel surface. | Mobile dock panel. | Usually maps to panel surface. |

### Panel, popup, tile and control adapters

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-panel-surface` | Panel adapter | Main panel/sheet surface. | Settings, Widget Manager, Page Creator. | Very important. |
| `--mha-panel-border` | Panel adapter | Main panel border. | Settings, Manager, Page Creator. | Important. |
| `--mha-panel-shadow` | Panel adapter | Main panel shadow. | Settings, Manager. | Important for elevation. |
| `--mha-panel-blur` | Panel adapter | Panel blur. | Panel filter. | Optional. |
| `--mha-panel-saturation` | Panel adapter | Panel saturation. | Panel filter. | Optional. |
| `--mha-panel-brightness` | Panel adapter | Panel brightness. | Panel filter. | Optional. |
| `--mha-panel-filter` | Panel adapter | Panel filter bundle. | Panels/sheets. | Usually derived. |
| `--mha-panel-highlight` | Panel adapter | Panel highlight layer. | Panels. | Optional. |
| `--mha-panel-highlight-opacity` | Panel adapter | Panel highlight opacity. | Panels. | Optional. |
| `--mha-panel-section-surface` | Panel adapter | Section surface inside panels. | Settings sections, Manager categories. | Important. |
| `--mha-panel-section-border` | Panel adapter | Section border inside panels. | Settings sections. | Optional. |
| `--mha-panel-section-shadow` | Panel adapter | Section shadow inside panels. | Settings sections. | Optional. |
| `--mha-panel-control-surface` | Panel adapter | Control surface inside panels. | Inputs, selects, toggles. | Important. |
| `--mha-panel-control-border` | Panel adapter | Control border inside panels. | Inputs/selects. | Optional. |
| `--mha-popup-surface` | Popup adapter | Popup/dialog surface. | Widget Config Popup. | Important if popup differs from panels. |
| `--mha-popup-border` | Popup adapter | Popup/dialog border. | Widget Config Popup. | Optional. |
| `--mha-popup-shadow` | Popup adapter | Popup/dialog shadow. | Widget Config Popup. | Optional. |
| `--mha-popup-blur` | Popup adapter | Popup blur. | Popup filter. | Optional. |
| `--mha-popup-saturation` | Popup adapter | Popup saturation. | Popup filter. | Optional. |
| `--mha-popup-brightness` | Popup adapter | Popup brightness. | Popup filter. | Optional. |
| `--mha-popup-filter` | Popup adapter | Popup filter bundle. | Widget Config Popup. | Usually derived. |
| `--mha-popup-highlight` | Popup adapter | Popup highlight layer. | Widget Config Popup. | Optional. |
| `--mha-popup-highlight-opacity` | Popup adapter | Popup highlight opacity. | Widget Config Popup. | Optional. |
| `--mha-popup-section-surface` | Popup adapter | Section surface inside popups. | Popup sections. | Optional. |
| `--mha-popup-section-border` | Popup adapter | Section border inside popups. | Popup sections. | Optional. |
| `--mha-popup-control-surface` | Popup adapter | Control surface inside popups. | Popup inputs/buttons. | Optional. |
| `--mha-popup-control-border` | Popup adapter | Control border inside popups. | Popup inputs/buttons. | Optional. |
| `--mha-tile-surface` | Tile adapter | Generic tile/row surface. | Settings rows, Manager tiles, internal cards. | Important. |
| `--mha-tile-surface-hover` | Tile adapter | Tile hover surface. | Manager/settings hover. | Optional. |
| `--mha-tile-surface-active` | Tile adapter | Tile active surface. | Active rows/buttons. | Usually accent. |
| `--mha-tile-surface-selected` | Tile adapter | Tile selected surface. | Selected rows. | Optional. |
| `--mha-tile-border` | Tile adapter | Generic tile border. | Manager/settings rows. | Important. |
| `--mha-tile-border-hover` | Tile adapter | Tile hover border. | Hover rows/tiles. | Optional. |
| `--mha-tile-border-active` | Tile adapter | Tile active border. | Active rows/tiles. | Optional. |
| `--mha-tile-shadow` | Tile adapter | Tile shadow. | Manager/settings/internal tiles. | Optional. Often `none`. |
| `--mha-tile-highlight` | Tile adapter | Tile highlight/reflection. | Glass tile layers. | Optional. |
| `--mha-tile-highlight-opacity` | Tile adapter | Tile highlight opacity. | Glass tile layers. | Optional. |
| `--mha-control-surface` | Control adapter | Generic control background. | Inputs, buttons, chips. | Important. |
| `--mha-control-surface-hover` | Control adapter | Control hover background. | Inputs/buttons. | Optional. |
| `--mha-control-surface-active` | Control adapter | Control active background. | Active controls. | Usually accent. |
| `--mha-control-surface-disabled` | Control adapter | Disabled control background. | Disabled controls. | Optional. |
| `--mha-control-border` | Control adapter | Generic control border. | Inputs/buttons. | Important. |
| `--mha-control-border-hover` | Control adapter | Hover control border. | Inputs/buttons. | Optional. |
| `--mha-control-border-active` | Control adapter | Active control border. | Active/focused controls. | Optional. |
| `--mha-control-border-disabled` | Control adapter | Disabled control border. | Disabled controls. | Optional. |
| `--mha-control-shadow` | Control adapter | Generic control shadow. | Controls. | Optional. |
| `--mha-control-shadow-hover` | Control adapter | Hover control shadow. | Controls. | Optional. |
| `--mha-control-shadow-active` | Control adapter | Active control shadow. | Controls. | Optional. |
| `--mha-control-blur` | Control adapter | Control blur. | Controls. | Optional. |
| `--mha-control-saturation` | Control adapter | Control saturation. | Controls. | Optional. |
| `--mha-control-brightness` | Control adapter | Control brightness. | Controls. | Optional. |
| `--mha-control-filter` | Control adapter | Control filter bundle. | Controls. | Usually derived. |
| `--mha-control-accent-surface` | Control adapter | Accent control background. | Active controls/toggles. | Important. |
| `--mha-control-accent-border` | Control adapter | Accent control border. | Active controls. | Optional. |
| `--mha-control-accent-shadow` | Control adapter | Accent control shadow. | Active controls. | Optional. |

### Scrim/backdrop and system-window aliases

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-scrim-surface` | Scrim adapter | Scrim/backdrop surface. | Panel scrims, mobile dock scrim, screensaver shade. | Important. |
| `--mha-scrim-opacity` | Scrim adapter | Scrim opacity multiplier. | Scrims/backdrops. | Optional. |
| `--mha-backdrop-blur` | Scrim adapter | Backdrop blur. | Modal/panel backdrops. | Optional. |
| `--mha-backdrop-saturation` | Scrim adapter | Backdrop saturation. | Modal/panel backdrops. | Optional. |
| `--mha-backdrop-brightness` | Scrim adapter | Backdrop brightness. | Modal/panel backdrops. | Optional. |
| `--mha-backdrop-filter` | Scrim adapter | Full backdrop filter. | Modal/panel backdrops. | Usually derived. |
| `--mha-system-window-surface` | System-window alias | Shared material for panels/popups/windows. | Panels, popups, mobile dock panel. | Usually maps to `--mha-surface-panel`. |
| `--mha-system-window-border` | System-window alias | Shared border for panels/popups/windows. | Panels/popups. | Usually maps to `--mha-border-panel`. |
| `--mha-system-window-shadow` | System-window alias | Shared shadow for panels/popups/windows. | Panels/popups. | Usually maps to `--mha-shadow-panel`. |
| `--mha-system-window-blur` | System-window alias | Shared blur for panels/popups/windows. | Panels/popups. | Usually maps to `--mha-blur-panel`. |

### Preview and Widget Manager roles

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-preview-surface` | Preview adapter | Preview/tile surface inside Widget Manager. | Widget Manager categories/widgets/previews. | Important if previews differ from panel sections. |
| `--mha-preview-surface-hover` | Preview adapter | Hover surface for previews. | Widget Manager hover states. | Optional. |
| `--mha-preview-border` | Preview adapter | Preview/tile border. | Widget Manager items. | Optional. |
| `--mha-preview-border-hover` | Preview adapter | Preview hover border. | Widget Manager hover states. | Optional. |
| `--mha-preview-text` | Preview adapter | Text inside preview tiles. | Widget Manager labels. | Usually maps to primary text. |

### Accent tokens

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-accent` | Accent | Main accent color. | Active states, selected items, controls. | Yes. Core theme input. |
| `--mha-accent-soft` | Accent | Soft/transparent accent. | Selection, subtle states. | Yes/derived. |
| `--mha-accent-strong` | Accent | Stronger accent variant. | Emphasis/active state. | Optional. |
| `--mha-accent-contrast` | Accent | Foreground on accent. | Text/icons on accent surfaces. | Must contrast with accent. |

### Legacy compatibility tokens

| Token | Family | Description | Typical consumers | Theme author guidance |
|---|---|---|---|---|
| `--mha-widget-surface` | Legacy widget | Legacy widget background. | Existing widget CSS and fallbacks. | Keep valid; do not remove. |
| `--mha-widget-surface-edit` | Legacy widget | Widget edit-mode background. | Edit mode. | Keep valid. |
| `--mha-widget-border` | Legacy widget | Legacy widget border. | Existing widget CSS and fallbacks. | Keep valid. |
| `--mha-widget-border-edit` | Legacy widget | Widget edit-mode border. | Edit mode. | Keep valid. |
| `--mha-widget-shadow` | Legacy widget | Legacy widget shadow. | Existing widget CSS and fallbacks. | Keep valid. |
| `--mha-widget-inner-highlight` | Legacy widget | Legacy inner highlight. | Glass widgets. | Keep valid for iOS/OneUI. |
| `--mha-widget-reflection` | Legacy widget | Widget reflection layer. | iOS glass widgets. | Keep valid. |
| `--mha-widget-reflection-opacity` | Legacy widget | Reflection opacity. | iOS glass widgets. | Keep valid. |
| `--mha-control-surface-edit` | Legacy control | Edit-mode control background. | Edit controls. | Keep valid. |
| `--mha-panel-background` | Legacy panel | Legacy panel background. | Older panel CSS. | Prefer panel/scrim roles for new work. |
| `--mha-panel-scrim-bg` | Legacy panel | Panel scrim background. | Older panel scrims. | Prefer `--mha-scrim-surface`. |
| `--mha-system-button-bg` | Legacy system button | Floating system button background. | Floating edit/settings buttons. | Prefer system button contract if present. |
| `--mha-system-button-border` | Legacy system button | Floating system button border. | Floating buttons. | Compatibility. |
| `--mha-system-button-color` | Legacy system button | Floating system button foreground. | Floating buttons. | Compatibility. |
| `--mha-system-button-backdrop-filter` | Legacy system button | Floating button blur/filter. | Floating buttons. | Compatibility. |
| `--mha-system-button-highlight` | Legacy system button | Floating button highlight layer. | Floating buttons. | Compatibility. |
| `--mha-system-button-highlight-opacity` | Legacy system button | Floating button highlight opacity. | Floating buttons. | Compatibility. |

## Theme-specific raw tokens

Theme-specific raw tokens are allowed and expected, but they are not the preferred API for components.

Examples:

| Token pattern | Owner | Purpose |
|---|---|---|
| `--mha-ios-*` | iOS theme | Raw iOS Liquid/Frosted material recipes. |
| `--mha-oneui-*` | OneUI theme | Raw OneUI material recipes. |
| `--mha-material-*` | Material theme | Raw Material You material recipes. |

Components should not normally consume these directly. Instead:

```text
Theme raw token -> semantic/contract token -> component adapter token -> component CSS
```

## Practical mapping examples

### Make Widget Manager previews follow Settings sections

```css
:host([data-theme-style="example"]) {
  --mha-preview-surface: var(--mha-panel-section-surface);
  --mha-preview-border: var(--mha-panel-section-border);
}
```

### Make the Dock follow the Status Bar

```css
:host([data-theme-style="example"]) {
  --mha-shell-dock-surface: var(--mha-shell-status-surface);
  --mha-shell-border: var(--mha-border-shell);
}
```

### Make popups use the same material as panels

```css
:host([data-theme-style="example"]) {
  --mha-popup-surface: var(--mha-panel-surface);
  --mha-popup-border: var(--mha-panel-border);
  --mha-popup-shadow: var(--mha-panel-shadow);
  --mha-popup-filter: var(--mha-panel-filter);
}
```
