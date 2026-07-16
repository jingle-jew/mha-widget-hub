const PRECIPITATION_CONDITIONS = new Set([
  "rainy",
  "pouring",
  "lightning-rainy",
  "hail",
  "snowy-rainy",
]);

const SNOW_CONDITIONS = new Set(["snowy", "snowy-rainy"]);
const STORM_CONDITIONS = new Set(["lightning", "lightning-rainy"]);
const CLOUDY_CONDITIONS = new Set([
  "cloudy",
  "fog",
  "partlycloudy",
  "rainy",
  "pouring",
  "lightning",
  "lightning-rainy",
  "hail",
  "snowy",
  "snowy-rainy",
]);

function normalizeCondition(value = "") {
  const condition = String(value || "").trim().toLowerCase();
  return condition || "sunny";
}

function resolveWeatherEntity(page = {}, hass = null) {
  const configuredId = String(page?.config?.weatherEntityId || "").trim();
  if (configuredId && hass?.states?.[configuredId]) return hass.states[configuredId];
  return Object.values(hass?.states || {}).find(entity => entity?.entity_id?.startsWith?.("weather.")) || null;
}

function resolveIsDay(hass = null) {
  const sunState = hass?.states?.["sun.sun"]?.state;
  if (sunState === "above_horizon") return true;
  if (sunState === "below_horizon") return false;
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20;
}

function createLayer(className) {
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");
  return layer;
}

function appendClouds(scene, count = 4) {
  const cloudField = createLayer("mha-weather-background__cloud-field");
  for (let index = 0; index < count; index += 1) {
    const cloud = createLayer("mha-weather-background__cloud");
    cloud.style.setProperty("--mha-weather-cloud-index", String(index));
    cloudField.append(cloud);
  }
  scene.append(cloudField);
}

function appendPrecipitation(scene, className, count) {
  const field = createLayer(`mha-weather-background__precipitation ${className}`);
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("i");
    particle.style.setProperty("--mha-weather-particle-index", String(index));
    particle.style.setProperty("--mha-weather-particle-x", `${(index * 37) % 101}%`);
    field.append(particle);
  }
  scene.append(field);
}

export function createWeatherPageBackground(page = {}, hass = null) {
  const weatherEntity = resolveWeatherEntity(page, hass);
  const condition = normalizeCondition(weatherEntity?.state);
  const isDay = resolveIsDay(hass);
  const windSpeed = Number(weatherEntity?.attributes?.wind_speed) || 0;
  const cloudCover = Number(weatherEntity?.attributes?.cloud_coverage);
  const cloudy = CLOUDY_CONDITIONS.has(condition);

  const scene = document.createElement("div");
  scene.className = "mha-weather-background";
  scene.dataset.condition = condition;
  scene.dataset.daytime = isDay ? "day" : "night";
  scene.dataset.cloudy = String(cloudy);
  scene.dataset.storm = String(STORM_CONDITIONS.has(condition));
  scene.style.setProperty("--mha-weather-wind-factor", String(Math.max(0.65, Math.min(2.2, 0.65 + (windSpeed / 28)))));
  scene.style.setProperty(
    "--mha-weather-cloud-opacity",
    String(Number.isFinite(cloudCover) ? Math.max(0.38, Math.min(0.96, cloudCover / 100)) : (cloudy ? 0.82 : 0.42)),
  );
  scene.setAttribute("aria-hidden", "true");

  scene.append(
    createLayer("mha-weather-background__sky"),
    createLayer("mha-weather-background__light"),
    createLayer("mha-weather-background__haze"),
  );

  appendClouds(scene, cloudy ? 6 : 3);

  if (PRECIPITATION_CONDITIONS.has(condition)) {
    appendPrecipitation(scene, "mha-weather-background__rain", condition === "pouring" ? 42 : 28);
  }
  if (SNOW_CONDITIONS.has(condition)) {
    appendPrecipitation(scene, "mha-weather-background__snow", 24);
  }
  if (STORM_CONDITIONS.has(condition)) {
    scene.append(createLayer("mha-weather-background__lightning"));
  }

  scene.append(createLayer("mha-weather-background__readability"));
  return scene;
}
