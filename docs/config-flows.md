# Config Flows

This document describes the current widget configuration flow system used by MHA Widget Hub.

It is based on the current project structure:

```text
src/widget-config/widget-config-registry.js
src/widget-config/widget-config-popup.js

src/widget-config/button-config.js
src/widget-config/toggle-config.js
src/widget-config/slider-config.js
src/widget-config/toggle-slider-config.js
src/widget-config/weather-config.js
src/widget-config/media-config.js
src/widget-config/light-options.js

src/widgets/simple-button-widget.js
src/widgets/toggle-widget.js
src/widgets/slider-widget.js
src/widgets/toggle-slider-widget.js
src/widgets/weather-widget.js
src/widgets/media-widget.js

styles/widget-manager/widget-config-popup.css
```

---

## 1. Purpose

Config flows let MHA ask the user for the information a widget needs before placing it on the grid.

The current flow is designed around this UX principle:

> Users should choose human concepts like “Lumière”, “Lecteur média”, or “Nom affiché”, not raw Home Assistant internals first.

Entity ids are still stored internally, but selection lists display friendly names.

---

## 2. Current User Flow

The current creation flow is:

```text
User opens widget manager
        ↓
User selects a widget entry
        ↓
MHA checks whether the widget supports configuration
        ↓
If configurable, a config popup opens before drop
        ↓
User selects entity/options/name
        ↓
MHA builds the configured widget
        ↓
Widget is placed on the grid
```

Important detail:

The popup appears after selecting the widget in the manager and before dropping it onto the grid.

This allows the selected variant, size, and manager entry metadata to be preserved while still requiring widget-specific configuration.

---

## 3. Current Configurable Widgets

The following widgets currently expose config manifests:

| Widget kind | Config type | Config file |
|---|---|---|
| `button` | `button` | `src/widget-config/button-config.js` |
| `toggle` | `toggle` | `src/widget-config/toggle-config.js` |
| `slider` | `slider` | `src/widget-config/slider-config.js` |
| `toggle-slider` | `toggle-slider` | `src/widget-config/toggle-slider-config.js` |
| `weather` | `weather` | `src/widget-config/weather-config.js` |
| `media` | `media` | `src/widget-config/media-config.js` |

Widgets without a config manifest are placed directly.

---

## 4. Config Manifest

Each configurable widget module exports a config manifest.

Example:

```js
export const TOGGLE_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "toggle",
  title: "Configurer le toggle",
  hint: "Choisis le type d’appareil, l’entité et le nom à afficher.",
  createDraft: createToggleConfigDraft,
  build: buildToggleWidgetConfig,
});
```

The manifest is then attached to the widget module:

```js
export const WIDGET_MODULE = Object.freeze({
  kind: "toggle",
  definition: TOGGLE_WIDGET_DEFINITION,
  renderer: TOGGLE_WIDGET_CONTENT_RENDERER,
  config: TOGGLE_WIDGET_CONFIG_MANIFEST,
  preview: ...
});
```

---

## 5. Manifest Fields

| Field | Required | Purpose |
|---|---:|---|
| `type` | yes | Stable config type id |
| `title` | optional today | Human popup title |
| `hint` | optional today | Human popup helper text |
| `createDraft` | yes | Creates editable config state |
| `build` | yes | Converts draft into final widget config |

Current popup code still contains hardcoded title/hint branching for several types, so `title` and `hint` exist but are not yet the only source of truth.

Target direction:

```text
The manifest should own title, hint, field rendering, createDraft, build.
```

---

## 6. Config Registry

The config registry lives in:

```text
src/widget-config/widget-config-registry.js
```

It collects config manifests directly from `WIDGET_MODULES`:

```js
const CONFIG_MANIFESTS = Object.freeze(
  WIDGET_MODULES
    .map((module) => module?.config)
    .filter(Boolean),
);
```

Then it creates:

```js
WIDGET_CONFIG_REGISTRY
```

as:

```js
{
  [manifest.type]: manifest
}
```

This is important because config flows are already partially registry-driven.

Adding a config flow currently requires:

1. Add a config manifest to the widget module.
2. Ensure the popup knows how to render that config type.

The second step is the current remaining centralization point.

---

## 7. Finding A Widget's Config Type

The registry resolves the config type with:

```js
getWidgetConfigType(widget)
```

Current behavior:

```js
return getWidgetDefinition(widget)?.config || "";
```

That means the widget definition points to a config type:

```js
config: "toggle"
```

And the widget module carries the actual manifest:

```js
config: TOGGLE_WIDGET_CONFIG_MANIFEST
```

Both sides currently matter:

```text
Widget definition config string
        ↓
Config registry manifest
```

---

## 8. Config Session

The popup does not edit the widget directly.

It creates a session:

```js
createWidgetConfigSession(widget, hass, {
  mode = "create",
  visibilityConfig,
})
```

The session shape is:

```js
{
  mode,
  widget,
  configType,
  draft,
}
```

Where:

- `mode` is usually `create` or `edit`;
- `widget` is the original widget/manager item;
- `configType` is the resolved config type;
- `draft` is editable temporary state.

This is good architecture because it avoids mutating the real widget while the user is still changing fields.

---

## 9. Draft / Build Pattern

Every config flow follows the same pattern:

```text
createDraft(widget, hass, visibilityConfig)
        ↓
user edits draft in popup
        ↓
build(widget, draft, hass, visibilityConfig)
        ↓
configured widget object
```

### createDraft

`createDraft` reads the original widget and creates editable state.

It usually also calls a reconcile function.

Example:

```js
export function createMediaConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    mediaEntityId: widget.mediaEntityId || widget.entityId || widget.entity_id || "",
    label: String(widget.label || "").trim(),
    labelCustomized: Boolean(String(widget.label || "").trim()),
  };
  return reconcileMediaConfigDraft(draft, hass, visibilityConfig);
}
```

### build

`build` merges the original widget with the chosen config values.

Example:

```js
export function buildMediaWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { selected } = reconcileMediaConfigDraft(draft, hass, visibilityConfig);
  const mediaEntityId = draft.mediaEntityId || "";
  return {
    ...widget,
    kind: "media",
    type: "media",
    component: "media-widget",
    entityId: mediaEntityId,
    mediaEntityId,
    label: String(draft.label || selected?.label || "").trim(),
  };
}
```

Important:

`build()` spreads the original widget first.

That preserves manager-selected properties such as:

- variant;
- size;
- category;
- title/label metadata;
- manager entry values;
- future widget metadata.

---

## 10. Reconcile Pattern

Most config files use a `reconcile...Draft()` function.

Example:

```js
reconcileToggleConfigDraft(draft, hass, visibilityConfig)
```

Reconcile functions are responsible for:

- finding valid entity options;
- replacing invalid selected entities;
- picking the first valid option when needed;
- resolving selected option metadata;
- auto-filling label when the user has not customized it;
- returning save validity data.

Typical return shape:

```js
{
  draft,
  options,
  selected
}
```

Some flows also return the selected action/type:

```js
{
  draft,
  action,
  options,
  selected
}
```

or:

```js
{
  draft,
  deviceType,
  options,
  selected
}
```

---

## 11. Human Entity Options

Human-friendly entity options are centralized in:

```text
src/widget-config/light-options.js
```

Despite the filename, it now contains general entity option helpers.

Core helpers:

```js
humanizeEntityId(entityId)
getEntityDisplayName(entityState, entityId)
getEntityOptionsByDomain(hass, domain, visibilityConfig)
getLightOptions(hass, visibilityConfig)
```

### Friendly display names

Entity labels are resolved in this order:

```text
attributes.friendly_name
        ↓
humanized entity_id
```

Example:

```text
light.salon_principal
```

becomes:

```text
Salon Principal
```

### Visibility filtering

Entity options are filtered through:

```js
filterEntitiesForCurrentUser(hass, options, visibilityConfig)
```

This means config popups respect MHA Admin entity permissions.

The user sees only allowed entities.

---

## 12. Entity Availability Rules

`getEntityOptionsByDomain()` filters entities by:

```js
getEntityDomain(entityId) === domain
```

and availability:

```js
isEntityAvailable(entityState)
```

Special case:

```js
domain === "button" && entityState?.state === "unknown"
```

Home Assistant button entities often report `unknown`, but they are still valid action targets.

---

## 13. Light Options

Lights get extra filtering through:

```js
getLightOptions(hass, visibilityConfig)
```

This function currently keeps only lights that support brightness:

```js
.filter(option => option.supportsBrightness)
```

The capability comes from:

```js
supportsLightBrightness(attributes)
```

This is important for:

- toggle-slider;
- brightness slider.

A basic on/off light without brightness support should not appear in brightness-specific config flows.

---

## 14. Popup UI

The popup is created by:

```js
createWidgetConfigPopup({
  session,
  hass,
  visibilityConfig,
  onCancel,
  onSave,
  onChange,
})
```

from:

```text
src/widget-config/widget-config-popup.js
```

It returns a DOM tree:

```html
<section class="mha-widget-config-popup mha-page-creator">
  <button class="mha-widget-config-scrim mha-page-creator-scrim">
  <div class="mha-widget-config-sheet mha-page-creator-sheet">
    <div class="mha-widget-config-header mha-page-creator-header">
    <p class="mha-widget-config-hint mha-page-creator-hint">
    <div class="mha-widget-config-fields">
    <div class="mha-widget-config-actions mha-page-creator-actions">
  </div>
</section>
```

The popup intentionally reuses Page Creator visual classes:

```text
mha-page-creator
mha-page-creator-scrim
mha-page-creator-sheet
mha-page-creator-header
mha-page-creator-hint
mha-page-creator-actions
```

This keeps the visual language consistent.

---

## 15. Popup Buttons

The popup has two actions:

| Button | Behavior |
|---|---|
| `Annuler` | closes without saving |
| `Continuer` | create mode: builds widget and continues to placement |
| `Enregistrer` | edit mode: builds widget and saves changes |

Current label logic:

```js
save.textContent = session?.mode === "edit" ? "Enregistrer" : "Continuer";
```

The save button is disabled when the current config is invalid.

---

## 16. Current Field Renderers

Field rendering currently lives inside:

```text
src/widget-config/widget-config-popup.js
```

Current field renderer functions:

```js
createToggleSliderFields()
createSliderFields()
createToggleFields()
createWeatherFields()
createMediaFields()
createButtonFields()
```

There is also a partial field renderer map:

```js
const WIDGET_CONFIG_FIELD_RENDERERS = Object.freeze({
  slider: createSliderFields,
  toggle: createToggleFields,
  "toggle-slider": createToggleSliderFields,
});
```

However, the popup currently still uses explicit branching for:

- slider;
- toggle;
- button;
- weather;
- media;
- fallback toggle-slider.

This is a known architecture gap.

Target direction:

```text
config manifest owns or references its field renderer
```

so `widget-config-popup.js` no longer needs to know every config type.

---

## 17. Toggle-Slider Config

Files:

```text
src/widget-config/toggle-slider-config.js
src/widgets/toggle-slider-widget.js
```

Config type:

```js
"toggle-slider"
```

Current purpose:

- choose a compatible light;
- customize display name;
- build a combined light widget.

Current draft fields:

```js
{
  lightEntityId,
  label,
  labelCustomized,
  sliderMode
}
```

Current build output includes:

```js
{
  ...widget,
  kind: "toggle-slider",
  type: "toggle-slider",
  component: "toggle-slider-widget",
  lightEntityId,
  entityId: lightEntityId,
  label,
  sliderMode: "brightness"
}
```

