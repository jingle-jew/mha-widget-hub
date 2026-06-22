# Run layout geometry checks

Start the local dev server:

```bash
npx vite --host 127.0.0.1 --port 4173
```

Run the checks:

```bash
npx -y @playwright/test test tests/geometry
```
