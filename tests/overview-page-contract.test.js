import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBootLifecycleCoordinator } from "../src/core/boot-lifecycle-coordinator.js";

const pageSource = readFileSync(
  new URL("../src/pages/overview-page.js", import.meta.url),
  "utf8",
);
const pageStyles = readFileSync(
  new URL("../styles/pages/overview-page.css", import.meta.url),
  "utf8",
);
const styleManifest = readFileSync(
  new URL("../src/styles/style-manifest.js", import.meta.url),
  "utf8",
);
const renderPipeline = readFileSync(
  new URL("../src/layout/render-pipeline.js", import.meta.url),
  "utf8",
);
const hostSource = readFileSync(
  new URL("../mha-widget-hub.js", import.meta.url),
  "utf8",
);

test("overview owns a specialized 6 + 4 layout with independent section scrolling", () => {
  assert.match(pageStyles, /grid-template-columns:\s*minmax\(0, 6fr\) minmax\(0, 4fr\)/);
  assert.match(pageStyles, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(pageStyles, /\.mha-overview-section-body\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(
    pageStyles,
    /\.mha-overview-section\s*\{[^}]*border:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none[^}]*-webkit-backdrop-filter:\s*none[^}]*backdrop-filter:\s*none/s,
  );
  assert.match(pageSource, /if \(editing\) grid\.classList\.add\("mha-grid"\)/);
  assert.match(styleManifest, /styles\/pages\/overview-page\.css/);
});

test("overview mobile follows Grid columns and portals its four-column sheet outside the page panel", () => {
  assert.match(renderPipeline, /mobileGridUnits:\s*units/);
  assert.match(pageStyles, /\.mha-overview-mobile \.mha-overview-room-grid\s*\{[^}]*repeat\(var\(--mha-overview-room-columns\),/s);
  assert.match(pageStyles, /\.mha-overview-device-grid\s*\{[^}]*repeat\(4,/s);
  assert.match(pageSource, /createPanelShell\(/);
  assert.match(pageSource, /applyPanelSurfaceContract\(createPanelShell\(/);
  assert.match(pageSource, /panel\.dataset\.mobileLayout\s*=\s*"true"/);
  assert.match(hostSource, /surfaceRoot:\s*this\.shadowRoot/);
  assert.match(
    hostSource,
    /onSheetOpenChange:\s*\(open\)\s*=>\s*\{[^}]*syncWidgetSurfaceOpenState\(this\.shadowRoot\)/s,
  );
  assert.match(pageSource, /activeMobileSheet\s*=\s*syncOverviewSheetPortal\(\{[\s\S]*surfaceRoot:\s*resolveSheetSurfaceRoot\(\)/);
  assert.doesNotMatch(pageSource, /mobileRoot\.append\(createMobileSheet/);
  assert.match(
    pageStyles,
    /\.mha-overview-sheet\.mha-page-creator\s+\.mha-overview-sheet-surface\.mha-page-creator-sheet\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/s,
  );
  assert.match(
    pageStyles,
    /\.mha-overview-sheet-body\s*\{[^}]*min-block-size:\s*0[^}]*overflow-y:\s*auto/s,
  );
  assert.match(pageStyles, /data-overview-sheet-open="true"[^}]*\.mha-widget-area\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(pageStyles, /data-overview-sheet-open="true"[^}]*\.mha-mobile-dock/s);
});

test("overview keeps HA child updates and local editing isolated", () => {
  assert.match(pageSource, /root\.dataset\.widgetComponent\s*=\s*"overview-page"/);
  assert.match(pageSource, /root\.__mhaUpdateFromHass\s*=/);
  assert.match(pageSource, /interactive:\s*!isEditing/);
  assert.match(pageStyles, /data-active-page-type="overview"[^}]*\.mha-primary-edit-button/s);
  assert.match(pageStyles, /data-active-page-type="overview"[^}]*\.mha-add-widget-button/s);
  assert.match(hostSource, /overview-devices:\$\{contextId\}/);
  assert.match(hostSource, /_overviewDeviceEditContext\.persistWidgets\(this\._widgets\)/);
  assert.match(pageSource, /headerAction:\s*controller\.editingSection === "devices"/);
  assert.match(pageSource, /mha-add-widget-button mha-overview-header-add-button/);
  assert.match(
    pageStyles,
    /data-active-page-type="overview"[^}]*mha-overview-header-add-button[\s\S]*position:\s*relative\s*!important/,
  );
  assert.match(
    pageStyles,
    /not\(\[data-layout="mobile"\]\)[^}]*mha-main-edit-button\.mha-add-widget-button[\s\S]*display:\s*none\s*!important/,
  );
});

test("the global HA update contract reaches overview widgets rendered inside the sheet", () => {
  const hass = { states: { "light.floor": { state: "on" } } };
  const updates = [];
  const overviewRoot = {
    __mhaUpdateFromHass: value => updates.push(["overview", value]),
  };
  const sheetWidget = {
    __mhaUpdateFromHass: value => updates.push(["sheet-widget", value]),
  };
  const host = {
    _hass: hass,
    shadowRoot: {
      querySelectorAll: selector => {
        assert.equal(selector, "[data-widget-component]");
        return [overviewRoot, sheetWidget];
      },
    },
    _screensaverCoordinator: { requestNowBarCalendarEvents() {} },
    _syncScreensaverDom() {},
  };

  createBootLifecycleCoordinator(host).updateFromHass();

  assert.deepEqual(updates, [
    ["overview", hass],
    ["sheet-widget", hass],
  ]);
});
