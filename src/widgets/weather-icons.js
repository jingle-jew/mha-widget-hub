const WEATHER_ALIASES = new Map([
  ["clear", "sunny"],
  ["clear-day", "sunny"],
  ["clear_night", "clear-night"],
  ["clearnight", "clear-night"],
  ["partly-cloudy", "partlycloudy"],
  ["partly_cloudy", "partlycloudy"],
  ["partly cloudy", "partlycloudy"],
  ["cloud", "cloudy"],
  ["clouds", "cloudy"],
  ["rain", "rainy"],
  ["showers", "rainy"],
  ["shower", "rainy"],
  ["heavy-rain", "pouring"],
  ["heavy_rain", "pouring"],
  ["storm", "lightning-rainy"],
  ["thunder", "lightning"],
  ["thunderstorm", "lightning-rainy"],
  ["lightning_rainy", "lightning-rainy"],
  ["snow", "snowy"],
  ["sleet", "snowy-rainy"],
  ["snowy_rainy", "snowy-rainy"],
  ["wind", "windy"],
  ["windy_variant", "windy-variant"],
  ["windy-variant", "windy"],
  ["mist", "fog"],
  ["foggy", "fog"],
  ["unknown", "unknown"],
  ["unavailable", "unavailable"],
]);

const WEATHER_LABELS = {
  sunny: "Ensoleillé",
  "clear-night": "Ciel dégagé",
  partlycloudy: "Partiellement nuageux",
  cloudy: "Nuageux",
  rainy: "Pluie",
  pouring: "Forte pluie",
  lightning: "Orage",
  "lightning-rainy": "Orage avec pluie",
  snowy: "Neige",
  "snowy-rainy": "Neige et pluie",
  fog: "Brouillard",
  windy: "Venteux",
  hail: "Grêle",
  exceptional: "Conditions exceptionnelles",
  unknown: "Condition inconnue",
  unavailable: "Condition indisponible",
};

function normalizeWeatherCondition(condition = "unknown") {
  const key = String(condition || "unknown").trim().toLowerCase();
  return WEATHER_ALIASES.get(key) || (WEATHER_LABELS[key] ? key : "unknown");
}

