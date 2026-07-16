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

function normalizeWindSpeedKmh(value = 0, unit = "km/h") {
  const speed = Math.max(0, Number(value) || 0);
  const normalizedUnit = String(unit || "km/h").trim().toLowerCase();
  if (["m/s", "mps"].includes(normalizedUnit)) return speed * 3.6;
  if (["mph", "mi/h"].includes(normalizedUnit)) return speed * 1.609344;
  if (["kn", "kt", "kts", "knot", "knots"].includes(normalizedUnit)) return speed * 1.852;
  return speed;
}

function resolveWindFactor(windSpeedKmh = 0) {
  const normalized = Math.max(0, Number(windSpeedKmh) || 0);
  const curved = 0.55 + (1.58 * (1 - Math.exp(-normalized / 32)));
  return Math.max(0.55, Math.min(2.1, curved));
}

function resolveCloudCount(condition = "sunny", cloudCover = NaN) {
  if (condition === "sunny" || condition === "clear-night") {
    return Number.isFinite(cloudCover) && cloudCover >= 22 ? 2 : 0;
  }
  if (condition === "partlycloudy") return 6;
  if (condition === "fog") return 2;
  if (STORM_CONDITIONS.has(condition)) return 17;
  if (["rainy", "pouring", "hail", "snowy", "snowy-rainy"].includes(condition)) return 15;
  if (condition === "cloudy") return 14;
  if (Number.isFinite(cloudCover)) return Math.max(3, Math.min(14, Math.round(3 + (cloudCover / 9))));
  return 4;
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
    const topRange = depth === "far"
      ? { min: -10, max: 55 }
      : depth === "mid"
        ? { min: -8, max: 48 }
        : { min: -12, max: 40 };
    const top = topRange.min + (pseudoRandom(seed + 7) * (topRange.max - topRange.min));
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
    const depthSpeedFactor = depth === "far" ? 0.82 : (depth === "near" ? 1.12 : 1);
    cloud.style.setProperty("--mha-weather-cloud-duration", `${duration}s`);
    cloud.style.setProperty("--mha-weather-cloud-depth-speed-factor", String(depthSpeedFactor));
    cloud.style.setProperty("--mha-weather-cloud-delay", `${-(pseudoRandom(seed + 10) * duration)}s`);
    cloud.style.setProperty("--mha-weather-cloud-opacity-local", String(opacity));
    cloudField.append(cloud);
  }
  scene.append(cloudField);
}

function appendPrecipitation(scene, className, count, { intensity = "normal" } = {}) {
  const field = createLayer(`mha-weather-background__precipitation ${className}`);
  field.dataset.intensity = intensity;
  for (let index = 0; index < count; index += 1) {
    const seed = 31.7 + (index * 19.13);
    const particle = document.createElement("i");
    const isSnow = className.includes("snow");
    const rainProfile = intensity === "storm"
      ? { sizeMin: 1.5, sizeRange: 1.35, durationMin: 0.46, durationRange: 0.34, opacityMin: 0.7, opacityRange: 0.28 }
      : intensity === "heavy"
        ? { sizeMin: 1.15, sizeRange: 1.2, durationMin: 0.58, durationRange: 0.48, opacityMin: 0.58, opacityRange: 0.34 }
        : { sizeMin: 0.86, sizeRange: 0.9, durationMin: 0.82, durationRange: 0.62, opacityMin: 0.46, opacityRange: 0.42 };
    const size = isSnow
      ? 0.72 + (pseudoRandom(seed + 1) * 1.05)
      : rainProfile.sizeMin + (pseudoRandom(seed + 1) * rainProfile.sizeRange);
    const duration = isSnow
      ? 4.8 + (pseudoRandom(seed + 2) * 4.6)
      : rainProfile.durationMin + (pseudoRandom(seed + 2) * rainProfile.durationRange);
    const delay = -(pseudoRandom(seed + 3) * duration);
    const opacity = isSnow
      ? 0.42 + (pseudoRandom(seed + 4) * 0.52)
      : rainProfile.opacityMin + (pseudoRandom(seed + 4) * rainProfile.opacityRange);
    const drift = -4 + (pseudoRandom(seed + 5) * 11);
    const depthRoll = pseudoRandom(seed + 7);
    const depth = depthRoll < 0.28 ? "far" : (depthRoll < 0.76 ? "mid" : "near");
    const stormAngle = intensity === "storm" ? 8 + (pseudoRandom(seed + 8) * 16) : 10 + (pseudoRandom(seed + 8) * 5);
    const startOffset = intensity === "storm" ? -18 - (pseudoRandom(seed + 9) * 26) : -14;
    const travelScale = intensity === "storm" ? 0.82 + (pseudoRandom(seed + 10) * 0.42) : 1;
    const depthScale = depth === "far" ? 0.68 : (depth === "near" ? 1.24 : 1);
    particle.dataset.depth = depth;
    particle.style.setProperty("--mha-weather-particle-x", `${pseudoRandom(seed + 6) * 100}%`);
    particle.style.setProperty("--mha-weather-particle-size", String(size * depthScale));
    particle.style.setProperty("--mha-weather-particle-duration", `${duration}s`);
    particle.style.setProperty("--mha-weather-particle-delay", `${delay}s`);
    particle.style.setProperty("--mha-weather-particle-opacity", String(opacity));
    particle.style.setProperty("--mha-weather-particle-drift", `${drift}vw`);
    particle.style.setProperty("--mha-weather-particle-drift-back", `${drift * -0.45}vw`);
    particle.style.setProperty("--mha-weather-particle-angle", `${stormAngle}deg`);
    particle.style.setProperty("--mha-weather-particle-start", `${startOffset}vh`);
    particle.style.setProperty("--mha-weather-particle-travel-x", `${(10 + drift) * travelScale}vw`);
    particle.style.setProperty("--mha-weather-particle-travel-y", `${122 * travelScale}vh`);
    field.append(particle);
  }
  scene.append(field);
}

