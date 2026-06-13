<p align="center">
  <img src="assets/brand/mha-widget-hub-logo.svg" alt="MHA Widget Hub" width="760">
</p>

# MHA Widget Hub

> **The family-first Home Assistant launcher.**

MHA Widget Hub is a custom Home Assistant launcher built around a spatial,
widget-based interface for shared family spaces.

Instead of presenting a traditional stack of dashboard cards, MHA provides a
launcher surface where widgets have deliberate sizes, positions and visual
hierarchy. A power user configures the home; everyone else gets a calm,
touch-friendly interface.

The project includes a functional HACS-compatible integration, automatic
sidebar panel registration, persistent multi-page layouts, Home Assistant
entity/service helpers, a configurable light widget and a growing widget
system. It remains under active development: some catalog entries are complete
widgets, while others are still visual prototypes.

## Project Status

Current state: **working Home Assistant custom integration and evolving
launcher product**.

### Operational today

- HACS-compatible custom integration under `custom_components/mha_widget_hub`;
- automatic `/mha-control-hub` sidebar panel registration;
- responsive layouts for mobile, tablet and desktop;
- persistent multi-page launcher;
- edit, add, move, resize, variant-cycle and delete workflows;
- collision-aware placement with visible ghost slots;
- widget registry with canonical `kind`, variants and size contracts;
- OneUI, iOS-inspired and Material-inspired visual systems;
- configurable screensaver with clock variants and Now Bar;
- local persistence with migration backup and observable failures;
- automated syntax, unit and source/bundle synchronization checks.

### Home Assistant support

The frontend receives the Home Assistant `hass` object through the registered
panel. Reusable helpers handle entity availability, toggle calls, light
brightness, fan percentage, media volume, cover position and throttled slider
updates.

The **combined light toggle + slider widget** currently has the most complete
end-to-end configuration and HA binding. It can select a light entity, reflect
its state and brightness, disable unavailable controls and call the appropriate
Home Assistant services.

Other widgets are at different maturity levels. Clock, weather, button, toggle,
slider and composed widgets have real renderers and variants, but several still
use configured or demonstration data. Placeholder entries remain in parts of
the Media, Security, Climate and System catalogs.

See [Architecture](docs/architecture.md) for the widget maturity table, HA
service contracts, responsive matrix and persistence model.

## Product Vision

MHA aims to make Home Assistant feel less like a technical dashboard and more
like the home screen of the house.

> **Made for the family, managed by the power user.**

### Family-first

The everyday interface should be obvious, calm and comfortable on touch
screens. It should expose the right controls instead of every possible entity.

### Power-user managed

The advanced user chooses pages, widgets, entities, variants and visual style.
The rest of the household should not need to understand the underlying Home
Assistant model.

### Spatial editing

Widget placement is constrained by the grid. When adding or moving a widget,
MHA presents valid positions instead of allowing ambiguous overlaps.

### Premium visual language

The UI borrows useful patterns from modern mobile operating systems: clear
hierarchy, adaptive surfaces, restrained depth, large touch targets and
launcher-like interactions.

## Interaction Model

### Add

Enter edit mode, open the widget manager, choose a category and widget variant,
then select one of the valid placement slots.

### Move

Activate move mode and use the directional controls. The layout engine supports
direct swaps and group-aware movement where geometry permits.

### Resize and variants

Widgets follow registry-defined size contracts. Compatible widgets can be
resized or cycled through their registered variants without producing illegal
dimensions.

### Multi-page launcher

Pages can be created, renamed, reordered, assigned an icon and removed. Widget
content and placement are persisted per page and responsive layout.

Free browser drag-and-drop is not the primary movement model. MHA favors
explicit slots and directional movement for predictable mouse and touch
behavior.

## Themes

MHA ships three visual directions:

- **OneUI:** soft surfaces, rounded geometry and a warm family-oriented look;
- **iOS-inspired:** liquid/frosted glass and Control Center-inspired controls;
- **Material-inspired:** tonal surfaces and Material You-inspired controls.

The themes share semantic tokens for surfaces, borders, shadows, text and
controls. Fresh installs default to Auto theme, OneUI style, automatic icon
shape, enabled screensaver, 30-second delay, Now Bar and digital clock.

Stored preferences always take precedence over defaults.

## Installation

### HACS

1. Add `https://github.com/jingle-jew/mha-widget-hub` as a custom HACS
   repository of type **Integration**.
2. Install **MHA Widget Hub**.
3. Restart Home Assistant.
4. Open **Settings > Devices & services > Add integration**.
5. Search for **MHA Widget Hub** and submit the setup form.

The integration serves its bundled frontend and registers the sidebar panel
automatically. No manual `panel_custom:` entry is required.

The current package targets Home Assistant `2025.7.0` or newer.

See [Installation](docs/installation.md) for manual installation and integration
details.

## Documentation

- [Architecture](docs/architecture.md): widgets, HA bindings, responsive,
  themes, persistence and repository structure.
- [Development](docs/development.md): local server, tests, CI and bundle
  synchronization.
- [Installation](docs/installation.md): HACS and manual Home Assistant setup.
- [CSS layout audit](docs/layout-css-audit.md): historical layout and styling
  analysis.

## Quick Development Start

Requires Node.js 22 or newer.

```bash
npm ci
python3 -m http.server 4173
```

Open `http://localhost:4173/dev.html`, then run the complete quality suite with:

```bash
npm run check
```

The integration bundle is generated from the root frontend source:

```bash
npm run sync:frontend
```

Never edit `custom_components/mha_widget_hub/frontend/` directly. See
[Development](docs/development.md) for the full workflow.

## Current Limitations

- HA configuration is complete only for a subset of widgets;
- several catalog entries remain placeholders or demonstration surfaces;
- weather does not yet have a complete HA entity-selection flow;
- layouts are stored per browser/device;
- family roles and permissions are not implemented;
- accessibility and keyboard behavior need broader end-to-end review;
- the main orchestrator remains large and is being decomposed progressively;
- historical CSS overrides still need consolidation.

## Roadmap

### Near term

- extend entity configuration to generic toggle, slider, weather and button
  widgets;
- continue extracting layout, placement, persistence and theme controllers;
- add tests for storage migration and extracted placement logic;
- expose persistence errors in the visible UI;
- continue consolidating responsive and semantic CSS contracts.

### Medium term

- real HA-backed media, climate, security and system widgets;
- layout import/export and recovery tools;
- richer registry-driven previews;
- broader keyboard, focus and screen-reader support;
- visual regression coverage.

### Longer term

- optional user/profile-aware layouts;
- cross-device synchronization strategy;
- kiosk/app/webview launcher workflows for shared family devices.

## Name

**MHA Widget Hub** describes a widget-first hub for managing the smart-home
experience.

## License

A license has not been selected yet.
