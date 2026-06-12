import { getWeatherIconLabel, normalizeWeatherCondition } from "./weather-icons.js";

function currentSvg(kind) {
  switch (kind) {
    case "sunny":
      return `
        <g class="mha-weather-current-glow"><circle cx="32" cy="32" r="21"/></g>
        <circle class="mha-weather-current-sun" cx="32" cy="32" r="13"/>
        <g class="mha-weather-current-rays">
          <path d="M32 6v9"/><path d="M32 49v9"/><path d="M6 32h9"/><path d="M49 32h9"/>
          <path d="M13.6 13.6l6.3 6.3"/><path d="M44.1 44.1l6.3 6.3"/>
          <path d="M50.4 13.6l-6.3 6.3"/><path d="M19.9 44.1l-6.3 6.3"/>
        </g>`;
    case "clear-night":
      return `
        <g class="mha-weather-current-moon-glow"><circle cx="34" cy="31" r="23"/></g>
        <path class="mha-weather-current-moon" d="M43.2 47.6c-12.9 0-23-9.9-23-22.2 0-7.4 3.8-14.2 9.7-18.1 1.6-1 3.3.6 2.7 2.3-.8 2.1-1.1 4.3-1.1 6.6 0 12.1 9.8 21.9 21.9 21.9 1.8 0 2.5 2.2 1.2 3.3-3.5 3.9-7.3 6.2-11.4 6.2Z"/>
        <g class="mha-weather-current-stars"><circle cx="48" cy="15" r="2.2"/><circle cx="17" cy="45" r="1.5"/></g>`;
    case "partlycloudy":
      return `
        <circle class="mha-weather-current-sun mha-weather-current-sun--behind" cx="24" cy="24" r="12"/>
        <g class="mha-weather-current-rays mha-weather-current-rays--behind"><path d="M24 5v7"/><path d="M24 36v7"/><path d="M5 24h7"/><path d="M36 24h7"/><path d="M10.6 10.6l5 5"/><path d="M37.4 10.6l-5 5"/></g>
        <path class="mha-weather-current-cloud mha-weather-current-cloud--front" d="M20 49h28.5C54.6 49 59 44.6 59 39.2c0-5.2-4.1-9.5-9.3-9.9C47.9 22.4 41.7 17 34.1 17c-7.8 0-14.2 5.6-15.6 12.8C12.2 30.7 7.4 35.8 7.4 42c0 4.1 3.4 7 12.6 7Z"/>`;
    case "cloudy":
      return `<path class="mha-weather-current-cloud" d="M16 50h32.4C55.4 50 61 44.7 61 38.1c0-6.2-5-11.3-11.3-11.8C47.7 18.2 40.5 12 31.8 12c-9 0-16.5 6.3-18.2 14.7C6.4 27.8 1.5 33.6 1.5 40.8 1.5 46 5.7 50 16 50Z"/>`;
    case "rainy":
    case "pouring":
      return `
        <path class="mha-weather-current-cloud" d="M16.5 39.8h31.2c6.6 0 11.8-4.9 11.8-11.1 0-5.9-4.8-10.8-10.8-11.3C46.6 10.4 40 5.2 32 5.2c-8.3 0-15.3 5.8-16.8 13.3C8.5 19.5 3.5 24.8 3.5 31.2c0 4.8 3.9 8.6 13 8.6Z"/>
        <g class="mha-weather-current-rain ${kind === "pouring" ? "mha-weather-current-rain--heavy" : ""}">
          <path style="--i:0" d="M21 45l-4.2 8.6"/><path style="--i:1" d="M34 45l-4.2 8.6"/><path style="--i:2" d="M47 45l-4.2 8.6"/>
        </g>`;
    case "lightning":
    case "lightning-rainy":
      return `
        <path class="mha-weather-current-cloud" d="M16.5 39h31.2c6.6 0 11.8-4.8 11.8-10.9 0-5.8-4.8-10.6-10.8-11.1C46.6 10.2 40 5.2 32 5.2c-8.3 0-15.3 5.7-16.8 13C8.5 19.2 3.5 24.5 3.5 30.8c0 4.7 3.9 8.2 13 8.2Z"/>
        <path class="mha-weather-current-bolt" d="M36 35 25.5 52.5h9.2L31 63l14.2-19.6H36V35Z"/>
        ${kind === "lightning-rainy" ? `<g class="mha-weather-current-rain"><path style="--i:0" d="M18 45l-3.5 7.5"/><path style="--i:1" d="M51 45l-3.5 7.5"/></g>` : ""}`;
    case "snowy":
    case "snowy-rainy":
      return `
        <path class="mha-weather-current-cloud" d="M16.5 39.8h31.2c6.6 0 11.8-4.9 11.8-11.1 0-5.9-4.8-10.8-10.8-11.3C46.6 10.4 40 5.2 32 5.2c-8.3 0-15.3 5.8-16.8 13.3C8.5 19.5 3.5 24.8 3.5 31.2c0 4.8 3.9 8.6 13 8.6Z"/>
        <g class="mha-weather-current-snow"><circle style="--i:0" cx="21" cy="49" r="2.5"/><circle style="--i:1" cx="34" cy="53" r="2.3"/><circle style="--i:2" cx="47" cy="49" r="2.5"/></g>
        ${kind === "snowy-rainy" ? `<g class="mha-weather-current-rain"><path style="--i:0" d="M53 45l-3.2 7"/></g>` : ""}`;
    case "fog":
      return `
        <path class="mha-weather-current-cloud" d="M17 35h30.5C54 35 59 30.7 59 25.4c0-5-4.5-9.2-10.2-9.6C46.8 9.8 40.2 5.5 32.4 5.5c-8.1 0-15 4.8-16.5 11.4C9.3 17.8 4.6 22.5 4.6 28.2 4.6 32.2 8.2 35 17 35Z"/>
        <g class="mha-weather-current-fog"><path d="M8 43h48"/><path d="M14 51h38"/><path d="M22 59h26"/></g>`;
    case "windy":
      return `<g class="mha-weather-current-wind"><path d="M8 23h34c5.2 0 8.3-2.8 8.3-6.6 0-3.5-2.7-6.3-6.2-6.3-2.8 0-5.1 1.8-6 4.1"/><path d="M8 36h43c4.8 0 7.8 2.8 7.8 6.4 0 3.8-3 6.6-6.9 6.6-3.1 0-5.6-1.8-6.4-4.5"/><path d="M8 49h25"/></g>`;
    case "hail":
      return `
        <path class="mha-weather-current-cloud" d="M16.5 39.8h31.2c6.6 0 11.8-4.9 11.8-11.1 0-5.9-4.8-10.8-10.8-11.3C46.6 10.4 40 5.2 32 5.2c-8.3 0-15.3 5.8-16.8 13.3C8.5 19.5 3.5 24.8 3.5 31.2c0 4.8 3.9 8.6 13 8.6Z"/>
        <g class="mha-weather-current-hail"><circle style="--i:0" cx="21" cy="49" r="3"/><circle style="--i:1" cx="34" cy="53" r="3"/><circle style="--i:2" cx="47" cy="49" r="3"/></g>`;
    case "exceptional":
      return `<path class="mha-weather-current-alert" d="M32 8 59 55H5L32 8Z"/><path class="mha-weather-current-alert-line" d="M32 24v16"/><circle class="mha-weather-current-alert-dot" cx="32" cy="47" r="2.8"/>`;
    case "unavailable":
    case "unknown":
    default:
      return `<circle class="mha-weather-current-unknown" cx="32" cy="32" r="23"/><path class="mha-weather-current-question" d="M24.5 25c.9-4.8 4.4-7.6 9.3-7.6 5.2 0 8.6 3.2 8.6 7.5 0 6.8-8 6.5-8 13.3"/><circle class="mha-weather-current-question-dot" cx="34" cy="47.5" r="2.7"/>`;
  }
}

export function createCurrentWeatherIcon(condition = "unknown", { className = "", label } = {}) {
  const kind = normalizeWeatherCondition(condition);
  const el = document.createElement("span");
  el.className = ["mha-weather-current-icon", `mha-weather-current-icon--${kind}`, className].filter(Boolean).join(" ");
  el.dataset.weatherCondition = kind;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label || getWeatherIconLabel(kind));
  el.innerHTML = `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      ${currentSvg(kind)}
    </svg>`;
  return el;
}