Current UI fields:

| Label | Control |
|---|---|
| `Nom affiché` | text input |
| `Lumière` | select |

Current empty state:

```text
Aucune lumière compatible avec la luminosité trouvée.
```

Important:

Although the original design discussed a brightness/white temperature mode selector, the current implementation documented here only builds `sliderMode: "brightness"`.

White temperature can be added later, but it is not currently a complete flow in this zip.

---

## 18. Slider Config

Files:

```text
src/widget-config/slider-config.js
src/widgets/slider-widget.js
```

Config type:

```js
"slider"
```

Current slider actions:

| Value | Label | Domain | Empty label |
|---|---|---|---|
| `volume` | `Volume` | `media_player` | `Aucun appareil média disponible` |
| `brightness` | `Intensité lumière` | `light` | `Aucune lumière disponible` |

Current draft fields:

```js
{
  entityId,
  label,
  labelCustomized,
  sliderAction
}
```

Current action inference:

```js
widget.sliderAction === "volume" or "brightness"
```

otherwise:

```js
widget.variant === "volume-slider" ? "volume" : "brightness"
```

Current UI fields:

| Label | Control |
|---|---|
| `Action` | select |
| `Appareil` | select |
| `Nom affiché` | text input |

Current build output includes:

```js
{
  ...widget,
  kind: "slider",
  type: "slider",
  component: "slider-widget",
  entityId,
  label,
  sliderAction
}
```

---

## 19. Toggle Config

Files:

```text
src/widget-config/toggle-config.js
src/widgets/toggle-widget.js
```

Config type:

```js
"toggle"
```

Current supported device types:

| Value | Label | Domain |
|---|---|---|
| `light` | `Lumière` | `light` |
| `switch` | `Interrupteur` | `switch` |
| `input_boolean` | `Booléen` | `input_boolean` |

Current draft fields:

```js
{
  deviceType,
  entityId,
  label,
  labelCustomized
}
```

Current UI fields:

| Label | Control |
|---|---|
| `Type d’appareil` | select |
| `Entité` | select |
| `Nom affiché` | text input |

Current build output includes:

```js
{
  ...widget,
  kind: "toggle",
  type: "toggle",
  component: "toggle-widget",
  deviceType,
  entityId,
  label
}
```

---

## 20. Button Config

Files:

```text
src/widget-config/button-config.js
src/widgets/simple-button-widget.js
```

Config type:

```js
"button"
```

Current button types:

| Value | Label |
|---|---|
| `light` | `Lumière` |
| `switch` | `Interrupteur` |
| `input_boolean` | `Booléen` |
| `button` | `Bouton HA` |
| `action` | `Action personnalisée` |

Current draft fields:

```js
{
  buttonType,
  entityId,
  label,
  labelCustomized,
  actionDomain,
  actionService,
  actionData,
  actionDataValid
}
```

Current UI fields for entity button types:

| Label | Control |
|---|---|
| `Type d’action` | select |
| `Entité` | select |
| `Nom affiché` | text input |

Current UI fields for custom action:

| Label | Control |
|---|---|
| `Type d’action` | select |
| `Domaine HA` | text input |
| `Service HA` | text input |
| `Données JSON` | textarea |
| `Nom affiché` | text input |

Current custom action hint:

```text
Les entity_id sont soumis aux permissions MHA Admin.
```

Current build output for entity mode:

```js
{
  ...widget,
  kind: "button",
  buttonType,
  entityId,
  label
}
```

Current build output for custom action mode:

```js
{
  ...widget,
  kind: "button",
  buttonType: "action",
  entityId: "",
  label,
  action: {
    domain,
    service,
    data
  }
}
```

Important:

`actionData` must be a valid JSON object.

Arrays and invalid JSON are rejected.

---

## 21. Weather Config

