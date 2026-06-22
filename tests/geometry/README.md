# Layout geometry smoke checks

These checks are optional browser-based smoke tests for coarse layout regressions.

They do not compare screenshots and are not part of `npm run check` yet.

## Run locally

In one terminal:

```bash
npx vite --host 127.0.0.1 --port 4173
```

In another terminal:

```bash
npx -y @playwright/test test tests/geometry
```

If Playwright browsers are missing, install Chromium locally:

```bash
npx -y playwright install chromium
```

## Scope

The tests currently verify:

- `dev.html` loads the MHA host.
- Main shell/workspace/grid/dock surfaces have non-zero geometry.
- Main surfaces stay inside desktop and mobile viewports.
- Desktop and mobile documents do not create obvious horizontal overflow.

Final visual validation remains manual.
