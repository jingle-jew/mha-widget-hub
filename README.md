# MHA Widget Hub

A premium Home Assistant dashboard shell inspired by modern mobile design systems.

The project is built around a clear separation:

```text
Shell = global interface, visual language, layout system
Widgets = functional content, data, interactions, placement
```

The shell should provide a polished, coherent foundation. Widgets should provide the richness.

---

## Project direction

MHA should feel like a real app, not a pile of cards.

The goal is:

- premium;
- calm;
- readable;
- touch-friendly;
- responsive;
- modular;
- visually coherent;
- customizable without becoming chaotic.

Customization should be powerful enough to give the interface personality, but limited enough to keep the design system consistent.

---

## Customization philosophy

Global customization is intentionally limited.

The user can customize the overall visual identity through a small number of high-impact choices:

```text
3 visual styles
- iOS
- OneUI
- Material

2 themes
- light
- dark

3 icon shapes
- rounded-square
- squircle
- circle

Accent colors
- 10 curated accent colors per visual style
```

That is the intended ceiling for global appearance customization.

Avoid adding endless sliders, arbitrary per-pixel visual controls, or overly granular theme options.

```text
Good customization:
- visual style
- light/dark theme
- icon shape
- accent color
- widget layout and content

Avoid:
- dozens of radius sliders
- separate shadow sliders
- random per-component color overrides
- one-off visual exceptions
```

The richness of the dashboard should come mostly from widgets, their layout, and their content, not from unlimited shell settings.

---

## Visual styles

Each visual style should have its own personality while using the same component architecture.

### iOS

- glassy;
- luminous;
- soft;
- layered;
- expressive blur;
- bright in light mode;
- deep and atmospheric in dark mode.

### OneUI

- clean;
- friendly;
- spacious;
- readable;
- rounded;
- practical;
- slightly playful without becoming noisy.

### Material

- tonal;
- structured;
- calm;
- accessible;
- token-driven;
- respectful of the Material You direction.

Material already has a strong color structure. Do not casually override it with unrelated custom rules.

---

## Accent system

Accent colors are style-specific.

Each visual style owns its own curated accent palette. Accent choices are stable across light/dark mode, but the available colors change according to the selected visual style.

Accent applies to system-level interactive elements:

- dock icons;
- mobile floating dock icon;
- edit button;
- future system buttons;
- toggles;
- sliders;
- accent pills;
- primary buttons.

Accent should not randomly recolor normal text, widget backgrounds, or content unless the component is intentionally designed as an accent component.

---

## Icon shape system

Icon shape is global.

If the user selects a shape, every icon-like control should respect it:

```text
rounded-square = all icon containers are rounded-square
squircle = all icon containers are squircle
circle = all icon containers are circle
```

This applies everywhere:

- dock;
- mobile dock;
- edit button;
- widget icons;
- status/system icons;
- future icon buttons.

Do not create one-off icon shapes unless the component is explicitly not an icon.

Icon symbols must remain centered inside their icon container.

---

## Text and typography rules

Text should be readable before it is decorative.

General rule:

```text
Prefer left-aligned text inside its box.
Avoid centered text unless there is a strong UI reason.
```

Use centered text sparingly, for example:

- tiny badges;
- icon-only labels;
- compact pills;
- symmetrical controls;
- empty states where centered composition is intentional.

For widgets and normal content areas, prefer:

- left-aligned headings;
- left-aligned values;
- left-aligned descriptions;
- predictable reading flow.

Avoid mixing text alignment randomly inside the same widget.

### Light theme text rule

In light theme, normal interface text should not be white.

White text is allowed only when required for contrast, such as:

- danger buttons;
- dark/inverted buttons;
- explicitly dark surfaces;
- icon glyphs when the icon style requires it.

---

## Layout philosophy

The layout system should remain predictable.

Global grid rules:

- widgets live on the dashboard grid;
- widgets own an internal layout grid;
- internal widget content should respect widget padding and gap tokens;
- the shell should reserve space for global UI such as status bar and dock;
- widgets should not render behind fixed shell controls.

Mobile, tablet, and desktop can have different shell behavior, but they should still feel like the same app.

---

## Mobile shell

Mobile should not be treated as a compressed desktop.

Mobile uses:

- hidden status bar;
- floating dock launcher;
- custom mobile dock panel;
- touch-friendly controls;
- responsive orientation relayout;
- edit mode with dock hidden.

The mobile floating dock launcher is visually an icon and must follow the global icon shape and icon surface tokens.

---

## Settings panel

The settings panel is part of the shell.

It should:

- open from the gear icon;
- use the same surface tokens as widgets;
- respect the active visual style;
- respect light/dark theme;
- respect accent color;
- blur/dim the dashboard behind it;
- avoid full-page flashes or layout jumps.

Settings should expose only meaningful global choices.

Do not turn the settings panel into a dump for every possible CSS value.

---

## Component architecture

Components should be reusable and token-driven.

Preferred direction:

```text
src/ui/
- icon
- icon-symbol
- button
- pill
- toggle
- slider

src/layout/
- shell
- dock
- mobile-dock
- status-bar

src/widgets/
- widget-layout
- empty-widget
- future real widgets

src/settings/
- settings-panel
- accent-palettes
```

Visual behavior should come from tokens and scoped component CSS, not from scattered one-off rules.

---

## Token discipline

Tokens are the source of truth.

Prefer a single clear token over aliases and duplicates.

Example:

```css
--mha-icon-radius-rounded-square
```

Avoid keeping old aliases around unless there is a real compatibility need.

When a token is renamed, clean up the old one carefully.

---

## Rendering and motion

The interface should feel smooth.

Avoid:

- full-screen flashes;
- unnecessary full re-renders;
- visible CSS loading artifacts;
- dock/settings flashes during orientation changes;
- abrupt background changes.

Preferred behavior:

