import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("weather summary metric combines current weather with the contextual brief", () => {
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
    "A generally calm day with mild conditions.",
  );
  assert.equal(content.dataset.summaryNarrativeKind, "summary");
});

test("weather summary metric falls back to an available weather entity for legacy sensor widgets", () => {
  installDom();

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    sourceType: "entity",
    entityId: "sensor.val_d_or_summary",
  }, {
    widgetW: 4,
    widgetH: 2,
    hass: {
      states: {
        "weather.home": {
          entity_id: "weather.home",
          state: "partlycloudy",
          attributes: {
            friendly_name: "Val-d'Or Prévisions",
            temperature: 26,
            temperature_unit: "°C",
          },
        },
        "sensor.val_d_or_summary": {
          entity_id: "sensor.val_d_or_summary",
          state: "Alternance de soleil et de nuages aujourd’hui.",
          attributes: { friendly_name: "Résumé" },
        },
      },
      config: {
        unit_system: { temperature: "°C" },
      },
    },
  });

  assert.equal(content.dataset.metricLayout, "summary");
  assert.equal(findByClass(content, "mha-weather-summary-temperature")?.textContent, "26°C");
  assert.equal(findByClass(content, "mha-weather-summary-location")?.textContent, "Val-d'Or");
});

test("weather summary metric exposes atmosphere data for adaptive gradients", () => {
  installDom();

  const soon = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    sourceType: "weather-attribute",
    entityId: "weather.home",
    attribute: "summary",
  }, {
    widgetW: 4,
    widgetH: 2,
    hass: {
      states: {
        "weather.home": {
          entity_id: "weather.home",
          state: "rainy",
          attributes: {
            friendly_name: "Maison",
            temperature: 18,
            temperature_unit: "°C",
            summary: "Averses en soirée.",
          },
        },
        "sun.sun": {
          entity_id: "sun.sun",
          state: "above_horizon",
          attributes: {
            next_setting: soon,
          },
        },
      },
      config: {
        unit_system: { temperature: "°C" },
      },
    },
  });

  assert.equal(content.dataset.metricLayout, "summary");
  assert.equal(content.dataset.summaryPhase, "dusk");
  assert.equal(content.dataset.summarySky, "precipitation");
});

test("weather summary metric uses its weather attribute entity for current conditions", () => {
  installDom();

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    sourceType: "weather-attribute",
    entityId: "weather.home",
    attribute: "summary",
  }, {
    widgetW: 4,
    widgetH: 2,
    hass: {
      states: {
        "weather.home": {
          entity_id: "weather.home",
          state: "sunny",
          attributes: {
            friendly_name: "Maison",
            temperature: 28.8,
            temperature_unit: "°C",
            summary: "Pensez à vous protéger ce soir.",
          },
        },
      },
      config: {
        unit_system: {
          temperature: "°C",
          wind_speed: "km/h",
        },
      },
    },
  });

  assert.equal(content.dataset.metricLayout, "summary");
  assert.equal(findByClass(content, "mha-weather-summary-temperature")?.textContent, "28.8°C");
  assert.equal(findByClass(content, "mha-weather-summary-location")?.textContent, "Maison");
  assert.equal(
    findByClass(content, "mha-weather-summary-text")?.textContent,
    "The sky will stay clear today.",
  );
});

test("weather summary metric hydrates forecasts for priority narratives without a chart", async () => {
  installDom();

  const forecastTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const hass = {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "cloudy",
        attributes: {
          friendly_name: "Maison",
          temperature: 18,
          temperature_unit: "°C",
        },
      },
    },
    config: { unit_system: { temperature: "°C" } },
    callWS: async ({ service_data: { type } }) => ({
      "weather.home": {
        forecast: type === "hourly"
          ? [{
            datetime: forecastTime,
            condition: "rainy",
            temperature: 17,
            precipitation_probability: 80,
          }]
          : [],
      },
    }),
  };

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    sourceType: "weather-attribute",
    entityId: "weather.home",
    attribute: "summary",
  }, {
    widgetW: 4,
    widgetH: 2,
    hass,
  });

  await new Promise(resolve => setImmediate(resolve));

  assert.equal(content.dataset.summaryNarrativeKind, "rain");
  assert.equal(findByClass(content, "mha-weather-summary-text")?.textContent.startsWith("Rain is expected"), true);
  assert.equal(findByClass(content, "mha-weather-narrative-chart"), null);
  content.__mhaDestroy();
});

