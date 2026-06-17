# Adding themes

MHA themes are registry-driven.

## Goal

To add a theme:

```text
1. Create one CSS file in src/styles/themes/
2. Add one entry to src/settings/theme-registry.js
```

The settings panel, theme IDs, default icon shape and CSS manifest are generated from the registry.

## Create the CSS file

Create:

```text
src/styles/themes/my-theme.css
```

Example:

```css
:host([data-theme-style="my-theme"]) {
  --mha-primary-surface: rgba(24, 24, 28, 0.72);
  --mha-on-primary-surface: rgba(255, 255, 255, 0.10);

  --mha-secondary-surface: rgba(255, 255, 255, 0.08);
  --mha-on-secondary-surface: rgba(255, 255, 255, 0.12);

  --mha-accent-surface: rgba(80, 160, 255, 0.85);
  --mha-overlay-surface: rgba(12, 12, 16, 0.78);

  --mha-primary-text: rgba(255, 255, 255, 0.96);
  --mha-secondary-text: rgba(255, 255, 255, 0.68);
}
```

## Register the theme

In `src/settings/theme-registry.js`, add an entry:

```js
{
  id: "my-theme",
  label: "My Theme",
  css: "themes/my-theme.css",
  defaultIconShape: "rounded",
  order: 100,
}
```

## What is automatic?

After registration, MHA automatically wires:

- settings panel style option;
- valid theme style ID;
- default icon shape;
- CSS manifest entry.

## Recommended theme rules

A theme should define surfaces and text tokens, not component-specific hacks.

Prefer:

```css
--mha-primary-surface
--mha-secondary-surface
--mha-accent-surface
```

Avoid styling individual widgets directly from a theme unless the exception is intentional.