- crossfade visual theme backgrounds;
- suppress transitions during orientation relayout;
- keep modal panels hidden until intentionally opened;
- use motion for polish, not distraction.

Respect `prefers-reduced-motion`.

---

## Edit mode

Edit mode is a shell state.

In edit mode:

- widgets may dance subtly;
- widgets may show a clear outline;
- edit controls must be above widget content;
- resize handles should feel integrated into widget borders;
- mobile dock should be hidden;
- the edit button remains the primary floating control.

Resize handles should not look like debug blocks.

---

## README / project documentation rule

When a major design-system decision is made, document it here.

This README should explain the philosophy and guardrails of the project, not every tiny implementation detail.

Implementation notes can be added lower in the file when useful.


---

## Implementation notes / history

# MHA Control Hub — Componentized foundation

## Lancer
```bash
python3 -m http.server 8766
```
Puis ouvrir `http://localhost:8766/dev.html`.

## Structure
```text
mha-control-hub/
  dev.html
  mha-control-hub.js
  src/
    core/storage.js
    components/icons.js
    layout/layout-engine.js
    layout/shell.js
    layout/status-bar.js
    layout/dock.js
    widgets/empty-widget.js
    screensaver/screensaver.js
  styles/
    core/tokens.css
    core/background.css
    layout/shell.css
    layout/status-bar.css
    layout/dock.css
    widgets/empty-widget.css
    screensaver/screensaver.css
  backup/weather-widget.backup.js
```

`mha-control-hub.js` orchestre. Les composants et styles sont séparés.


## Clean dark/light visual themes

This build resets theme handling from the original project.

Canonical attributes:
- `data-theme="dark|light"` controls light/dark.
- `data-theme-style="ios|oneui|material"` controls the visual family.

Scope:
- widget/floating surface colors;
- wallpaper/background colors;
- text/muted colors.

Not changed:
- grid;
- layout;
- drag/drop;
- resize;
- widget sizing;
- widget structure.


## iOS Tahoe glass refinement

The iOS theme surfaces were adjusted to feel more like modern liquid glass:
- more transparent widget surfaces;
- less backdrop blur;
- thinner glass borders/highlights;
- lighter/crisper shadows;
- brighter wallpaper palette.

No grid, layout, drag/drop, resize, or widget sizing behavior was changed.


## iOS tinted Liquid Glass

The iOS theme now targets a tinted Liquid Glass look:
- transparent optical surfaces;
- small controlled blur;
- blue/violet tint for readability;
- stronger edge highlights;
- optional reflection layer via `--mha-widget-reflection`.

No grid, layout, drag/drop, resize, or widget sizing behavior was changed.




## Dock syntax fix

`src/layout/dock.js` was rewritten cleanly after the dock icon shape patch introduced an invalid `const` insertion.

Dock items are now `.mha-icon` elements and follow the global icon shape tokens.








## Dock container only

The dock is now only a layout container.

It does not:
- create hardcoded icons;
- import `createIcon()`;
- assign icon categories;
- define icon shape;
- define icon-specific CSS.

It only creates empty `.mha-dock-item` slots. Future dock content should be passed in as normal reusable UI components.




## Empty dock reset

The dock is now visible but empty. It contains no child/content logic and has an empty width of 40vw.


## Parser fix after empty dock cleanup

`dev.html` was rebuilt with a clean module script after removing the icon-related work.
The dock remains visible, empty, and set to 40vw when empty.


## macOS-ish adaptive empty dock

The empty dock is now taller and more macOS-like while remaining adaptive:

- width uses viewport/tokens;
- height uses `clamp()` and viewport units;
- no fixed x-by-y dimensions;
- mobile portrait, landscape, and desktop each receive adaptive bounds.


## Icon component shapes only

Added a reusable icon component foundation without connecting it to the interface.

Files:
- `src/ui/icon.js`
- `styles/components/icon.css`

Scope:
- shape tokens only;
- rounded-square, squircle, circle;
- no glyphs/signs;
- no dev menu;
- no dock/widget/status-bar integration.


## Local icon symbol library

Added a local icon symbol library with 240 symbols.

Files:
- `src/icons/icon-symbol-catalog.js`
- `src/ui/icon-symbol.js`
- `styles/components/icon-symbol.css`

Architecture:
- icon shape/container is separate from icon symbol/sign.
- any symbol can be placed inside any icon container later.
- the symbol component is not connected to dock/widgets/status bar yet.


## Dock populated with local symbol icons

The dock now contains 8 normal reusable icon components.
Each icon uses:
- `createIcon()` for the shape/container;
- `createIconSymbol()` for the local symbol/sign.

The symbols are selected from the local icon symbol catalog.


## Verified icon shape toggle fix

Fixed the global icon shape toggle by removing a circular CSS token reference:

```css
--mha-icon-border-radius: var(--mha-border-radius-icon);
--mha-border-radius-icon: var(--mha-icon-border-radius);
```

The active token now resolves cleanly through `--mha-border-radius-icon`, and `data-icon-shape` is mirrored as a real host attribute.


## Direct icon shape CSS fix

Added direct host-state rules at the end of `styles/components/icon.css`:

```css
:host([data-icon-shape="circle"]) .mha-icon {
  border-radius: var(--mha-icon-border-radius-circle);
}
```

This avoids relying only on chained custom properties for the visible icon shape.


## Icon shape listener fix

Fixed the dev menu icon shape control by attaching a robust listener directly to:

```js
document.querySelector('[data-dev-action="icon-shape"]')
```

Both `change` and `input` events now call `setIconShape()`.
The setter is also exposed through `window.__MHA_DEV__.setIconShape` for manual testing.


## Theme-bound icon surfaces

Icon surface/color styling is now bound to the visual theme:

- iOS: Liquid Glass icon surfaces with white symbols in light and dark modes.
- OneUI: opaque OneUI-esque colored icon surfaces with black symbols.
- Material: widget-colored icon surfaces with Material You symbol colors.