Files:

```text
src/widget-config/weather-config.js
src/widgets/weather-widget.js
```

Config type:

```js
"weather"
```

Current purpose:

- choose an allowed `weather` entity.

Current draft fields:

```js
{
  entityId
}
```

Current UI fields:

| Label | Control |
|---|---|
| `Entité météo` | select |

Current empty state:

```text
Aucune entité météo autorisée et disponible.
```

Current build output includes:

```js
{
  ...widget,
  kind: "weather",
  type: "weather",
  component: "weather-widget",
  entityId
}
```

Unlike several other flows, the weather config currently does not expose a custom display label.

---

## 22. Media Config

Files:

```text
src/widget-config/media-config.js
src/widgets/media-widget.js
```

Config type:

```js
"media"
```

Current purpose:

- choose a `media_player`;
- customize display name.

Current draft fields:

```js
{
  mediaEntityId,
  label,
  labelCustomized
}
```

Current UI fields:

| Label | Control |
|---|---|
| `Nom affiché` | text input |
| `Lecteur média` | select |

Current empty state:

```text
Aucun lecteur média autorisé et disponible.
```

Current build output includes:

```js
{
  ...widget,
  kind: "media",
  type: "media",
  component: "media-widget",
  entityId: mediaEntityId,
  mediaEntityId,
  label
}
```

---

## 23. Label Customization

Most flows use the same pattern:

```js
labelCustomized: Boolean(String(widget.label || "").trim())
```

When the user has not customized the label:

```js
draft.label = selected?.label || "";
```

When the user edits the label:

```js
labelCustomized = true
```

This gives a good default while still allowing user override.

Important UX result:

- selecting an entity auto-fills the label;
- once the user types a custom name, MHA stops overwriting it.

---

## 24. Preserving Variant And Size

Config builds always spread the original widget:

```js
return {
  ...widget,
  ...
}
```

This is important because the selected manager entry may carry:

```js
variant
size
w
h
category
description
order
```

The config flow should only add or replace configuration-specific properties.

Do not rebuild the widget from scratch unless necessary.

Recommended:

```js
{
  ...widget,
  kind: "my-widget",
  entityId,
  label
}
```

Avoid:

```js
{
  kind: "my-widget",
  entityId,
  label
}
```

because that can lose selected variant/size metadata.

---

## 25. Save Validity

Field renderers return:

```js
{
  fields,
  canSave,
  isValid
}
```

`canSave` initializes the save button state.

`isValid` updates the state when input changes.

Examples:

### Entity flows

```js
canSave: Boolean(selected)
```

### Custom button action

```js
canSave: Boolean(
  draft.actionDomain.trim()
  && draft.actionService.trim()
  && draft.actionDataValid
)
```

The popup disables the primary action until the form is valid.

---

## 26. Current Styling

Popup CSS lives in:

```text
styles/widget-manager/widget-config-popup.css
```

The popup also reuses Page Creator class names, so it inherits part of the established modal/sheet visual language.

Theme-specific visual styling should come from tokens.

The config popup should not define a totally separate visual system.

---

## 27. Adding A New Config Flow Today

To add a new config flow today:

### Step 1 — Create the config file

Example:

```text
src/widget-config/my-widget-config.js
```

Export:

```js
createMyWidgetConfigDraft()
reconcileMyWidgetConfigDraft()
buildMyWidgetConfig()
```

### Step 2 — Add a config manifest in the widget module

Example:

```js
export const MY_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "my-widget",
  title: "Configurer mon widget",
  hint: "Choisis les options à afficher.",
  createDraft: createMyWidgetConfigDraft,
  build: buildMyWidgetConfig,
});
```

### Step 3 — Reference the config type in the widget definition

Example:

```js
export const MY_WIDGET_DEFINITION = Object.freeze({
  ...
  config: "my-widget",
});
```

### Step 4 — Attach the manifest to the widget module