function iconSvg(kind) {
  switch (kind) {
    case "sunny":
      return `
        <circle class="mha-weather-static-sun" cx="32" cy="32" r="13" />
        <g class="mha-weather-static-rays">
          <path d="M32 7v8"/><path d="M32 49v8"/><path d="M7 32h8"/><path d="M49 32h8"/>
          <path d="M14.3 14.3l5.7 5.7"/><path d="M44 44l5.7 5.7"/>
          <path d="M49.7 14.3L44 20"/><path d="M20 44l-5.7 5.7"/>
        </g>`;
    case "clear-night":
      return `
        <path class="mha-weather-static-moon" d="M42.5 47.5c-12.4 0-22-9.5-22-21.3 0-7.2 3.6-13.7 9.3-17.5 1.4-.9 3.1.5 2.6 2.1-.7 2-.9 4-.9 6.1 0 11.5 9.2 20.8 20.8 20.8 1.6 0 2.2 2 1 3-3 4.2-6.8 6.8-10.8 6.8Z"/>
        <circle class="mha-weather-static-star" cx="48" cy="16" r="2.2"/>`;
    case "partlycloudy":
      return `
        <circle class="mha-weather-static-sun mha-weather-static-sun--soft" cx="24" cy="24" r="11" />
        <path class="mha-weather-static-cloud" d="M21 48h27.5c5.8 0 10.5-4.3 10.5-9.7 0-5.1-4.2-9.4-9.5-9.7C47.8 22 41.7 17 34.4 17c-7.5 0-13.8 5.3-15.2 12.2C13 30 8.2 35 8.2 41.1 8.2 44.9 11.5 48 21 48Z"/>`;
    case "cloudy":
      return `<path class="mha-weather-static-cloud" d="M16.5 49h31.6C54.8 49 60 44 60 37.8c0-5.9-4.8-10.8-10.9-11.2C47.2 18.9 40.2 13 31.8 13c-8.7 0-16 6.1-17.6 14.2C7.1 28.2 2 33.8 2 40.7 2 45.3 5.8 49 16.5 49Z"/>`;
    case "rainy":
    case "pouring":
      return `
        <path class="mha-weather-static-cloud" d="M17 39h29.5C53 39 58 34.4 58 28.6 58 23.1 53.6 18.5 48 18.1 46.1 11.2 39.7 6 32 6c-8 0-14.7 5.6-16 13C9.5 20 5 25 5 31.2 5 35.5 8.6 39 17 39Z"/>
        <g class="mha-weather-static-rain ${kind === "pouring" ? "mha-weather-static-rain--heavy" : ""}">
          <path d="M22 45l-4 8"/><path d="M34 45l-4 8"/><path d="M46 45l-4 8"/>
        </g>`;
    case "lightning":
      return `
        <path class="mha-weather-static-cloud" d="M17 39h29.5C53 39 58 34.4 58 28.6 58 23.1 53.6 18.5 48 18.1 46.1 11.2 39.7 6 32 6c-8 0-14.7 5.6-16 13C9.5 20 5 25 5 31.2 5 35.5 8.6 39 17 39Z"/>
        <path class="mha-weather-static-bolt" d="M35 35 25 52h9l-4 10 13-18h-9l1-9Z"/>`;
    case "lightning-rainy":
      return `
        <path class="mha-weather-static-cloud" d="M17 38h29.5C53 38 58 33.5 58 27.8 58 22.4 53.6 18 48 17.6 46.1 10.9 39.7 6 32 6c-8 0-14.7 5.4-16 12.7C9.5 19.6 5 24.5 5 30.6 5 34.8 8.6 38 17 38Z"/>
        <path class="mha-weather-static-bolt" d="M36 35 27 50h8l-4 10 13-18h-8v-7Z"/>
        <g class="mha-weather-static-rain"><path d="M19 45l-4 8"/><path d="M50 45l-4 8"/></g>`;
    case "snowy":
    case "snowy-rainy":
      return `
        <path class="mha-weather-static-cloud" d="M17 39h29.5C53 39 58 34.4 58 28.6 58 23.1 53.6 18.5 48 18.1 46.1 11.2 39.7 6 32 6c-8 0-14.7 5.6-16 13C9.5 20 5 25 5 31.2 5 35.5 8.6 39 17 39Z"/>
        <g class="mha-weather-static-snow"><circle cx="22" cy="49" r="2.4"/><circle cx="34" cy="53" r="2.2"/><circle cx="46" cy="49" r="2.4"/></g>
        ${kind === "snowy-rainy" ? `<g class="mha-weather-static-rain"><path d="M53 44l-3 7"/></g>` : ""}`;
    case "fog":
      return `
        <path class="mha-weather-static-cloud" d="M17 35h29.5C53 35 58 30.8 58 25.6 58 20.7 53.6 16.5 48 16.1 46.1 10.2 39.7 6 32 6c-8 0-14.7 4.7-16 11.2C9.5 18 5 22.5 5 28.1 5 31.9 8.6 35 17 35Z"/>
        <g class="mha-weather-static-fog"><path d="M9 43h46"/><path d="M15 51h34"/><path d="M22 59h22"/></g>`;
    case "windy":
      return `<g class="mha-weather-static-wind"><path d="M8 24h34c5 0 8-2.7 8-6.4 0-3.4-2.6-6.1-6-6.1-2.7 0-5 1.7-5.8 4"/><path d="M8 36h43c4.6 0 7.5 2.7 7.5 6.2 0 3.7-2.9 6.4-6.6 6.4-3 0-5.4-1.8-6.2-4.4"/><path d="M8 48h24"/></g>`;
    case "hail":
      return `
        <path class="mha-weather-static-cloud" d="M17 39h29.5C53 39 58 34.4 58 28.6 58 23.1 53.6 18.5 48 18.1 46.1 11.2 39.7 6 32 6c-8 0-14.7 5.6-16 13C9.5 20 5 25 5 31.2 5 35.5 8.6 39 17 39Z"/>
        <g class="mha-weather-static-hail"><circle cx="22" cy="49" r="3"/><circle cx="34" cy="53" r="3"/><circle cx="46" cy="49" r="3"/></g>`;
    case "exceptional":
      return `<path class="mha-weather-static-alert" d="M32 8 58 54H6L32 8Z"/><path class="mha-weather-static-alert-line" d="M32 24v15"/><circle class="mha-weather-static-alert-dot" cx="32" cy="46" r="2.6"/>`;
    case "unavailable":
    case "unknown":
    default:
      return `<circle class="mha-weather-static-unknown" cx="32" cy="32" r="22"/><path class="mha-weather-static-question" d="M25 25c.8-4.5 4.2-7.2 8.8-7.2 5 0 8.3 3.1 8.3 7.2 0 6.5-7.7 6.2-7.7 12.8"/><circle class="mha-weather-static-question-dot" cx="34" cy="47" r="2.6"/>`;
  }
}

export function getWeatherIconLabel(condition) {
  const kind = normalizeWeatherCondition(condition);
  return WEATHER_LABELS[kind] || WEATHER_LABELS.unknown;
}

export function createWeatherIcon(condition = "unknown", { className = "", label } = {}) {
  const kind = normalizeWeatherCondition(condition);
  const el = document.createElement("span");
  el.className = ["mha-weather-icon", `mha-weather-icon--${kind}`, className].filter(Boolean).join(" ");
  el.dataset.weatherCondition = kind;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label || getWeatherIconLabel(kind));
  el.innerHTML = `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      ${iconSvg(kind)}
    </svg>`;
  return el;
}

export { normalizeWeatherCondition };