Icon shape remains independent and controlled by `data-icon-shape`.


## iOS widget gradient removal

The iOS visual theme now uses uniform glass widget surfaces instead of widget background gradients.

Adjusted tokens:
- `--mha-widget-surface`
- `--mha-widget-surface-edit`

Icon surfaces remain unchanged.


## iOS widget overlay gradient removal

Removed the remaining top-left widget gradient/shine overlays for the iOS visual theme.

The iOS widget surface is now intended to be uniform glass:
- no surface gradient;
- no pseudo-element corner gradient;
- borders/shadows/blur remain.


## Squircle SVG mask shape

The squircle icon shape now uses an SVG mask instead of only `border-radius`.

- rounded-square: `border-radius`
- squircle: SVG mask / superellipse-like shape
- circle: `border-radius: 999px`

To tune the squircle, adjust the `--mha-icon-squircle-mask` path control points in `styles/components/icon.css`.


## OneUI superellipse squircle mask

The squircle icon shape now uses a generated superellipse mask (`n=4`) instead of a hand-tuned cubic SVG.

This gives a more OneUI-like squircle:
- flatter sides than a circle;
- smoother corners than a rounded rectangle;
- scalable across icon sizes.

For future tuning, regenerate the mask with:

```bash
node tools/generate-squircle-mask.mjs 4
```

Try `3.2` for rounder or `5` for squarer.


## Squircle n=3

The squircle SVG mask was regenerated with superellipse exponent `n=3`.

Compared with `n=4`, this produces a softer/rounder squircle.


## Remove legacy squircle radius token

Removed the old `--mha-icon-border-radius-squircle` token.

Squircle shape is now controlled only by the SVG mask token:

```css
--mha-icon-squircle-mask
```

Rounded-square and circle still use border-radius tokens.


## Squircle inner edge fix

The squircle icon shape now disables the regular CSS border while the SVG mask is active.

Reason:
- the mask defines the visible shape;
- a normal CSS border does not perfectly follow the mask;
- this could create a thin white internal edge on the four sides.

Rounded-square and circle still use normal borders.


## Material dock/widget surface alignment

In Material theme:
- the dock container uses exactly `--mha-widget-surface`;
- icon tiles intentionally use a separate Material You tonal container;
- icon symbols continue to use the Material You symbol palette.


## Icon symbol centering contract

Icon symbols are now explicitly centered by both the container and the symbol component:

- `.mha-icon` uses `display: grid` and `place-items: center`;
- `.mha-icon-symbol` centers itself with grid/self alignment;
- SVGs are block-level and centered to avoid inline baseline offsets.


## Global icon shape contract

Icon shape is now centralized at the end of `styles/components/icon.css`.

All `.mha-icon` instances follow the host-level `data-icon-shape` value:
- `rounded-square`
- `squircle`
- `circle`

Dock, widgets, status bar, and future contexts may control icon size/color/surface, but should not redefine icon shape.


## Widget internal unit layout foundation

Widgets now expose internal layout tokens:

- `--mha-widget-inner-padding`
- `--mha-widget-inner-gap`
- `--mha-widget-inner-unit-w`
- `--mha-widget-inner-unit-h`
- `--mha-widget-inner-unit`

The internal unit is square because it uses the smaller of the available width/height units.
The test icon in `slot-a` uses one `--mha-widget-inner-unit`, so it remains square and follows the global icon shape correctly.


## Widget internal square unit fix

The widget test icon now uses a row-based internal unit so it remains square.

Reason:
- width-based calculations can stretch icons in wide widgets;
- stretched icons turn global `circle` shape into a pill;
- the internal unit is now based on widget internal height divided by widget rows.


## Widget icon size token fix

The test widget icon now sets the reusable icon component token:

```css
--mha-icon-size: var(--mha-widget-inner-unit);
```

This is more reliable than setting only width/height because `.mha-icon` owns its dimensions through `--mha-icon-size`.


## Widget internal grid restart

The visible inner widget line is removed. Its former inset now acts as internal widget padding.

Each widget now creates an internal grid matching its global unit count:
- 1x4 => 1 internal column x 4 rows;
- 2x4 => 2 internal columns x 4 rows;
- 4x2 => 4 internal columns x 2 rows.

The test icon in `slot-a` occupies the first internal unit.


## Widget internal grid polish

The test icon now sits inside a `.mha-widget-unit` wrapper.

The wrapper occupies one internal grid cell, while the icon itself uses the smaller side of that cell through container query units:

```css
--mha-icon-size: min(100cqi, 100cqb);
```

This prevents circle icons from becoming pills inside rectangular widget cells.


## Theme switch crossfade without rerender

Theme and visual-style switching no longer calls `hub.requestRender()` from the dev menu.

Instead:
- `data-theme` and `data-theme-style` are updated directly on the host;
- CSS tokens update in place;
- a short backdrop crossfade class smooths the visual handoff.

This avoids the reload-like flash during theme changes.


## Longer theme crossfade

Theme background crossfade duration increased from 520ms to 1250ms.

The overlay now fades through multiple opacity stops so the visual theme transition is intentionally noticeable and smooth.


## Real background crossfade

The theme backdrop crossfade now snapshots the old background before changing theme tokens.

Flow:
1. read current `--mha-page-bg`;
2. store it in `--mha-theme-crossfade-from`;
3. change `data-theme` / `data-theme-style`;
4. fade the old background overlay out over the new background.

This creates an actual old-to-new background transition instead of a simple overlay wash.


## All theme crossfade 2s

Theme crossfade duration is now 2000ms.

The crossfade is applied to all visual theme preference changes from the dev menu:
- light/dark theme;
- iOS/OneUI/Material visual style;
- global icon shape.

The background crossfade snapshots the old background before changing tokens, then fades it over the new theme.


## Resize no-flash

Widget resize no longer calls `render()` on pointer release.

