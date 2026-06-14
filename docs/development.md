# Development

This guide covers local frontend work, automated checks and synchronization of
the Home Assistant integration bundle.

See the [main README](../README.md) for product context and
[Architecture](architecture.md) for system contracts.

## Requirements

- Node.js 22 or newer;
- npm;
- a static HTTP server;
- Python 3 for the example server command.

The project currently has no runtime npm dependencies.

## Local Server

Install the locked npm environment:

```bash
npm ci
```

Start a static server from the repository root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/dev.html
```

`dev.html` supplies a lightweight `hass` mock and development controls for
themes, responsive modes and previews.

Because the frontend uses native ES modules, serve it over HTTP rather than
opening the HTML file directly.

## Quality Commands

Run the full local CI contract:

```bash
npm run check
```

This executes:

1. JavaScript syntax validation;
2. unit tests with Node Test Runner;
3. source/generated frontend parity.

Individual commands:

```bash
npm run check:syntax
npm test
npm run check:sync
```

Current tests cover:

- responsive boundaries;
- widget and logical size conversion;
- registry normalization and aliases;
- variant selection and cycling;
- Home Assistant entity availability;
- toggle and slider service payloads;
- throttled latest-value actions;
- storage reads, writes and backups;
- DOM lifecycle cleanup.

## Frontend Source of Truth

Canonical frontend files live at the repository root:

```text
mha-control-hub-loader.js
mha-widget-hub.js
src/
styles/
assets/
```

The runtime copy under:

```text
custom_components/mha_widget_hub/frontend/
```

is generated.

Never edit the generated copy directly. Make changes in the canonical source,
then run:

```bash
npm run sync:frontend
```

The generated files must be committed with the source change.

## Synchronization Check

Verify parity without modifying files:

```bash
npm run check:sync
```

This calls:

```bash
node tools/sync-integration-frontend.mjs --check
```

The check fails when the integration copy contains a missing, extra or
different file. GitHub Actions runs the same command through `npm run check`.

## Adding or Changing a Widget

Prefer this order:

1. define identity, sizes and variants in `widget-registry.js`;
2. add or update the widget renderer;
3. keep widget composition in `src/widgets/`;
4. reuse controls from `src/ui/`;
5. place HA service logic in `src/ha/`;
6. add configuration under `src/widget-config/` when needed;
7. add manager entries and previews;
8. cover pure contracts with `node:test`;
9. synchronize the integration frontend.

Use canonical `kind` for new data. `type` and `component` aliases are migration
inputs, not new identities.

## CSS Workflow

Follow the existing layers:

1. core tokens;
2. layout;
3. reusable component;
4. widget-specific styling;
5. theme token overrides.

Prefer semantic tokens over repeating hard-coded colors and shadows. Keep
viewport queries in the shell where possible; widget internals should respond
to their own container.

After significant visual changes, verify at least:

- mobile portrait;
- mobile landscape;
- tablet;
- desktop;
- light and dark themes;
- OneUI, iOS and Material styles;
- edit and normal modes.

## Home Assistant Changes

Keep entity and service behavior out of visual primitives.

- entity lookup belongs in `src/ha/entity.js`;
- service construction belongs in `src/ha/toggle.js` or `src/ha/slider.js`;
- execution and throttling belong in `src/ha/actions.js`;
- widgets should disable actions when HA state is absent or unavailable.

When adding a service contract, test the exact `{domain, service, data}` payload.

## Persistence Changes

Use helpers from `src/core/storage.js` instead of direct writes.

Migration rules:

- distinguish absent data from corrupt JSON;
- create a backup before destructive transformation;
- do not advance the schema version after a failed write;
- keep logs free of stored user content;
- return or aggregate explicit persistence results.

## CI

The workflow at `.github/workflows/ci.yml` runs on pushes and pull requests with
Node.js 24:

```bash
npm ci
npm run check
```

There is no separate CI-only behavior. A passing local `npm run check` should
match the repository quality job.
