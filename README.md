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