During resize, the widget's dataset and CSS custom properties are updated live.
On finish, the new size is saved and square-unit sync is scheduled without rebuilding the Shadow DOM.


## Edit mode widget dance

Edit mode now adds a CSS-only widget wiggle/dance and highlighted contour.

- No render required.
- Widgets use staggered animation delays.
- Dragging/resizing pauses the dance.
- `prefers-reduced-motion` disables the animation.


## Rerender cleanup pass

Reduced unnecessary full Shadow DOM renders.

Converted to targeted DOM/CSS updates:
- screensaver preview toggle;
- screensaver nowbar toggle;
- screensaver clock variant change;
- window resize runtime layout attribute sync.

Full `render()` is still kept for:
- initial mount;
- new hass assignment;
- reset grid;
- structural recovery when styled grid units mismatch.


## Reduce widget internal gap

Reduced the internal widget grid gap.

The internal gap is now independent from the global grid gap:

```css
--mha-widget-inner-gap: var(--mha-widget-content-gap, clamp(0.2rem, 0.55vw, 0.45rem));
```

This keeps content units tighter inside widgets without changing spacing between widgets.


## Reduce widget inner padding

Reduced the internal padding between the widget contour and the widget's internal content grid.

```css
--mha-widget-inner-padding: var(--mha-widget-inner-inset, clamp(0.38rem, 0.9vw, 0.65rem));
```

This brings internal content closer to the widget edge while staying tokenized and overrideable through `--mha-widget-inner-inset`.


## Reusable UI component library

Added initial reusable UI components:

- `createButton()` / `styles/components/button.css`
- `createPill()` / `styles/components/pill.css`
- `createToggle()` / `styles/components/toggle.css`
- `createSlider()` / `styles/components/slider.css`

Each component has theme-style specific rules for iOS, OneUI, and Material.

A temporary demo layout was added to `slot-a` to validate placement inside the widget internal grid.


## Widget layout helpers

Added reusable widget internal layout helpers:

- `src/widgets/widget-layout.js`
- `styles/widgets/widget-layout.css`

Helpers:
- `createWidgetInnerGrid()`
- `createWidgetUnit({ col, row, colSpan, rowSpan, children })`
- `createWidgetText({ text })`

The `slot-a` demo now uses these helpers instead of manually creating grid units.


## Fix edit overlay after widget layout helpers

Repaired edit-mode visual behavior after introducing `widget-layout.js`.

- Edit controls/guides are hidden outside edit mode with opacity, visibility and pointer-events.
- Resize handle is display:none outside edit mode.
- Widget dance/glow animation restored in edit mode.
- Widget internal layout was left untouched.


## Edit controls above widget content

Edit-mode controls and visual guides now sit above the internal widget content grid.

- widget content grid: lower layer;
- edit tools / resize handle / size badge: higher layer;
- drop/resize outlines remain readable.


## Opaque edit controls and red delete

Edit-mode affordances are now opaque so they remain visible over widget content.

- edit buttons and badges use solid readable surfaces;
- the delete/close button is red through `data-action="close"`;
- the move button remains neutral.


## Remove edit button reserved space

The edit button is now treated strictly as a floating overlay.

The grid uses symmetrical left/right padding so the right side no longer reserves extra space for the edit button.


## Vertical dock for tablet and desktop

The dock is now responsive:

- mobile: bottom horizontal dock;
- tablet/desktop: right-side vertical floating dock.

This uses the right-side free space without reserving layout space in the grid.


## Dock autohide mobile only

Dock scroll auto-hide is now limited to mobile.

- mobile: bottom dock can hide while scrolling;
- tablet/desktop: vertical dock remains visible as a persistent side rail.


## Vertical dock top alignment

On tablet/desktop, the vertical dock now aligns its top edge with the first widget row instead of centering vertically.

It uses:

```css
--mha-dock-top: max(var(--mha-statusbar-reserved-top), var(--mha-page-padding));
```


## Mobile dock 4 icon pages

Mobile dock now shows at most 4 icons per page.

- icons are grouped into pages of 4 in `dock.js`;
- mobile dock scrolls horizontally with snap points;
- odd icon counts are handled naturally by the last partial page;
- tablet/desktop vertical dock flattens the page wrappers with `display: contents`.


## Mobile dock widget width and hidden status bar

Mobile-only layout polish:

- dock width now matches the widget/grid content width;
- status bar is hidden on mobile;
- the grid no longer reserves top status-bar space on mobile;
- widgets can fill the freed top area.


## Mobile dock 1.5x height

Mobile dock height is now scaled to 1.5x its base widget-like height:

```css
--mha-dock-height-scale: 1.5;
```

The dock still shows 4 icons per page.


## Mobile dock proportional icons

Mobile dock icons now scale from the dock's available width/height instead of using a mostly fixed clamp.

The icon size respects:
- 4 visible icons per page;
- dock padding;
- dock internal gap;
- dock height.

```css
--mha-icon-size: min(var(--mha-dock-icon-from-width), var(--mha-dock-icon-from-height));
```


## Mobile dock size guard

Added a mobile safety layer so the bottom dock cannot become a giant panel.

The dock keeps:
- same widget/grid width;
- 4 icons per page;
- proportional icon sizing;
- larger dock height;

but now has a maximum height:

```css
--mha-dock-max-height: clamp(5.25rem, 18vh, 6.75rem);
```

and a mobile icon cap:

```css
--mha-icon-size-max-mobile: clamp(3rem, 14vw, 4.15rem);
```


## Restore mobile dock icons

Mobile dock icon sizing was simplified.

The icon size is now based on the available dock width divided by 4, with a mobile max cap.
It no longer depends on inherited percentage height calculations, which could resolve to invalid/zero and hide the icons.


## Mobile dock simple scroll

Replaced mobile dock page wrappers with a robust direct-scroll layout.

Mobile dock:
- direct `.mha-dock-item` children;
- 4 visible icon slots;
- horizontal scroll/snap for additional icons;
- no page wrapper structure;
- easier to debug and less fragile.


