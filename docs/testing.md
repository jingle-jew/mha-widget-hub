# Testing Guide

This document describes how to test MHA Widget Hub changes.

Testing should include automated tests, syntax/build checks and manual visual checks.

---

## 1. Test Goals

MHA testing should protect:

- widget registry behavior;
- widget rendering;
- live previews;
- config flows;
- Home Assistant entity handling;
- page storage;
- placement/grid behavior;
- responsive layout;
- theme/token contracts;
- admin entity visibility;
- screensaver behavior;
- Home Assistant panel loading.

---

## 2. Common Test Commands

From the project root:

```bash
npm test
npm run check:syntax
npm run build
```

Use:

```bash
npm run
```

to confirm the exact scripts available in the current branch.

---

## 3. Recommended Test Order

For most changes:

```text
1. check syntax
2. run automated tests
3. build
4. test in dev.html
5. test in Home Assistant
6. test responsive/browser variations
```

Recommended command sequence:

```bash
npm run check:syntax
npm test
npm run build
```

---

## 4. Automated Test Areas

Current tests cover major architecture seams such as:

```text
dom-lifecycle.test.js
placement-controller.test.js
entity-visibility-store.test.js
page-store.test.js
page-model.test.js
widget-manager-catalog.test.js
entity-permissions.test.js
widget-preview-context.test.js
storage.test.js
responsive-layout.test.js
placement-calculations.test.js
page-controller.test.js
ios-surface-tokens.test.js
widget-factory.test.js
wallpaper-storage.test.js
ha-bindings.test.js
screensaver-controller.test.js
theme-text-tokens.test.js
widget-preview-renderer.test.js
placement-geometry.test.js
```

When changing one of these systems, update or add tests.

---

## 5. Widget Tests

When adding or changing a widget, verify:

- widget module exports correctly;
- widget appears in `WIDGET_MODULES`;
- widget definition is normalized by the registry;
- manager entries appear in the correct category;
- default size is valid;
- variants resolve correctly;
- aliases work if provided;
- renderer produces content;
- widget shell receives correct dataset values;
- widget CSS loads through the style manifest;
- config manifest is found if the widget is configurable;
- preview renderer works or fallback is acceptable.

Manual checks:

- add widget from manager;
- configure widget if needed;
- place widget on grid;
- move widget;
- resize/change variant if supported;
- delete widget;
- reload page and verify persistence.

---

## 6. Preview Tests

When changing preview behavior, verify:

- preview context sets `preview: true`;
- preview context sets `interactive: false`;
- mock `hass` contains expected states;
- no Home Assistant services are called;
- live preview renders a DOM node;
- fallback preview renders for unsupported widgets;
- preview scale is correct;
- wide widgets are not cropped;
- vertical widgets are centered;
- small widgets do not look oversized;
- previews remain non-interactive.

Manual checks:

- open widget manager;
- test all widget categories;
- inspect 1×1, 2×1, 2×2, 4×1, 1×2 previews;
- test narrow/mobile manager width;
- test light/dark themes.

---

## 7. Config Flow Tests

When changing config flows, verify:

- popup opens after selecting the widget;
- popup opens before grid placement;
- cancel does not create a widget;
- save/continue creates a configured widget;
- selected manager variant is preserved;
- selected manager size is preserved;
- custom label works;
- label auto-fill works before customization;
- entity lists show human names;
- entity ids are stored internally;
- save button is disabled when invalid;
- MHA Admin visibility filtering is respected.

For entity flows, test:

- no available entities;
- one available entity;
- multiple available entities;
- unavailable entities;
- hidden entities;
- renamed friendly names.

For button custom actions, test:

- empty domain/service;
- invalid JSON;
- array JSON;
- valid object JSON;
- `{}` fallback.

---

## 8. Theme Tests

When changing themes or tokens, test:

- OneUI light;
- OneUI dark;
- Material light;
- Material dark;
- iOS Liquid light;
- iOS Liquid dark;
- iOS Frosted light;
- iOS Frosted dark.

Check:

- widgets;
- dock;
- status bar;
- settings panel;
- widget manager;
- config popup;
- page creator popup;
- system buttons;
- mobile dock;
- text contrast;
- borders;
- blur;
- shadows;
- active states;
- accent colors.

Automated token tests should be updated when changing semantic token contracts.

---

## 9. Layout Tests

When changing layout or placement, test:

- desktop;
- tablet;
- mobile;
- dock left;
- dock right;
- dock bottom;
- edit mode;
- drag/drop;
- ghost placement;
- collision behavior;
- swap behavior;
- group movement;
- page changes;
- grid persistence after reload.

Run tests around:

```text
placement-geometry
placement-calculations
placement-controller
responsive-layout
```

Manual stress tests:

- fill the grid;
- move a widget into a crowded row;
- move wide widgets;
- move tall widgets;
- change dock position;
- resize the browser repeatedly.

---

## 10. Home Assistant Tests

In Home Assistant, verify:

- panel opens from sidebar;
- no blank page after navigation away/back;
- `hass` becomes available;
- widgets update from real entity state;
- light toggle works;
- switch toggle works;
- slider service calls work;
- media slider works;
- weather widget reads correct entity;
- admin visibility affects config lists;
- browser reload keeps state.

Also test:

- frontend cache cleared;
- HA restart if panel registration changed;
- HACS install/update path if packaging changed.

---

## 11. Browser Compatibility Tests

Check:

### Chromium

Usually the reference browser for layout and devtools.

### Safari

Important for:

- backdrop-filter;
- safe area;
- mobile viewport;
- fixed/floating elements.

### Firefox

Important because blur/backdrop-filter behavior may differ.

Known risk:

```text
Some transparent/blurred surfaces may appear more transparent in Firefox.
```

### Android / HA App

Important for:

- touch handling;
- viewport height;
- performance;
- Home Assistant WebView quirks.

---

## 12. Persistence Tests

When changing storage, pages, widgets or settings, verify:

- state saves;
- state reloads;
- missing/old values migrate safely;
- invalid JSON does not crash app;
- default values restore correctly;
- reset actions work if available;
- per-device behavior works where intended.

Storage-related tests should cover both valid and invalid stored values.

---

## 13. Admin Visibility Tests

When changing entity filtering or config flows, verify:

- visible entities appear;
- hidden entities do not appear;
- current user filtering works;
- admin panel saves permissions;
- config popups respect permissions;
- existing widgets do not break if their entity becomes hidden;
- friendly names still display correctly.

---

## 14. Screensaver Tests

When changing screensaver behavior, verify:

- idle detection;
- wake interaction;
- clock rendering;
- theme compatibility;
- mobile layout;
- Home Assistant navigation return;
- no stuck overlay;
- no excessive timers.

---

## 15. Performance Checks

For larger changes, check:

- initial load time;
- manager open time;
- preview rendering;
- drag/drop responsiveness;
- resize behavior;
- CPU usage while idle;
- unnecessary repeated renders;
- excessive `hass.callService`;
- repeated `localStorage` writes.

Use browser devtools performance panel when needed.

---

## 16. Regression Checklist

Before merging, quickly check:

- interface does not flash raw code at startup;
- page is not blank after returning to MHA;
- dock positions work;
- manager opens;
- config popup opens;
- at least one widget can be added;
- settings panel opens;
- theme switch works;
- page switch works;
- state persists after reload.

---

## 17. When To Add Tests

Add or update tests when:

- a registry contract changes;
- a widget module shape changes;
- config manifest behavior changes;
- preview scale/context changes;
- placement math changes;
- storage format changes;
- theme token contract changes;
- HA helper behavior changes;
- permissions behavior changes.

Do not rely only on manual testing for architecture-level changes.

---

## 18. Test Philosophy

MHA should be tested like a small frontend platform.

Protect the extension points:

```text
WIDGET_MODULE
THEME_REGISTRY
CONFIG_MANIFEST
PREVIEW_RENDERER
semantic tokens
HA helpers
layout math
```

The more stable these contracts are, the easier it becomes to add widgets, themes and future packs without breaking the app.
