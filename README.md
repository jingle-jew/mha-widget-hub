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