## Custom mobile dock

Added a separate mobile-only dock:

- `src/layout/mobile-dock.js`
- `styles/layout/mobile-dock.css`

Mobile uses a floating lower-left launcher that opens a custom dock panel.
The standard dock is hidden on mobile and remains the vertical rail on tablet/desktop.

Icon rule:
- mobile dock icons still use `createIcon()` and `createIconSymbol()`;
- `mobile-dock.css` does not define icon shape properties;
- icons continue to follow the global `data-icon-shape` contract.


## Settings panel from dock

Added a real settings panel opened from the gear icon in both docks.

New files:
- `src/settings/settings-panel.js`
- `styles/settings/settings-panel.css`

Moved user-facing dev controls into settings:
- light/dark theme;
- iOS/OneUI/Material visual style;
- global icon shape;
- screensaver preview;
- screensaver now bar;
- screensaver clock variant;
- reset grid.

The gear icon dispatches `mha-open-settings`, and the host opens the settings panel without requiring a full dashboard render.


## Fix settings dock icon and mobile launcher

- Added reliable local `gear` and `apps` symbols to the icon catalog.
- Dock settings item now uses `symbol: "gear"` with `action: "settings"`.
- Both standard and mobile docks dispatch `mha-open-settings` from the gear item.
- The mobile floating launcher is visually only a normal `.mha-icon`; the button shell is transparent.
- The launcher icon therefore follows the global icon shape contract.


## Force settings gear dock icon

- Desktop/tablet dock now explicitly includes a 9th `gear` item for settings.
- Mobile dock panel also explicitly includes a `gear` item.
- `gear` and `apps` are guaranteed in the local icon catalog.
- Mobile launcher has no visible button shell; only its internal `.mha-icon` is visible.


## Dock settings only reserved rail

Dock is now reduced to a settings-only test state.

- desktop/tablet dock contains only the gear/settings icon;
- mobile dock panel contains only the gear/settings icon;
- tablet/desktop rail adapts to icon count and collapses compactly with one icon;
- tablet/desktop grid reserves right-side rail space so widgets do not render behind the dock.


## Plug settings panel to gear

The gear icon now opens the settings panel through a direct host callback.

- `createDock({ onSettings })`
- `createMobileDock({ onSettings })`
- host passes `onSettings: () => this._openSettings()`

The previous `mha-open-settings` event fallback remains available, but the main path is now direct and reliable.


## Fix missing settings methods

Fixed crash caused by `this._createSettingsPanel is not a function`.

The host class now explicitly defines:
- `_openSettings()`
- `_closeSettings()`
- `_syncSettingsDom()`
- `_createSettingsPanel()`
- settings-specific theme/icon handlers.

The gear callback now has a valid method to call.


## Light theme no white text contract

Added a global readability rule:

- in `data-theme="light"`, normal interface text should not be white;
- Material theme color structure is intentionally left untouched;
- white text remains allowed for explicit contrast exceptions such as danger buttons and inverted/dark controls;
- icon glyph colors remain owned by the icon component/theme contract.

New file:
- `styles/themes/light-text-contract.css`


## Status bar row alignment

Tablet/desktop status bar is now:
- slightly thinner;
- lower-shadow;
- aligned from the first widget's left edge to the outside edge of the dock rail.

Mobile status bar remains hidden.


## Settings modal background blur

Opening the settings panel now adds `is-settings-open` to the host.

The dashboard background/shell/dock/edit button are blurred and dimmed while the settings panel remains sharp and interactive.


## Settings use widget surface tokens

Settings panel now follows the same surface/color tokens as widgets.

- base settings surface uses `--mha-widget-surface`;
- sections and controls use `--mha-control-surface` / `--mha-widget-surface`;
- iOS light settings are brighter and more glass-like;
- Material palette structure is not redefined, only existing widget/control tokens are consumed.


## Rounder rounded-square icons

Adjusted the rounded-square icon radius token to 38%:

```css
--mha-icon-radius-rounded-square: 38%;
```

Only the rounded-square icon shape is changed. Squircle and circle are untouched.


## Icon radius token cleanup

Cleaned up the rounded-square icon radius token.

Canonical token:
```css
--mha-icon-radius-rounded-square: 32%;
```

Removed the old border-radius alias so rounded-square has a single source of truth.

Squircle and circle shapes are untouched.


## Remove global grid shadow

Removed any possible shell/grid/background shadow and softened iOS light widget depth.

- `.mha-background`, `.mha-shell`, and `.mha-grid` are forced to have no global shadow;
- iOS light widget shadows are reduced so stacked widgets do not merge into a vertical grid shadow;
- widget glass depth is kept mostly as subtle inset highlights.


## Orientation relayout

Fixed Safari responsive simulator orientation changes.

Viewport/orientation changes now compute a responsive signature based on:
- viewport width/height;
- portrait/landscape;
- layout mode;
- effective layout;
- active grid units.

If the signature changes, the host performs a layout-safe render so portrait → landscape can move from 1 column to 2 columns without a browser refresh.


## Orientation flash fix

Reduced visual artifacts during Safari responsive orientation changes.

- closed settings panel now gets `hidden`;
- closed settings panel is hard-hidden with CSS;
- responsive relayout adds `is-responsive-relayouting`;
- transitions/animations are suppressed during the short relayout window.


## Orientation dock flash fix

The standard dock and mobile dock are now hidden during the short responsive relayout window.

This prevents the dock from briefly appearing in the wrong position during Safari simulator orientation changes.


## Mobile dock panel surface tokens

The mobile floating dock panel now follows the same surface tokens as widgets.

- base panel derives from `--mha-widget-surface`;
- panel is slightly denser/darker than normal widget surfaces;
- iOS keeps a glass feel derived from widget tokens;
- OneUI remains opaque and clean;
- Material palette structure is preserved by consuming existing surface tokens only.


