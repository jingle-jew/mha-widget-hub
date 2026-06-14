# Home Assistant installation

MHA Widget Hub is packaged as a HACS custom integration. The integration serves
its bundled frontend and registers the `mha-widget-hub` panel automatically
after the integration has been configured once.

## Install with HACS

1. Add `https://github.com/jingle-jew/mha-widget-hub` as a custom HACS
   repository of type **Integration**.
2. Install **MHA Widget Hub** and restart Home Assistant.
3. Open **Settings > Devices & services > Add integration**.
4. Search for **MHA Widget Hub** and submit the empty setup form.

The integration then registers:

- sidebar title: `MHA`;
- sidebar icon: `mdi:view-dashboard`;
- panel URL: `/mha-widget-hub`;
- frontend loader URL: `/mha_widget_hub_static/mha-widget-hub-loader.js`.

No `panel_custom:` entry is required. HACS installs files but cannot create a
Home Assistant config entry by itself, so step 4 is required once. After that,
the panel is registered automatically on every Home Assistant startup.

## Manual installation

Copy `custom_components/mha_widget_hub` into the Home Assistant
`config/custom_components` directory, restart Home Assistant, then add the
integration from **Settings > Devices & services**.

As an optional YAML fallback, the integration can also be loaded with:

```yaml
mha_widget_hub:
```

This fallback still registers the panel from the integration itself. It does
not use `panel_custom:`.

## Frontend development

The frontend source of truth stays at the repository root:

- `mha-widget-hub-loader.js`;
- `mha-widget-hub.js`;
- `src/`;
- `styles/`;
- `assets/`.

After changing those files, synchronize the HACS bundle with:

```bash
npm run sync:frontend
```

The generated runtime copy lives in
`custom_components/mha_widget_hub/frontend/` and must be committed with the
source change. Never edit files in that generated directory directly: make the
change in the root source, then run the synchronization command.

To verify the bundle without modifying files:

```bash
npm run check:sync
```

This runs `sync-integration-frontend.mjs --check`. CI executes the same check
and fails when a file is missing, extra or different. The existing `dev.html`
workflow remains unchanged.
