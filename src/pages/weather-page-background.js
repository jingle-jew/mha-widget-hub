import {
  WEATHER_LANDSCAPE_MOMENTS,
  resolveWeatherBackgroundAsset,
} from "./weather-background-assets.js";

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

function resolveIsDay(hass = null, now = new Date()) {
  const sunState = hass?.states?.["sun.sun"]?.state;
  if (sunState === "above_horizon") return true;
  if (sunState === "below_horizon") return false;
  const hour = now.getHours();
  return hour >= 6 && hour < 20;
}

function createLayer(className) {
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");
  return layer;
}

function resolveFallbackWeatherPeriod(now = new Date()) {
  const hour = now.getHours() + (now.getMinutes() / 60);
  if (hour < 5) return "night";
  if (hour < 6.25) return "dawn";
  if (hour < 7.5) return "sunrise";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 18.5) return "sunset";
  if (hour < 20.5) return "dusk";
  return "night";
}

function timestamp(value = "") {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function resolveWeatherPeriod(hass = null, isDay = true, now = new Date()) {
  const sun = hass?.states?.["sun.sun"] || null;
  if (!sun) return resolveFallbackWeatherPeriod(now);

  const explicitPeriod = String(sun.attributes?._mha_weather_period_override || "").trim();
  if (WEATHER_LANDSCAPE_MOMENTS.includes(explicitPeriod)) {
    return explicitPeriod;
  }

  const nextRising = timestamp(sun.attributes?.next_rising);
  const nextSetting = timestamp(sun.attributes?.next_setting);
  const nextDawn = timestamp(sun.attributes?.next_dawn);
  const nextDusk = timestamp(sun.attributes?.next_dusk);
  const lastChanged = timestamp(sun.last_changed);
  const nowMs = now.getTime();
  const minute = 60 * 1000;
  const until = value => Number.isFinite(value) ? value - nowMs : Infinity;
  const sinceLastChange = Number.isFinite(lastChanged) ? nowMs - lastChanged : Infinity;
  const aboveHorizon = sun.state === "above_horizon"
    || (sun.state !== "below_horizon" && isDay);

  if (aboveHorizon) {
    if (sinceLastChange >= 0 && sinceLastChange <= 30 * minute) return "sunrise";
    if (until(nextSetting) >= 0 && until(nextSetting) <= 45 * minute) return "sunset";
    return now.getHours() < 12 ? "morning" : "afternoon";
  }

  if (until(nextRising) >= 0 && until(nextRising) <= 25 * minute) return "sunrise";
  if (until(nextRising) > 25 * minute && until(nextRising) <= 100 * minute) return "dawn";
  if (until(nextDawn) >= 0 && until(nextDawn) <= 45 * minute) return "dawn";
  if (until(nextDusk) >= 0 && until(nextDusk) <= 75 * minute) return "dusk";
  if (sinceLastChange >= 0 && sinceLastChange <= 60 * minute) return "dusk";
  return resolveFallbackWeatherPeriod(now);
}

function resolveWinterScene(condition = "sunny", weatherEntity = null, now = new Date()) {
  if (SNOW_CONDITIONS.has(condition)) return true;
  const temperature = Number(weatherEntity?.attributes?.temperature);
  if (Number.isFinite(temperature) && temperature <= 1) return true;
  const month = now.getMonth();
  return month === 11 || month <= 1;
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

const CLOUD_MASS_PROFILES = Object.freeze({
  clear: Object.freeze({ minCount: 0, maxCount: 2, fallbackCover: 8, widthScale: 0.78, lowCloudShift: -0.04 }),
  partly: Object.freeze({ minCount: 3, maxCount: 5, fallbackCover: 42, widthScale: 0.88, lowCloudShift: -0.02 }),
  cloudy: Object.freeze({ minCount: 6, maxCount: 8, fallbackCover: 82, widthScale: 1.04, lowCloudShift: 0.02 }),
  rain: Object.freeze({ minCount: 7, maxCount: 9, fallbackCover: 90, widthScale: 1.12, lowCloudShift: 0.06 }),
  storm: Object.freeze({ minCount: 8, maxCount: 10, fallbackCover: 100, widthScale: 1.22, lowCloudShift: 0.1 }),
  fog: Object.freeze({ minCount: 2, maxCount: 3, fallbackCover: 92, widthScale: 1.14, lowCloudShift: 0.12 }),
  default: Object.freeze({ minCount: 3, maxCount: 5, fallbackCover: 48, widthScale: 0.94, lowCloudShift: 0 }),
});

const CLOUD_DEPTH_SEQUENCE = Object.freeze([
  "far", "mid", "near", "mid", "far", "near", "mid", "far", "near", "mid",
]);

function resolveCloudProfile(condition = "sunny", cloudCover = NaN) {
  let key = "default";
  if (condition === "sunny" || condition === "clear-night") key = "clear";
  else if (condition === "partlycloudy") key = "partly";
  else if (condition === "fog") key = "fog";
  else if (STORM_CONDITIONS.has(condition)) key = "storm";
  else if (["rainy", "pouring", "hail"].includes(condition)) key = "rain";
  else if (["cloudy", "snowy", "snowy-rainy"].includes(condition)) key = "cloudy";

  const profile = CLOUD_MASS_PROFILES[key];
  const cover = Number.isFinite(cloudCover)
    ? Math.max(0, Math.min(100, cloudCover))
    : profile.fallbackCover;
  const density = cover / 100;
  const count = key === "clear"
    ? (cover < 22 ? 0 : Math.max(1, Math.round(profile.maxCount * density)))
    : Math.round(profile.minCount + ((profile.maxCount - profile.minCount) * density));
  return { ...profile, key, cover, density, count };
}

function appendClouds(scene, {
  condition = "sunny",
  cloudCover = NaN,
  composition = {},
  profile = resolveCloudProfile(condition, cloudCover),
  seedKey = condition,
} = {}) {
  const cloudField = createLayer("mha-weather-background__cloud-field");
  const seedBase = [...seedKey].reduce((total, character) => total + character.charCodeAt(0), 0);
  const horizon = Number(composition.horizon) || 58;
  const fieldHeight = Number(composition.cloudFieldHeight) || 66;
  const fadeStart = Number(composition.cloudFadeStart) || 44;
  cloudField.dataset.profile = profile.key;

  for (let index = 0; index < profile.count; index += 1) {
    const seed = seedBase + (index * 17.31);
    const depth = CLOUD_DEPTH_SEQUENCE[index % CLOUD_DEPTH_SEQUENCE.length];
    const cloud = createLayer("mha-weather-background__cloud");
    const baseWidth = depth === "far"
      ? 68 + (pseudoRandom(seed + 2) * 38)
      : depth === "mid"
        ? 82 + (pseudoRandom(seed + 2) * 48)
        : 98 + (pseudoRandom(seed + 2) * 58);
    const width = baseWidth * profile.widthScale;
    const heightRatio = depth === "far"
      ? 0.11 + (pseudoRandom(seed + 3) * 0.07)
      : 0.13 + (pseudoRandom(seed + 3) * 0.09);
    const duration = depth === "far"
      ? 118 + (pseudoRandom(seed + 4) * 78)
      : depth === "mid"
        ? 88 + (pseudoRandom(seed + 4) * 64)
        : 66 + (pseudoRandom(seed + 4) * 50);
    const start = -width - 18 - (pseudoRandom(seed + 5) * 44);
    const travel = 225 + width + (pseudoRandom(seed + 6) * 70);
    const verticalBand = depth === "far"
      ? { min: 0.48, max: 0.74 }
      : depth === "mid"
        ? { min: 0.16, max: 0.54 }
        : { min: -0.1, max: 0.34 };
    const topRatio = verticalBand.min
      + profile.lowCloudShift
      + (pseudoRandom(seed + 7) * (verticalBand.max - verticalBand.min));
    const computedTop = Math.max(-8, Math.min(horizon - 3, horizon * topRatio));
    const anchorsHorizon = index === 0 && ["cloudy", "rain", "storm", "fog"].includes(profile.key);
    const topInScene = anchorsHorizon
      ? Math.max(computedTop, Math.min(horizon - 3, fadeStart + 1))
      : computedTop;
    const top = (topInScene / fieldHeight) * 100;
    const drift = -2.5 + (pseudoRandom(seed + 8) * 5.5);
    const horizonFactor = topInScene >= fadeStart ? 0.64 : 1;
    const opacity = depth === "far"
      ? 0.2 + (pseudoRandom(seed + 9) * 0.16)
      : depth === "mid"
        ? 0.32 + (pseudoRandom(seed + 9) * 0.2)
        : 0.4 + (pseudoRandom(seed + 9) * 0.2);

    cloud.dataset.depth = depth;
    cloud.dataset.shape = String(index % 5);
    cloud.dataset.horizon = String(topInScene >= fadeStart);
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
    cloud.style.setProperty("--mha-weather-cloud-opacity-local", String(opacity * horizonFactor));
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
  const now = new Date();
  const isDay = resolveIsDay(hass, now);
  const period = resolveWeatherPeriod(hass, isDay, now);
  const winter = resolveWinterScene(condition, weatherEntity, now);
  const backgroundAsset = resolveWeatherBackgroundAsset({
    landscapeId: page?.config?.weatherLandscapeId,
    condition,
    moment: period,
    winter,
  });
  const windSpeedKmh = normalizeWindSpeedKmh(
    weatherEntity?.attributes?.wind_speed,
    weatherEntity?.attributes?.wind_speed_unit || weatherEntity?.attributes?.wind_unit || "km/h",
  );
  const cloudCover = Number(weatherEntity?.attributes?.cloud_coverage);
  const cloudProfile = resolveCloudProfile(condition, cloudCover);
  const cloudy = CLOUDY_CONDITIONS.has(condition);

  const scene = document.createElement("div");
  scene.className = "mha-weather-background";
  scene.dataset.condition = condition;
  scene.dataset.daytime = isDay ? "day" : "night";
  scene.dataset.period = period;
  scene.dataset.winter = String(winter);
  scene.dataset.landscapeId = backgroundAsset.landscapeId;
  scene.dataset.ambience = backgroundAsset.ambience;
  scene.dataset.sceneKey = `${backgroundAsset.key}:condition-${condition}:cloud-${cloudProfile.key}-${cloudProfile.count}`;
  scene.dataset.assetKey = backgroundAsset.key;
  scene.dataset.assetUrl = backgroundAsset.url;
  scene.dataset.cloudy = String(cloudy);
  scene.dataset.storm = String(STORM_CONDITIONS.has(condition));
  scene.dataset.horizon = String(backgroundAsset.composition.horizon);
  scene.style.setProperty("--mha-weather-wind-factor", String(resolveWindFactor(windSpeedKmh)));
  scene.style.setProperty("--mha-weather-scene-horizon", `${backgroundAsset.composition.horizon}%`);
  scene.style.setProperty("--mha-weather-cloud-field-height", `${backgroundAsset.composition.cloudFieldHeight}%`);
  scene.style.setProperty(
    "--mha-weather-cloud-fade-start",
    `${(backgroundAsset.composition.cloudFadeStart / backgroundAsset.composition.cloudFieldHeight) * 100}%`,
  );
  scene.style.setProperty(
    "--mha-weather-cloud-fade-soft",
    `${(backgroundAsset.composition.cloudFadeSoft / backgroundAsset.composition.cloudFieldHeight) * 100}%`,
  );
  scene.style.setProperty(
    "--mha-weather-cloud-mist-start",
    `${((backgroundAsset.composition.horizon - 9) / backgroundAsset.composition.cloudFieldHeight) * 100}%`,
  );
  scene.style.setProperty(
    "--mha-weather-horizon-mist-opacity",
    String(backgroundAsset.composition.horizonMistOpacity),
  );
  scene.style.setProperty(
    "--mha-weather-cloud-opacity",
    String(Number.isFinite(cloudCover) ? Math.max(0.38, Math.min(0.96, cloudCover / 100)) : (cloudy ? 0.82 : 0.42)),
  );
  scene.setAttribute("aria-hidden", "true");

  const landscape = createLayer("mha-weather-background__landscape");
  landscape.style.backgroundImage = `url("${backgroundAsset.url}")`;

  scene.append(
    createLayer("mha-weather-background__sky"),
    landscape,
    createLayer("mha-weather-background__light"),
    createLayer("mha-weather-background__haze"),
  );

  if (condition === "clear-night") appendStars(scene, 54);
  if (condition === "fog") appendFog(scene);
  appendClouds(scene, {
    condition,
    cloudCover,
    composition: backgroundAsset.composition,
    profile: cloudProfile,
    seedKey: backgroundAsset.key,
  });

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
