const assetUrl = filename => new URL(`../assets/weather/webp/${filename}`, import.meta.url).href;

const WEATHER_ASSET_FILES = Object.freeze({
  clearNight: "clear-night.webp",
  cloudyDay: "cloud.webp",
  dawn: "dawn.webp",
  dusk: "dusk.webp",
  foggyDay: "foggy-day.webp",
  foggyNight: "foggy-night.webp",
  partlyCloudy: "partly-cloudy.webp",
  rainyDay: "rain.webp",
  rainyNight: "rainy-night.webp",
  smog: "smog-firesmoke.webp",
  sunny: "sunny.webp",
  sunrise: "sunrise.webp",
  sunset: "sunset.webp",
  thunderstorm: "thunderstorm.webp",
  winterClearNight: "winter-clear-night.webp",
  winterCloudyDay: "winter-cloudy-day.webp",
  winterDay: "winter-day.webp",
  winterSnowDay: "winter-snow-day.webp",
  winterSnowNight: "winter-snow-night.webp",
});

const DEFAULT_SCENE_COMPOSITION = Object.freeze({
  horizon: 58,
  cloudFieldHeight: 66,
  cloudFadeStart: 44,
  cloudFadeSoft: 56,
  horizonMistOpacity: 0.12,
});

// The WebP files share a landscape, but their light, relief visibility and
// embedded weather move the perceived horizon. Keeping that information next
// to the asset lets the procedural layer compose itself with the photograph.
const WEATHER_SCENE_COMPOSITIONS = Object.freeze({
  clearNight: Object.freeze({ horizon: 58, cloudFieldHeight: 65, cloudFadeStart: 45, cloudFadeSoft: 56, horizonMistOpacity: 0.08 }),
  cloudyDay: Object.freeze({ horizon: 60, cloudFieldHeight: 69, cloudFadeStart: 45, cloudFadeSoft: 58, horizonMistOpacity: 0.18 }),
  dawn: Object.freeze({ horizon: 59, cloudFieldHeight: 67, cloudFadeStart: 45, cloudFadeSoft: 57, horizonMistOpacity: 0.14 }),
  dusk: Object.freeze({ horizon: 59, cloudFieldHeight: 67, cloudFadeStart: 44, cloudFadeSoft: 57, horizonMistOpacity: 0.15 }),
  foggyDay: Object.freeze({ horizon: 65, cloudFieldHeight: 77, cloudFadeStart: 42, cloudFadeSoft: 63, horizonMistOpacity: 0.36 }),
  foggyNight: Object.freeze({ horizon: 64, cloudFieldHeight: 76, cloudFadeStart: 42, cloudFadeSoft: 62, horizonMistOpacity: 0.34 }),
  partlyCloudy: Object.freeze({ horizon: 58, cloudFieldHeight: 66, cloudFadeStart: 44, cloudFadeSoft: 56, horizonMistOpacity: 0.12 }),
  rainyDay: Object.freeze({ horizon: 61, cloudFieldHeight: 72, cloudFadeStart: 43, cloudFadeSoft: 59, horizonMistOpacity: 0.25 }),
  rainyNight: Object.freeze({ horizon: 61, cloudFieldHeight: 72, cloudFadeStart: 43, cloudFadeSoft: 59, horizonMistOpacity: 0.24 }),
  smog: Object.freeze({ horizon: 63, cloudFieldHeight: 74, cloudFadeStart: 44, cloudFadeSoft: 61, horizonMistOpacity: 0.3 }),
  sunny: Object.freeze({ horizon: 57, cloudFieldHeight: 63, cloudFadeStart: 46, cloudFadeSoft: 55, horizonMistOpacity: 0.05 }),
  sunrise: Object.freeze({ horizon: 59, cloudFieldHeight: 67, cloudFadeStart: 45, cloudFadeSoft: 57, horizonMistOpacity: 0.13 }),
  sunset: Object.freeze({ horizon: 59, cloudFieldHeight: 67, cloudFadeStart: 44, cloudFadeSoft: 57, horizonMistOpacity: 0.14 }),
  thunderstorm: Object.freeze({ horizon: 60, cloudFieldHeight: 71, cloudFadeStart: 41, cloudFadeSoft: 58, horizonMistOpacity: 0.3 }),
  winterClearNight: Object.freeze({ horizon: 59, cloudFieldHeight: 66, cloudFadeStart: 45, cloudFadeSoft: 57, horizonMistOpacity: 0.1 }),
  winterCloudyDay: Object.freeze({ horizon: 61, cloudFieldHeight: 70, cloudFadeStart: 45, cloudFadeSoft: 59, horizonMistOpacity: 0.2 }),
  winterDay: Object.freeze({ horizon: 59, cloudFieldHeight: 66, cloudFadeStart: 46, cloudFadeSoft: 57, horizonMistOpacity: 0.08 }),
  winterSnowDay: Object.freeze({ horizon: 62, cloudFieldHeight: 72, cloudFadeStart: 44, cloudFadeSoft: 60, horizonMistOpacity: 0.24 }),
  winterSnowNight: Object.freeze({ horizon: 62, cloudFieldHeight: 72, cloudFadeStart: 44, cloudFadeSoft: 60, horizonMistOpacity: 0.23 }),
});

