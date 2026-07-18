import { CELESTIAL_GRADIENT_PREVIEW } from "./weather-celestial-gradient.js";

const alpineLakeAssetUrl = filename => new URL(
  `../assets/weather/landscapes/alpine-lake/webp/${filename}`,
  import.meta.url,
).href;

export const DEFAULT_WEATHER_LANDSCAPE_ID = "alpine-lake";

export const WEATHER_LANDSCAPE_MOMENTS = Object.freeze([
  "dawn",
  "sunrise",
  "morning",
  "afternoon",
  "sunset",
  "dusk",
  "night",
]);

export const WEATHER_LANDSCAPE_AMBIENCES = Object.freeze([
  "clear",
  "overcast-light",
  "overcast-high",
]);

const WEATHER_CONDITION_AMBIENCES = Object.freeze({
  sunny: "clear",
  clear: "clear",
  "clear-day": "clear",
  "clear-night": "clear",
  clear_night: "clear",
  clearnight: "clear",
  exceptional: "clear",
  partlycloudy: "overcast-light",
  "partly-cloudy": "overcast-light",
  partly_cloudy: "overcast-light",
  "partly cloudy": "overcast-light",
  windy: "overcast-light",
  wind: "overcast-light",
  "windy-variant": "overcast-light",
  windy_variant: "overcast-light",
  fog: "overcast-light",
  foggy: "overcast-light",
  mist: "overcast-light",
  cloudy: "overcast-high",
  cloud: "overcast-high",
  clouds: "overcast-high",
  rainy: "overcast-high",
  rain: "overcast-high",
  showers: "overcast-high",
  shower: "overcast-high",
  pouring: "overcast-high",
  "heavy-rain": "overcast-high",
  heavy_rain: "overcast-high",
  lightning: "overcast-high",
  thunder: "overcast-high",
  thunderstorm: "overcast-high",
  "lightning-rainy": "overcast-high",
  lightning_rainy: "overcast-high",
  storm: "overcast-high",
  hail: "overcast-high",
  snowy: "overcast-high",
  snow: "overcast-high",
  "snowy-rainy": "overcast-high",
  snowy_rainy: "overcast-high",
  sleet: "overcast-high",
  "freezing-rainy": "overcast-high",
});

