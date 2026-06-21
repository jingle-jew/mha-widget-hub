# Surface Migration Guardrails

This document lists non-negotiable guardrails for the MHA surface contract migration.

These criteria should be checked before and after every migration phase.

## Primary guardrail: OneUI must remain visually stable

OneUI is currently the most visually approved theme and must not be used as collateral damage while cleaning iOS surfaces.

During the surface-contract migration:

- OneUI background must remain visually unchanged.
- OneUI surface layering must remain visually unchanged unless a change is explicitly requested.
- OneUI blur/filter/shadow behavior must remain visually unchanged unless a change is explicitly requested.
- OneUI dock, status bar, widgets, settings panels, widget manager, widget config popup and page creator must remain visually stable.

Any phase that changes OneUI should be considered a regression unless the phase explicitly targets OneUI.

## Primary guardrail: background color extraction must keep working

Automatic accent/background color extraction is part of the theme system and must continue to work.

During migration:

- Background extraction must still read the intended wallpaper/background source.
- New surface tokens must not hide, replace, or bypass the source used by accent extraction.
- Theme backgrounds should remain owned by theme/background tokens, not by component surface tokens.
- Surface refactors must not move wallpaper/background logic into panel/widget/shell components.
- Auto accent behavior for OneUI must continue to produce the same result unless explicitly changed.

## Important distinction: background vs surface

The background system and the surface system should remain separate.

Background tokens answer:

```text
What is behind the UI?
```

Surface tokens answer:

```text
What material does this UI layer use?
```

The migration should not merge these two concepts.

Recommended separation:

```css
/* Background/canvas */
--mha-bg-primary
--mha-page-background
--mha-surface-canvas

/* Surfaces/components */
--mha-surface-primary
--mha-surface-panel
--mha-surface-shell
--mha-surface-control
```

## Phase validation checklist

Before merging any migration phase, manually check:

### OneUI

- [ ] Background still looks the same.
- [ ] Auto accent/background extraction still works.
- [ ] Widgets still look the same.
- [ ] Dock still looks the same.
- [ ] Status bar still looks the same.
- [ ] Settings panel still looks the same.
- [ ] Widget Manager still looks the same.
- [ ] Widget Config popup still looks the same.
- [ ] Page Creator still looks the same.

### iOS

- [ ] Liquid remains visually coherent.
- [ ] Frosted remains visually coherent.
- [ ] Any iOS visual change is intentional and tied to the phase goal.

### Material

- [ ] Material remains visually unchanged unless explicitly targeted.
- [ ] Material opaque/tonal surfaces remain opaque where intended.

## CSS safety rules

### Do not remap global aliases in a way that changes OneUI

When adding new global aliases, default them to existing semantic tokens.

Good:

```css
--mha-surface-shell: var(--mha-shell-surface, var(--mha-surface-glass));
```

Risky:

```css
--mha-surface-shell: var(--mha-surface-primary);
```

The risky version can change OneUI if its shell currently depends on `--mha-surface-glass`.

### Do not change background extraction tokens during surface migration

Avoid changing these unless the phase explicitly targets background/accent extraction:

```css
--mha-bg-primary
--mha-page-background
--mha-bg-base-1
--mha-bg-base-2
--mha-bg-radial-1
--mha-bg-radial-2
--mha-bg-radial-3
--mha-bg-blob-1
--mha-bg-blob-2
--mha-bg-blob-3
--mha-bg-blob-4
--mha-bg-blob-opacity
```

### Do not make component surfaces own wallpaper logic

Widgets, panels, dock and status bar should not become the source of truth for background extraction.

They should consume surface roles only.

## Migration implication

Phase 2 must be strictly non-destructive.

That means adding aliases such as:

```css
--mha-surface-shell: var(--mha-shell-surface, var(--mha-surface-glass));
--mha-surface-popup: var(--mha-surface-panel);
--mha-surface-control: var(--mha-control-surface, var(--mha-surface-tertiary));
```

without changing existing theme mappings.

Only later phases should remap iOS-specific values, and those remaps should be scoped to iOS selectors.

## Success condition

The migration is safe when the new contract can be introduced while OneUI stays visually identical and background color extraction continues to function.
