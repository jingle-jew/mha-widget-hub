<p align="center">
  <img src="assets/brand/mha-widget-hub-logo.svg" alt="MHA Widget Hub" width="760">
</p>

# MHA Widget Hub

> **The family-first Home Assistant launcher.**

MHA Widget Hub is an experimental custom Home Assistant launcher/dashboard project focused on a premium, spatial, widget-based interface for family homes.

The current project already includes a visual shell, responsive grid system, edit mode, widget placement tools, a widget manager MVP, theme styles, and reusable UI components. It is **not yet explicitly connected to Home Assistant entities/services** in this prototype stage. The foundation is being built first: interface, layout, interaction model, and design system.

## Summary

MHA Widget Hub aims to make Home Assistant feel less like a technical dashboard and more like a polished home launcher.

Instead of thinking in cards stacked in a dashboard, MHA thinks in widgets placed on a spatial grid. The user can enter edit mode, choose widgets from a manager, see valid ghost placement slots, and build a layout visually. The long-term goal is simple: a clean interface for the family, with enough power behind it for the person managing the smart home.

## Project status

Current state: **visual/interaction prototype with working layout systems**.

Present today:

- custom shell and launcher-style UI;
- responsive widget grid for mobile, tablet, and desktop;
- edit mode;
- widget move mode with arrow-based movement;
- ghost drop slots for valid placement;
- widget manager MVP;
- placeholder widgets and slider widgets;
- visual themes: OneUI, iOS-inspired, and Material-inspired;
- accent palettes and icon shape options;
- screensaver UI;
- floating controls;
- mobile portrait/landscape behavior rules;
- reusable UI primitives such as sliders, toggles, buttons, icons, and pills.

Not present yet:

- explicit Home Assistant entity binding;
- service calls;
- real widget configuration flow;
- production-ready HACS packaging;
- multi-user/family permissions;
- polished documentation for installation inside Home Assistant.

## Why “launcher”?

MHA Widget Hub is designed around the idea that a smart home interface should feel like the home screen of the house.

A launcher is not just a page of cards. It is a place where the most important controls live, where layout matters, and where visual hierarchy helps everyone understand what to touch.

MHA uses that model for Home Assistant:

- widgets are placed spatially;
- available positions are shown visually;
- the grid prevents invalid placement;
- editing is intentional and separated from everyday use;
- the normal interface stays clean for non-technical users.

## Design goals

### Family-first

The everyday interface should be obvious, calm, and touch-friendly. The goal is not to expose every entity at once. The goal is to make the right controls easy to find.

### Power-user managed

The advanced user can design the layout, tune widgets, choose styles, and eventually bind entities. The rest of the household should not need to understand the machinery underneath.

### Spatial editing

MHA avoids freeform chaos. Widget placement is guided by the grid. When adding or moving a widget, the interface shows valid ghost slots so the user chooses from legal positions instead of fighting collisions.

### Premium visual language

The interface is inspired by modern mobile operating systems: soft surfaces, clear typography, blurred floating controls, adaptive themes, and launcher-like interaction patterns.

## Core interaction model

The current editor is built around three main concepts:

### Add

Enter edit mode, tap the `+` button, choose a category, choose a widget variant, then pick a ghost slot on the grid.

### Move

Use the widget move button to enter move mode. From there, widgets can be moved with directional arrows and smart swap logic.

### Place

Ghost slots show only valid positions for the selected widget size. This keeps the layout legal and predictable.

Free browser drag-and-drop has intentionally been removed. The official movement model is now slot-based placement and arrow-based movement.

## Current widget manager MVP

The widget manager currently includes common starter categories:

- Weather;
- Lights;
- Climate;
- Media;
- Security;
- System.

These categories include placeholder widgets and slider widgets in useful sizes. They are meant to validate the complete flow before real Home Assistant configuration is added.

## Responsive behavior

MHA currently treats layouts differently depending on screen class:

### Desktop and tablet

- non-scroll-first launcher surface;
- larger grid;
- editing tools available;
- widget manager opens as a wider settings-style panel.

### Mobile portrait

- scrollable launcher;
- floating controls;
- edit mode available;
- widget manager uses mobile sheet dimensions;
- categories appear as a single-column list.

