# Architecture

This document describes the current frontend architecture and its contracts.
For product positioning and installation, start with the
[main README](../README.md).

## System Overview

MHA Widget Hub has two runtime layers:

1. a Home Assistant custom integration that serves static frontend files and
   registers the sidebar panel;
2. a browser frontend built from native ES modules, Web Components, CSS and
   Home Assistant's `hass` object.

The application root is `mha-widget-hub.js`. It currently orchestrates pages,
layout, widget placement, rendering, settings, persistence and lifecycle.
Focused modules own lower-level behavior so this orchestrator can be decomposed
progressively rather than rewritten.

## Widget Contract

Widget identity is centralized in
[`src/widgets/widget-registry.js`](../src/widgets/widget-registry.js).

The registry defines:

- canonical `kind`;
- component and renderer;
- manager category and preview type;
- aliases used for migration;
- default size and valid variants;
- kind-specific size normalization;
- optional configuration flow.

`kind` is the canonical identity. Legacy `type`, `component` and variant aliases
remain accepted as migration inputs.

### Registered widgets

| Kind | Role | Current maturity |
| --- | --- | --- |
| `clock` | Digital and analog clocks | Functional |
| `button` | Simple action surface | Renderer functional, HA binding evolving |
| `slider` | Horizontal or vertical control | Renderer functional, generic HA configuration evolving |
| `toggle` | Toggle row | Renderer functional, generic HA configuration evolving |
| `toggle-slider` | Combined light state and brightness | Configurable and HA-bound |
| `toggle-buttons` | Toggle with quick actions | Visual/interaction foundation |
| `weather` | Adaptive weather layouts | Functional renderer using widget data |
| `empty` | Placeholder/future widget shell | Prototype |

The manager groups entries under Utilities, Actions, Lights, Climate, Media,
Security and System. Catalog presence does not necessarily mean that a complete
HA entity flow exists.

## Rendering Layers

The intended widget path is:

```text
stored widget
  -> contract normalization
  -> registry definition
  -> widget shell
  -> registered content renderer
  -> reusable UI controls
```

Responsibilities:

- `widget-registry.js` owns identity, sizes and variants;
- `widget-renderers.js` maps registry renderer names to widget content;
- `widget-shell.js` owns card framing and edit controls;
- `src/widgets/*` owns widget-level composition;
- `src/ui/*` owns reusable low-level controls.

This distinction prevents generic controls from knowing about dashboard
placement or Home Assistant storage.

## Home Assistant Boundary

Home Assistant behavior is separated into:

```text
src/ha/
  entity.js                     Entity IDs, domains, state and availability
  toggle.js                     Toggle support and service construction
  slider.js                     Slider bindings and domain payloads
  actions.js                    Safe calls and latest-value throttling
```

Visual widgets consume these modules rather than constructing service calls
inside low-level UI primitives.

When `hass` is absent, or an entity is `unknown` or `unavailable`, bound controls
are disabled and service calls are not sent.

### Slider services

| Domain/data | Home Assistant service |
| --- | --- |
| Light brightness | `light.turn_on` with `brightness_pct` |
| Fan percentage | `fan.set_percentage` |
| Media volume | `media_player.volume_set` |
| Cover position | `cover.set_cover_position` |

Toggle helpers support `light`, `switch`, `fan`, `humidifier`,
`input_boolean` and `media_player`.

Slider input is coalesced while requests are in flight. Intermediate drag
updates are limited, while the final `change` value is always preserved.

## Layout System

The outer grid places widgets. Widget dimensions use small internal units where
a standard visible square is represented by `2x2` units.

The canonical responsive matrix is:

- mobile: width below `768px`;
- tablet: `768px` through `1179px`;
- desktop: `1180px` and above.

Orientation refines a layout but does not define a separate layout identity.
The shell owns viewport media queries; widget internals should react primarily
to their own container.

### Placement

Placement maps are stored per page, layout and grid dimensions. Candidate moves
are validated for bounds and overlap before persistence.

The editing model uses:

- valid ghost slots for addition and direct placement;
- directional movement;
- direct neighbor swaps;
- group-aware translated swaps where geometry permits.

## Themes and CSS

The styles are organized into:

```text
styles/
  core/                         Base rules and tokens
  layout/                       Shell, grid, docks and framing
  components/                   Reusable controls
  widgets/                      Widget-specific rules
  themes/                       OneUI, iOS and Material token overrides
  settings/                     Settings surfaces
  widget-manager/               Catalog and configuration
```

Semantic tokens describe visual roles such as widget surfaces, controls,
borders, text and shadows. Theme files should override those roles without
changing component geometry.

Widget content should size from its widget rectangle. Viewport-specific rules
belong at the launcher shell unless the component truly depends on the viewport.

## Persistence

Pages, widget contracts, positions and preferences are stored in browser
`localStorage`.

The storage layer:

- returns explicit write results;
- logs only non-sensitive operation metadata;
- distinguishes missing and corrupt JSON;
- preserves raw pre-migration values in
  `mha-storage-backup-before-v1`;
- exposes `data-persistence-state="saved|error"` on the hub.

Persistence is currently local to the browser/device. Home Assistant user
profiles and cross-device synchronization are not implemented.

## DOM Lifecycle

Dynamic widgets may own observers, animation frames or queued actions.
`destroyDomSubtree()` invokes registered `__mhaDestroy` hooks before nodes are
removed or replaced.

Slider cleanup disconnects `ResizeObserver`, cancels pending animation frames
and clears transient drag state. Composed widgets also clear pending HA actions
and references.

## Repository Structure

```text
mha-widget-hub-loader.js        Frontend boot loader
mha-widget-hub.js               Main custom element and orchestration
dev.html                        Standalone development surface

src/
  components/                   Shared icon primitives
  core/                         Storage and DOM lifecycle
  ha/                           Home Assistant bindings
  icons/                        Icon symbol catalog
  layout/                       Shell, docks, responsive and grid engine
  screensaver/                  Screensaver rendering
  settings/                     Theme and settings controllers
  system/                       Shared system actions and icons
  ui/                           Reusable low-level controls
  widget-config/                Widget configuration flows
  widget-manager/               Catalog, previews and selection
  widgets/                      Registry, renderers and components

styles/                         Layered application styling
tests/                          Node Test Runner coverage
tools/                          Validation and synchronization scripts
custom_components/mha_widget_hub/
                                HA integration and generated frontend
```

## Architectural Direction

The current strategy is incremental:

1. keep registry and HA contracts centralized;
2. extract controllers from `MhaControlHub` along existing responsibility
   boundaries;
3. move placement and migration logic into pure, testable modules;
4. continue reducing corrective CSS through semantic tokens;
5. expand HA configuration without coupling entity calls to visual primitives.
