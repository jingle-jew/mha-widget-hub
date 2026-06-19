# Config Flows

This document describes the current widget configuration flow system used by MHA Widget Hub.

The current system is manifest-driven: each configurable widget owns its draft creation, build logic and field rendering through its config manifest.

---

## 1. Purpose

Config flows let MHA ask the user for the information a widget needs before placing it on the grid or before updating an existing widget configuration.

The user-facing goal is simple:

> Users choose human concepts like “Light”, “Media player”, “Mode”, “Routine” or “Display name”, while MHA stores the Home Assistant ids and widget metadata internally.

Entity ids are still stored in widget config, but selection lists display friendly names and respect MHA Admin visibility filtering.

---

## 2. Current User Flow

Typical create flow:

```text
User opens widget manager
        ↓
User selects a widget entry
        ↓
MHA checks whether the widget supports configuration
        ↓
If configurable, a config popup opens before drop
        ↓
User selects entities/options/name
        ↓
The config manifest builds the configured widget
        ↓
Widget placement continues
        ↓
Widget is placed on the grid
```

Important detail:

The popup appears after selecting the widget in the manager and before dropping it onto the grid. This preserves manager-selected metadata such as variant, size, title, category and future catalog fields.

---

## 3. Current Configurable Widgets

The following widgets currently expose config manifests:

| Widget kind | Config type | Config file |
|---|---|---|
| `button` | `button` | `src/widget-config/button-config.js` |
| `scenes` | `scenes` | `src/widget-config/scenes-config.js` |
| `toggle` | `toggle` | `src/widget-config/toggle-config.js` |
| `slider` | `slider` | `src/widget-config/slider-config.js` |
| `toggle-slider` | `toggle-slider` | `src/widget-config/toggle-slider-config.js` |
| `weather` | `weather` | `src/widget-config/weather-config.js` |
| `media` | `media` | `src/widget-config/media-config.js` |

Widgets without a config manifest are placed directly.

---

## 4. Config Manifest Contract

Each configurable widget module attaches a config manifest to its `WIDGET_MODULE`.

Current manifest shape:

```js
export const MY_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "my-widget",
  title: "Configure my widget",
  hint: "Choose the options to display.",
  titleKey: "widgets.config.myWidget.title",
  hintKey: "widgets.config.myWidget.hint",
  getTitle,
  getHint,
  createDraft,
  build,
  renderFields,
});
```

Not every manifest needs every optional field.

| Field | Required | Purpose |
|---|---:|---|
| `type` | yes | Stable config type id |
| `title` | optional | Fallback popup title |
| `hint` | optional | Fallback helper text |
| `titleKey` | optional | i18n key for the title |
| `hintKey` | optional | i18n key for the hint |
| `getTitle` | optional | Dynamic title resolver |
| `getHint` | optional | Dynamic hint resolver |
| `createDraft` | yes | Creates editable config state |
| `build` | yes | Converts draft into final widget config |
| `renderFields` | yes for UI config | Renders the config fields for this manifest |

The popup is now generic. It asks the manifest to render fields instead of knowing every config type itself.

---

## 5. Widget Module Attachment

The manifest is attached to the widget module:

```js
export const WIDGET_MODULE = Object.freeze({
  kind: "toggle",
  definition: TOGGLE_WIDGET_DEFINITION,
  renderer: TOGGLE_WIDGET_CONTENT_RENDERER,
  config: TOGGLE_WIDGET_CONFIG_MANIFEST,
  preview: TOGGLE_WIDGET_PREVIEW,
});
```

The widget definition still references the config type:

```js
export const TOGGLE_WIDGET_DEFINITION = Object.freeze({
  ...
  config: "toggle",
});
```

Both sides matter:

```text
widget definition config id
        ↓
widget module config manifest
        ↓
widget-config-registry
        ↓
widget-config-popup
```

---

## 6. Config Registry

The config registry lives in:

```text
src/widget-config/widget-config-registry.js
```

It collects config manifests from `WIDGET_MODULES`, then builds:

```js
WIDGET_CONFIG_REGISTRY
```

as:

```js
{
  [manifest.type]: manifest
}
```

This means a new config flow is discovered through the widget module registry. A normal new config flow should not require adding a new branch in `widget-config-popup.js`.

---

## 7. Config Session