## Resize handle border-only polish

The resize handle no longer has a black square background.

It is now:
- an invisible generous hit target;
- a visible white L-shaped mark drawn on the widget edge;
- clipped by the widget overflow/radius so it follows the widget corner.


## Edit button icon shape token

The floating edit button now follows the global icon shape setting.

- rounded-square uses `--mha-icon-radius-rounded-square`;
- circle uses `--mha-icon-border-radius-circle`;
- squircle uses `--mha-icon-squircle-mask`.


## Edit button icon surface and edge alignment

The floating edit button now follows the full icon token contract:

- surface: `--mha-icon-bg`;
- border: `--mha-icon-border`;
- text/glyph: `--mha-icon-color`;
- shadow: `--mha-icon-shadow`;
- shape: global icon shape setting.

On mobile, it uses the same edge rhythm as the floating dock launcher.


## Hide mobile dock in edit mode

When the host is in edit mode (`.is-editing`), the mobile floating dock is hidden.

This prevents the dock launcher/panel from overlapping edit controls or adding visual clutter during layout editing.


## OneUI light grid shadow fix

Softened OneUI light shadows to prevent stacked widget shadows from visually merging into a vertical grid shadow.

Only OneUI light is affected:
- `--mha-widget-shadow`
- `--mha-floating-shadow`
- `--mha-dock-shadow`

Also added a OneUI-light-only guard to keep the grid/shell/background shadowless.


## Accent palettes

Added theme-style specific accent palettes.

New files:
- `src/settings/accent-palettes.js`
- `styles/themes/accent-palettes.css`

Each visual style has 10 accent colors:
- iOS;
- OneUI;
- Material.

The accent selector appears in Settings > Appearance between visual style and icon shape.

Accent applies to:
- system icons: dock, mobile dock, edit button;
- toggles;
- sliders;
- accent pills;
- primary buttons.

Accent choices are stable across light/dark mode and change their available palette based on the selected visual style.


## Fix accent handler method

Fixed palette swatch clicks.

The settings panel was calling `_applyAccentFromSettings()`, but the host method was not reliably present inside the `MhaControlHub` class.

The method is now explicitly defined in `mha-control-hub.js` and updates:
- host `data-accent`;
- document `data-accent`;
- `localStorage` global accent;
- `localStorage` per-style accent.


## iOS reference glass slider

Updated the iOS-only slider style to match the intended glassy mobile reference.

The iOS slider now uses:
- translucent rounded glass track;
- accent-filled progress;
- white floating thumb;
- light/dark iOS variants;
- active accent token for the fill.

OneUI and Material slider styles are intentionally untouched.


## iOS slider square-pill thumb and track

Adjusted the iOS slider itself, not a wrapper pill.

The iOS slider now uses square-pill geometry for:
- the track;
- the progress track;
- the thumb/button.

OneUI and Material are untouched.


## iOS slider wider centered thumb

The iOS slider thumb is now wider than tall and explicitly centered on the track.

New iOS-only tokens:
```css
--mha-slider-ios-thumb-width
--mha-slider-ios-thumb-height
```

WebKit/Blink centering uses:
```css
margin-top: calc((var(--mha-slider-ios-track-height) - var(--mha-slider-ios-thumb-height)) / 2);
```

OneUI and Material remain untouched.


## OneUI 7 reference tonal slider

Updated the OneUI-only slider style to follow the One UI 7 volume/brightness direction.

The OneUI slider now uses:
- a wide soft rounded track;
- tonal inactive surface;
- accent-filled progress;
- a subtle integrated thumb;
- active accent token for the filled part.

iOS and Material slider styles are intentionally untouched.


## OneUI slider accent progress and round thumb fix

Fixed OneUI slider behavior:

- progress bar uses the active accent;
- thumb uses a near-accent color;
- thumb is round and wider;
- thumb is vertically centered on the track;
- inactive track remains tonal.

Only OneUI slider CSS is affected.


## OneUI embedded label contained slider

OneUI slider now uses a larger self-contained control.

- label is placed inside the slider control;
- progress fill uses the active accent;
- thumb uses a near-accent color;
- thumb remains fully inside the track;
- slider becomes thicker to use the freed space.

Only OneUI slider styling is affected.


## OneUI custom visual slider

OneUI slider now uses a custom visual layer instead of relying on native range pseudo-elements.

- native input remains for interaction;
- custom visual track renders the inactive area;
- custom visual fill renders accent progress;
- custom visual thumb stays fully contained;
- embedded label sits inside the control.

This avoids Safari/WebKit range rendering issues.


## OneUI custom slider ratio fix

Fixed the custom OneUI slider visual calculation.

The slider now exposes:
```css
--mha-slider-value: 50%;
--mha-slider-ratio: .5;
```

The custom OneUI fill/thumb use the numeric ratio, avoiding Safari calc issues with percent division.


## OneUI fresh custom slider

OneUI slider was rebuilt from a fresh base instead of stacking overrides.

OneUI now uses:
- a dedicated DOM visual layer;
- real fill DOM element;
- real thumb DOM element;
- transparent native range input as interaction layer.

This keeps OneUI independent from native range pseudo-element quirks while preserving iOS/Material slider behavior.


## OneUI slider adaptive width fix

The OneUI slider now adapts to its container width.

- label column shrinks responsively;
- lane keeps a practical minimum width;
- progress fill uses the lane width;
- thumb is clamped inside the lane;
- narrow containers prioritize the slider lane over label space.


## Slider minimum two widget units

Sliders have a layout rule:

```text
Horizontal slider: never less than 2 internal widget units wide.
Vertical slider: never less than 2 internal widget units tall.
```

Use `createWidgetSliderUnit()` instead of raw `createWidgetUnit()` when placing sliders inside a widget.

The helper enforces:
- horizontal sliders: `colSpan >= 2`;
- vertical sliders: `rowSpan >= 2`.

