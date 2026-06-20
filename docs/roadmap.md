# Roadmap

This document describes the long-term direction of MHA Widget Hub.

It is not a promise that every item is implemented today. It is a guide for future architecture, contribution decisions and project priorities.

---

## 1. Product Vision

MHA Widget Hub is becoming a family-first Home Assistant launcher.

The goal is not to replace every Home Assistant dashboard use case.

The goal is to provide a controlled, beautiful, touch-friendly launcher where:

- a power user configures the system;
- family members use a simplified interface;
- widgets are deliberate and spatial;
- themes feel coherent;
- Home Assistant complexity is hidden behind human UI.

MHA should feel less like a technical dashboard and more like a home interface.

MHA should also remain native to itself: no embedded Home Assistant dashboard cards and no dependency on external HACS/custom cards for core widgets.

---

## 2. Architecture Vision

The long-term architecture goal is:

```text
Add widget:
  create one widget module
  register it once

Add theme:
  create one theme CSS file
  register it once
```

MHA should avoid requiring contributors to edit many central files for simple extensions.

Target extension model:

```text
Widget module owns:
  definition
  renderer
  config
  preview
  css
  aliases
  variants
  capabilities
  storage compatibility
  shell behavior
  placement flow

Theme owns:
  registry entry
  CSS
  token values
  accent behavior
```

---

## 3. Current Direction

MHA is already moving toward:

- registry-driven widgets;
- registry-driven themes;
- live widget previews;
- manifest-driven config flows;
- semantic theme tokens;
- Home Assistant abstraction helpers;
- modular layout and placement logic;
- shared panel shell/surface contracts;
- dedicated admin visibility controls;
- domain coordinators around root orchestration.

The project is no longer a single custom card. It is becoming a small frontend platform.

---

## 4. Recently Stabilized Architecture

The following items are now substantially in place:

- config field rendering moved into manifests through `renderFields`;
- popup title/hint can be manifest-driven or dynamic;
- manager visibility can be declarative through `manager.hidden` and entry `hidden`;
- widget-specific stored-data patches can live in `definition.storage.normalize`;
- widget manager/config/page creator surfaces share panel primitives;
- screensaver CSS is split into smaller files;
- root orchestration is reduced through dedicated coordinators;
- scenes widget is registered as a native MHA widget with config and live preview.

These should be treated as stable direction, not temporary experiments.

---

## 5. Near-Term Priorities

### 5.1 Strengthen extension contract tests

Current state:

- widget module contracts exist;
- config manifests are discovered from modules;
- previews are discovered from modules;
- CSS is discovered from definitions;
- some contract tests exist.

Target:

```text
A broken widget module contract should fail tests quickly.
```

Recommended coverage:

- every registered widget has a stable kind;
- every renderer key resolves;
- every CSS path is valid;
- every config type resolves to a manifest;
- every configurable widget has `renderFields`, `createDraft` and `build`;
- every live preview can create a widget without HA side effects.

---

### 5.2 Extract reusable config field primitives

Current state:

- config fields are manifest-driven;
- each config file still builds much of its own DOM.

Target:

```text
Config manifests remain owners of fields,
but use shared primitives for common controls.
```

Potential primitives:

- entity selector;
- domain selector;
- text input;
- JSON textarea;
- segmented control;
- select field;
- icon picker;
- label field;
- empty-state helper.

Result:

```text
New config flows stay module-owned without duplicating basic field UI.
```

---

### 5.3 Continue widget-owned normalization

Current state:

- registry normalization is more generic;
- widget definitions can provide `storage.normalize`.

Target:

```js
storage: {
  normalize(widget, helpers) {
    return { ...patch };
  }
}
```

Result:

```text
Legacy compatibility rules live near the widget that owns them.
```

---

### 5.4 Continue reducing the main file conservatively

Current state:

`mha-widget-hub.js` has been substantially reduced through coordinators, but still coordinates the application shell.

Target:

