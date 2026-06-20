# Surface Consumer Audit

This audit documents the current MHA surface, blur, shadow, border, and filter consumers before defining a global surface contract.

It intentionally does not propose or apply visual changes. Its goal is to show where surfaces currently get their material from, where iOS overrides exist, and which consumers should eventually migrate to a global MHA surface contract.

## Scope

Audited source files on `master`:

- `styles/themes/ios.css`
- `styles/themes/semantic-tokens.css`
- `styles/core/glass-surface.css`
- `styles/widgets/widget-shell.css`
- `styles/layout/dock.css`
- `styles/layout/status-bar.css`
- `styles/settings/settings-panel.css`
- `styles/widget-manager/widget-manager.css`
- `styles/widget-manager/widget-config-popup.css`
- `styles/widget-manager/widget-surface-backdrop.css`
- `styles/panels/panel-surface-contract.css`
- `styles/panels/page-creator-sheet.css`
- `styles/panels/page-creator-bottom.css`

## Global token layers currently present

### Legacy component tokens

These tokens are still the most concrete source for many surfaces:

- `--mha-widget-surface`
- `--mha-widget-surface-edit`
- `--mha-widget-border`
- `--mha-widget-border-edit`
- `--mha-widget-shadow`
- `--mha-dock-surface`
- `--mha-dock-slot-surface`
- `--mha-dock-shadow`
- `--mha-statusbar-surface`
- `--mha-control-surface`
- `--mha-control-surface-edit`
- `--mha-panel-surface`

### Semantic surface tokens

`semantic-tokens.css` introduces a role layer:

- `--mha-surface-primary`
- `--mha-surface-secondary`
- `--mha-surface-tertiary`
- `--mha-surface-glass`
- `--mha-surface-floating`
- `--mha-surface-panel`
- `--mha-surface-tonal`
- `--mha-primary-surface`
- `--mha-on-primary-surface`
- `--mha-secondary-surface`
- `--mha-on-secondary-surface`

Current default mapping:

```css
--mha-surface-primary: var(--mha-widget-surface, rgba(255,255,255,.12));
--mha-surface-secondary: var(--mha-control-surface, var(--mha-surface-primary));
--mha-surface-tertiary: color-mix(in srgb, var(--mha-surface-primary) 78%, var(--mha-text, #fff) 6%);
--mha-surface-glass: var(--mha-dock-surface, var(--mha-surface-primary));
--mha-surface-panel: var(--mha-panel-surface, var(--mha-surface-primary));
```

### Shell tokens

Used by dock and status bar:

- `--mha-shell-surface`
- `--mha-shell-status-surface`
- `--mha-shell-dock-surface`
- `--mha-shell-panel-surface`
- `--mha-shell-border`
- `--mha-shell-shadow`
- `--mha-shell-blur`

Current default mapping:

```css
--mha-shell-surface: var(--mha-surface-glass);
--mha-shell-status-surface: var(--mha-shell-surface);
--mha-shell-dock-surface: var(--mha-shell-surface);
--mha-shell-panel-surface: var(--mha-surface-panel);
--mha-shell-border: var(--mha-border-secondary);
--mha-shell-shadow: var(--mha-shadow-floating);
--mha-shell-blur: var(--mha-blur-primary);
```

### Widget shell tokens

Used by `.mha-widget`:

- `--mha-widget-shell-surface`
- `--mha-widget-shell-border`
- `--mha-widget-shell-shadow`
- `--mha-widget-shell-highlight`
- `--mha-widget-control-surface`
- `--mha-widget-shell-surface-edit`
- `--mha-widget-shell-border-edit`

Current default mapping:

```css
--mha-widget-shell-surface: var(--mha-surface-primary);
--mha-widget-shell-border: var(--mha-border-primary);
--mha-widget-shell-shadow: var(--mha-shadow-primary);
--mha-widget-shell-highlight: var(--mha-highlight-primary);
--mha-widget-control-surface: var(--mha-surface-secondary);
--mha-widget-shell-surface-edit: var(--mha-surface-secondary);
--mha-widget-shell-border-edit: var(--mha-border-focus);
```

### Glass primitive tokens

`styles/core/glass-surface.css` defines a shared blur/filter primitive for persistent glass surfaces:

- `--mha-glass-surface-background`
- `--mha-glass-surface-border`
- `--mha-glass-surface-blur`
- `--mha-glass-surface-saturation`
- `--mha-glass-surface-brightness`
- `--mha-glass-surface-filter`
- `--mha-glass-surface-fallback-filter`
- `--mha-glass-reflection-blend-mode`

