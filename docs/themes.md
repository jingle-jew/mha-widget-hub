# Themes Guide

## Overview

MHA Widget Hub uses a registry-driven theme system.

A theme is composed of:

- Theme registration
- Theme stylesheet
- Accent palette integration
- Optional defaults (icon shapes, visual identity)

The goal is that a new theme can be added with minimal code changes.

---

## Current Themes

- OneUI
- iOS Liquid Glass
- iOS Frosted Glass
- Material

---

## Adding a Theme

### 1. Create a Theme Stylesheet

Create:

```text
styles/themes/my-theme.css
```

The stylesheet should define the visual identity of the theme through MHA tokens.

---

### 2. Register the Theme

Add the theme to the theme registry.

Typical metadata:

```js
{
  id: "my-theme",
  label: "My Theme"
}
```

---

### 3. Verify Accent Support

Themes should support MHA accent palettes whenever possible.

This allows users to:

- choose a manual accent color;
- use automatic wallpaper-based accents;
- keep consistent widget coloring.

---

## Theme Responsibilities

Themes control:

- widget surfaces;
- panel surfaces;
- dock surfaces;
- status bar surfaces;
- borders;
- typography;
- icon appearance;
- shadows;
- blur effects.

Themes should not contain widget-specific business logic.

---

## Design Philosophy

### OneUI

Focus:

- clarity;
- contrast;
- readable surfaces;
- practical dashboard appearance.

### iOS Liquid Glass

Focus:

- translucent surfaces;
- reduced visual weight;
- minimal shadows;
- floating appearance.

### iOS Frosted Glass

Focus:

- classic Apple frosted blur style;
- stronger material separation;
- subtle tinting.

### Material

Focus:

- Material-inspired surfaces;
- accent-driven emphasis;
- clear hierarchy.

---

## Best Practices

Prefer tokens.

Avoid hardcoded colors.

Avoid widget-specific overrides.

Keep theme behavior centralized.
