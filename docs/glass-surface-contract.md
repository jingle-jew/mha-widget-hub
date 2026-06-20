# Glass Surface Contract

MHA exposes a reusable glass surface primitive for shell surfaces and future widget/theme packs.

The primitive lives in `styles/core/glass-surface.css`.

It centralizes the persistent surface material behavior:

- standard backdrop filtering;
- WebKit-prefixed backdrop filtering;
- fallback filtering when blur is unavailable or visually limited;
- Firefox reflection fallback behavior.

## Public class

Use `mha-glass-surface` when a custom surface should participate in the MHA glass system.

## Existing consumers

The core shell currently applies the primitive contract to:

- `.mha-widget`
- `.mha-dock`
- `.mha-status-bar`
- `.mha-screensaver-nowbar-tile`

This keeps persistent iOS and OneUI glass surfaces on the same blur path instead of duplicating browser fallbacks in every component file.

## Public tokens

Future widget packs may rely on these tokens:

- `--mha-glass-surface-background`
- `--mha-glass-surface-border`
- `--mha-glass-surface-blur`
- `--mha-glass-surface-saturation`
- `--mha-glass-surface-brightness`
- `--mha-glass-surface-filter`
- `--mha-glass-surface-fallback-filter`
- `--mha-glass-reflection-blend-mode`

Theme CSS should prefer changing these tokens over redefining backdrop filtering directly.

## Fallback model

The fallback path intentionally separates two cases:

1. Browsers with backdrop-filter support use the full glass filter.
2. Browsers or rendering contexts where backdrop blur is limited still keep saturation, brightness, and surface tint so the UI remains readable.

## Rule of thumb

Widgets should consume the glass surface contract. The shell should own browser-specific blur behavior.