Example:

```js
export const WIDGET_MODULE = Object.freeze({
  kind: "my-widget",
  definition: MY_WIDGET_DEFINITION,
  renderer: MY_WIDGET_RENDERER,
  config: MY_WIDGET_CONFIG_MANIFEST,
  preview: ...
});
```

### Step 5 — Add field rendering to the popup

Current required central edit:

```text
src/widget-config/widget-config-popup.js
```

Add:

```js
createMyWidgetFields()
```

and include it in the popup render branching.

This is the part that should eventually move into the config manifest.

---

## 28. Recommended Future Manifest Shape

To make config flows fully modular, the manifest should eventually become:

```js
export const MY_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "my-widget",
  title: "Configurer mon widget",
  hint: "Choisis les options à afficher.",
  createDraft,
  reconcile,
  build,
  renderFields,
});
```

Then the popup can become generic:

```js
const content = configDefinition.renderFields({
  session,
  hass,
  visibilityConfig,
  onChange,
});
```

Target flow:

```text
Widget module owns:
  definition
  renderer
  config manifest
  preview
  css
```

This would remove the need for switch/ternary logic in the popup.

---

## 29. Risks And Current Limitations

### Popup still knows too many config types

`widget-config-popup.js` currently imports every config-specific function.

That means adding a new config type still requires editing a central file.

This is the main thing preventing config flows from being fully plugin-like.

### Manifest title/hint not fully authoritative

Several manifests define `title` and `hint`, but popup title/hint text is still hardcoded with branching.

This can drift over time.

### `light-options.js` name is too narrow

The file now handles general entity option helpers, not only light options.

A future rename could be:

```text
entity-options.js
```

### Weather has no custom label

Weather config currently only selects an entity.

That may be fine, but it is different from media/toggle/slider/button UX.

### Toggle-slider white temperature mode is not implemented as a complete flow

The current combined light config documents only brightness mode.

If white temperature becomes a real option, the flow should add:

```js
sliderMode: "brightness" | "color_temp"
```

and filter lights by matching capability.

---

## 30. Best Practices

When creating or updating a config flow:

1. Keep draft state separate from widget state.
2. Always reconcile draft state against current `hass.states`.
3. Filter entities through MHA Admin visibility.
4. Display human names, not raw entity ids.
5. Preserve custom labels once edited.
6. Preserve selected manager variant and size.
7. Keep build output explicit and stable.
8. Disable save when no valid entity/action exists.
9. Do not call Home Assistant services from config UI.
10. Keep field UI small and touch-friendly.

---

## 31. Testing Checklist

For every config flow, test:

- no available entities;
- one available entity;
- multiple entities sorted alphabetically;
- custom label entry;
- label auto-fill before customization;
- entity change after custom label;
- invalid saved entity no longer available;
- MHA Admin visibility filtering;
- create mode button label `Continuer`;
- edit mode button label `Enregistrer`;
- selected widget variant preserved;
- selected widget size preserved;
- widget renders after save;
- popup cancel does not mutate widget;
- Home Assistant reload/cache behavior.

For button custom action, also test:

- invalid JSON disables save;
- array JSON is rejected;
- empty JSON becomes `{}`;
- domain + service required.

---

## 32. Architecture Verdict

The config-flow system is already moving in the right direction.

Strengths:

- config manifests exist;
- registry collects manifests from widget modules;
- draft/build pattern is clean;
- entity lists are human-friendly;
- MHA Admin visibility is respected;
- selected manager metadata is preserved;
- popup appears at the right moment before drop.

Main remaining work:

- move field renderers into config manifests;
- make title/hint manifest-driven;
- rename `light-options.js` to a more general entity helper name;
- add tests for every config type;
- document edit-mode integration if/when widget reconfiguration is exposed from placed widgets.

Target state:

```text
Add widget config file
    +
Attach manifest to widget module
```

No central popup branching should be needed.
