# Optional Sidebar Modules

This document describes a proposed MHA integration architecture where the Home Assistant sidebar panels are modular and optional.

The goal is to keep MHA Widget Hub clean for regular users while allowing advanced tools such as MHA Admin, Theme Builder and Diagnostics to live in the same integration ecosystem.

## Summary

Instead of exposing every MHA tool by default, the integration can let the installer choose which MHA panels should be added to the Home Assistant sidebar.

Example options:

```text
MHA Widget Hub panels
[x] MHA Widget Hub
[x] MHA Admin
[ ] MHA Theme Builder
[ ] MHA Diagnostics
[ ] MHA Dev Tools
```

This creates a single installable MHA integration with optional sidebar modules.

## Product model

```text
MHA Widget Hub
  = end-user dashboard module

MHA Admin
  = administrative/power-user module

MHA Theme Builder
  = visual theme authoring module

MHA Diagnostics
  = troubleshooting/support module
```

The modules are related, but they are not the same user experience.

The dashboard should remain focused on daily use. Admin and authoring tools should be opt-in.

## Why this is preferable

### Compared with putting everything inside MHA Widget Hub

Keeping all tools inside the dashboard would pollute the main product surface.

The dashboard should not need to carry:

- theme authoring UI
- diagnostics tools
- admin-only configuration
- developer experiments

Optional sidebar modules keep those tools available without making the main dashboard feel like a development cockpit.

### Compared with separate integrations for every tool

Creating a separate integration for each tool would increase installation and versioning complexity.

A user might otherwise need to install:

```text
mha-widget-hub
mha-admin
mha-theme-builder
mha-diagnostics
```

That creates version-matching risk and unnecessary setup friction.

A single integration with optional panels is simpler:

```text
Install MHA Widget Hub
Choose enabled modules
```

## Proposed architecture

```text
custom_components/mha_widget_hub/
  __init__.py
  config_flow.py
  const.py
  panel_registry.py
  frontend/
    mha-widget-hub.js
    mha-admin.js
    mha-theme-builder.js
    mha-diagnostics.js
```

Each panel has its own frontend entrypoint.

```text
mha-widget-hub.js
  imports dashboard runtime only

mha-admin.js
  imports admin tools only

mha-theme-builder.js
  imports theme builder only

mha-diagnostics.js
  imports diagnostics only
```

The important rule:

```text
The dashboard must not import Theme Builder/Admin/Diagnostics code.
```

This keeps the runtime lightweight for normal users.

## Panel registry concept

The integration can define panels declaratively.

Example shape:

```python
MHA_PANELS = {
    "dashboard": {
        "title": "MHA Widget Hub",
        "icon": "mdi:view-dashboard",
        "url_path": "mha-widget-hub",
        "module_url": "/mha-widget-hub/frontend/mha-widget-hub.js",
        "default_enabled": True,
    },
    "admin": {
        "title": "MHA Admin",
        "icon": "mdi:shield-account",
        "url_path": "mha-admin",
        "module_url": "/mha-widget-hub/frontend/mha-admin.js",
        "default_enabled": False,
    },
    "theme_builder": {
        "title": "MHA Theme Builder",
        "icon": "mdi:palette",
        "url_path": "mha-theme-builder",
        "module_url": "/mha-widget-hub/frontend/mha-theme-builder.js",
        "default_enabled": False,
    },
    "diagnostics": {
        "title": "MHA Diagnostics",
        "icon": "mdi:bug-check",
        "url_path": "mha-diagnostics",
        "module_url": "/mha-widget-hub/frontend/mha-diagnostics.js",
        "default_enabled": False,
    },
}
```

The setup code can then register only the enabled panels.

## Config flow / options flow

### Initial config flow

During setup, the integration can ask which panels should be shown in the HA sidebar.

Suggested default:

```text
[x] MHA Widget Hub
[ ] MHA Admin
[ ] MHA Theme Builder
[ ] MHA Diagnostics
```

For development builds, Admin could be enabled by default if desired, but regular installs should stay conservative.

