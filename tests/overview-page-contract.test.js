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

test("overview owns a specialized 6 + 4 layout with independent section scrolling", () => {
  assert.match(pageStyles, /grid-template-columns:\s*minmax\(0, 6fr\) minmax\(0, 4fr\)/);
  assert.match(pageStyles, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(pageStyles, /\.mha-overview-section-body\s*\{[^}]*overflow-y:\s*auto/s);
  assert.equal(pageSource.includes('className = "mha-grid"'), false);
  assert.match(styleManifest, /styles\/pages\/overview-page\.css/);
});

test("overview mobile follows Grid columns, uses a four-column sheet, and blocks the background", () => {
  assert.match(renderPipeline, /mobileGridUnits:\s*units/);
  assert.match(pageStyles, /\.mha-overview-mobile \.mha-overview-room-grid\s*\{[^}]*repeat\(var\(--mha-overview-room-columns\),/s);
  assert.match(pageStyles, /\.mha-overview-device-grid\s*\{[^}]*repeat\(4,/s);
  assert.match(pageSource, /createPanelShell\(/);
  assert.match(pageStyles, /data-overview-sheet-open="true"[^}]*\.mha-widget-area\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(pageStyles, /data-overview-sheet-open="true"[^}]*\.mha-mobile-dock/s);
});

test("overview keeps HA child updates and local editing isolated", () => {
  assert.match(pageSource, /root\.dataset\.widgetComponent\s*=\s*"overview-page"/);
  assert.match(pageSource, /root\.__mhaUpdateFromHass\s*=/);
  assert.match(pageSource, /interactive:\s*!isEditing/);
  assert.match(pageStyles, /data-active-page-type="overview"[^}]*\.mha-primary-edit-button/s);
  assert.match(pageStyles, /data-active-page-type="overview"[^}]*\.mha-add-widget-button/s);
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
