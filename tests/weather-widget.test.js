import test from "node:test";
import assert from "node:assert/strict";

import { createWeatherWidgetContent } from "../src/widgets/weather-widget.js";

function installDom() {
  class FakeNode {}
  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement(tag) {
      const node = new FakeNode();
      node.tagName = tag.toUpperCase();
      node.childNodes = [];
      node.dataset = {};
      node.style = { setProperty(name, value) { this[name] = value; } };
      node.className = "";
      node.hidden = false;
      node.innerHTML = "";
      node.setAttribute = (name, value) => { node[name] = value; };
      node.append = (...children) => node.childNodes.push(...children);
      node.replaceChildren = (...children) => { node.childNodes = [...children]; };
      node.querySelector = () => null;
      node.querySelectorAll = () => [];
      return node;
    },
  };
}

test("weather widget updates its internal layout while resizing", () => {
  installDom();

  const widget = { kind: "weather", entityId: "weather.home" };
  const hass = {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "sunny",
        attributes: {
          temperature: 23,
          humidity: 55,
          wind_speed: 12,
        },
      },
    },
    config: {
      unit_system: {
        temperature: "°C",
        wind_speed: "km/h",
      },
    },
  };

  const content = createWeatherWidgetContent(widget, {
    widgetW: 2,
    widgetH: 2,
    hass,
  });

  assert.equal(content.dataset.weatherSize, "2x2");
  assert.equal(content.childNodes.length, 1);

  content.__mhaUpdateWidgetSize({ widgetW: 3, widgetH: 2 });

  assert.equal(content.dataset.weatherSize, "3x2");
  assert.equal(content.childNodes.length, 2);
});
