import assert from "node:assert/strict";
import test from "node:test";

import { upgradePredefinedProperty } from "../src/core/custom-element-property.js";

test("upgradePredefinedProperty replays an own property through the prototype setter", () => {
  const calls = [];

  class TestElement {
    set hass(value) {
      calls.push(value);
      this._hass = value;
    }

    get hass() {
      return this._hass;
    }
  }

  const host = new TestElement();
  Object.defineProperty(host, "hass", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: "pre-upgrade",
  });

  const upgraded = upgradePredefinedProperty(host, "hass");

  assert.equal(upgraded, true);
  assert.equal(host.hass, "pre-upgrade");
  assert.deepEqual(calls, ["pre-upgrade"]);
  assert.equal(Object.prototype.hasOwnProperty.call(host, "hass"), false);
});

test("upgradePredefinedProperty ignores missing own properties", () => {
  const host = {};

  const upgraded = upgradePredefinedProperty(host, "hass");

  assert.equal(upgraded, false);
  assert.equal(Object.prototype.hasOwnProperty.call(host, "hass"), false);
});
