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
| Core utilities | `src/core/` |
| Pages | `src/pages/` |
| Layout/grid/dock | `src/layout/` |
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

Recommended order:

```js
definition
renderer
config
preview
WIDGET_MODULE
```

The module should own as much widget-specific behavior as possible.

---

## 6. Widget Definition Convention

Widget definitions should be named:

```js
{NAME}_WIDGET_DEFINITION
```

Example:

```js
export const TOGGLE_SLIDER_WIDGET_DEFINITION = Object.freeze({
  ...
});
```

Definitions should include:

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
config
```

as needed.

---

## 7. Widget Renderer Convention

Renderer constants should use:

```js
{NAME}_WIDGET_CONTENT_RENDERER
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
```

Export functions should follow this pattern:

```js
create{Name}ConfigDraft()
reconcile{Name}ConfigDraft()
build{Name}WidgetConfig()
```

Config manifests should use:

```js
{Name}_CONFIG_MANIFEST
```

Example:

```js
export const MEDIA_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "media",
  title: "Configurer le média",
  hint: "...",
  createDraft: createMediaConfigDraft,
  build: buildMediaWidgetConfig,
});
```

---

## 9. Config Draft Convention

Drafts should be plain objects.

They should hold editable UI state, not mutate the real widget directly.

Typical fields:

```js
{
  entityId,
  label,
  labelCustomized
}
```

For custom action widgets:

```js
{
  actionDomain,
  actionService,
  actionData,
  actionDataValid
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

## 11. Preview Convention

Preview support should live in the widget module.

Recommended function name:

```js
create{Name}PreviewWidget()
```

Example:

```js
function createMediaPreviewWidget(item = {}, context = {}) {
  return {
    ...item,
    kind: "media",
    type: "media",
    component: "media-widget",
    mediaEntityId: "media_player.preview",
    entityId: "media_player.preview",
    label: item.label || "Salon",
  };
}
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

## 12. Manager Entry Convention

Manager entries should live in widget definitions.

Example:

```js
manager: {
  entries: [
    {
      category: "media",
      variant: "media-compact",
      label: "Média",
      description: "Contrôle média compact.",
      size: { w: 2, h: 2 },
      order: 10,
    },
  ],
}
```

Manager entries should include:

- category;
- variant;
- label;
- description;
- size;
- order when useful.

Avoid defining manager entries in `widget-manager.js`.

---

## 13. Widget Category Convention

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

## 14. Theme Naming

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

## 15. Theme File Convention

Theme CSS files should live in:

```text
styles/themes/
```

and use:

```text
{name}.css
```

Examples:

```text
ios.css
oneui.css
material.css
```

A theme should be registered in:

```text
src/settings/theme-registry.js
```

---

## 16. Theme Registry Convention

Theme entries should include:

```js
{
  id,
  label,
  order,
  defaultIconShape,
  css,
  aliases
}
```

Example:

```js
oneui: freezeTheme({
  id: "oneui",
  label: "OneUI",
  order: 20,
  defaultIconShape: "squircle",
  css: css("styles/themes/oneui.css"),
  aliases: ["samsung", "one-ui"],
});
```

---

## 17. Token Convention

New component/widget CSS should prefer semantic tokens:

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

## 18. CSS Selector Convention

Prefer host dataset selectors for theme/system state:

```css
:host([data-theme-style="ios"])
:host([data-theme-style="ios"][data-ios-glass="liquid"])
:host([data-theme="dark"])
:host([data-accent="blue"])
```

Avoid JavaScript-driven class toggles for theme identity when a dataset attribute already exists.

---

## 19. CSS Layer Convention

Use the right CSS folder:

| Type | Folder |
|---|---|
| base tokens/background | `styles/core/` |
| reusable controls | `styles/components/` |
| system controls | `styles/system/` |
| theme identity | `styles/themes/` |
| shell/grid/dock/status layout | `styles/layout/` |
| settings panel | `styles/settings/` |
| widget manager/config popup | `styles/widget-manager/` |
| widget shell/widget CSS | `styles/widgets/` |
| screensaver | `styles/screensaver/` |

Do not put theme identity into widget CSS unless it is a controlled exception.

---

## 20. JavaScript Naming

Use descriptive function names.

Prefer:

```js
createWidgetConfigSession()
normalizeWidgetContract()
getWidgetManagerCategories()
filterEntitiesForCurrentUser()
```

Avoid vague names:

```js
doStuff()
handleThing()
process()
fixData()
```

Boolean functions should read like booleans:

```js
isWidgetKind()
hasWidgetContentRenderer()
supportsWidgetConfiguration()
```

---

## 21. Constant Naming

Use uppercase for exported constants:

```js
WIDGET_MODULES
WIDGET_REGISTRY
THEME_REGISTRY
STORAGE_KEYS
```

Use descriptive names for module-local constants too.

---

## 22. Object Immutability

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

This prevents accidental mutation of global contracts.

---

## 23. Home Assistant Helper Convention

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
- toggle behavior;
- slider behavior.

Avoid direct service calls in widget renderers when a helper exists.

---

## 24. Entity Naming Convention

Use `entityId` in MHA widget objects when possible.

Accept compatibility aliases when needed:

```text
entity_id
entity
lightEntityId
mediaEntityId
```

but normalize toward `entityId`.

For widget-specific roles, explicit names are okay:

```text
lightEntityId
mediaEntityId
weatherEntityId
```

when the widget can have more than one entity role.

---

## 25. Local Storage Key Convention

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

Example:

```text
mha-theme
mha-accent
mha-ios-glass
```

---

## 26. Documentation Naming

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

README should remain short and approachable.

Advanced details belong in `docs/`.

---

## 27. Test Naming

Test files should use:

```text
{name}.test.js
```

Examples:

```text
widget-preview-renderer.test.js
placement-geometry.test.js
theme-text-tokens.test.js
```

Test the contract, not just the implementation detail.

---

## 28. Commit Message Convention

Use short, scoped messages.

Examples:

```text
docs: add config flow guide
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

## 29. Branch Naming Convention

Suggested branch names:

```text
docs/phase-9-roadmap
widgets/media-preview
themes/ios-token-cleanup
config/manifest-field-renderers
layout/bottom-dock-columns
```

---

## 30. Changelog Convention

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

## 31. Versioning Direction

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

## 32. Accessibility Conventions

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

## 33. UX Writing Convention

Prefer human labels.

Good:

```text
Lumière
Lecteur média
Nom affiché
Continuer
Enregistrer
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

## 34. French/English Convention

Current project docs may use English, while UI labels may be French or mixed depending on current implementation.

Suggested direction:

- code and developer docs: English;
- UI labels: eventually localizable;
- comments: English unless explaining a user-facing French string;
- README: can remain English for open-source reach.

If localization is added later, avoid hardcoding UI strings directly inside logic-heavy modules.

---

## 35. Backward Compatibility Convention

When renaming or changing widget kinds/variants:

- keep aliases;
- migrate stored values;
- test old storage;
- document the change.

Do not break existing user layouts without a migration.

---

## 36. Deprecation Convention

When replacing old tokens, fields or modules:

1. keep compatibility alias;
2. document the preferred replacement;
3. migrate usage gradually;
4. remove only after a clear cleanup phase.

Avoid silent removals.

---

## 37. Safety Convention

For changes that affect real Home Assistant actions:

- keep service calls behind helpers;
- validate entity ids;
- respect admin visibility;
- avoid actions during preview/render;
- avoid service calls during config;
- make action widgets explicit.

Preview and config UIs should not trigger real Home Assistant actions.

---

## 38. Performance Convention

Avoid:

- repeated full re-renders when partial updates work;
- repeated storage writes during drag;
- repeated expensive entity scans;
- unnecessary timers;
- unbounded observers;
- layout thrashing;
- huge synchronous startup work.

For expensive UI work, prefer:

- caching;
- requestAnimationFrame;
- lazy rendering;
- small DOM updates.

---

## 39. Review Checklist

Before merging a change, ask:

- Did this add a hardcoded list?
- Did this duplicate logic?
- Did this belong in a registry?
- Did this belong in a helper?
- Did this preserve old storage?
- Did this respect admin visibility?
- Did this update docs?
- Did this add/update tests?
- Did this work in Home Assistant, not only dev.html?

---

## 40. North Star Convention

Every new feature should move MHA toward this:

```text
Simple for family.
Powerful for admin.
Easy for contributors.
Stable for Home Assistant.
```