function appendStars(scene, count = 46) {
  const field = createLayer("mha-weather-background__stars");
  for (let index = 0; index < count; index += 1) {
    const seed = 71.2 + (index * 13.37);
    const star = document.createElement("i");
    star.style.setProperty("--mha-weather-star-x", `${pseudoRandom(seed + 1) * 100}%`);
    star.style.setProperty("--mha-weather-star-y", `${pseudoRandom(seed + 2) * 63}%`);
    star.style.setProperty("--mha-weather-star-size", `${0.8 + (pseudoRandom(seed + 3) * 1.9)}px`);
    star.style.setProperty("--mha-weather-star-opacity", String(0.34 + (pseudoRandom(seed + 4) * 0.62)));
    star.style.setProperty("--mha-weather-star-delay", `${-(pseudoRandom(seed + 5) * 6)}s`);
    field.append(star);
  }
  scene.append(field);
}

function appendFog(scene) {
  const field = createLayer("mha-weather-background__fog-field");
  for (let index = 0; index < 5; index += 1) {
    const band = document.createElement("i");
    band.style.setProperty("--mha-weather-fog-index", String(index));
    band.style.setProperty("--mha-weather-fog-top", `${14 + (index * 11)}%`);
    band.style.setProperty("--mha-weather-fog-opacity", String(0.16 + (index * 0.035)));
    band.style.setProperty("--mha-weather-fog-duration", `${42 + (index * 11)}s`);
    field.append(band);
  }
  scene.append(field);
}

export function createWeatherPageBackground(page = {}, hass = null) {
  const weatherEntity = resolveWeatherEntity(page, hass);
  const condition = normalizeCondition(weatherEntity?.state);
  const isDay = resolveIsDay(hass);
  const windSpeedKmh = normalizeWindSpeedKmh(
    weatherEntity?.attributes?.wind_speed,
    weatherEntity?.attributes?.wind_speed_unit || weatherEntity?.attributes?.wind_unit || "km/h",
  );
  const cloudCover = Number(weatherEntity?.attributes?.cloud_coverage);
  const cloudy = CLOUDY_CONDITIONS.has(condition);

  const scene = document.createElement("div");
  scene.className = "mha-weather-background";
  scene.dataset.condition = condition;
  scene.dataset.daytime = isDay ? "day" : "night";
  scene.dataset.cloudy = String(cloudy);
  scene.dataset.storm = String(STORM_CONDITIONS.has(condition));
  scene.style.setProperty("--mha-weather-wind-factor", String(resolveWindFactor(windSpeedKmh)));
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

  if (condition === "clear-night") appendStars(scene, 54);
  if (condition === "fog") appendFog(scene);
  appendClouds(scene, { condition, cloudCover });

  if (PRECIPITATION_CONDITIONS.has(condition)) {
    const rainIntensity = STORM_CONDITIONS.has(condition)
      ? "storm"
      : (condition === "pouring" ? "heavy" : "normal");
    const rainCount = rainIntensity === "storm" ? 96 : (rainIntensity === "heavy" ? 76 : 48);
    appendPrecipitation(
      scene,
      "mha-weather-background__rain",
      rainCount,
      { intensity: rainIntensity },
    );
  }
  if (SNOW_CONDITIONS.has(condition)) {
    appendPrecipitation(scene, "mha-weather-background__snow", 54, { intensity: "snow" });
  }
  if (STORM_CONDITIONS.has(condition)) {
    scene.append(createLayer("mha-weather-background__lightning"));
  }

  scene.append(createLayer("mha-weather-background__readability"));
  return scene;
}
