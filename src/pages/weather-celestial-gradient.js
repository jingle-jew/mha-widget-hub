const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const profile = ({
  top,
  middle,
  horizon,
  ambient,
  brightness,
  halo,
  stars,
  temperature,
  sun,
  moon,
}) => Object.freeze({
  top,
  middle,
  horizon,
  ambient,
  brightness,
  halo,
  stars,
  temperature,
  sun,
  moon,
});

export const CELESTIAL_GRADIENT_PROFILES = Object.freeze({
  dawn: profile({
    top: "#142344", middle: "#4f5278", horizon: "#c48699", ambient: "#8f7899",
    brightness: 0.56, halo: 0.04, stars: 0.16, temperature: 0.12, sun: 0, moon: 0.34,
  }),
  sunrise: profile({
    top: "#527da8", middle: "#97a0bb", horizon: "#f2a17f", ambient: "#f0ad86",
    brightness: 0.82, halo: 0.64, stars: 0.01, temperature: 0.76, sun: 0.88, moon: 0.08,
  }),
  morning: profile({
    top: "#4b9bd7", middle: "#8dc5e8", horizon: "#d8dfdc", ambient: "#f2d7ae",
    brightness: 1, halo: 0.42, stars: 0, temperature: 0.22, sun: 0.96, moon: 0,
  }),
  afternoon: profile({
    top: "#247fc4", middle: "#70b4df", horizon: "#c4d9e5", ambient: "#edc99d",
    brightness: 0.98, halo: 0.34, stars: 0, temperature: 0.16, sun: 1, moon: 0,
  }),
  sunset: profile({
    top: "#385d8c", middle: "#a06f86", horizon: "#f08b56", ambient: "#f1a05f",
    brightness: 0.78, halo: 0.72, stars: 0, temperature: 0.9, sun: 0.84, moon: 0.06,
  }),
  dusk: profile({
    top: "#172b51", middle: "#564a72", horizon: "#c36f65", ambient: "#c98270",
    brightness: 0.5, halo: 0.08, stars: 0.34, temperature: 0.46, sun: 0, moon: 0.58,
  }),
  night: profile({
    top: "#071329", middle: "#142846", horizon: "#314968", ambient: "#536987",
    brightness: 0.3, halo: 0, stars: 0.76, temperature: 0.04, sun: 0, moon: 0.94,
  }),
});

const MOON_PHASES = Object.freeze({
  new_moon: Object.freeze({ shadowX: 0, shadowScale: 1, shadowOpacity: 0.98, illumination: 0 }),
  waxing_crescent: Object.freeze({ shadowX: -18, shadowScale: 1, shadowOpacity: 0.96, illumination: 0.25 }),
  first_quarter: Object.freeze({ shadowX: -48, shadowScale: 1, shadowOpacity: 0.96, illumination: 0.5 }),
  waxing_gibbous: Object.freeze({ shadowX: -78, shadowScale: 1, shadowOpacity: 0.92, illumination: 0.75 }),
  full_moon: Object.freeze({ shadowX: -110, shadowScale: 0.82, shadowOpacity: 0, illumination: 1 }),
  waning_gibbous: Object.freeze({ shadowX: 78, shadowScale: 1, shadowOpacity: 0.92, illumination: 0.75 }),
  last_quarter: Object.freeze({ shadowX: 48, shadowScale: 1, shadowOpacity: 0.96, illumination: 0.5 }),
  waning_crescent: Object.freeze({ shadowX: 18, shadowScale: 1, shadowOpacity: 0.96, illumination: 0.25 }),
});

const MOON_PHASE_ALIASES = Object.freeze({
  new: "new_moon",
  newmoon: "new_moon",
  waxingcrescent: "waxing_crescent",
  firstquarter: "first_quarter",
  waxinggibbous: "waxing_gibbous",
  full: "full_moon",
  fullmoon: "full_moon",
  waninggibbous: "waning_gibbous",
  lastquarter: "last_quarter",
  thirdquarter: "last_quarter",
  waningcrescent: "waning_crescent",
});

function normalizePhaseKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeMoonPhase(value = "") {
  const key = normalizePhaseKey(value);
  if (Object.hasOwn(MOON_PHASES, key)) return key;
  const compact = key.replaceAll("_", "");
  return MOON_PHASE_ALIASES[compact] || "full_moon";
}

function parseHexColor(value = "#000000") {
  const normalized = String(value).replace("#", "");
  const expanded = normalized.length === 3
    ? [...normalized].map(character => `${character}${character}`).join("")
    : normalized;
  const parsed = Number.parseInt(expanded, 16);
  if (!Number.isFinite(parsed)) return [0, 0, 0];
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

export function interpolateCelestialColor(from, to, progress = 0) {
  const amount = clamp(Number(progress) || 0);
  const fromRgb = parseHexColor(from);
  const toRgb = parseHexColor(to);
  const channels = fromRgb.map((channel, index) => Math.round(
    channel + ((toRgb[index] - channel) * amount),
  ));
  return `rgb(${channels.join(" ")})`;
}

function interpolateNumber(from = 0, to = 0, progress = 0) {
  return Number(from) + ((Number(to) - Number(from)) * clamp(progress));
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function positionFromAngles(azimuth, elevation) {
  const normalizedAzimuth = ((azimuth % 360) + 360) % 360;
  const x = 8 + ((normalizedAzimuth / 360) * 84);
  const y = 46 - ((clamp(elevation, 0, 90) / 90) * 38);
  return Object.freeze({ x: clamp(x, 6, 94), y: clamp(y, 7, 48), source: "astronomical" });
}

export function normalizeCelestialPosition({
  azimuth,
  elevation,
  fallbackX = 50,
  fallbackY = 24,
} = {}) {
  const resolvedAzimuth = finiteNumber(azimuth);
  const resolvedElevation = finiteNumber(elevation);
  if (Number.isFinite(resolvedAzimuth) && Number.isFinite(resolvedElevation)) {
    return positionFromAngles(resolvedAzimuth, resolvedElevation);
  }
  return Object.freeze({
    x: clamp(finiteNumber(fallbackX) || 50, 6, 94),
    y: clamp(finiteNumber(fallbackY) || 24, 7, 48),
    source: "estimated",
  });
}

function resolveMoonEntity(hass = null) {
  const states = hass?.states || {};
  const preferred = ["sensor.moon_phase", "sensor.moon"]
    .map(entityId => states[entityId])
    .find(Boolean);
  if (preferred) return preferred;
  return Object.values(states).find((entity) => {
    const entityId = String(entity?.entity_id || "").toLowerCase();
    const phase = normalizePhaseKey(entity?.attributes?.moon_phase || entity?.attributes?.phase || entity?.state);
    return (entityId.includes("moon") || entityId.includes("lunar"))
      && (
        Object.hasOwn(MOON_PHASES, phase)
        || Object.hasOwn(MOON_PHASE_ALIASES, phase.replaceAll("_", ""))
        || Number.isFinite(finiteNumber(entity?.attributes?.azimuth))
        || Number.isFinite(finiteNumber(entity?.attributes?.elevation))
      );
  }) || null;
}

function resolveMoonPhase(moonEntity = null) {
  return normalizeMoonPhase(
    moonEntity?.attributes?.moon_phase
      || moonEntity?.attributes?.phase
      || moonEntity?.state,
  );
}

function approximateDayProgress(now = new Date()) {
  const hour = now.getHours() + (now.getMinutes() / 60);
  return clamp((hour - 6) / 14);
}

function approximateNightProgress(now = new Date()) {
  const hour = now.getHours() + (now.getMinutes() / 60);
  const nocturnalHour = hour < 12 ? hour + 24 : hour;
  return clamp((nocturnalHour - 20) / 10);
}

function resolveSolarDayProgress(sun, now) {
  const nowMs = now.getTime();
  let rising = Date.parse(sun?.attributes?.next_rising || "");
  let setting = Date.parse(sun?.attributes?.next_setting || "");
  if (!Number.isFinite(rising) || !Number.isFinite(setting)) return approximateDayProgress(now);
  while (rising > nowMs) rising -= 24 * 60 * 60 * 1000;
  while (setting < nowMs) setting += 24 * 60 * 60 * 1000;
  if (setting <= rising) return approximateDayProgress(now);
  return clamp((nowMs - rising) / (setting - rising));
}

function resolveSolarPosition(sun, isDay, now) {
  const azimuth = finiteNumber(sun?.attributes?.azimuth);
  const elevation = finiteNumber(sun?.attributes?.elevation);
  const dayProgress = sun?.state === "above_horizon"
    ? resolveSolarDayProgress(sun, now)
    : approximateDayProgress(now);
  const fallbackX = 10 + (dayProgress * 80);
  const fallbackY = 46 - (Math.sin(Math.PI * dayProgress) * 36);
  return {
    ...normalizeCelestialPosition({ azimuth, elevation, fallbackX, fallbackY }),
    elevation,
    visible: sun
      ? sun.state === "above_horizon" && (!Number.isFinite(elevation) || elevation > -1)
      : Boolean(isDay),
  };
}

function resolveLunarPosition(moonEntity, now) {
  const azimuth = finiteNumber(moonEntity?.attributes?.azimuth);
  const elevation = finiteNumber(moonEntity?.attributes?.elevation);
  const nightProgress = approximateNightProgress(now);
  const fallbackX = 12 + (nightProgress * 76);
  const fallbackY = 43 - (Math.sin(Math.PI * nightProgress) * 28);
  return {
    ...normalizeCelestialPosition({ azimuth, elevation, fallbackX, fallbackY }),
    elevation,
    aboveHorizon: !Number.isFinite(elevation) || elevation > -1,
  };
}

function resolveInterpolatedProfile(transition = {}) {
  const fromId = Object.hasOwn(CELESTIAL_GRADIENT_PROFILES, transition.from)
    ? transition.from
    : "afternoon";
  const toId = Object.hasOwn(CELESTIAL_GRADIENT_PROFILES, transition.to)
    ? transition.to
    : fromId;
  const progress = clamp(Number(transition.progress) || 0);
  const from = CELESTIAL_GRADIENT_PROFILES[fromId];
  const to = CELESTIAL_GRADIENT_PROFILES[toId];
  return {
    fromId,
    toId,
    progress,
    top: interpolateCelestialColor(from.top, to.top, progress),
    middle: interpolateCelestialColor(from.middle, to.middle, progress),
    horizon: interpolateCelestialColor(from.horizon, to.horizon, progress),
    ambient: interpolateCelestialColor(from.ambient, to.ambient, progress),
    brightness: interpolateNumber(from.brightness, to.brightness, progress),
    halo: interpolateNumber(from.halo, to.halo, progress),
    stars: interpolateNumber(from.stars, to.stars, progress),
    temperature: interpolateNumber(from.temperature, to.temperature, progress),
    sun: interpolateNumber(from.sun, to.sun, progress),
    moon: interpolateNumber(from.moon, to.moon, progress),
  };
}

function rounded(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(Number(value) * factor) / factor;
}

export function resolveCelestialGradientState({
  hass = null,
  isDay = true,
  now = new Date(),
  period = "afternoon",
  transition = { from: period, to: period, progress: 0 },
} = {}) {
  const resolved = resolveInterpolatedProfile(transition);
  const sun = hass?.states?.["sun.sun"] || null;
  const moonEntity = resolveMoonEntity(hass);
  const moonPhase = resolveMoonPhase(moonEntity);
  const moonPhaseProfile = MOON_PHASES[moonPhase];
  const solarPosition = resolveSolarPosition(sun, isDay, now);
  const lunarPosition = resolveLunarPosition(moonEntity, now);
  const sunOpacity = solarPosition.visible ? resolved.sun : 0;
  const moonOpacity = lunarPosition.aboveHorizon ? resolved.moon : 0;
  const starsOpacity = clamp(resolved.stars * (1 - (moonPhaseProfile.illumination * moonOpacity * 0.38)));

  return Object.freeze({
    period,
    from: resolved.fromId,
    to: resolved.toId,
    progress: rounded(resolved.progress),
    colors: Object.freeze({
      top: resolved.top,
      middle: resolved.middle,
      horizon: resolved.horizon,
      ambient: resolved.ambient,
    }),
    brightness: rounded(resolved.brightness),
    temperature: rounded(resolved.temperature),
    starsOpacity: rounded(starsOpacity),
    sun: Object.freeze({
      x: rounded(solarPosition.x, 2),
      y: rounded(solarPosition.y, 2),
      opacity: rounded(sunOpacity),
      haloOpacity: rounded(resolved.halo * sunOpacity),
      source: solarPosition.source,
    }),
    moon: Object.freeze({
      x: rounded(lunarPosition.x, 2),
      y: rounded(lunarPosition.y, 2),
      opacity: rounded(moonOpacity),
      phase: moonPhase,
      source: lunarPosition.source,
      shadowX: moonPhaseProfile.shadowX,
      shadowScale: moonPhaseProfile.shadowScale,
      shadowOpacity: moonPhaseProfile.shadowOpacity,
    }),
  });
}

function setVariable(target, name, value) {
  target.style.setProperty(name, String(value));
}

export function applyCelestialGradientState(target, state) {
  setVariable(target, "--mha-celestial-sky-top", state.colors.top);
  setVariable(target, "--mha-celestial-sky-mid", state.colors.middle);
  setVariable(target, "--mha-celestial-sky-horizon", state.colors.horizon);
  setVariable(target, "--mha-celestial-ambient-color", state.colors.ambient);
  setVariable(target, "--mha-celestial-ambient-light", state.brightness);
  setVariable(target, "--mha-celestial-temperature", state.temperature);
  setVariable(target, "--mha-celestial-sun-x", `${state.sun.x}%`);
  setVariable(target, "--mha-celestial-sun-y", `${state.sun.y}%`);
  setVariable(target, "--mha-celestial-sun-opacity", state.sun.opacity);
  setVariable(target, "--mha-celestial-sun-halo-opacity", state.sun.haloOpacity);
  setVariable(target, "--mha-celestial-moon-x", `${state.moon.x}%`);
  setVariable(target, "--mha-celestial-moon-y", `${state.moon.y}%`);
  setVariable(target, "--mha-celestial-moon-opacity", state.moon.opacity);
  setVariable(target, "--mha-celestial-moon-shadow-x", `${state.moon.shadowX}%`);
  setVariable(target, "--mha-celestial-moon-shadow-scale", state.moon.shadowScale);
  setVariable(target, "--mha-celestial-moon-shadow-opacity", state.moon.shadowOpacity);
  setVariable(target, "--mha-celestial-stars-opacity", state.starsOpacity);
}

function createLayer(className) {
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");
  return layer;
}

export function createCelestialGradientLayer(state) {
  const root = createLayer("mha-weather-background__celestial-gradient");
  root.dataset.period = state.period;
  root.append(
    createLayer("mha-weather-celestial__sky"),
    createLayer("mha-weather-celestial__stars"),
    createLayer("mha-weather-celestial__sun"),
    createLayer("mha-weather-celestial__moon"),
  );
  return root;
}

export const CELESTIAL_GRADIENT_PREVIEW = Object.freeze({
  period: "sunset",
  background: [
    `radial-gradient(circle at 76% 28%, ${CELESTIAL_GRADIENT_PROFILES.sunset.ambient} 0 3%, transparent 24%)`,
    `linear-gradient(180deg, ${CELESTIAL_GRADIENT_PROFILES.sunset.top} 0%, ${CELESTIAL_GRADIENT_PROFILES.sunset.middle} 54%, ${CELESTIAL_GRADIENT_PROFILES.sunset.horizon} 100%)`,
  ].join(", "),
});