### Mobile landscape

- edit mode disabled;
- widget manager hidden;
- floating edit/add controls hidden.

## Themes

MHA currently includes three visual style directions:

### OneUI

Soft, warm, rounded, translucent, and family-friendly.

### iOS-inspired

Glassier and more reflective, with an emphasis on soft depth.

### Material-inspired

Tonal containers, flatter elevation, and Material-like structure.

Each style supports accent color choices and icon shape preferences.

## Repository structure

The project is intentionally modular:

```text
mha-control-hub.js              Main custom element / shell orchestration
src/
  components/                   Icon primitives
  core/                         Storage helpers
  icons/                        Icon symbol catalog
  layout/                       Shell, dock, status bar, layout engine
  screensaver/                  Screensaver UI
  settings/                     Settings panel and accent palettes
  ui/                           Reusable UI controls
  widget-manager/               Widget Manager MVP
  widgets/                      Widget renderers and widget layout helpers
styles/
  components/                   UI primitive styles
  core/                         Tokens and background
  layout/                       Shell/grid/dock/floating controls/status bar
  screensaver/                  Screensaver styles
  settings/                     Settings panel styles
  themes/                       OneUI/iOS/Material theme styles
  widget-manager/               Widget Manager styles
  widgets/                      Widget styles
assets/
  brand/                        Logo and icon assets
```

## Development notes

This project is currently moving fast and prioritizes the foundation of the product:

1. visual shell;
2. responsive grid;
3. editor model;
4. widget manager;
5. theme system;
6. then Home Assistant binding.

The intent is to avoid prematurely wiring Home Assistant entities before the interface model is strong enough.

## Roadmap

Likely next steps:

- real widget configuration flow;
- Home Assistant entity selectors;
- service-call bindings;
- weather/media/light/climate widget implementations;
- layout import/export;
- multi-page launcher support;
- HACS-ready packaging;
- documentation for installation and usage;
- app/webview launcher strategy for family devices.

## Name

**MHA Widget Hub** means a widget-first hub for managing the smart home experience.

The product idea is simple:

> Made for the family, managed by the power-user.

## License

License not selected yet.


## Accent swatch selected checkmarks

Accent swatches now use the same internal check mark selected state across iOS,
OneUI and Material. External contour/ring highlights were removed to keep the
selection treatment clean and compatible with squircle masking.


## First launch defaults

On a fresh browser/device with no saved preferences, MHA Widget Hub opens with:

- theme: Auto;
- visual style: OneUI;
- accent: first OneUI blue;
- icon shape: Auto;
- screensaver: enabled;
- screensaver delay: 30 seconds;
- Now Bar: enabled;
- clock: digital.

These are only fallback values. Once the user changes a setting, the saved
localStorage preference remains persistent and is not overwritten by the defaults.


## Theme Auto first-launch fix

The theme setting now defaults to `Auto` on first launch. Persisted user choices
from localStorage still win, but document-level effective theme bootstrap values
are no longer allowed to make a fresh install appear as `Sombre`.


## Widget Manager settings token parity

The Widget Manager now follows the Settings panel visual contract more closely:
same sheet class, same surface tokens, and category/widget tiles styled like
settings sections across iOS, OneUI, and Material.


## Status bar safe frame alignment

The experimental centered-shell content frame was rolled back. Tablet/desktop
status bar alignment now uses a safer CSS-only frame: the shell and grid math
remain untouched, while the status bar and floating edit button use the same
left/right page padding inset.


## Status bar padding compensation

Tablet/desktop status bar alignment now compensates for the existing horizontal
padding inside `.mha-widget-area` and `.mha-grid` instead of removing that
padding. The internal grid padding remains intact, while the status bar left
inset is adjusted so the visual widget edge aligns with the right-side frame.


## Grid frame left nudge

After status bar alignment, tablet/desktop grid placement received a very small
left nudge. This does not change grid math, widget positions, or internal
padding; it only optically aligns the visible widget frame.


## Grid vertical nudge rollback

The previous vertical grid compensation was too aggressive and made the widget
grid sit too high. The grid is restored to the earlier horizontal-only nudge,
while the status bar shadow remains removed.