Consumers currently include:

- `.mha-glass-surface`
- `.mha-widget`
- `.mha-dock`
- `.mha-status-bar`
- `.mha-screensaver-nowbar-tile`

This primitive centralizes blur/filter behavior but does not own each component background.

## iOS theme token generations

`ios.css` currently contains multiple generations of material definitions.

### Base iOS layer

Defines generic iOS radius, blur, saturation, widget reflection, light/dark text and base surfaces:

- `--mha-surface-blur`
- `--mha-surface-saturation`
- `--mha-widget-reflection-opacity`
- `--mha-widget-reflection`
- `--mha-widget-surface`
- `--mha-widget-border`
- `--mha-dock-surface`
- `--mha-dock-slot-surface`
- `--mha-statusbar-surface`
- `--mha-control-surface`

### Early Liquid/Frosted variant layer

Defines:

- Liquid: lower blur, higher saturation, stronger reflection.
- Frosted: higher blur, lower saturation, calmer reflection.

This layer is partially superseded later in the same file.

### Frosted classic layer

Defines stronger Frosted values and explicitly assigns:

- `--mha-widget-shell-surface: var(--mha-widget-surface)`
- `--mha-widget-shell-surface-edit: var(--mha-widget-surface-edit)`
- `--mha-dock-surface`
- `--mha-statusbar-surface`
- `--mha-control-surface`

### Liquid reinforced layer

Defines Liquid light/dark widget and control values and explicitly assigns:

- `--mha-widget-shell-surface: var(--mha-widget-surface)`
- `--mha-widget-shell-surface-edit: var(--mha-widget-surface-edit)`

### iOS surface contract layer

Defines newer concrete iOS tokens:

Liquid:

- `--mha-ios-liquid-blur`
- `--mha-ios-liquid-shadow`
- `--mha-ios-liquid-surface`
- `--mha-ios-liquid-primary-surface`
- `--mha-ios-liquid-surface-active`
- `--mha-ios-liquid-surface-muted`
- `--mha-ios-liquid-border`
- `--mha-ios-liquid-primary-border`
- `--mha-ios-liquid-border-active`

Frosted:

- `--mha-ios-frosted-blur`
- `--mha-ios-frosted-surface`
- `--mha-ios-frosted-surface-active`
- `--mha-ios-frosted-surface-muted`
- `--mha-ios-frosted-border`
- `--mha-ios-frosted-border-active`
- `--mha-ios-frosted-tile-surface`
- `--mha-ios-frosted-tile-surface-hover`
- `--mha-ios-frosted-tile-border`
- `--mha-ios-frosted-tile-shadow`
- `--mha-ios-frosted-shadow`

This is currently the closest thing to a concrete theme-material layer, but it is not yet mapped into a global MHA surface contract.

## Current surface consumers

### Widgets

File: `styles/widgets/widget-shell.css`

Consumer: `.mha-widget`

Current material:

```css
border: 1px solid var(--mha-widget-shell-border, var(--mha-border-primary));
background: var(--mha-widget-shell-surface, var(--mha-surface-primary));
backdrop-filter: blur(var(--mha-surface-blur)) saturate(var(--mha-surface-saturation));
box-shadow: var(--mha-widget-shell-shadow, var(--mha-shadow-primary));
```

Reflection layer:

```css
background: var(--mha-widget-shell-highlight, var(--mha-highlight-primary, none));
opacity: var(--mha-widget-reflection-opacity, 0);
mix-blend-mode: screen;
```

Audit note:

Widgets are already relatively well connected to widget-shell semantic tokens. Future migration should adjust token mapping first, not this component.

### Widget edit mode

File: `styles/widgets/widget-shell.css`

Consumer: `.mha-widget` under `:host(.is-editing)`

Current material:

```css
background: var(--mha-widget-shell-surface-edit, var(--mha-surface-secondary));
border-color: var(--mha-edit-outline-color);
box-shadow: edit outlines + var(--mha-widget-shell-shadow);
```

Audit note:

Edit-mode surface should remain a separate role because it is stateful, not just a theme layer.

### Dock

File: `styles/layout/dock.css`

Consumer: `.mha-dock`

Current material:

```css
border: 1px solid var(--mha-shell-border, var(--mha-border-secondary));
background: var(--mha-shell-dock-surface, var(--mha-surface-glass));
backdrop-filter: blur(var(--mha-shell-blur, var(--mha-blur-primary))) saturate(var(--mha-surface-saturation));
box-shadow: var(--mha-shell-shadow, var(--mha-shadow-floating));
```

