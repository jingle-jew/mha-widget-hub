import test from "node:test";
import assert from "node:assert/strict";

import { buildWeatherNarrativeModel } from "../src/ha/weather-narrative.js";
import { setLanguage } from "../src/i18n/index.js";

test.beforeEach(() => {
  setLanguage("fr");
});

function forecastAt(year, month, day, hour, condition, precipitationProbability = null) {
  return {
    datetime: new Date(year, month, day, hour).toISOString(),
    condition,
    temperatureValue: 18,
    precipitationProbability,
  };
}

function weather(overrides = {}) {
  return {
    entityId: "weather.home",
    entityAllowed: true,
    entityAvailable: true,
    condition: "sunny",
    temperatureValue: 18,
    temperatureUnit: "°C",
    windUnit: "km/h",
    hourlyForecast: [],
    dailyForecast: [],
    alerts: [],
    ...overrides,
  };
}

test("weather brief summarizes the current period before its midpoint", () => {
  const now = new Date(2026, 6, 14, 8, 0);
  const model = buildWeatherNarrativeModel(weather({
    hourlyForecast: [
      forecastAt(2026, 6, 14, 9, "sunny"),
      forecastAt(2026, 6, 14, 10, "sunny"),
    ],
  }), now);

  assert.equal(model.periodKey, "morning");
  assert.equal(model.headline, "Le soleil sera au rendez-vous ce matin.");
  assert.equal(model.secondary, "");
});

test("weather brief switches to the next period after the current period midpoint", () => {
  const now = new Date(2026, 6, 14, 11, 30);
  const model = buildWeatherNarrativeModel(weather({
    hourlyForecast: [
      forecastAt(2026, 6, 14, 12, "cloudy"),
      forecastAt(2026, 6, 14, 13, "cloudy"),
      forecastAt(2026, 6, 14, 14, "partlycloudy"),
    ],
  }), now);

  assert.equal(model.periodKey, "afternoon");
  assert.equal(model.headline, "Le ciel restera nuageux cet après-midi.");
});

test("weather brief keeps future advisories separate from the period summary", () => {
  const now = new Date(2026, 6, 14, 8, 0);
  const model = buildWeatherNarrativeModel(weather({
    hourlyForecast: [
      forecastAt(2026, 6, 14, 9, "sunny"),
      forecastAt(2026, 6, 14, 10, "sunny"),
      forecastAt(2026, 6, 14, 14, "rainy", 80),
    ],
  }), now);

  assert.equal(model.headline, "Le soleil sera au rendez-vous ce matin.");
  assert.equal(model.kind, "rain");
  assert.equal(model.advisory?.kind, "rain");
  assert.match(model.secondary, /^Attendez-vous à de la pluie vers 14 h\./);
  assert.match(model.secondary, /Probabilité : 80 %$/);
});

test("weather brief falls back to a natural period label for daily precipitation", () => {
  const now = new Date(2026, 6, 14, 8, 0);
  const model = buildWeatherNarrativeModel(weather({
    hourlyForecast: [],
    dailyForecast: [forecastAt(2026, 6, 14, 18, "rainy", 70)],
  }), now);

  assert.match(model.secondary, /^Attendez-vous à de la pluie ce soir\./);
});