This protects the track, progress bar, thumb, and label from becoming unusably compressed.


## Diagnosed OneUI slider layout fix

The OneUI slider issue was not only a visual slider bug.

Root cause:
- the slider was placed in a fixed internal widget slot;
- when the widget grew, that slider slot did not grow;
- extra CSS guard rules attempted to force grid span from CSS, which is fragile.

Fix:
- OneUI slider CSS was cleaned into one final block;
- fragile `grid-column-end: span max(...)` guard was removed;
- `createWidgetSliderUnit()` now enforces:
  - horizontal slider without label: min 2 columns;
  - horizontal slider with label: min 3 columns;
  - vertical slider: min 2 rows;
- the demo slider now consumes remaining row width when the widget grows.


## Widget layout syntax fix

Fixed a syntax error in `src/widgets/widget-layout.js` caused by a partial helper replacement.

`createWidgetSliderUnit()` is now rebuilt cleanly and validated with `node --check`.


## OneUI simple pill slider reset

OneUI slider was reset to the simplest possible usable version:

- rounded pill track;
- accent progress fill;
- no visible thumb;
- no visible text;
- native range input remains as a transparent interaction layer.

This is the new baseline before adding any future OneUI slider complexity.


## OneUI iOS-reference slider reset

Removed the custom OneUI slider attempt.

OneUI now uses the same native-range styling strategy as iOS:
- taller pill track;
- accent progress;
- accent thumb;
- no visible label for now.

This is the new simple OneUI slider baseline.


## SliderWidget architecture

Slider support is now split into two layers:

```text
src/ui/slider.js
→ low-level reusable slider control

src/widgets/slider-widget.js
→ full widget whose primary content is a slider
```

The slider control can still be used inside any widget. The SliderWidget owns widget-level concerns:
- full widget width/height;
- orientation auto;
- 4x1 / 1x4 behavior;
- future Home Assistant entity binding.

Temporary demo slider slots (`slot-f` and `slot-i`) now render through `createSliderWidgetContent()` instead of embedding slider layout directly in `empty-widget.js`.


## SliderWidget import fix

`empty-widget.js` still uses `createWidgetSliderUnit()` for the embedded Salon slider (`slot-a`), while `slot-f` and `slot-i` now use `SliderWidget`.

The import was restored so both layers can coexist:
- embedded slider control inside a widget;
- full SliderWidget as a standalone widget.


## createSlider import fix

`empty-widget.js` still creates an embedded low-level slider control in `slot-a`, so it must import `createSlider()` from `src/ui/slider.js`.

`slot-f` and `slot-i` continue to use the full SliderWidget path.


## clampSliderSpan cleanup fix

Removed the remaining stale `clampSliderSpan()` call in `createWidgetSliderUnit()`.

Slider widget spans now keep minimum useful sizes without imposing the old artificial max span helper.


## SliderWidget size contract

The reusable slider component is not size-limited.

The full SliderWidget has its own widget-level size contract:
- horizontal SliderWidget: minimum `2x1`, maximum `4x1`;
- vertical SliderWidget: minimum `1x2`, maximum `1x4`.

Once the SliderWidget receives its allowed span, the internal slider fills the
entire granted area. This keeps full slider widgets predictable while preserving
the low-level slider as a flexible reusable control for other widgets.


## SliderWidget safe area centering

The full SliderWidget now renders inside the same safe inset used by other widgets.
This keeps horizontal and vertical slider widgets from touching or being cropped by
widget edges.

OneUI SliderWidget instances are centered on both axes inside that safe area while
the low-level reusable slider component remains unchanged.


## SliderWidget resize contract

SliderWidget sizing is now enforced at widget-resize persistence level, not just
inside the widget content.

Only full SliderWidget instances are constrained:
- horizontal SliderWidget: `2x1` to `4x1`;
- vertical SliderWidget: `1x2` to `1x4`.

The low-level reusable slider component remains unrestricted.


## Slider rotor remeasure

Auto-oriented sliders now measure the nearest slider widget/unit instead of the
slider wrapper itself. The measured inline and block dimensions are written to
CSS variables and rechecked across two animation frames after resize.

This prevents vertical SliderWidget instances from keeping the previous compact
horizontal rotor length after being resized from `4x1` to `1x4`.


## SliderWidget span contract fix

The SliderWidget now uses its normalized widget contract size directly for its
internal grid span. The content layer no longer re-clamps with `activeGridUnits`,
which could collapse a 4x1 / 1x4 SliderWidget back toward a compact 3-unit span.

The widget shell still enforces:
- horizontal SliderWidget: `2x1` to `4x1`;
- vertical SliderWidget: `1x2` to `1x4`.

The low-level slider component remains unrestricted.


## OneUI and Material widget shape contract

In OneUI and Material, widget-level pill geometry is only allowed for:
- `2x1`;
- `1x2`.

All other widget sizes use the theme's normal rounded-square / rounded-rect
widget radius.

This rule applies only to widget containers. It does not affect internal pills,
buttons, icon shapes, sliders, or the iOS widget geometry.


## Sober edit tool buttons

The edit-mode move button was removed from widget tools. Drag and drop remains
handled by the widget itself and can be explained by onboarding.

The remaining close button uses a calm surface/border treatment with no glow,
keeping edit controls visible without making them visually noisy.


## Edit button icon size contract

The edit launcher keeps its current touch target, but its SVG glyph now follows
the same `--mha-icon-glyph-size` token used by dock/widget icons. This keeps the
edit icon visually aligned with the rest of the interface without shrinking the
button itself.


## Edit button accent contract

The edit launcher is treated as a system control and now follows the same
accent-aware system icon tokens as dock/system icons:

- `--mha-system-icon-bg`;
- `--mha-system-icon-color`;
- `--mha-system-icon-border`;
- `--mha-system-icon-shadow`.

Its size and glyph scale remain controlled by `styles/layout/shell.css`.


## Edit button accent cascade fix