Audit note:

Dock is already aligned with shell tokens and is a good reference surface for the future `shell`/`primary` layer.

### Status bar

File: `styles/layout/status-bar.css`

Consumer: `.mha-status-bar`

Current material conflicts:

1. Initial minified rule sets background, blur, shadow with generic shell tokens.
2. Theme appearance block sets iOS-specific background, border, shadow, blur.
3. Later no-shadow block forces `box-shadow: none !important`.
4. Later semantic block sets shell token background, border, shadow, blur.
5. Later Liquid-specific block maps to `--mha-primary-surface`.
6. Later Frosted-specific block maps to `--mha-statusbar-surface` and then hardcodes light/dark rgba backgrounds.

Key hardcoded Frosted values:

```css
background: rgba(242, 242, 247, .72);
background: rgba(44, 44, 46, .68);
```

Audit note:

Status bar is the highest-risk surface. It should be cleaned only after a global shell/status role is explicit.

### Settings sheet

File: `styles/settings/settings-panel.css`

Consumer: `.mha-settings-sheet`

Current base material:

```css
border: 1px solid var(--mha-border-secondary);
background: var(--mha-surface-panel);
box-shadow: var(--mha-shadow-panel);
backdrop-filter: blur(var(--mha-blur-strong)) saturate(var(--mha-surface-saturation));
```

Current iOS override:

```css
:host([data-theme-style="ios"]) .mha-settings-sheet {
  background:
    linear-gradient(145deg, rgba(255,255,255,.24), rgba(255,255,255,.08)),
    rgba(18,20,28,.78);
}
```

Audit note:

Settings sheet bypasses the semantic panel surface in iOS. This hardcoded override should be removed only after the panel role produces the intended iOS material.

### Settings sections

File: `styles/settings/settings-panel.css`

Consumer: `.mha-settings-section`

Current material:

```css
border: 1px solid var(--mha-border-subtle);
background: var(--mha-surface-secondary);
```

Audit note:

This is a stable candidate reference for a future nested-section role.

### Settings select/input controls

File: `styles/settings/settings-panel.css`

Consumer: `.mha-settings-select`

Current material:

```css
border: 1px solid var(--mha-border-secondary);
background: var(--mha-surface-tertiary);
```

Light non-Material override:

```css
background: rgba(255,255,255,.74);
```

Audit note:

Control roles exist conceptually but light-mode overrides can bypass them.

### Settings reset button

File: `styles/settings/settings-panel.css`

Consumer: `.mha-settings-reset`

Current material:

```css
border: 1px solid var(--mha-border-secondary);
background: var(--mha-surface-secondary);
```

Audit note:

This can be used as a visual reference for tile/button-like surfaces, but it currently shares the same token as settings sections.

### Widget Manager sheet

File: `styles/widget-manager/widget-manager.css`

Consumer: `.mha-widget-manager-sheet.mha-settings-sheet`

Current material:

- Inherits most sheet styling from `.mha-settings-sheet`.
- OneUI gets a specific override:

```css
background: var(--mha-oneui-panel-surface, var(--mha-surface-panel));
```

Audit note:

Because it carries `.mha-settings-sheet`, the manager is indirectly coupled to settings panel material.

### Widget Manager tiles

File: `styles/widget-manager/widget-manager.css`

Consumers:

- `.mha-widget-manager-category`
- `.mha-widget-manager-widget`

Current material:

```css
border: 1px solid var(--mha-preview-border);
background: var(--mha-preview-surface);
box-shadow: inset highlight + drop shadow;
```

Hover material:

```css
border-color: var(--mha-preview-border-hover);
background: var(--mha-preview-surface-hover);
```

Audit note:

Manager tiles use preview tokens, not settings section or global surface roles. They need a clear future tile role.

### Widget Manager preview box

File: `styles/widget-manager/widget-manager.css`

Consumer: `.mha-widget-manager-preview-area`

Current material:

```css
background:
  radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--mha-accent) 13%, transparent), transparent 34%),
  var(--mha-widget-shell-surface, var(--mha-surface-primary));
border: 1px solid var(--mha-preview-border);
```

Audit note:

Preview boxes currently follow widget-shell surface, which may be wrong if previews should be nested-section surfaces rather than actual widget surfaces.

### Widget Config sheet

