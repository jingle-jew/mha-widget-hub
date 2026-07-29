import assert from "node:assert/strict";
import test from "node:test";

import {
  bindComponentHassContract,
  collectChangedEntityIds,
  routeHassUpdate,
} from "../src/core/hass-update-router.js";

function createHass(states = {}) {
  return { states };
}

function createRoot(components) {
  return { querySelectorAll: () => components };
}

test("changed entity discovery compares Home Assistant state references once", () => {
  const light = { state: "off", attributes: {} };
  const previous = createHass({ "light.kitchen": light });
  const unchanged = createHass({ "light.kitchen": light });
  assert.deepEqual([...collectChangedEntityIds(previous, unchanged)], []);

  const next = createHass({ "light.kitchen": { state: "on", attributes: {} } });
  assert.deepEqual([...collectChangedEntityIds(previous, next)], ["light.kitchen"]);
});

test("an unrelated HA update does not touch a contracted widget", () => {
  let calls = 0;
  const component = { __mhaUpdateFromHass: () => { calls += 1; } };
  bindComponentHassContract(component, { kind: "toggle", entityId: "light.kitchen" });
  const light = { state: "off", attributes: { brightness: 0 } };
  const previous = createHass({
    "light.kitchen": light,
    "sensor.outdoor": { state: "10", attributes: {} },
  });
  const next = createHass({
    "light.kitchen": light,
    "sensor.outdoor": { state: "11", attributes: {} },
  });
  const result = routeHassUpdate({ root: createRoot([component]), previousHass: previous, nextHass: next });
  assert.equal(result.updateCount, 0);
  assert.equal(calls, 0);
});

test("a widget skips a related entity update when its visual signature is unchanged", () => {
  let calls = 0;
  const component = { __mhaUpdateFromHass: () => { calls += 1; } };
  bindComponentHassContract(component, { kind: "toggle", entityId: "light.kitchen" });
  const first = createHass({ "light.kitchen": { state: "on", attributes: { brightness: 120 } } });
  routeHassUpdate({ root: createRoot([component]), previousHass: null, nextHass: first });
  assert.equal(calls, 1);

  const sameVisualState = createHass({ "light.kitchen": { state: "on", attributes: { brightness: 120 } } });
  const result = routeHassUpdate({ root: createRoot([component]), previousHass: first, nextHass: sameVisualState });
  assert.equal(result.updateCount, 0);
  assert.equal(calls, 1);
});

test("domain fallback dependencies update automatic media widgets only for media players", () => {
  let calls = 0;
  const component = { __mhaUpdateFromHass: () => { calls += 1; } };
  bindComponentHassContract(component, { kind: "media" });
  const media = { state: "paused", attributes: {} };
  const previous = createHass({ "media_player.office": media, "light.office": { state: "off", attributes: {} } });
  const lightUpdate = createHass({ "media_player.office": media, "light.office": { state: "on", attributes: {} } });
  routeHassUpdate({ root: createRoot([component]), previousHass: previous, nextHass: lightUpdate });
  assert.equal(calls, 0);

  const mediaUpdate = createHass({ "media_player.office": { state: "playing", attributes: {} }, "light.office": lightUpdate.states["light.office"] });
  routeHassUpdate({ root: createRoot([component]), previousHass: lightUpdate, nextHass: mediaUpdate });
  assert.equal(calls, 1);
});

test("component-specific render signatures are preserved by the widget contract", () => {
  const signature = () => "specialized";
  const component = {
    __mhaUpdateFromHass() {},
    __mhaGetHassRenderSignature: signature,
  };
  bindComponentHassContract(component, { kind: "media", entityId: "media_player.office" });
  assert.equal(component.__mhaGetHassRenderSignature, signature);
});