### Options flow

The options flow should allow the user to enable or disable modules after installation.

Example:

```text
Settings > Devices & services > MHA Widget Hub > Options

Sidebar modules:
[x] MHA Widget Hub
[x] MHA Admin
[ ] MHA Theme Builder
[ ] MHA Diagnostics
```

Changing options should register newly enabled panels and remove disabled panels when possible.

## Data model

The integration options can store enabled panels as a list.

Example:

```json
{
  "enabled_panels": ["dashboard", "admin", "theme_builder"]
}
```

Recommended behavior:

- Unknown panel IDs are ignored.
- Missing options fall back to default panel settings.
- The dashboard panel should generally remain available unless the user explicitly disables it.
- Admin/dev panels should be opt-in.

## Frontend separation

Each module should have a separate frontend entrypoint.

```text
frontend/
  mha-widget-hub.js
  mha-admin.js
  mha-theme-builder.js
  mha-diagnostics.js
```

This avoids accidentally loading heavy dev tools for a normal dashboard user.

A good dependency direction is:

```text
shared primitives/utilities
  -> dashboard panel
  -> admin panel
  -> theme builder panel
  -> diagnostics panel
```

But the dashboard should not depend on admin/theme-builder modules.

## Theme Builder as an optional module

The Theme Builder should be treated as a tool for creating theme CSS, not as part of the dashboard runtime.

MVP scope:

- token schema
- generated form fields
- static preview
- export CSS
- copy/download output
- no automatic registry mutation

The builder should export a theme file that can be reviewed, committed and synced like regular project code.

Future scope:

- load presets
- import existing theme CSS
- save drafts locally
- optionally write theme files through an explicit admin action

## Diagnostics as an optional module

Diagnostics can eventually include:

- loaded style manifest view
- active theme and appearance state
- enabled modules
- entity visibility status
- frontend version/build metadata
- token inspection helpers
- cache/sync checks

This should remain opt-in to avoid intimidating regular users.

## Guardrails

1. The main dashboard should remain simple and family-friendly.
2. Optional modules should be discoverable from HA config/options, not from the regular dashboard UI.
3. Modules should have separate frontend entrypoints.
4. Modules should not increase dashboard bundle/runtime cost when disabled.
5. The integration should tolerate missing/unknown module IDs.
6. Theme Builder should edit/export tokens, not random component selectors.
7. Dangerous actions such as writing files or changing visibility should require explicit confirmation.
8. Manual visual validation remains the final step for theme changes.

## Migration path

### Phase 1 — Document and registry shape

- Add this document.
- Define the panel registry shape in docs or code comments.
- Keep existing panels unchanged.

### Phase 2 — Internal panel registry

- Create a backend panel registry.
- Move current panel registration into a reusable helper.
- Keep current default behavior.

### Phase 3 — Options flow

- Add checkboxes for enabled panels.
- Store enabled panels in config entry options.
- Re-register panels after options changes.

### Phase 4 — Separate frontend entrypoints

- Ensure each module has its own entrypoint.
- Prevent dashboard runtime from importing admin/builder modules.

### Phase 5 — Theme Builder module

- Add an optional Theme Builder panel.
- Start with preview/export only.
- Do not wire it into the main dashboard.

### Phase 6 — Diagnostics/dev modules

- Add optional diagnostic and dev panels as needed.

## Open questions

- Should `dashboard` be mandatory or user-disableable?
- Should `admin` be enabled by default for development installs only?
- Should module availability depend on user permissions?
- How should disabled panels be removed if Home Assistant keeps stale panel registrations until reload?
- Should Theme Builder live forever inside this integration, or eventually become a separate optional integration?

## Decision summary

The preferred long-term shape is:

```text
One MHA integration
  multiple optional HA sidebar modules
  each module isolated by frontend entrypoint
  installer chooses what appears in the sidebar
```

This keeps MHA easy to install, keeps the dashboard clean, and creates room for advanced tools without forcing them on regular users.
