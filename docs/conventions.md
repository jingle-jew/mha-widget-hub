# Conventions

This document defines naming, structure and contribution conventions for MHA Widget Hub.

The goal is to keep the project predictable as it grows.

---

## 1. General Principles

Prefer:

```text
registry
module
manifest
token
helper
coordinator
test
```

Avoid:

```text
switch
hardcoded list
duplicated logic
inline visual exception
hidden dependency
```

A contributor should be able to find the right place for a change quickly.

---

## 2. File Naming

Use lowercase kebab-case for files:

```text
toggle-slider-widget.js
widget-config-popup.js
theme-controller.js
placement-calculations.js
semantic-tokens.css
```

Avoid:

```text
ToggleSliderWidget.js
widgetConfigPopup.js
theme_controller.js
```

---

## 3. Folder Ownership

| Area | Folder |
|---|---|
| Main custom element | project root |
| Core utilities/coordinators | `src/core/` |
| Pages | `src/pages/` |
| Layout/grid/dock | `src/layout/` |
| Shared panels/sheets | `src/panels/` |
| Widgets | `src/widgets/` |
| Widget manager | `src/widget-manager/` |
| Widget config flows | `src/widget-config/` |
| Themes/settings | `src/settings/` |
| Style manifest | `src/styles/` |
| CSS | `styles/` |
| HA helpers | `src/ha/` |
| Admin/permissions | `src/admin/` |
| Screensaver | `src/screensaver/` |
| Reusable UI primitives | `src/ui/` |
| System controls | `src/system/` |
| Tests | `tests/` |
| Docs | `docs/` |

---

## 4. Widget Naming

Widget files should use:

```text
{name}-widget.js
```

Examples:

```text
weather-widget.js
media-widget.js
toggle-slider-widget.js
simple-button-widget.js
scenes-widget.js
```

Widget kind should be stable and lowercase:

```js
kind: "toggle-slider"
```

Widget component should usually end in `-widget`:

```js
component: "toggle-slider-widget"
```

---

## 5. Widget Module Convention

A widget module should export:

```js
export const WIDGET_MODULE = Object.freeze({
  kind,
  definition,
  renderer,
  config,
  preview,
});
```

If a field is not needed, omit it.

Recommended order inside a widget file:

```text
constants/helpers
definition
renderer
config manifest
preview helpers
WIDGET_MODULE
```

The module should own as much widget-specific behavior as possible.

---

## 6. Widget Definition Convention

Widget definitions should be named:

```js
{Name}_WIDGET_DEFINITION
```

Example:

```js
export const TOGGLE_SLIDER_WIDGET_DEFINITION = Object.freeze({
  ...
});
```

Definitions may include:

```js
component
category
manager
renderer
css
aliases
variantAliases
defaultSize
defaultVariant
variants
variantGroups
config
capabilities
storage
shell
placementFlow
normalizeSize
```

Use definition metadata instead of adding widget-specific branches in central files.

---

## 7. Widget Renderer Convention

Renderer constants should use:

```js
{Name}_WIDGET_CONTENT_RENDERER
```

Example:

```js
export const MEDIA_WIDGET_CONTENT_RENDERER = Object.freeze({
  render({ widget, hass, interactive }) {
    ...
  },
});
```

Renderers should not own:

- registry logic;
- manager logic;
- global layout logic;
- theme identity;
- storage migrations.

Use `src/ha/` helpers for Home Assistant-specific behavior.

---

## 8. Widget Config Convention

Config files should use:

```text
{name}-config.js
```

Examples:

```text
toggle-config.js
slider-config.js
toggle-slider-config.js
media-config.js
scenes-config.js
```

Export functions should follow this pattern:

```js
create{Name}ConfigDraft()
reconcile{Name}ConfigDraft()
build{Name}WidgetConfig()
render{Name}ConfigFields()
```

Config manifests should use:

```js
{Name}_WIDGET_CONFIG_MANIFEST
```

Example:

```js
export const MEDIA_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "media",
  title: "Configure media",
  hint: "Choose a media player and display name.",
  createDraft: createMediaConfigDraft,
  build: buildMediaWidgetConfig,
  renderFields: renderMediaConfigFields,
});
```

Optional dynamic/i18n fields:

```js
titleKey
hintKey
getTitle
getHint
```

Field rendering should live in `renderFields`, not in `widget-config-popup.js`.

---

## 9. Config Draft Convention

Drafts should be plain objects.

They should hold editable UI state, not mutate the real widget directly.

Typical fields:

```js
{
  entityId,
  label,
  labelCustomized,
}
```

For custom action widgets:

```js
{
  actionDomain,
  actionService,
  actionData,
  actionDataValid,
}
```

Use `labelCustomized` to prevent entity changes from overwriting a user-entered label.

---

## 10. Config Build Convention

Build functions should preserve the original widget:

```js
return {
  ...widget,
  kind: "my-widget",
  entityId,
  label,
};
```

Do not rebuild from scratch unless there is a strong reason.

This preserves:

- variant;
- size;
- manager metadata;
- future fields;
- compatibility data.

---

## 11. Config RenderFields Convention

