import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  createScreensaver,
  updateScreensaverClockVariant,
} from "../src/screensaver/screensaver.js";
import { installDeterministicI18n } from "../tools/i18n-deterministic.mjs";

installDeterministicI18n(beforeEach);

function installDom() {
  class FakeNode {
    constructor(tagName = "") {
      this.tagName = tagName.toUpperCase();
      this.childNodes = [];
      this.dataset = {};
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.className = "";
      this.attributes = {};
      this.textContent = "";
      this.innerHTML = "";
      this.parentNode = null;
      this.listeners = new Map();
    }

    append(...children) {
      children.forEach((child) => {
        if (!child) return;
        child.parentNode = this;
        this.childNodes.push(child);
      });
    }

    prepend(...children) {
      children.reverse().forEach((child) => {
        if (!child) return;
        child.parentNode = this;
        this.childNodes.unshift(child);
      });
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    }

    querySelector(selector) {
      return queryTree(this, selector, true);
    }

    querySelectorAll(selector) {
      return queryTree(this, selector, false);
    }
  }

  function matchesSelector(node, selector) {
    if (!selector.startsWith(".")) return false;
    const className = selector.slice(1);
    return String(node.className || "")
      .split(/\s+/u)
      .filter(Boolean)
      .includes(className);
  }

  function queryTree(root, selector, firstOnly) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.childNodes) {
        if (matchesSelector(child, selector)) {
          matches.push(child);
          if (firstOnly) return true;
        }
        if (visit(child) && firstOnly) return true;
      }
      return false;
    };

    visit(root);
    return firstOnly ? (matches[0] || null) : matches;
  }

  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement(tag) {
      return new FakeNode(tag);
    },
    createElementNS(_namespace, tag) {
      return new FakeNode(tag);
    },
  };
}

beforeEach(() => {
  installDom();
});

afterEach(() => {
  delete globalThis.Node;
  delete globalThis.document;
});

test("screensaver now bar renders dynamic tile text without i18n keys", () => {
  const screensaver = createScreensaver({
    isVisible: true,
    showNowBar: true,
    nowBarTiles: [
      { key: "media", title: "Ocean Drive", subtitle: "Duke Dumont" },
    ],
  });

  const title = screensaver.querySelector(".mha-screensaver-nowbar-title");
  const subtitle = screensaver.querySelector(".mha-screensaver-nowbar-subtitle");

  assert.ok(title);
  assert.ok(subtitle);
  assert.equal(title.textContent, "Ocean Drive");
  assert.equal(subtitle.textContent, "Duke Dumont");
});

test("screensaver digital weather clock uses and refreshes the Now Bar weather entity", () => {
  const hass = {
    config: { unit_system: { temperature: "°C" } },
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "sunny",
        attributes: {
          friendly_name: "Home",
          temperature: 22,
          temperature_unit: "°C",
        },
      },
    },
  };
  const screensaver = createScreensaver({
    isVisible: true,
    showNowBar: false,
    clockVariant: "digital-weather",
    hass,
    weatherEntityId: "weather.home",
  });

  assert.equal(
    screensaver.querySelector(".mha-clock-weather")?.textContent,
    "22°C · Sunny",
  );
  assert.equal(
    screensaver.querySelector(".mha-screensaver-clock-region")?.dataset.weatherEntityId,
    "weather.home",
  );

  hass.states["weather.home"].attributes.temperature = 23;
  assert.equal(updateScreensaverClockVariant(
    screensaver,
    "digital-weather",
    { hass, weatherEntityId: "weather.home" },
  ), false);
  assert.equal(
    screensaver.querySelector(".mha-clock-weather")?.textContent,
    "23°C · Sunny",
  );
});

test("screensaver now bar calendar fallback stays a calendar tile", () => {
  const screensaver = createScreensaver({
    isVisible: true,
    showNowBar: true,
    nowBarItems: {
      now: false,
      weather: false,
      calendar: true,
      media: false,
    },
  });

  const tile = screensaver.querySelector(".mha-screensaver-nowbar-tile");
  const title = screensaver.querySelector(".mha-screensaver-nowbar-title");
  const subtitle = screensaver.querySelector(".mha-screensaver-nowbar-subtitle");

  assert.equal(tile?.dataset.nowbarKey, "calendar");
  assert.equal(title?.textContent, "Calendar");
  assert.equal(subtitle?.textContent, "No upcoming events");
});

test("screensaver now bar renders artwork, weather, date, and shaped icon visuals", () => {
  const screensaver = createScreensaver({
    isVisible: true,
    showNowBar: true,
    nowBarTiles: [
      {
        key: "media",
        title: "Ocean Drive",
        subtitle: "Duke Dumont",
        visual: { type: "artwork", artworkUrl: "/ocean-drive.jpg" },
      },
      {
        key: "weather",
        title: "Home",
        subtitle: "22°C · Sunny",
        visual: { type: "weather", condition: "sunny" },
      },
      {
        key: "calendar",
        title: "Dentist",
        subtitle: "Tomorrow",
        visual: { type: "date", day: "29", month: "Apr" },
      },
      {
        key: "now",
        title: "Now Bar",
        subtitle: "All lights are off.",
        visual: { type: "icon", icon: "bulb", category: "lighting" },
      },
    ],
  });

  const visuals = screensaver.querySelectorAll(".mha-screensaver-nowbar-visual");
  assert.equal(visuals.length, 4);
  assert.ok(visuals.every(visual => String(visual.className).includes("mha-icon")));
  assert.equal(screensaver.querySelector(".mha-screensaver-nowbar-artwork")?.src, "/ocean-drive.jpg");
  assert.equal(
    screensaver.querySelector(".mha-screensaver-nowbar-weather-glyph")?.dataset.weatherCondition,
    "sunny",
  );
  assert.equal(screensaver.querySelector(".mha-screensaver-nowbar-date-day")?.textContent, "29");
  assert.equal(screensaver.querySelector(".mha-screensaver-nowbar-date-month")?.textContent, "Apr");
  assert.equal(screensaver.querySelector(".mha-screensaver-nowbar-glyph")?.dataset.iconSymbol, "bulb");
});
