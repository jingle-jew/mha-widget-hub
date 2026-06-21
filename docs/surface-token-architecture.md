# Surface Token Architecture

This document explains how MHA should think about tokens, semantic tokens, shell tokens, surface tokens, and component tokens.

It is intentionally explanatory. It does not define the final contract yet and does not imply visual changes by itself.

## Why this matters

MHA's long-term goal is:

```text
1 theme = 1 JS + 1 manifest + theme-owned CSS/tokens
```

For that to work, components cannot depend on theme-specific selectors like:

```css
:host([data-theme-style="ios"]) .mha-status-bar { ... }
```

as the main way to style surfaces.

Instead, MHA Core should define a stable vocabulary of roles, and each theme should provide values for those roles.

The target architecture is:

```text
MHA Core
  defines roles and component contracts

Theme
  provides visual values for those roles

Components
  consume roles, not theme-specific implementation details
```

## What is a token?

A token is a named CSS value.

Example:

```css
--mha-widget-radius: 24px;
--mha-surface-blur: 16px;
--mha-widget-surface: rgba(255,255,255,.12);
```

A token can represent almost anything:

- color
- surface background
- border color
- blur amount
- saturation amount
- shadow
- radius
- spacing
- typography
- animation duration

Tokens are useful because components can reference a name instead of hardcoding a value.

```css
.mha-widget {
  background: var(--mha-widget-surface);
}
```

## What is a raw/concrete token?

A raw or concrete token describes a specific visual material value.

Examples:

```css
--mha-ios-liquid-surface: rgba(255,255,255,.24);
--mha-ios-liquid-primary-surface: linear-gradient(...);
--mha-ios-frosted-surface: linear-gradient(...);
--mha-ios-frosted-tile-surface: rgba(242,242,247,.76);
```

These tokens are theme-specific. They describe what iOS Liquid or iOS Frosted looks like.

They answer:

> What is this material made of?

They should usually live inside a theme file such as:

```text
styles/themes/ios.css
```

or a future theme package.

## What is a semantic token?

A semantic token describes the purpose or role of a value, not its visual identity.

Examples:

```css
--mha-surface-primary
--mha-surface-secondary
--mha-surface-panel
--mha-border-primary
--mha-shadow-floating
--mha-blur-primary
```

These tokens answer:

> What is this value used for?

For example:

```css
--mha-surface-primary
```

should not mean “white translucent glass”. It should mean something like:

> the main surface material for primary MHA surfaces.

Then iOS, OneUI, Material, or any future theme can decide what that role looks like.

## Raw token vs semantic token

A raw token says what the value is.

```css
--mha-ios-liquid-primary-surface: linear-gradient(...);
```

A semantic token says what the value is for.

```css
--mha-surface-primary: var(--mha-ios-liquid-primary-surface);
```

A component should generally consume the semantic token, not the raw theme token.

Good:

```css
.mha-widget {
  background: var(--mha-surface-primary);
}
```

Less good:

```css
.mha-widget {
  background: var(--mha-ios-liquid-primary-surface);
}
```

Bad for extensibility:

```css
:host([data-theme-style="ios"][data-ios-glass="liquid"]) .mha-widget {
  background: linear-gradient(...);
}
```

The last example makes the component know too much about the theme.

## What is a component token?

A component token is a token scoped to a specific component or component family.

Examples currently present in MHA:

```css
--mha-widget-shell-surface
--mha-widget-shell-border
--mha-widget-shell-shadow
--mha-shell-dock-surface
--mha-shell-status-surface
--mha-panel-section-surface
--mha-slider-widget-surface
```

Component tokens are useful adapter tokens.

They sit between global semantic roles and actual selectors.

Example:

```css
:host {
  --mha-widget-shell-surface: var(--mha-surface-primary);
}

.mha-widget {
  background: var(--mha-widget-shell-surface);
}
```

This lets MHA Core say:

> Widgets usually use the primary surface.

while still allowing a theme or mode to say:

> In Frosted Glass, widget shells should use the section surface instead.

Component tokens are acceptable when they adapt global roles to a specific component. They become a problem when they become a second design system with unclear rules.

## What is a shell token?

Shell tokens describe persistent app chrome.

Current examples:

```css
--mha-shell-surface
--mha-shell-status-surface
--mha-shell-dock-surface
--mha-shell-panel-surface
--mha-shell-border
--mha-shell-shadow
--mha-shell-blur
```

Shell consumers include:

- dock
- status bar
- possibly primary panels/sheets
- persistent navigation surfaces

A shell token answers:

> What does the MHA shell/chrome material look like?

This is different from widget content surfaces or nested section surfaces.

## What is a surface token?

A surface token describes a visible layer that can hold content.

Examples:

```css
--mha-surface-primary
--mha-surface-secondary
--mha-surface-tertiary
--mha-surface-panel
--mha-surface-glass
```

Surfaces are about layering.

A simple model:

```text
page background
  ↓
primary surface
  ↓
on-primary / nested section surface
  ↓
secondary / tile surface
  ↓
control surface
```

This model is not about color names. It is about depth and containment.

## What does on-primary mean?

`on-primary` means:

> a surface placed on top of a primary surface.

It does **not** mean “text color on primary”.

In MHA's current naming, `on-primary-surface` is intended as a nested surface role.

Example:

```text
Settings sheet = primary/panel surface
Settings section = on-primary surface
Button/input inside section = secondary/control surface
```

The same idea can apply to widgets:

```text
Widget shell = primary surface
Button tile inside widget = on-primary or secondary surface
Slider track/control = control surface
```

## Recommended global layers

A future global MHA contract should probably distinguish these roles:

```css
--mha-surface-canvas
--mha-surface-primary
--mha-surface-on-primary
--mha-surface-secondary
--mha-surface-on-secondary
--mha-surface-panel
--mha-surface-popup
--mha-surface-control
--mha-surface-accent
```

And separate effects:

```css
--mha-border-primary
--mha-border-secondary
--mha-border-subtle

--mha-shadow-primary
--mha-shadow-floating
--mha-shadow-panel

--mha-blur-primary
--mha-blur-panel
--mha-blur-popup

--mha-saturation-primary
--mha-saturation-panel

--mha-highlight-primary
--mha-highlight-subtle
```

Surface, border, blur, shadow and highlight should not be collapsed into one token. They are separate ingredients of a material.

## Recommended relationship graph

The desired relationship should look like this:

```text
Theme raw material tokens
  ↓
Global semantic tokens
  ↓
Component adapter tokens
  ↓
Component CSS selectors
```

Example:

```css
/* Theme raw tokens */
:host([data-theme-style="ios"][data-ios-glass="liquid"]) {
  --mha-ios-liquid-shell-surface: linear-gradient(...);
  --mha-ios-liquid-shell-border: rgba(...);
  --mha-ios-liquid-shell-blur: 6px;
}

/* Global semantic mapping */
:host([data-theme-style="ios"][data-ios-glass="liquid"]) {
  --mha-surface-primary: var(--mha-ios-liquid-shell-surface);
  --mha-border-primary: var(--mha-ios-liquid-shell-border);
  --mha-blur-primary: var(--mha-ios-liquid-shell-blur);
}

/* Component adapter */
:host {
  --mha-widget-shell-surface: var(--mha-surface-primary);
  --mha-widget-shell-border: var(--mha-border-primary);
  --mha-widget-shell-blur: var(--mha-blur-primary);
}

/* Component CSS */
.mha-widget {
  background: var(--mha-widget-shell-surface);
  border-color: var(--mha-widget-shell-border);
  backdrop-filter: blur(var(--mha-widget-shell-blur));
}
```

## Why component adapter tokens are still useful

A widget and a dock may both use the same global role most of the time.

But sometimes a theme variant may need a difference.

Example:

- Liquid: widget shell uses the shell/primary surface.
- Frosted: widget shell uses the section/on-primary surface.

This is where adapter tokens help:

```css
:host([data-theme-style="ios"][data-ios-glass="liquid"]) {
  --mha-widget-shell-surface: var(--mha-surface-primary);
}

:host([data-theme-style="ios"][data-ios-glass="frosted"]) {
  --mha-widget-shell-surface: var(--mha-surface-on-primary);
}
```

The widget selector does not need to know about Liquid or Frosted.

## What should a theme own?

A theme should own visual values:

```css
--theme-shell-surface
--theme-section-surface
--theme-tile-surface
--theme-control-surface
--theme-border-primary
--theme-shadow-primary
--theme-blur-primary
```

In MHA naming, this may become:

```css
--mha-ios-liquid-shell-surface
--mha-ios-liquid-section-surface
--mha-ios-liquid-tile-surface
--mha-ios-liquid-control-surface
```

or for a future theme:

```css
--mha-theme-mytheme-shell-surface
--mha-theme-mytheme-section-surface
```

The theme should avoid owning component selectors directly unless the component truly needs a theme-specific personality.

Acceptable theme selector:

```css
:host([data-theme-style="ios"]) {
  --mha-surface-primary: var(--mha-ios-liquid-shell-surface);
}
```

Avoid when possible:

```css
:host([data-theme-style="ios"]) .mha-status-bar {
  background: ...;
}
```

## What should MHA Core own?

MHA Core should own:

- the semantic role names;
- the expected role meanings;
- the component adapter tokens;
- which component consumes which role;
- layout and geometry;
- fallback behavior.

MHA Core should not need to know the internal material recipe of every theme.

## What should components own?

Components should own:

- layout;
- internal spacing;
- interaction states;
- state-specific adapters;
- semantic token consumption.

Components should avoid owning:

- theme-specific colors;
- theme-specific blur values;
- theme-specific surface recipes;
- hardcoded iOS/OneUI/Material backgrounds.

## Current MHA issue in one sentence

MHA currently has the right pieces, but they are mixed together:

```text
raw theme tokens + semantic tokens + component adapter tokens + direct component overrides
```

all currently participate in final rendering.

That makes it hard to predict which surface wins.

## Migration principle

Do not replace everything at once.

The safe migration order is:

1. Document current consumers.
2. Define the global role vocabulary.
3. Add non-destructive semantic aliases.
4. Pick one theme variant, likely iOS, and map raw theme tokens to global roles.
5. Migrate one component family at a time.
6. Remove old overrides only after a visual check.

## Practical rule of thumb

When editing a component, ask:

> Is this value describing what the component is, or what the theme looks like?

If it describes the component role, it belongs in Core/component CSS.

If it describes the theme appearance, it belongs in theme tokens.

## Glossary

### Token

A named CSS value.

### Raw token

A concrete visual value, often theme-specific.

Example: `--mha-ios-liquid-primary-surface`.

### Semantic token

A role-based value describing purpose.

Example: `--mha-surface-primary`.

### Component token

A component adapter value mapping semantic roles to a component.

Example: `--mha-widget-shell-surface`.

### Shell token

A component-family token for persistent app chrome.

Example: `--mha-shell-dock-surface`.

### Surface token

A token representing a visible material layer.

Example: `--mha-surface-panel`.

### Effect token

A token representing blur, shadow, saturation, brightness, or highlight.

Example: `--mha-blur-primary`.

### Contract

The documented agreement between Core, themes, and components.

A contract says which tokens exist, what they mean, and who is allowed to set or consume them.