`renderFields` should use this signature:

```js
renderFields(session, hass, visibilityConfig, onChange, helpers)
```

It should return:

```js
{
  fields,
  canSave,
  isValid,
}
```

Use the provided helpers when possible:

```js
helpers.createField(...)
helpers.t(...)
helpers.configOptionLabel(...)
helpers.emptyLabelForConfigOption(...)
```

Keep UI small and touch-friendly.

---

## 12. Preview Convention

Preview support should live in the widget module.

Recommended function name:

```js
create{Name}PreviewWidget()
```

Preview manifest:

```js
preview: Object.freeze({
  mode: "live",
  createWidget: createMediaPreviewWidget,
})
```

Use static previews only when live previews are not practical.

---

## 13. Manager Entry Convention

Manager entries should live in widget definitions.

Example:

```js
manager: Object.freeze({
  hidden: false,
  entries: Object.freeze([
    Object.freeze({
      category: "media",
      variant: "media-compact",
      label: "Media",
      description: "Compact media control.",
      size: freezeSize(2, 2),
      order: 10,
    }),
  ]),
})
```

Manager entries should include:

- category;
- variant;
- label;
- description;
- size;
- order when useful.

Use `manager.hidden: true` to hide the whole widget from the manager.

Use `entry.hidden: true` to hide one catalog item.

Avoid defining manager entries in `widget-manager.js`.

---

## 14. Widget Category Convention

Current categories:

```text
utilities
actions
lights
climate
media
security
system
```

Use an existing category unless a new one is clearly needed.

A new category should be added centrally and documented.

---

## 15. Widget Storage Convention

Widget-specific stored-data compatibility should live in the widget definition when possible.

Example:

```js
storage: Object.freeze({
  normalize(widget = {}) {
    return {
      entityId: widget.entityId || widget.entity_id || "",
    };
  },
})
```

This keeps legacy field handling close to the widget that owns it.

Avoid growing central normalization branches.

---

## 16. Widget Capability Convention

Use capabilities for behavior that the shell or placement flow needs to know.

Example:

```js
capabilities: Object.freeze({
  configurable: true,
  resizable: true,
  slotConfigurable: false,
})
```

Use capabilities instead of hardcoding widget kinds in shell/flow modules.

---

## 17. Widget Shell And Placement Convention

Use definition metadata for shell/placement behavior:

```js
shell: Object.freeze({
  configureMode: "variant",
})
```

```js
placementFlow: "configure-first"
```

or:

```js
placementFlow: "slot-config-first"
```

This keeps special widget behavior declarative.

---

## 18. Theme Naming

Theme ids should be lowercase and stable:

```text
ios
oneui
material
```

Use aliases for alternate names:

```js
aliases: ["material-you", "material3", "material-3"]
```

Avoid changing existing theme ids because they may be stored in localStorage.

---

## 19. Theme File Convention

Theme CSS files should live in:

```text
styles/themes/
```

and use:

```text
{name}.css
```

A theme should be registered in:

```text
src/settings/theme-registry.js
```

---

## 20. Theme Registry Convention

Theme entries should include:

```js
{
  id,
  label,
  order,
  defaultIconShape,
  css,
  aliases,
}
```

---

## 21. Token Convention

New component/widget/panel CSS should prefer semantic tokens:

```css
--mha-primary-surface
--mha-on-primary-surface
--mha-secondary-surface
--mha-on-secondary-surface
--mha-primary-border
--mha-secondary-border
--mha-primary-text
--mha-secondary-text
--mha-muted-text
--mha-accent-surface
--mha-on-accent-surface
```

Legacy tokens may still be used for compatibility, but new work should move toward semantic roles.

Avoid hardcoded colors unless the value is genuinely local.

---

## 22. CSS Selector Convention

Prefer host dataset selectors for theme/system state:

```css
:host([data-theme-style="ios"])
:host([data-theme-style="ios"][data-ios-glass="liquid"])
:host([data-theme="dark"])
:host([data-accent="blue"])
```

Avoid JavaScript-driven class toggles for theme identity when a dataset attribute already exists.

---

## 23. CSS Layer Convention

Use the right CSS folder:

| Type | Folder |
|---|---|
| base tokens/background | `styles/core/` |
| reusable controls | `styles/components/` |
| system controls | `styles/system/` |
| theme identity | `styles/themes/` |
| shell/grid/dock/status layout | `styles/layout/` |
| shared panels/sheets | `styles/panels/` |
| settings panel | `styles/settings/` |
| widget manager/config popup | `styles/widget-manager/` |
| widget shell/widget CSS | `styles/widgets/` |
| screensaver | `styles/screensaver/` |

Do not put theme identity into widget CSS unless it is a controlled exception.

---

## 24. Panel Convention

Shared overlay/sheet behavior should use:

```text
src/panels/panel-shell.js
src/panels/panel-surface-contract.js
styles/panels/
```

Use panel surface roles and mobile presentation metadata instead of duplicating modal/sheet structure.

---

## 25. Coordinator Convention

Coordinators should have narrow, domain-specific ownership.

Examples:

```text
boot-lifecycle-coordinator.js
render-pipeline.js
page-ui-coordinator.js
settings-surface-coordinator.js
widget-flow-coordinator.js
widget-surface-coordinator.js
screensaver-coordinator.js
```

Use a coordinator when logic is orchestration-heavy and would otherwise grow `mha-widget-hub.js`.

Avoid creating a coordinator for tiny pure helpers.

---

## 26. JavaScript Naming

Use descriptive function names.

Prefer:

```js
createWidgetConfigSession()
normalizeWidgetContract()
getWidgetManagerCategories()
filterEntitiesForCurrentUser()
```

Boolean functions should read like booleans:

```js
isWidgetKind()
hasWidgetContentRenderer()
supportsWidgetConfiguration()
```

---

## 27. Constant Naming

Use uppercase for exported constants:

```js
WIDGET_MODULES
WIDGET_REGISTRY
THEME_REGISTRY
STORAGE_KEYS
```

Use descriptive names for module-local constants too.

---

## 28. Object Immutability

Registry/config metadata should generally be frozen:

```js
Object.freeze(...)
```

Use frozen objects for:

- widget modules;
- widget definitions;
- config manifests;
- theme definitions;
- option lists;
- preview data.

---

## 29. Home Assistant Helper Convention

Home Assistant logic should live in:

```text
src/ha/
```

Use helpers for:

- entity ids;
- domains;
- availability;
- capabilities;
- service calls;
- weather data;
- media data;
- toggle behavior;
- slider behavior.

Avoid direct service calls in widget renderers when a helper exists.

---

## 30. Entity Naming Convention

Use `entityId` in MHA widget objects when possible.

Accept compatibility aliases when needed:

```text
entity_id
entity
lightEntityId
mediaEntityId
weatherEntityId
```

Normalize toward `entityId` when the widget only has one primary entity role.

For widget-specific roles, explicit names are okay when a widget can have more than one entity role.

---

## 31. Local Storage Key Convention

Storage keys should be centralized.

Use:

```text
src/core/storage-keys.js
```

or the domain-specific storage module.

Avoid scattering raw string keys.

Key names should start with:

```text
mha-
```

---

## 32. Documentation Naming

Docs should live in:

```text
docs/
```

Use lowercase kebab-case:

```text
user-guide.md
theme-tokens.md
preview-system.md
config-flows.md
release-checklist.md
```

README should remain short and approachable. Advanced details belong in `docs/`.

---

## 33. Test Naming

Test files should use:

```text
{name}.test.js
```

Test the contract, not just the implementation detail.

---

## 34. Commit Message Convention

Use short, scoped messages.

Examples:

```text
docs: update config flow guide
widgets: add live preview for media widget
themes: normalize frosted panel surfaces
layout: fix bottom dock grid columns
config: preserve widget variant during build
```

Suggested prefixes:

```text
docs
widgets
themes
config
preview
layout
settings
admin
ha
tests
build
release
```

Avoid huge mixed commits.

---

## 35. Branch Naming Convention

Suggested branch names:

```text
docs/update-current-architecture
widgets/media-preview
themes/ios-token-cleanup
config/manifest-field-renderers
layout/bottom-dock-columns
```

---

## 36. Changelog Convention

Use:

```markdown
## x.y.z

### Added
### Changed
### Fixed
### Internal
### Documentation
### Known Issues
```

Only include sections that matter.

Mention breaking changes clearly.

---

## 37. Versioning Direction

MHA should eventually follow semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Suggested meaning:

| Type | Meaning |
|---|---|
| MAJOR | breaking storage/API/extension changes |
| MINOR | new widgets/themes/features |
| PATCH | fixes and safe improvements |

Before a stable public release, `0.x.y` versioning is acceptable.

---

## 38. Accessibility Conventions

When adding UI:

- keep touch targets large enough;
- preserve text contrast;
- do not rely only on color;
- support keyboard focus where practical;
- keep labels human-readable;
- avoid tiny controls in mobile layouts;
- avoid excessive motion.

MHA is a family/shared interface, so clarity matters more than density.

---

## 39. UX Writing Convention

Prefer human labels.

Good:

```text
Light
Media player
Display name
Continue
Save
```

Avoid exposing raw technical wording first:

```text
entity_id
service call
domain
payload
```

Developer/admin screens may use technical terms when appropriate.

---

## 40. French/English Convention

Current project docs may use English, while UI labels may be French or mixed depending on current implementation.

Suggested direction:

- code and developer docs: English;
- UI labels: eventually localizable;
- comments: English unless explaining a user-facing French string;
- README: can remain English for open-source reach.

If localization is added later, avoid hardcoding UI strings directly inside logic-heavy modules.

---

## 41. Backward Compatibility Convention

When renaming or changing widget kinds/variants:

- keep aliases;
- migrate stored values;
- test old storage;
- document the change.

Do not break existing user layouts without a migration.

---

## 42. Deprecation Convention

When replacing old tokens, fields or modules:

1. keep compatibility alias;
2. document the preferred replacement;
3. migrate usage gradually;
4. remove only after a clear cleanup phase.