The popup does not mutate the widget directly.

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
  ...metadata
}
```

Where:

- `mode` is usually `create` or `edit`;
- `widget` is the original widget or manager item;
- `configType` is the resolved config type;
- `draft` is editable temporary state;
- metadata can include contextual fields such as a scenes button index.

This avoids mutating the real widget while the user is changing fields.

---

## 8. Draft / Build Pattern

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

`createDraft` reads the original widget and creates editable state. It usually also calls a reconcile function.

Example shape:

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

Recommended pattern:

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

Always spread the original widget first unless there is a very specific reason not to.

This preserves:

- selected variant;
- selected size;
- manager category;
- title/label metadata;
- catalog entry values;
- future widget metadata.

---

## 9. Render Fields Pattern

Field rendering now belongs to the config manifest.

A manifest exposes:

```js
renderFields(session, hass, visibilityConfig, onChange, helpers)
```

It returns:

```js
{
  fields,
  canSave,
  isValid,
}
```

| Field | Purpose |
|---|---|
| `fields` | DOM node containing the config fields |
| `canSave` | Initial primary-button enabled state |
| `isValid` | Optional function called after input changes |

The popup uses `canSave` for the initial button state and `isValid()` after input events.

### Render helpers

The popup passes common helpers so config files can share consistent markup and labels:

```js
{
  createField,
  configOptionLabel,
  emptyLabelForConfigOption,
  t,
}
```

`createField()` should be preferred for standard label/control/hint layout.

---

## 10. Reconcile Pattern

Most config files use a `reconcile...Draft()` function.

Reconcile functions are responsible for:

- finding valid entity options;
- replacing invalid selected entities;
- picking the first valid option when needed;
- resolving selected option metadata;
- auto-filling labels when the user has not customized them;
- returning save validity data.

Typical return shape:

```js
{
  draft,
  options,
  selected,
}
```

Some flows also return type-specific data:

```js
{
  draft,
  action,
  options,
  selected,
}
```

or:

```js
{
  draft,
  deviceType,
  options,
  selected,
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

---

## 12. Entity Availability Rules

`getEntityOptionsByDomain()` filters entities by domain and availability.

General rule:

```js
getEntityDomain(entityId) === domain
```

and:

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

This keeps only lights that support brightness.

The capability comes from:

```js
supportsLightBrightness(attributes)
```

This matters for:

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

It now uses the shared panel shell:

```text
src/panels/panel-shell.js
src/panels/panel-surface-contract.js
```

The config popup remains visually aligned with the Page Creator sheet and other panel surfaces through shared panel classes and surface roles.

---

## 15. Popup Buttons

The popup has two actions:

| Button | Behavior |
|---|---|
| Cancel | closes without saving |
| Continue | create mode: builds widget and continues to placement |
| Save | edit mode: builds widget and saves changes |

The save/continue button is disabled until the current manifest content is valid.

---

## 16. Toggle-Slider Config

Files:

```text
src/widget-config/toggle-slider-config.js
src/widgets/toggle-slider-widget.js
```

Config type:

```js
"toggle-slider"
```

Purpose:

- choose a compatible light;
- customize display name;
- build a combined light widget.

Draft fields:

```js
{
  lightEntityId,
  label,
  labelCustomized,
  sliderMode,
}
```

Current UI fields:

| Label | Control |
|---|---|
| Display name | text input |
| Light | select |

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
  sliderMode: "brightness",
}
```

White-temperature mode can be added later, but the current complete flow is brightness-based.

---

## 17. Slider Config

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
| `volume` | Volume | `media_player` | No media player available |
| `brightness` | Light brightness | `light` | No light available |

Draft fields:

```js
{
  entityId,
  label,
  labelCustomized,
  sliderAction,
}
```

Current UI fields:

| Label | Control |
|---|---|
| Action | select |
| Device | select |
| Display name | text input |

---

## 18. Toggle Config

Files:

```text
src/widget-config/toggle-config.js
src/widgets/toggle-widget.js
```

Config type:

```js
"toggle"
```

Supported device types:

| Value | Label | Domain |
|---|---|---|
| `light` | Light | `light` |
| `switch` | Switch | `switch` |
| `input_boolean` | Boolean | `input_boolean` |

Draft fields:

```js
{
  deviceType,
  entityId,
  label,
  labelCustomized,
}
```

---

## 19. Button Config

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
| `light` | Light |
| `switch` | Switch |
| `input_boolean` | Boolean |
| `button` | HA button |
| `action` | Custom action |

Draft fields:

```js
{
  buttonType,
  entityId,
  label,
  labelCustomized,
  actionDomain,
  actionService,
  actionData,
  actionDataValid,
}
```

Custom action mode validates `actionData` as a JSON object. Arrays and invalid JSON are rejected.

---

## 20. Scenes Config

Files:

```text
src/widget-config/scenes-config.js
src/widgets/scenes-widget.js
```

Config type:

```js
"scenes"
```

Purpose:

- configure up to four buttons;
- support Home Assistant `scene`, `script` and `automation` entities;
- present `scene` as a Mode and `script`/`automation` as Routine-style shortcuts;
- support per-slot configuration from the widget.

Current widget definition marks:

```js
capabilities: {
  configurable: true,
  slotConfigurable: true,
}
```

and:

```js
placementFlow: "slot-config-first"
```

This lets the widget open configuration for a specific button slot without adding special popup branches.

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

Purpose:

- choose an allowed `weather` entity.

Draft fields:

```js
{
  entityId,
}
```

Weather config currently does not expose a custom display label.

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

Purpose:

- choose a `media_player`;
- customize display name.

Draft fields:

```js
{
  mediaEntityId,
  label,
  labelCustomized,
}
```

---

## 23. Label Customization

Most flows use this pattern:

```js
labelCustomized: Boolean(String(widget.label || "").trim())
```

When the user has not customized the label:

```js
draft.label = selected?.label || "";
```

When the user edits the label:

```js
labelCustomized = true;
```

This gives a good default while still allowing user override.

---

## 24. Preserving Variant And Size

Config builds should always spread the original widget:

```js
return {
  ...widget,
  ...configSpecificFields,
};
```

Avoid rebuilding a widget from scratch because that can lose selected manager metadata.

---

## 25. Styling

Popup CSS lives in:

```text
styles/widget-manager/widget-config-popup.css
```

Shared panel CSS also applies through:

```text
styles/panels/panel-surface-contract.css
styles/panels/panel-frame-alignment.css
styles/panels/page-creator-sheet.css
```

Theme-specific visual styling should come from tokens. The config popup should not define a separate visual system.

---

## 26. Adding A New Config Flow Today

To add a new config flow today:

### Step 1 — Create the config file

```text
src/widget-config/my-widget-config.js
```

Export draft/build/render functions:

```js
createMyWidgetConfigDraft()
reconcileMyWidgetConfigDraft()
buildMyWidgetConfig()
renderMyWidgetConfigFields()
```

### Step 2 — Add a config manifest in the widget module

```js
export const MY_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "my-widget",
  title: "Configure my widget",
  hint: "Choose the options to display.",
  createDraft: createMyWidgetConfigDraft,
  build: buildMyWidgetConfig,
  renderFields: renderMyWidgetConfigFields,
});
```

### Step 3 — Reference the config type in the widget definition

```js
export const MY_WIDGET_DEFINITION = Object.freeze({
  ...
  config: "my-widget",
});
```

### Step 4 — Attach the manifest to the widget module

```js
export const WIDGET_MODULE = Object.freeze({
  kind: "my-widget",
  definition: MY_WIDGET_DEFINITION,
  renderer: MY_WIDGET_RENDERER,
  config: MY_WIDGET_CONFIG_MANIFEST,
  preview: MY_WIDGET_PREVIEW,
});
```

No central `widget-config-popup.js` field branch should be required for a normal config flow.

---

## 27. Risks And Current Limitations

### Reusable field primitives are still limited

`renderFields` is manifest-driven, but field UI is still hand-built by each config flow. Future work can extract reusable primitives for selects, labels, text inputs, segmented controls, JSON fields and entity selectors.

### `light-options.js` name is too narrow

The file now handles general entity option helpers, not only light options.

Future rename candidate:

```text
src/widget-config/entity-options.js
```

### Weather has no custom label

Weather config currently only selects an entity. That may be fine, but it differs from media/toggle/slider/button UX.

### Toggle-slider white temperature mode is not complete

The current combined light config documents brightness mode. If white temperature becomes a real option, the flow should add:

```js
sliderMode: "brightness" | "color_temp"
```

and filter lights by matching capability.

---

## 28. Best Practices

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
11. Put field rendering in the manifest via `renderFields`.

---

## 29. Testing Checklist

For every config flow, test:

- no available entities;
- one available entity;
- multiple entities sorted alphabetically;
- custom label entry;
- label auto-fill before customization;
- entity change after custom label;
- invalid saved entity no longer available;
- MHA Admin visibility filtering;
- create mode button label;
- edit mode button label;
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

For scenes, also test:

- empty slot configuration;
- configured slot activation;
- scene/script/automation entity options;
- per-slot edit mode;
- MHA Admin visibility filtering per slot.

---

## 30. Architecture Verdict

The config-flow system is now strongly manifest-driven.

Strengths:

- config manifests are collected from widget modules;
- draft/build pattern is clean;
- field rendering is delegated to `renderFields`;
- title/hint can be static, i18n-driven or dynamic;
- entity lists are human-friendly;
- MHA Admin visibility is respected;
- selected manager metadata is preserved;
- popup appears before drop when configuration is required;
- the shared panel shell keeps popup visuals consistent.

Main remaining work:

- extract more reusable config field primitives;
- rename `light-options.js` to a broader entity helper name;
- add or maintain tests for every config type;
- document any future edit-mode flows when placed-widget reconfiguration expands.

Target state:

```text
Add widget config file
    +
Attach manifest to widget module
```

No central popup branching should be needed for ordinary config flows.