```text
The main file stays a readable application shell.
```

Future extraction candidates:

```text
home-assistant-connection-controller
panel coordination refinements
remaining boot/app shell seams
```

Rule:

```text
One coherent extraction at a time.
```

Do not refactor for sport.

---

### 5.5 Stabilize token contracts

Current state:

- semantic tokens exist;
- legacy adapter tokens still exist;
- some widget-specific tokens remain;
- panel CSS now participates in the shared visual contract.

Target:

```text
Themes define visual identity.
Components, panels and widgets consume semantic tokens.
Widgets only expose private tokens when genuinely needed.
```

Result:

```text
Themes can restyle the launcher without editing widget code.
```

---

## 6. Medium-Term Priorities

### 6.1 Widget packs

Future widget packs could group related widgets.

Examples:

```text
Lighting Pack
Climate Pack
Media Pack
Security Pack
Family Organizer Pack
Energy Pack
Scenes Pack
```

A widget pack should eventually provide:

```text
widget modules
widget CSS
config manifests
preview renderers
preview data
assets
documentation
```

Initial implementation can remain static. Dynamic plugin loading should wait until internal contracts are stable.

---

### 6.2 Theme packs

Future theme packs could group visual systems.

Examples:

```text
Apple Pack
Samsung Pack
Material Pack
Console Pack
Kids Pack
High Contrast Pack
Wall Panel Pack
```

A theme pack should eventually provide:

```text
theme registry entry
theme CSS
accent palettes
semantic token mappings
assets
documentation
```

---

### 6.3 More widget configuration field types

Potential future config field types:

- entity selector;
- multi-entity selector;
- domain selector;
- action selector;
- icon picker;
- color picker;
- text input;
- number input;
- segmented control;
- toggle;
- slider;
- JSON editor;
- page selector;
- user selector.

Target:

```text
Config fields should be reusable primitives.
```

---

### 6.4 Better admin controls

Future admin features could include:

- per-user page visibility;
- per-user widget visibility;
- per-user entity visibility;
- child-safe action limits;
- read-only mode;
- guest mode;
- room-specific dashboards;
- device-specific dashboard profiles.

Guiding principle:

```text
The admin configures complexity.
The family sees simplicity.
```

---

### 6.5 Import/export

Potential future feature:

```text
Export MHA layout/theme/settings
Import MHA layout/theme/settings
```

This would help with:

- backups;
- sharing dashboard setups;
- moving between devices;
- debugging user reports;
- creating starter templates.

Exports should avoid leaking sensitive Home Assistant details unless the user explicitly chooses to include them.

---

## 7. Long-Term Priorities

### 7.1 Controlled extension ecosystem

The long-term dream is:

```text
MHA can load controlled widget/theme extensions
without letting random code take over the app.
```

This requires:

- stable module contracts;
- versioning;
- validation;
- safe metadata;
- predictable CSS loading;
- permission boundaries;
- documented compatibility rules.

Do not jump there too early. First stabilize internal extension contracts.

---

### 7.2 Plugin discovery

Possible future directions:

- static manifest files;
- local plugin folders;
- HACS-compatible packages;
- curated extension registry;
- manual import.

Dynamic discovery should not make the app fragile. Static registration is acceptable until the extension contract is mature.

---

### 7.3 Theme builder

A future theme builder could let users create themes without writing CSS.

Possible controls:

- surface opacity;
- blur strength;
- corner radius;
- border strength;
- text contrast;
- accent palette;
- icon shape;
- background/wallpaper behavior.

The builder should output values that map to the same theme token contract.

---

### 7.4 Widget builder

A future widget builder could allow limited custom widgets from UI.

Possible safe primitives:

- label;
- icon;
- entity state;
- toggle action;
- service action;
- slider;
- conditional display;
- layout stack.

This should be controlled and limited.

Avoid turning MHA into an unrestricted arbitrary-code editor for normal users.

---

## 8. Compatibility Goals

