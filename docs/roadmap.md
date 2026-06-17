# Roadmap

This document describes the long-term direction of MHA Widget Hub.

It is not a promise that every item is implemented today.

It is a guide for future architecture, contribution decisions and project priorities.

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
- config manifests;
- semantic theme tokens;
- Home Assistant abstraction helpers;
- modular layout and placement logic;
- dedicated admin visibility controls.

The project is no longer a single custom card.

It is becoming a small frontend platform.

---

## 4. Near-Term Priorities

### 4.1 Complete config-flow modularity

Current state:

- config manifests exist;
- config registry collects manifests from widget modules;
- popup still contains central field rendering branches.

Target:

```js
config: {
  type,
  title,
  hint,
  createDraft,
  build,
  renderFields
}
```

Result:

```text
Adding a new config flow should not require editing widget-config-popup.js.
```

---

### 4.2 Move widget-specific normalization into widget definitions

Current state:

- `normalizeWidgetContract()` still contains kind-specific compatibility logic.

Target:

```js
definition.normalizeContract(widget, helpers)
```

Result:

```text
The registry becomes more generic.
Each widget owns its own legacy compatibility rules.
```

---

### 4.3 Make manager visibility declarative

Current state:

Some manager exclusions are still hardcoded.

Target:

```js
manager: {
  visible: false
}
```

or:

```js
manager: {
  entries: []
}
```

Result:

```text
Widget manager should not need to know special widget names.
```

---

### 4.4 Continue reducing the main file

Current state:

`mha-widget-hub.js` is already smaller than before, but still coordinates many systems.

Target extractions:

```text
app-lifecycle-controller
widget-grid-controller
panel-controller
home-assistant-connection-controller
secondary-ui-controller
```

Result:

```text
The main file stays a readable application shell.
```

---

### 4.5 Stabilize token contracts

Current state:

- semantic tokens exist;
- legacy adapter tokens still exist;
- some widget-specific tokens remain.

Target:

```text
Themes define visual identity.
Components consume semantic tokens.
Widgets only expose private tokens when genuinely needed.
```

Result:

```text
Themes can restyle the whole launcher without editing widget code.
```

---

## 5. Medium-Term Priorities

### 5.1 Widget packs

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

Initial implementation can remain static.

Dynamic plugin loading should wait until internal contracts are stable.

---

### 5.2 Theme packs

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

### 5.3 More widget configuration types

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

### 5.4 Better admin controls

Future admin features could include:

- per-user page visibility;
- per-user widget visibility;
- per-user entity visibility;
- child-safe action limits;
- read-only mode;
- guest mode;
- room-specific dashboards;
- device-specific dashboard profiles.

The guiding principle:

```text
The admin configures complexity.
The family sees simplicity.
```

---

### 5.5 Import/export

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

Important:

Exports should avoid leaking sensitive Home Assistant details unless the user explicitly chooses to include them.

---

## 6. Long-Term Priorities

### 6.1 Controlled extension ecosystem

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

Do not jump there too early.

First stabilize internal extension contracts.

---

### 6.2 Plugin discovery

Possible future directions:

- static manifest files;
- local plugin folders;
- HACS-compatible packages;
- curated extension registry;
- manual import.

Important:

Dynamic discovery should not make the app fragile.

Static registration is acceptable until the extension contract is mature.

---

### 6.3 Theme builder

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

### 6.4 Widget builder

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

## 7. Compatibility Goals

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

## 8. Storage Migration Direction

Future storage migrations should be:

- explicit;
- testable;
- reversible when possible;
- tolerant of invalid data;
- isolated in store/model modules.

Avoid doing storage migrations inside random UI rendering code.

Good locations:

```text
src/pages/page-store.js
src/core/storage.js
src/admin/entity-visibility-store.js
src/settings/*
src/widgets/widget-registry.js
```

depending on the data type.

---

## 9. Home Assistant Integration Direction

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

## 10. Visual Direction

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

Widgets should consume:

```text
semantic tokens
adapter tokens
component primitives
```

---

## 11. Documentation Direction

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

## 12. Contribution Direction

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

## 13. Suggested Milestones

### Milestone A — Extension Contract Stabilization

- config field renderers moved into manifests;
- widget-specific normalization moved into definitions;
- manager visibility made declarative;
- docs updated;
- tests added.

### Milestone B — Theme Contract Stabilization

- public token list finalized;
- legacy token compatibility documented;
- theme-specific hacks reduced;
- theme docs tested against code;
- visual regression checklist created.

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

## 14. Non-Goals For Now

Avoid prioritizing these too early:

- unrestricted third-party JavaScript loading;
- complex marketplace behavior;
- arbitrary user-written widget code;
- backend sync before local model stabilizes;
- overengineering plugin discovery;
- replacing the Home Assistant dashboard system entirely.

MHA should first become stable, documented and easy to extend internally.

---

## 15. Roadmap Principle

The north star:

```text
A contributor should be able to add a widget or theme
without understanding the entire application.
```

Every architectural decision should move the project closer to that.
