# Release Checklist

This checklist should be used before publishing or distributing a new version of MHA Widget Hub.

---

## 1. Release Goal

A release should be:

- buildable;
- installable;
- testable in Home Assistant;
- documented;
- visually stable;
- safe for existing user storage;
- compatible with the current extension architecture.

---

## 2. Pre-Release Cleanup

Before release:

- remove temporary debug logs;
- remove unused test files;
- remove experimental dead code;
- confirm no local-only paths are committed;
- confirm no `.DS_Store` files are included;
- confirm generated artifacts are intentional;
- confirm documentation links work.

Check for accidental files:

```bash
find . -name ".DS_Store"
```

---

## 3. Version And Metadata

Confirm version-related files are updated if applicable:

```text
package.json
hacs.json
custom_components/*/manifest.json
README.md
CHANGELOG.md
```

Exact files may vary depending on the current packaging structure.

---

## 4. Build Checks

Run:

```bash
npm install
npm run check:syntax
npm test
npm run build
```

If any command fails, stop the release.

---

## 5. Automated Test Checklist

Confirm tests pass for:

- storage;
- pages;
- placement;
- responsive layout;
- widget factory;
- widget registry/catalog;
- widget previews;
- Home Assistant bindings;
- entity permissions;
- wallpaper storage;
- theme tokens;
- screensaver controller;
- DOM lifecycle.

---

## 6. Manual dev.html Checklist

Open `dev.html` and verify:

- app loads without raw code flash;
- widgets render;
- widget manager opens;
- live previews render;
- config popup opens;
- settings panel opens;
- dock positions work;
- theme switching works;
- wallpaper controls work if changed;
- resize behavior is stable.

---

## 7. Manual Home Assistant Checklist

In Home Assistant, verify:

- sidebar panel appears;
- panel opens;
- no blank screen;
- navigating away and back works;
- frontend cache does not show old code;
- real `hass` entity states are read;
- service calls work for supported widgets;
- config popup lists real entities;
- admin visibility filtering works;
- reload preserves layout/settings.

---

## 8. Widget Checklist

Test at least one widget from each active family:

- clock;
- button;
- toggle;
- slider;
- toggle-slider;
- weather;
- media.

For each affected widget, verify:

- manager entry;
- preview;
- config flow if any;
- placement;
- render;
- state persistence;
- Home Assistant behavior.

---

## 9. Theme Checklist

Test:

- OneUI light/dark;
- Material light/dark;
- iOS Liquid light/dark;
- iOS Frosted light/dark.

Check:

- widgets;
- dock;
- status bar;
- settings panel;
- widget manager;
- config popup;
- text contrast;
- borders;
- blur;
- accents.

---

## 10. Responsive Checklist

Test:

- desktop wide;
- desktop narrow;
- tablet;
- mobile;
- orientation changes if possible;
- dock left;
- dock right;
- dock bottom;
- mobile floating buttons.

Watch for:

- horizontal overflow;
- cropped panels;
- dock outside viewport;
- tiny widgets on first load;
- frozen layout during startup.

---

## 11. Storage Compatibility Checklist

Before release, verify existing users are not broken.

Test with:

- fresh storage;
- old stored widgets;
- invalid/missing stored values;
- multiple pages;
- custom wallpapers;
- existing theme settings;
- existing dock position;
- admin entity visibility settings.

Confirm migrations/defaults work safely.

---

## 12. HACS / Packaging Checklist

Confirm packaged files include everything needed:

```text
mha-widget-hub.js
src/*
styles/*
assets/*
custom_components/* if applicable
hacs.json
README.md
LICENSE
docs/*
```

Confirm packaged files exclude unnecessary files:

```text
node_modules
.DS_Store
temporary screenshots
local-only scripts
debug output
```

If using HACS, verify:

- repository structure is valid;
- install path is correct;
- frontend resources are available;
- integration/panel registration works;
- update path does not require manual cleanup.

---

## 13. Documentation Checklist

Confirm docs are updated when relevant:

```text
README.md
docs/installation.md
docs/user-guide.md
docs/widgets.md
docs/themes.md
docs/theme-tokens.md
docs/preview-system.md
docs/config-flows.md
docs/architecture.md
docs/development.md
docs/testing.md
docs/release-checklist.md
```

README should stay light.

Advanced details should stay in `docs/`.

---

## 14. Changelog Checklist

Write a changelog entry with:

- user-visible changes;
- developer changes;
- breaking changes if any;
- migration notes if any;
- known issues if any.

Example format:

```markdown
## x.y.z

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Internal
- ...

### Known Issues
- ...
```

---

## 15. Breaking Change Checklist

If there is a breaking change, document:

- what changed;
- who is affected;
- how to migrate;
- whether storage is migrated automatically;
- whether users must clear cache;
- whether Home Assistant restart is required.

Avoid breaking existing stored widgets unless there is a migration.

---

## 16. Final Release Smoke Test

Before publishing:

1. Fresh browser session.
2. Open Home Assistant.
3. Open MHA from sidebar.
4. Add a configurable widget.
5. Add a non-configurable widget.
6. Change theme.
7. Change dock position.
8. Reload page.
9. Navigate away and back.
10. Confirm state persists.

---

## 17. Tagging

When ready:

```bash
git status
git log --oneline -n 5
```

Confirm working tree is clean.

Then tag according to the project versioning strategy.

Example:

```bash
git tag v0.x.y
git push origin v0.x.y
```

Only tag after tests and manual checks are complete.

---

## 18. Post-Release Verification

After release/install/update:

- install through the expected path;
- open MHA in Home Assistant;
- verify version/update is actually loaded;
- test one widget;
- test one theme switch;
- check browser console;
- check Home Assistant logs if integration files changed.

---

## 19. Rollback Notes

Before release, know how to roll back:

- previous git tag;
- previous HACS release;
- previous frontend JS file;
- user storage compatibility.

If a release changes storage format, rollback may be more complicated.

Document this in the changelog if relevant.

---

## 20. Release Principle

Do not release only because the build passes.

A safe MHA release needs:

```text
automated checks
+
manual UI checks
+
Home Assistant checks
+
documentation updates
```

The project is UI-heavy, so visual/manual validation is part of the release process.
