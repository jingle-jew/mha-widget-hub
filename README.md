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