const CONDITION_ASSETS = Object.freeze({
  sunny: { day: "sunny", night: "clearNight" },
  "clear-night": { day: "sunny", night: "clearNight" },
  partlycloudy: { day: "partlyCloudy", night: "clearNight" },
  cloudy: { day: "cloudyDay", night: "rainyNight" },
  rainy: { day: "rainyDay", night: "rainyNight" },
  pouring: { day: "rainyDay", night: "rainyNight" },
  lightning: { day: "thunderstorm", night: "thunderstorm" },
  "lightning-rainy": { day: "thunderstorm", night: "thunderstorm" },
  hail: { day: "thunderstorm", night: "thunderstorm" },
  fog: { day: "foggyDay", night: "foggyNight" },
  snowy: { day: "winterSnowDay", night: "winterSnowNight" },
  "snowy-rainy": { day: "winterSnowDay", night: "winterSnowNight" },
  exceptional: { day: "smog", night: "smog" },
});

function resolvePeriodAssetKey(period = "day") {
  if (period === "dawn") return "dawn";
  if (period === "sunrise") return "sunrise";
  if (period === "sunset") return "sunset";
  if (period === "dusk") return "dusk";
  return "";
}

export function resolveWeatherBackgroundAsset({
  condition = "sunny",
  period = "day",
  winter = false,
} = {}) {
  const normalizedCondition = String(condition || "sunny").trim().toLowerCase();
  const daytime = period === "night" || period === "dusk" ? "night" : "day";
  const periodKey = resolvePeriodAssetKey(period);

  let assetKey = periodKey || CONDITION_ASSETS[normalizedCondition]?.[daytime];
  if (!assetKey) assetKey = daytime === "night" ? "clearNight" : "sunny";

  if (winter && !periodKey) {
    if (["snowy", "snowy-rainy"].includes(normalizedCondition)) {
      assetKey = daytime === "night" ? "winterSnowNight" : "winterSnowDay";
    } else if (normalizedCondition === "cloudy" || normalizedCondition === "partlycloudy") {
      assetKey = daytime === "night" ? "winterClearNight" : "winterCloudyDay";
    } else if (["sunny", "clear-night"].includes(normalizedCondition)) {
      assetKey = daytime === "night" ? "winterClearNight" : "winterDay";
    }
  }

  const filename = WEATHER_ASSET_FILES[assetKey] || WEATHER_ASSET_FILES.sunny;
  return Object.freeze({
    key: `${winter ? "winter" : "standard"}:${period}:${normalizedCondition}:${assetKey}`,
    assetKey,
    filename,
    url: assetUrl(filename),
    composition: WEATHER_SCENE_COMPOSITIONS[assetKey] || DEFAULT_SCENE_COMPOSITION,
  });
}
