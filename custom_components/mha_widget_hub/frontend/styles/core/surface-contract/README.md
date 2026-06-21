# Surface Contract Modules

This folder contains dormant CSS token modules for the future MHA global surface contract.

They are intentionally **not loaded** by `src/styles/style-manifest.js` yet.

## Purpose

These files define the future token vocabulary in isolated modules before any visual migration happens.

The modules must not:

- change legacy tokens;
- override existing runtime behavior;
- be added to the style manifest during the audit/proposal phase;
- alter OneUI, Material, or iOS rendering;
- affect background color extraction.

## Intended future load order

When the migration begins, the intended order is:

```text
legacy tokens.css
semantic-tokens.css
surface-contract/foundation.css
surface-contract/effects.css
surface-contract/adapters.css
theme files
component files
```

For now, the modules are documentation-grade CSS references only.

## Files

- `foundation.css`: global surface, border, text and radius role names.
- `effects.css`: shadow, blur, saturation, brightness, filter and highlight role names.
- `adapters.css`: component-family adapter names for widgets, shell, panels, popups, tiles, controls and backdrops.

## Migration rule

Do not wire these modules into the manifest until Phase 2 is explicitly approved.
