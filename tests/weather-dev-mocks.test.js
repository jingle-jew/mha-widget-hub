import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../dev.html", import.meta.url), "utf8");

test("dev weather mocks expose registry-linked weather sensors", () => {
  assert.match(source, /config\/entity_registry\/list/);
  assert.match(source, /config\/device_registry\/list/);
  assert.match(source, /dev-weather-entry/);
  assert.match(source, /weather\.val_d_or_previsions/);
  assert.match(source, /sensor\.val_d_or_dew_point/);
  assert.match(source, /sensor\.val_d_or_wind_gust/);
  assert.match(source, /sensor\.val_d_or_tendency/);
  assert.match(source, /sensor\.val_d_or_summary/);
  assert.match(source, /sensor\.val_d_or_pm25/);
  assert.match(source, /sensor\.val_d_or_warnings/);
});

test("dev weather mocks return hourly and daily forecast responses", () => {
  assert.match(source, /weather"\s*&&\s*payload\.service\s*===\s*"get_forecasts"/);
  assert.match(source, /payload\.service_data\?\.type\s*===\s*"hourly"/);
  assert.match(source, /hourlyForecast/);
  assert.match(source, /dailyForecast/);
});

test("dev weather mocks can be reset from the browser console", () => {
  assert.match(source, /window\.__MHA_DEV__/);
  assert.match(source, /resetMockHass\(\)/);
  assert.match(source, /createMockHass/);
});