test("weather metric 2x2 renders progress visuals for humidity and precipitation probability", () => {
  installDom();

  const hass = {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "rainy",
        attributes: {
          humidity: 41,
          precipitation_probability: 60,
        },
      },
    },
  };

  const humidity = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "humidity",
    sourceType: "weather-attribute",
    entityId: "weather.home",
    attribute: "humidity",
    unit: "%",
  }, {
    widgetW: 2,
    widgetH: 2,
    hass,
  });
  const precipitation = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "precipitation-probability",
    sourceType: "weather-attribute",
    entityId: "weather.home",
    attribute: "precipitation_probability",
    unit: "%",
  }, {
    widgetW: 2,
    widgetH: 2,
    hass,
  });

  const humidityProgress = findByClass(humidity, "mha-weather-metric-progress");
  const precipitationProgress = findByClass(precipitation, "mha-weather-metric-progress");
  assert.equal(humidityProgress?.dataset.progressKind, "humidity");
  assert.equal(humidityProgress?.style["--mha-weather-metric-progress"], "41%");
  assert.equal(precipitationProgress?.dataset.progressKind, "precipitation");
  assert.equal(precipitationProgress?.style["--mha-weather-metric-progress"], "60%");
});

test("weather metric progress accents keep a fallback when the theme accent token is absent", () => {
  const css = readFileSync(new URL("../styles/widgets/weather-metric-widget.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.mha-weather-metric-progress\[data-progress-kind="humidity"\]\s*\{[\s\S]*var\(--mha-accent-primary,\s*#[0-9a-fA-F]{6}\)/,
  );
  assert.match(
    css,
    /\.mha-weather-metric-progress\[data-progress-kind="precipitation"\]\s*\{[\s\S]*var\(--mha-accent-primary,\s*#[0-9a-fA-F]{6}\)/,
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

test("weather forecast timeline grid matches the rendered forecast cards", () => {
  installDom();

  const content = createWeatherWidgetContent({
    kind: "weather",
    entityId: "weather.home",
    displayMode: "forecast",
    forecastType: "hourly",
  }, {
    widgetW: 4,
    widgetH: 2,
    hass: {
      states: {
        "weather.home": {
          entity_id: "weather.home",
          state: "partlycloudy",
          attributes: {
            temperature: 8,
            temperature_unit: "°C",
            forecast: Array.from({ length: 12 }, (_, index) => ({
              datetime: `2026-07-12T${String(index).padStart(2, "0")}:00:00`,
              temperature: 8 + index,
              condition: "partlycloudy",
              precipitation_probability: index * 5,
            })),
          },
        },
      },
      config: {
        unit_system: {
          temperature: "°C",
          wind_speed: "km/h",
        },
      },
    },
  });

  const timeline = findByClass(content, "mha-weather-widget-forecast-timeline");
  const chart = findByClass(content, "mha-weather-widget-forecast-chart");
  const svg = chart?.childNodes[0];
  const points = (svg?.childNodes || []).filter(node => node.tagName === "CIRCLE");
  assert.equal(timeline?.style["--mha-weather-forecast-count"], "5");
  assert.equal(timeline?.childNodes.length, 5);
  assert.equal(points.length, 5);
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
  assert.equal(content.childNodes.length, 1);
  assert.equal(findByClass(content, "mha-weather-narrative-chart"), null);
  content.__mhaDestroy();
});
