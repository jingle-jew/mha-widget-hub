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

function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function resolveCloudCount(condition = "sunny", cloudCover = NaN) {
  if (STORM_CONDITIONS.has(condition)) return 17;
  if (["rainy", "pouring", "hail", "snowy", "snowy-rainy", "fog"].includes(condition)) return 15;
  if (condition === "cloudy") return 14;
  if (condition === "partlycloudy") return 10;
  if (Number.isFinite(cloudCover)) return Math.max(5, Math.min(14, Math.round(5 + (cloudCover / 11))));
  return 6;
}

function appendClouds(scene, { condition = "sunny", cloudCover = NaN } = {}) {
  const count = resolveCloudCount(condition, cloudCover);
  const cloudField = createLayer("mha-weather-background__cloud-field");
  const seedBase = [...condition].reduce((total, character) => total + character.charCodeAt(0), 0);

  for (let index = 0; index < count; index += 1) {
    const seed = seedBase + (index * 17.31);
    const depthRoll = pseudoRandom(seed + 1);
    const depth = depthRoll < 0.34 ? "far" : (depthRoll < 0.78 ? "mid" : "near");
    const cloud = createLayer("mha-weather-background__cloud");
    const width = depth === "far"
      ? 18 + (pseudoRandom(seed + 2) * 18)
      : depth === "mid"
        ? 28 + (pseudoRandom(seed + 2) * 28)
        : 42 + (pseudoRandom(seed + 2) * 36);
    const heightRatio = 0.28 + (pseudoRandom(seed + 3) * 0.2);
    const duration = depth === "far"
      ? 88 + (pseudoRandom(seed + 4) * 74)
      : depth === "mid"
        ? 62 + (pseudoRandom(seed + 4) * 58)
        : 44 + (pseudoRandom(seed + 4) * 42);
    const start = -58 - (pseudoRandom(seed + 5) * 72);
    const travel = 195 + (pseudoRandom(seed + 6) * 110);
    const top = -8 + (pseudoRandom(seed + 7) * 88);
    const drift = -4 + (pseudoRandom(seed + 8) * 9);
    const opacity = depth === "far"
      ? 0.28 + (pseudoRandom(seed + 9) * 0.24)
      : depth === "mid"
        ? 0.5 + (pseudoRandom(seed + 9) * 0.3)
        : 0.66 + (pseudoRandom(seed + 9) * 0.28);

    cloud.dataset.depth = depth;
    cloud.dataset.shape = String(index % 5);
    cloud.style.setProperty("--mha-weather-cloud-width", `${width}vw`);
    cloud.style.setProperty("--mha-weather-cloud-height", `${width * heightRatio}vw`);
    cloud.style.setProperty("--mha-weather-cloud-top", `${top}%`);
    cloud.style.setProperty("--mha-weather-cloud-start", `${start}vw`);
    cloud.style.setProperty("--mha-weather-cloud-travel", `${travel}vw`);
    cloud.style.setProperty("--mha-weather-cloud-drift", `${drift}vh`);
    cloud.style.setProperty("--mha-weather-cloud-duration", `${duration}s`);
    cloud.style.setProperty("--mha-weather-cloud-delay", `${-(pseudoRandom(seed + 10) * duration)}s`);
    cloud.style.setProperty("--mha-weather-cloud-opacity-local", String(opacity));
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

  appendClouds(scene, { condition, cloudCover });

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
