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
    filename,
    url: assetUrl(filename),
  });
}
