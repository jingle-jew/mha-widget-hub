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

The project includes a HACS-compatible Home Assistant integration, automatic
sidebar panel registration, configurable widgets, multiple visual systems,
responsive layouts and a dedicated administration panel for entity visibility
management.

## Project Status

Current state: **functional Home Assistant launcher platform with configurable
widgets, multi-page layouts and administrative entity filtering.**

### Operational today

- HACS-compatible custom integration;
- automatic sidebar registration of:
  - `/mha-control-hub`
  - `/mha-admin`
- responsive layouts for mobile, tablet and desktop;
- persistent multi-page launcher;
- widget manager with previews;
- widget configuration flows before placement;
- widget variant system;
- collision-aware placement engine;
- OneUI, iOS Liquid Glass, iOS Frosted Glass and Material-inspired themes;
- configurable screensaver and clock system;
- Home Assistant entity abstraction layer (`src/ha`);
- user-specific entity visibility management through MHA Admin;
- local persistence and migration support;
- automated syntax, unit and source/bundle synchronization checks.

## Home Assistant Support

The frontend receives the Home Assistant `hass` object through the registered
panel.

Reusable helpers inside `src/ha` provide:

- entity lookup;
- entity availability detection;
- state normalization;
- toggle actions;
- brightness control;
- media volume control;
- throttled slider updates;
- service abstraction for future widgets.

### Currently configurable widgets

#### Toggle Widget

Supported domains:

- `light`
- `switch`
- `input_boolean`

Features:

- real-time state updates;
- unavailable detection;
- Home Assistant service calls;
- friendly-name entity selection.

#### Slider Widget

Supported actions:

- light brightness;
- media player volume.

Features:

- entity selection flow;
- theme-aware rendering;
- horizontal and vertical variants;
- throttled service updates.

#### Combined Toggle + Slider Widget

Supported domains:

- `light`

Features:

- light on/off control;
- brightness control;
- entity selection;
- brightness-capable light filtering;
- unavailable handling;
- Home Assistant service integration.

### Widget Categories

Current catalog includes:

- Utilities
- Actions
- Lights
- Climate
- Media
- Security
- System

Some categories already contain functional widgets while others remain in
active development.

## MHA Admin

MHA Admin is a dedicated administrative panel automatically added to the Home
Assistant sidebar.

Purpose:

- manage which entities are exposed inside MHA;
- control which entities users can select during widget configuration;
- prepare future family-oriented launcher experiences.

### Supported Domains

- `light`
- `switch`
- `input_boolean`
- `weather`
- `media_player`
- `climate`
- `sensor`
- `binary_sensor`

### Features

- Home Assistant user selection;
- per-domain entity filtering;
- entity search;
- friendly-name display;
- persistent configuration storage;
- visibility management integrated with widget configuration flows.

### Important

MHA Admin controls visibility within MHA only.

It does **not** replace Home Assistant's native security or permission system.

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

Enter edit mode, open the widget manager, choose a category, choose a widget,
complete the configuration flow if required and place it into a valid slot.

### Move

Activate move mode and use directional controls. The layout engine supports
direct swaps and group-aware movement where geometry permits.

### Variants

Widgets follow registry-defined size contracts.

The variant button cycles through compatible widget variants while preserving
layout constraints.

### Multi-page launcher

Pages can be created, renamed, reordered, assigned an icon and removed.

Widget content and placement are persisted per page and responsive layout.

### Dock

Supported positions:

- left
- right
- bottom

The layout automatically adapts to the selected dock position.

## Themes

MHA currently ships four visual styles:

### OneUI

Soft surfaces, rounded geometry and a family-friendly presentation inspired by
Samsung's One UI.

### iOS Liquid Glass

Floating translucent controls inspired by modern iOS glass surfaces.

### iOS Frosted Glass

Frosted translucent surfaces inspired by earlier iOS and macOS design language.

Includes distinct weather styling and stronger visual separation than Liquid
Glass.

### Material

Material You-inspired controls, tonal surfaces and Android-inspired interaction
patterns.

### Shared Design System

All themes share:

- semantic tokens;
- widget contracts;
- layout behavior;
- configuration panels;
- screensaver components;
- MHA Admin styling.

## Installation

### HACS

1. Add `https://github.com/jingle-jew/mha-widget-hub` as a custom HACS
   repository of type **Integration**.
2. Install **MHA Widget Hub**.
3. Restart Home Assistant.
4. Open **Settings > Devices & services > Add integration**.
5. Search for **MHA Widget Hub** and complete setup.

The integration serves its bundled frontend and automatically registers both
sidebar panels.

No manual `panel_custom:` configuration is required.

The current package targets Home Assistant `2025.7.0` or newer.

See [Installation](docs/installation.md) for additional details.

## Documentation

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Installation](docs/installation.md)
- [CSS layout audit](docs/layout-css-audit.md)

## Quick Development Start

Requires Node.js 22 or newer.

```bash
npm ci
python3 -m http.server 4173

Open:
http://localhost:4173/dev.html

Run validation:
npm run check

Synchronize frontend bundle:
npm run sync:frontend

Never edit directly:
custom_components/mha_widget_hub/frontend/

The root frontend source remains the single source of truth.
```

### Current Limitations

* not every widget category is fully connected to Home Assistant yet;
* media, climate, security and system widgets are still evolving;
* some catalog entries remain visual placeholders;
* entity visibility rules currently affect MHA only;
* layouts remain browser/device specific;
* import/export workflows are not implemented yet;
* accessibility and keyboard navigation require additional review;
* the main orchestrator is still being progressively decomposed into dedicated controllers;
* historical CSS overrides continue to be consolidated.

### Roadmap

## Near Term

* complete Home Assistant bindings for additional widget categories;
* continue migration toward registry-driven widget definitions;
* extend configuration flows to all supported widgets;
* improve preview generation and variant management;
* reduce CSS override complexity and consolidate design tokens.

## Medium Term

* fully functional media widgets;
* climate widgets;
* security widgets;
* room widgets;
* import/export support;
* backup and recovery tools;
* broader accessibility support.

## Longer Term

* profile-aware launcher experiences;
* synchronized layouts;
* advanced family controls;
* kiosk and wall-panel deployments;
* expanded administrative tooling.



License

A license has not been selected yet.