MHA should maintain compatibility across:

- current Home Assistant frontend behavior;
- HACS installation/update flow;
- existing local storage values;
- existing widget definitions;
- existing theme settings;
- existing admin visibility settings.

Breaking changes should be rare.

When breaking changes are unavoidable, they should include:

- migration path;
- changelog entry;
- documentation update;
- fallback behavior if possible.

---

## 9. Storage Migration Direction

Future storage migrations should be:

- explicit;
- testable;
- reversible when possible;
- tolerant of invalid data;
- isolated in store/model/widget definition modules.

Avoid doing storage migrations inside random UI rendering code.

Good locations:

```text
src/pages/page-store.js
src/core/storage.js
src/admin/entity-visibility-store.js
src/settings/*
src/widgets/widget-registry.js
widget definition storage adapters
```

---

## 10. Home Assistant Integration Direction

MHA should keep Home Assistant behavior behind helpers.

Future HA work should continue to improve:

- entity discovery;
- entity permission filtering;
- service action helpers;
- slider capability detection;
- weather data normalization;
- media player helpers;
- climate helpers;
- sensor formatting;
- unavailable/unknown handling.

Widgets should consume stable helpers instead of duplicating HA details.

---

## 11. Visual Direction

MHA should support multiple visual systems while keeping a consistent internal token contract.

Current major visual systems:

- OneUI;
- iOS Liquid Glass;
- iOS Frosted Glass;
- Material You.

Future themes should not require widget-specific hacks.

Visual identity belongs in:

```text
styles/themes/*
styles/themes/semantic-tokens.css
styles/themes/accent-palettes.css
```

Components, panels and widgets should consume:

```text
semantic tokens
adapter tokens
component primitives
```

---

## 12. Documentation Direction

Documentation should remain layered.

### README

Simple overview for normal users.

### User docs

How to install and use MHA.

### Developer docs

How to add widgets, themes, config flows and previews.

### Architecture docs

How systems connect internally.

### Release docs

How to test and ship changes safely.

The README should not become an architecture manual.

---

## 13. Contribution Direction

Future contributions should be judged by whether they move MHA toward:

- fewer central edits;
- clearer contracts;
- less duplicated logic;
- safer Home Assistant behavior;
- better visual consistency;
- better tests;
- better documentation.

Avoid features that add long-term architectural debt unless the tradeoff is intentional and documented.

---

## 14. Suggested Milestones

### Milestone A — Extension Contract Stabilization

- contract tests for widget modules;
- reusable config field primitives;
- widget-owned storage normalization completed where practical;
- docs updated with current contracts;
- no new central widget/config branches.

### Milestone B — Theme Contract Stabilization

- public token list finalized;
- legacy token compatibility documented;
- theme-specific hacks reduced;
- theme docs tested against code;
- manual visual regression checklist maintained.

### Milestone C — Widget Pack Readiness

- widget module contract stable;
- CSS loading contract stable;
- preview data contract stable;
- config manifest contract stable;
- pack manifest draft created.

### Milestone D — HACS Polish

- installation docs finalized;
- release checklist validated;
- versioning convention chosen;
- update flow tested;
- cache/reload notes documented.

### Milestone E — Family/Admin UX

- admin visibility improved;
- per-user/page rules explored;
- safer action controls;
- simpler onboarding.

---

## 15. Non-Goals For Now

Avoid prioritizing these too early:

- unrestricted third-party JavaScript loading;
- complex marketplace behavior;
- arbitrary user-written widget code;
- backend sync before local model stabilizes;
- overengineering plugin discovery;
- replacing the Home Assistant dashboard system entirely;
- embedding native HA dashboard cards or external HACS/custom cards as core widgets.

MHA should first become stable, documented and easy to extend internally.

---

## 16. Roadmap Principle

The north star:

```text
A contributor should be able to add a widget or theme
without understanding the entire application.
```

Every architectural decision should move the project closer to that.