File: `styles/widget-manager/widget-config-popup.css`

Consumer: `.mha-widget-config-sheet`

Current material:

- Mostly inherits generic panel/sheet behavior through the panel shell/settings classes.
- OneUI gets an explicit override:

```css
background: var(--mha-oneui-panel-surface, var(--mha-surface-panel));
```

Audit note:

No iOS-specific sheet token here, but inherited iOS settings-sheet hardcodes can affect it depending on class composition.

### Widget Config groups

File: `styles/widget-manager/widget-config-popup.css`

Consumer: `.mha-widget-config-group`

Current material:

```css
border: 1px solid color-mix(in srgb, var(--mha-widget-border) 82%, transparent);
background: color-mix(in srgb, var(--mha-widget-surface) 52%, transparent);
```

Audit note:

This bypasses semantic section/control roles and directly mixes widget material.

### Widget Config controls

File: `styles/widget-manager/widget-config-popup.css`

Consumer: `.mha-widget-config-control`

Current material:

```css
border: 1px solid var(--mha-widget-border);
background: color-mix(in srgb, var(--mha-widget-surface) 76%, transparent);
```

Audit note:

Controls should eventually consume a global control role.

### Page Creator sheet

Files:

- `src/pages/page-creator.js`
- `styles/panels/page-creator-sheet.css`
- `styles/panels/page-creator-bottom.css`

Current behavior:

- Page Creator uses `createPanelShell()` and `applyPanelSurfaceContract()` with `PANEL_SURFACE_ROLES.POPUP`.
- CSS files mostly adjust mobile presentation and geometry, not material.

Audit note:

Page Creator material comes from shared panel/settings sheet behavior. It should eventually consume the global popup/panel role.

### Page Creator tiles

Source class:

- `.mha-page-creator-icon`

Current material:

Not clearly centralized in the inspected CSS files. It likely inherits from button/component styling or panel styles.

Audit note:

This needs follow-up targeted search before migration. It should become a section/tile role consumer.

### Panel surface contract

Files:

- `src/panels/panel-surface-contract.js`
- `styles/panels/panel-surface-contract.css`

Current roles:

- `panel`
- `popup`
- `subpanel`

Current CSS mostly affects placement/mobile presentation, not material.

Audit note:

This is the correct place to carry surface intent in DOM attributes, but material tokens are not yet mapped by `data-surface-role`.

### Page/backdrop blur when panels are open

Files:

- `styles/settings/settings-panel.css`
- `styles/widget-manager/widget-surface-backdrop.css`

Current filters:

Settings open:

```css
filter: blur(var(--mha-settings-background-blur, 10px)) saturate(.82) brightness(.86);
```

Widget surface open iOS base:

```css
--mha-backdrop-filter: blur(var(--mha-surface-blur, 10px)) saturate(var(--mha-surface-saturation, 190%)) brightness(.92);
```

Widget surface open iOS Liquid override:

```css
--mha-backdrop-filter: blur(var(--mha-surface-blur, 10px)) saturate(.82) brightness(.92);
```

Audit note:

Liquid panel-open saturation reduction already exists for widget-surface/settings-like states, but the logic is split between settings panel and widget surface backdrop files.

## Major conflicts and risks

### 1. iOS has multiple active material systems

The following coexist:

- old `--mha-widget-surface` / `--mha-dock-surface` / `--mha-statusbar-surface`
- newer `--mha-ios-liquid-*` / `--mha-ios-frosted-*`
- semantic `--mha-surface-*`
- shell `--mha-shell-*`
- widget shell `--mha-widget-shell-*`
- component hardcodes

### 2. Some components are token consumers, others are token authors

Good consumers:

- widgets
- dock

Mixed consumers/authors:

- status bar
- settings sheet
- widget manager
- widget config

### 3. Status bar has too many final answers

The status bar is repeatedly assigned background, border, shadow and blur in the same file.

### 4. Settings sheet bypasses iOS tokens

The iOS-specific settings sheet background is hardcoded and does not reference the iOS material contract.

### 5. Manager/config surfaces use preview/widget tokens

Widget Manager and Widget Config still use `--mha-preview-*` or direct mixes of `--mha-widget-*` rather than global roles.

## Recommended next step

Do not patch iOS surfaces directly yet.

Next step should be to define the global MHA surface contract in documentation only, then add non-destructive tokens in `semantic-tokens.css` that alias to the current behavior.

Only after that should iOS Liquid/Frosted be remapped into the global contract.