const ALPINE_LAKE_ASSETS = Object.freeze({
  dawn: Object.freeze({
    clear: alpineLakeAssetUrl("dawn-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("dawn-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("dawn-overcast-high.webp"),
  }),
  sunrise: Object.freeze({
    clear: alpineLakeAssetUrl("sunrise-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("sunrise-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("sunrise-overcast-high.webp"),
  }),
  morning: Object.freeze({
    clear: alpineLakeAssetUrl("morning-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("morning-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("morning-overcast-high.webp"),
  }),
  afternoon: Object.freeze({
    clear: alpineLakeAssetUrl("afternoon-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("afternoon-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("afternoon-overcast-high.webp"),
  }),
  sunset: Object.freeze({
    clear: alpineLakeAssetUrl("sunset-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("sunset-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("sunset-overcast-high.webp"),
  }),
  dusk: Object.freeze({
    clear: alpineLakeAssetUrl("dusk-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("dusk-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("dusk-overcast-high.webp"),
  }),
  night: Object.freeze({
    clear: alpineLakeAssetUrl("night-clear.webp"),
    "overcast-light": alpineLakeAssetUrl("night-overcast-light.webp"),
    "overcast-high": alpineLakeAssetUrl("night-overcast-high.webp"),
  }),
});

const ALPINE_LAKE_COMPOSITION = Object.freeze({
  default: Object.freeze({
    horizon: 58,
    cloudFieldHeight: 66,
    cloudFadeStart: 44,
    cloudFadeSoft: 56,
    horizonMistOpacity: 0.12,
  }),
  moments: Object.freeze({
    dawn: Object.freeze({ horizon: 59 }),
    sunrise: Object.freeze({ horizon: 59 }),
    morning: Object.freeze({ horizon: 58 }),
    afternoon: Object.freeze({ horizon: 57 }),
    sunset: Object.freeze({ horizon: 59 }),
    dusk: Object.freeze({ horizon: 59 }),
    night: Object.freeze({ horizon: 58 }),
  }),
  ambiences: Object.freeze({
    clear: Object.freeze({ cloudFieldHeight: 63, cloudFadeStart: 46, cloudFadeSoft: 55, horizonMistOpacity: 0.05 }),
    "overcast-light": Object.freeze({ cloudFieldHeight: 66, cloudFadeStart: 44, cloudFadeSoft: 56, horizonMistOpacity: 0.12 }),
    "overcast-high": Object.freeze({ cloudFieldHeight: 72, cloudFadeStart: 42, cloudFadeSoft: 59, horizonMistOpacity: 0.24 }),
  }),
});

export const WEATHER_LANDSCAPES = Object.freeze({
  [DEFAULT_WEATHER_LANDSCAPE_ID]: Object.freeze({
    id: DEFAULT_WEATHER_LANDSCAPE_ID,
    type: "raster",
    label: "Alpine lake",
    labelKey: "settings.weatherLandscapeOptions.alpineLake",
    preview: ALPINE_LAKE_ASSETS.afternoon.clear,
    assets: ALPINE_LAKE_ASSETS,
    // Winter assets can be connected here later without changing the resolver.
    winterAssets: null,
    composition: ALPINE_LAKE_COMPOSITION,
  }),
  "celestial-gradient": Object.freeze({
    id: "celestial-gradient",
    type: "procedural",
    renderer: "celestial-gradient",
    label: "Celestial gradient",
    labelKey: "settings.weatherLandscapeOptions.celestialGradient",
    preview: CELESTIAL_GRADIENT_PREVIEW,
    composition: Object.freeze({
      default: Object.freeze({
        horizon: 58,
        cloudFieldHeight: 66,
        cloudFadeStart: 44,
        cloudFadeSoft: 56,
        horizonMistOpacity: 0.12,
      }),
    }),
  }),
});

export function normalizeWeatherLandscapeId(value = DEFAULT_WEATHER_LANDSCAPE_ID) {
  const id = String(value || "").trim();
  return Object.hasOwn(WEATHER_LANDSCAPES, id)
    ? id
    : DEFAULT_WEATHER_LANDSCAPE_ID;
}

export function getWeatherLandscapeOptions() {
  return Object.values(WEATHER_LANDSCAPES).map(landscape => Object.freeze({
    value: landscape.id,
    label: landscape.label,
    labelKey: landscape.labelKey,
    preview: landscape.preview,
    type: landscape.type || "raster",
    renderer: landscape.renderer || "raster",
  }));
}

export function resolveWeatherLandscapeAmbience(condition = "") {
  const normalizedCondition = String(condition || "").trim().toLowerCase();
  return WEATHER_CONDITION_AMBIENCES[normalizedCondition] || "overcast-light";
}

function resolveLandscape(id, registry) {
  const requested = String(id || "").trim();
  return registry?.[requested]
    || registry?.[DEFAULT_WEATHER_LANDSCAPE_ID]
    || WEATHER_LANDSCAPES[DEFAULT_WEATHER_LANDSCAPE_ID];
}

function resolveComposition(landscape, moment, ambience) {
  const composition = landscape?.composition || {};
  return Object.freeze({
    horizon: 58,
    cloudFieldHeight: 66,
    cloudFadeStart: 44,
    cloudFadeSoft: 56,
    horizonMistOpacity: 0.12,
    ...(composition.default || {}),
    ...(composition.moments?.[moment] || {}),
    ...(composition.ambiences?.[ambience] || {}),
  });
}

function filenameFromUrl(url = "") {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").at(-1) || "");
  } catch {
    return "";
  }
}

export function resolveWeatherBackgroundAsset({
  landscapeId = DEFAULT_WEATHER_LANDSCAPE_ID,
  condition = "sunny",
  moment = "afternoon",
  winter = false,
  registry = WEATHER_LANDSCAPES,
} = {}) {
  const landscape = resolveLandscape(landscapeId, registry);
  const normalizedMoment = WEATHER_LANDSCAPE_MOMENTS.includes(moment) ? moment : "afternoon";
  const requestedAmbience = resolveWeatherLandscapeAmbience(condition);
  if (landscape?.type === "procedural") {
    const resolvedLandscapeId = landscape.id || DEFAULT_WEATHER_LANDSCAPE_ID;
    return Object.freeze({
      key: `${resolvedLandscapeId}:procedural`,
      assetKey: `${resolvedLandscapeId}:procedural`,
      landscapeId: resolvedLandscapeId,
      requestedLandscapeId: String(landscapeId || ""),
      type: "procedural",
      renderer: landscape.renderer || resolvedLandscapeId,
      label: landscape.label || "Celestial gradient",
      moment: normalizedMoment,
      ambience: "temporal",
      fallback: "none",
      season: "standard",
      winterFallback: false,
      filename: "",
      url: "",
      composition: resolveComposition(landscape, normalizedMoment, requestedAmbience),
    });
  }
  const usesWinterAssets = Boolean(winter && landscape?.winterAssets);
  const assets = usesWinterAssets ? landscape.winterAssets : landscape?.assets;
  const candidates = [
    [normalizedMoment, requestedAmbience, "exact"],
    [normalizedMoment, "overcast-light", "same-moment-overcast-light"],
    [normalizedMoment, "clear", "same-moment-clear"],
    ["afternoon", requestedAmbience, "afternoon-same-ambience"],
  ];

  let resolvedMoment = normalizedMoment;
  let resolvedAmbience = requestedAmbience;
  let fallback = "preview";
  let url = "";

  for (const [candidateMoment, candidateAmbience, candidateFallback] of candidates) {
    const candidateUrl = assets?.[candidateMoment]?.[candidateAmbience];
    if (!candidateUrl) continue;
    resolvedMoment = candidateMoment;
    resolvedAmbience = candidateAmbience;
    fallback = candidateFallback;
    url = candidateUrl;
    break;
  }

  if (!url) {
    url = landscape?.preview
      || registry?.[DEFAULT_WEATHER_LANDSCAPE_ID]?.preview
      || WEATHER_LANDSCAPES[DEFAULT_WEATHER_LANDSCAPE_ID].preview;
  }

  const resolvedLandscapeId = landscape?.id || DEFAULT_WEATHER_LANDSCAPE_ID;
  const season = usesWinterAssets ? "winter" : "standard";
  return Object.freeze({
    key: `${resolvedLandscapeId}:${season}:${resolvedMoment}:${resolvedAmbience}`,
    assetKey: `${resolvedLandscapeId}:${resolvedMoment}:${resolvedAmbience}`,
    landscapeId: resolvedLandscapeId,
    requestedLandscapeId: String(landscapeId || ""),
    type: landscape?.type || "raster",
    renderer: landscape?.renderer || "raster",
    label: landscape?.label || "Alpine lake",
    moment: resolvedMoment,
    ambience: resolvedAmbience,
    fallback,
    season,
    winterFallback: Boolean(winter && !usesWinterAssets),
    filename: filenameFromUrl(url),
    url,
    composition: resolveComposition(landscape, resolvedMoment, resolvedAmbience),
  });
}
