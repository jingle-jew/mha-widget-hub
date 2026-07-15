import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createWeatherMetricWidgetContent } from "../src/widgets/weather-metric-widget.js";
import {
  createWeatherWidgetContent,
  WEATHER_WIDGET_CONTENT_RENDERER,
} from "../src/widgets/weather-widget.js";
import { createWeatherNarrativeWidgetContent } from "../src/widgets/weather-narrative-widget.js";
import { setLanguage } from "../src/i18n/index.js";

test.beforeEach(() => {
  setLanguage("en");
});

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
  assert.equal(findByClass(content, "mha-weather-summary-eyebrow"), null);
  assert.equal(findByClass(content, "mha-weather-summary-temperature")?.textContent, "26°C");
  assert.equal(findByClass(content, "mha-weather-summary-location")?.textContent, "Val-d'Or");
  assert.match(
    findByClass(content, "mha-weather-summary-text")?.textContent,
    /^Sun and clouds will alternate /,
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
  assert.match(findByClass(content, "mha-weather-summary-text")?.textContent, /^Sunshine will dominate /);
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
  assert.match(findByClass(content, "mha-weather-summary-text")?.textContent, /^Rain will accompany /);
  assert.match(findByClass(content, "mha-weather-summary-narrative-secondary")?.textContent, /^Rain is expected /);
  const advisory = findByClass(content, "mha-weather-summary-advisory");
  const body = findByClass(content, "mha-weather-summary-body");
  assert.notEqual(advisory, null);
  assert.equal(body.childNodes.includes(advisory), false);
  assert.equal(advisory.childNodes[0]?.dataset.iconSymbol, "warning");
  assert.equal(advisory.childNodes[0]?.["aria-hidden"], "true");
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

test("weather metric 2x2 renders the localized wind direction above its speed", () => {
  installDom();
  setLanguage("fr");

  const content = createWeatherMetricWidgetContent({
    kind: "weather-metric",
    metricKey: "wind",
    sourceType: "weather-attribute",
    entityId: "weather.home",
    attribute: "wind_speed",
    unit: "km/h",
  }, {
    widgetW: 2,
    widgetH: 2,
    hass: {
      states: {
        "weather.home": {
          entity_id: "weather.home",
          state: "windy",
          attributes: {
            wind_speed: 11,
            wind_bearing: 202.5,
            wind_speed_unit: "km/h",
          },
        },
      },
    },
  });

  const valueBlock = findByClass(content, "mha-weather-metric-value-block");
  assert.equal(valueBlock?.dataset.windDirection, "true");
  assert.equal(valueBlock?.childNodes[0].className, "mha-weather-metric-wind-direction");
  assert.equal(valueBlock?.childNodes[0].textContent, "SSO");
  assert.equal(valueBlock?.childNodes[1].textContent, "11");
  assert.equal(valueBlock?.childNodes[2].textContent, "km/h");
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

test("weather summary reserves the flexible center row for its main narrative", () => {
  const css = readFileSync(new URL("../styles/widgets/weather-metric-widget.css", import.meta.url), "utf8");

  assert.match(
    css,
    /> \.mha-weather-metric-widget\[data-weather-metric-size="4x2"\]\[data-metric-layout="summary"\]\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);/,
  );
  assert.match(
    css,
    /\.mha-weather-summary-body\s*\{[^}]*align-content:\s*start;[^}]*border-block-start:/,
  );
});

test("selected long weather metric labels use the two-line wrapping contract", () => {
  const css = readFileSync(new URL("../styles/widgets/weather-metric-widget.css", import.meta.url), "utf8");

  ["cloud-coverage", "precipitation-rate", "solar-radiation", "sunshine-duration"].forEach(metricKey => {
    assert.equal(css.includes(`[data-metric-key="${metricKey}"]`), true);
  });
  assert.match(
    css,
    /\.mha-weather-metric-widget:is\([\s\S]*?\) \.mha-weather-metric-label\s*\{[\s\S]*?-webkit-line-clamp:\s*2;[\s\S]*?white-space:\s*normal;[\s\S]*?text-overflow:\s*clip;/,
  );
  assert.match(
    css,
    /\.mha-weather-metric-widget:is\([\s\S]*?\) \.mha-weather-metric-header\s*\{\s*align-items:\s*flex-start;/,
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

test("weather widget shell exposes the normalized surface mode to CSS", () => {
  const implicitShell = { dataset: {} };
  WEATHER_WIDGET_CONTENT_RENDERER.decorateShell({
    shell: implicitShell,
    widget: { kind: "weather" },
  });
  assert.equal(implicitShell.dataset.weatherSurfaceMode, "dynamic");

  const dynamicShell = { dataset: {} };
  WEATHER_WIDGET_CONTENT_RENDERER.decorateShell({
    shell: dynamicShell,
    widget: { kind: "weather", surfaceMode: "dynamic" },
  });
  assert.equal(dynamicShell.dataset.weatherSurfaceMode, "dynamic");

  const defaultShell = { dataset: {} };
  WEATHER_WIDGET_CONTENT_RENDERER.decorateShell({
    shell: defaultShell,
    widget: { kind: "weather", surfaceMode: "default" },
  });
  assert.equal(defaultShell.dataset.weatherSurfaceMode, "default");
});

test("OneUI weather surface choices highlight only the selected option", () => {
  const css = readFileSync(
    new URL("../styles/widget-manager/widget-config-popup.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-widget-config-choice\s*\{[\s\S]*?border-color:\s*transparent;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/,
  );
  assert.match(
    css,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-widget-config-choice:has\(\.mha-widget-config-choice-input:checked\)\s*\{[\s\S]*?background:\s*var\(--mha-accent\);[\s\S]*?color:\s*var\(--mha-accent-contrast, #fff\);[\s\S]*?box-shadow:\s*none;/,
  );
  assert.match(
    css,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-widget-config-choice \.mha-choice-indicator\s*\{[\s\S]*?border:\s*1px solid rgba\(0,0,0,\.56\);[\s\S]*?background:\s*#fff;/,
  );
  assert.match(
    css,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-widget-config-choice-input:checked ~ \.mha-choice-indicator::after\s*\{[\s\S]*?background:\s*#111;/,
  );
});

test("default OneUI weather surfaces consume the primary surface token", () => {
  const css = readFileSync(new URL("../styles/widgets/weather-widget.css", import.meta.url), "utf8");

  assert.match(css, /data-theme-style="oneui"[^\n]*data-weather-surface-mode="default"/);
  assert.doesNotMatch(css, /data-theme-style="ios"[^\n]*data-weather-surface-mode="default"/);
  assert.match(
    css,
    /data-weather-surface-mode="default"[\s\S]*?background:\s*var\(--mha-primary-surface\);/,
  );
  assert.match(
    css,
    /data-weather-surface-mode="default"[^\n]*\.mha-weather-icon\s*\{\s*color:\s*rgba\(255,255,255,\.98\);/,
  );
  assert.match(
    css,
    /data-weather-surface-mode="default"[^\n]*\.mha-icon-symbol\s*\{\s*--mha-icon-symbol-color:\s*rgba\(255,255,255,\.98\);/,
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
