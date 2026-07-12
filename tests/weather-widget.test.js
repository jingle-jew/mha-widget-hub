import test from "node:test";
import assert from "node:assert/strict";

import { createWeatherMetricWidgetContent } from "../src/widgets/weather-metric-widget.js";
import { createWeatherWidgetContent } from "../src/widgets/weather-widget.js";
import { createWeatherNarrativeWidgetContent } from "../src/widgets/weather-narrative-widget.js";

function findByClass(node, className) {
  if (!node) return null;
  if (node.className === className) return node;
  for (const child of node.childNodes || []) {
    const match = findByClass(child, className);
    if (match) return match;
  }
  return null;
}

function installDom() {
  class FakeNode {}
  globalThis.Node = FakeNode;
  const createNode = (tag) => {
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
  };
  globalThis.document = {
    createElement: createNode,
    createElementNS(namespace, tag) {
      void namespace;
      return createNode(tag);
    },
  };
}

test("weather summary metric combines current weather with narrative text", () => {
  installDom();

  const hass = {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "partlycloudy",
        attributes: {
          friendly_name: "Val-d'Or Prévisions",
          temperature: 26,
          temperature_unit: "°C",
          humidity: 43,
          wind_speed: 18,
          wind_speed_unit: "km/h",
        },
      },
      "sensor.val_d_or_summary": {
        entity_id: "sensor.val_d_or_summary",
        state: "Alternance de soleil et de nuages aujourd’hui.",
        attributes: {
          friendly_name: "Résumé",
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

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    sourceType: "entity",
    entityId: "sensor.val_d_or_summary",
    weatherEntityId: "weather.home",
  }, {
    widgetW: 4,
    widgetH: 2,
    hass,
  });

  assert.equal(content.dataset.metricLayout, "summary");
  assert.equal(findByClass(content, "mha-weather-summary-temperature")?.textContent, "26°C");
  assert.equal(findByClass(content, "mha-weather-summary-location")?.textContent, "Val-d'Or");
  assert.equal(
    findByClass(content, "mha-weather-summary-text")?.textContent,
    "Alternance de soleil et de nuages aujourd’hui.",
  );
});

test("weather metric 2x1 uses the simple-button sibling layout", () => {
  installDom();

  const hass = {
    states: {
      "sensor.feels_like": {
        entity_id: "sensor.feels_like",
        state: "5.6",
        attributes: {
          friendly_name: "Ressenti",
          unit_of_measurement: "°C",
          device_class: "temperature",
        },
      },
    },
  };

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "apparent-temperature",
    sourceType: "entity",
    entityId: "sensor.feels_like",
  }, {
    widgetW: 2,
    widgetH: 1,
    hass,
  });

  assert.equal(content.dataset.weatherMetricSize, "2x1");
  assert.equal(content.dataset.metricLayout, "compact");
  assert.equal(content.childNodes.length, 2);
  assert.equal(content.childNodes[0].className, "mha-weather-metric-icon-bubble");
  assert.equal(content.childNodes[1].className, "mha-weather-metric-compact-text");
  assert.equal(content.childNodes[1].childNodes[0].className, "mha-weather-metric-label");
  assert.equal(content.childNodes[1].childNodes[1].className, "mha-weather-metric-value-block");
});

test("weather metric text 2x1 keeps its state below the label", () => {
  installDom();

  const hass = {
    states: {
      "sensor.pressure_tendency": {
        entity_id: "sensor.pressure_tendency",
        state: "En baisse",
        attributes: {
          friendly_name: "Tendance",
        },
      },
    },
  };

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "pressure-tendency",
    valueKind: "text",
    sourceType: "entity",
    entityId: "sensor.pressure_tendency",
  }, {
    widgetW: 2,
    widgetH: 1,
    hass,
  });

  assert.equal(content.dataset.metricLayout, "compact");
  assert.equal(content.childNodes.length, 2);
  assert.equal(content.childNodes[0].className, "mha-weather-metric-icon-bubble");
  assert.equal(content.childNodes[1].className, "mha-weather-metric-compact-text");
  assert.equal(content.childNodes[1].childNodes[0].className, "mha-weather-metric-label");
  assert.equal(content.childNodes[1].childNodes[1].className, "mha-weather-metric-text-value");
  assert.equal(content.childNodes[1].childNodes[1].textContent, "En baisse");
});

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
  assert.equal(content.childNodes.length, 1);
  assert.equal(
    content.childNodes[0].childNodes.some((node) => node.className === "mha-weather-widget-details"),
    true,
  );
});

test("weather narrative widget renders honestly when forecasts are unavailable", () => {
  installDom();

  const content = createWeatherNarrativeWidgetContent({
    kind: "weather-narrative",
    entityId: "weather.home",
  }, {
    hass: {
      states: {
        "weather.home": {
          entity_id: "weather.home",
          state: "partlycloudy",
          attributes: {
            friendly_name: "Maison",
            temperature: 22,
            temperature_unit: "°C",
          },
        },
      },
    },
  });

  assert.equal(content.dataset.weatherNarrativeKind, "summary");
  assert.equal(content.childNodes.length, 2);
  content.__mhaDestroy();
});