`styles/layout/shell.css` loads after `styles/themes/accent-palettes.css`, so
base edit-button rules could override the accent palette rules.

A final shell-level guard now binds `.mha-edit-button` to the live system icon
accent tokens:
- `--mha-system-icon-bg`;
- `--mha-system-icon-color`;
- `--mha-system-icon-border`;
- `--mha-system-icon-shadow`.

The SVG also stays bound to `currentColor`.


## Automatic icon shape mapping

Icon shape now supports an `Auto` setting.

When icon shape is set to `Auto`, the effective icon shape follows the selected
visual style:

```text
iOS      → rounded-square
OneUI    → squircle
Material → circle
```

Manual choices still override the automatic mapping:
- rounded-square;
- squircle;
- circle.


## Icon shape Auto settings fix

The settings select now includes `Auto`.

`Auto` stores as `mha-icon-shape = auto` and resolves dynamically:
- iOS → rounded-square;
- OneUI → squircle;
- Material → circle.

The legacy `mha-dev-icon-shape` key is still read/written for compatibility.


## Icon shape Auto state and mask fix

Icon shape now separates:
- `data-icon-shape-setting`: the user preference (`auto`, `rounded-square`, `squircle`, `circle`);
- `data-icon-shape`: the effective CSS shape.

`Auto` remains visible in settings instead of being replaced by the resolved
shape.

Squircle mask rules are explicitly removed for `rounded-square` and `circle` so
Safari/WebKit cannot keep stale squircle clipping artifacts.


## Final icon shape Auto fix

The settings panel now always reads the user icon-shape preference from
`getStoredIconShapeSetting()`, never from the effective `data-icon-shape`.

This prevents `Auto` from snapping back to the resolved shape.

A final CSS guard also removes WebKit masks whenever the effective shape is not
`squircle`, preventing stale squircle cutouts on rounded-square and circle icons.


## Icon shape Auto final v2 fix

The icon shape settings handler now saves `auto` as the user setting and applies
only the resolved effective shape to `data-icon-shape`.

This prevents the settings panel from snapping back to `squircle` after choosing
Auto.


## Initial appearance defaults

Fresh installs / empty localStorage now start with:

```text
Theme: Auto
Visual style: OneUI
Icon shape: Auto
Accent: first OneUI accent (blue)
```

Theme `Auto` follows the system light/dark preference. Existing saved user
preferences are preserved and are not overwritten.


## Theme Auto missing helper fix

Added the missing theme setting helpers used by `syncThemeAttributes()`:
- `getSystemThemePreference()`;
- `normalizeThemeSetting()`;
- `resolveTheme()`;
- `getStoredThemeSetting()`.

This fixes the startup `ReferenceError: Can't find variable: getStoredThemeSetting`.


## OneUI light slider track contrast

The inactive slider track in OneUI light mode is slightly darker so it remains
visible on light widget surfaces. The accent fill/progress color is unchanged.


## OneUI slider fill translucency

OneUI slider progress/fill now keeps the accent hue but uses a translucent
`color-mix()` treatment:
- light theme: slightly softer;
- dark theme: slightly stronger.

This affects both embedded sliders and SliderWidget instances because they share
the same low-level slider component.


## Material tablet/desktop dock pill

In Material You only, the tablet/desktop dock container uses a pill/capsule
radius. The mobile floating dock, iOS, and OneUI remain unchanged.


## Safe render cleanup pass

A cautious performance/stability pass was added:

- initial shell/dock/settings/edit UI fades in after the first render settles;
- viewport/orientation changes are coalesced through `requestAnimationFrame`;
- during responsive relayout, transient transitions are suppressed to reduce flash;
- theme/style/accent/edit behavior remains token/class-driven instead of being refactored.

This pass intentionally avoids large rendering architecture changes.


## Settings backdrop by visual style

When settings are open:
- iOS blurs the page behind the sheet;
- OneUI also blurs the page behind the sheet;
- Material does not blur and instead dims/darkens the page with a stronger scrim.


## Material You dynamic surfaces

Material You surfaces now derive from the selected accent color.

The Material layer defines dynamic color roles:
- primary;
- primary / secondary / tertiary containers;
- surface tint;
- surface container low / regular / high / highest;
- outline / outline variant.

Widgets, settings sections, dock surfaces, pills, buttons, toggles, and sliders
use these Material roles. iOS and OneUI are unchanged.


## Material borderless surfaces

Material surfaces no longer use visible borders. The Material style now relies on:
- dynamic container color;
- surface tint;
- elevation/shadow;
- accent feedback for edit/focus states.

Border geometry is mostly preserved by making surface border colors transparent
instead of removing border width outright.


## Material light settings dim tuning

Material settings still use dim/scrim instead of blur. In light mode, the dim is
now softer so the background does not become overly gray while the settings
sheet remains clearly elevated.


## Material tonal background

Material You now uses a calm tonal app background derived from the selected
accent color.

- iOS and OneUI keep the decorative wallpaper/blob background.
- Material disables the decorative blobs/orbs and uses a stable accent-derived
  background surface.
- Light/dark Material use different accent mix strengths.


## Material solid background

Material now uses a truly solid tonal background derived from the selected
accent. Decorative background spans/blobs are disabled directly in Material mode.

iOS and OneUI keep the decorative blob wallpaper.


## OneUI-only animated blobs

Background behavior by visual style:

- iOS: decorative blobs remain visible but stable.
- OneUI: decorative blobs animate gently.
- Material: blobs remain disabled and the background stays solid/tonal.

`prefers-reduced-motion` disables OneUI blob animation.


## OneUI orbiting blobs

OneUI background blobs are now more visible and centered. Each blob has its own
orbit/crossing animation so the motion feels intentional and Samsung-like:
- central concentration;
- slow orbiting paths;
- crossing trajectories;
- stronger but still soft opacity.

iOS blobs remain stable, and Material keeps its solid tonal background.
