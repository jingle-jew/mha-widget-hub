/*
 * Minimal Tabler icon provider for MHA.
 *
 * We vendor only the first curated subset we actually want to use so:
 * - no CDN is required;
 * - no runtime Home Assistant icon dependency is introduced;
 * - the bundle does not ship the full Tabler catalog.
 *
 * Source: Tabler Icons (MIT) https://github.com/tabler/tabler-icons
 */

function defineTablerIcon(paths = []) {
  return Object.freeze({
    provider: "tabler",
    renderMode: "stroke",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
    paths: Object.freeze([...paths]),
  });
}

export const TABLER_ICON_REGISTRY = Object.freeze({
  home: defineTablerIcon([
    "M5 12l-2 0l9 -9l9 9l-2 0",
    "M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7",
    "M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6",
  ]),
  apps: defineTablerIcon([
    "M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
    "M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
    "M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
    "M14 7l6 0",
    "M17 4l0 6",
  ]),
  clock: defineTablerIcon([
    "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0",
    "M12 7v5l3 3",
  ]),
  coffee: defineTablerIcon([
    "M3 8h13v8a4 4 0 0 1 -4 4h-5a4 4 0 0 1 -4 -4v-8z",
    "M16 10h1a3 3 0 0 1 0 6h-1",
    "M6 3v1",
    "M10 3v1",
    "M14 3v1",
  ]),
  "device-tv": defineTablerIcon([
    "M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -9",
    "M16 3l-4 4l-4 -4",
  ]),
  bulb: defineTablerIcon([
    "M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7",
    "M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3",
    "M9.7 17l4.6 0",
  ]),
  lamp: defineTablerIcon([
    "M9 20h6",
    "M12 20v-8",
    "M5 12h14l-4 -8h-6l-4 8",
  ]),
  temperature: defineTablerIcon([
    "M10 13.5a4 4 0 1 0 4 0v-8.5a2 2 0 0 0 -4 0v8.5",
    "M10 9l4 0",
  ]),
  flame: defineTablerIcon([
    "M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235",
  ]),
  snowflake: defineTablerIcon([
    "M10 4l2 1l2 -1",
    "M12 2v6.5l3 1.72",
    "M17.928 6.268l.134 2.232l1.866 1.232",
    "M20.66 7l-5.629 3.25l.01 3.458",
    "M19.928 14.268l-1.866 1.232l-.134 2.232",
    "M20.66 17l-5.629 -3.25l-2.99 1.738",
    "M14 20l-2 -1l-2 1",
    "M12 22v-6.5l-3 -1.72",
    "M6.072 17.732l-.134 -2.232l-1.866 -1.232",
    "M3.34 17l5.629 -3.25l-.01 -3.458",
    "M4.072 9.732l1.866 -1.232l.134 -2.232",
    "M3.34 7l5.629 3.25l2.99 -1.738",
  ]),
  propeller: defineTablerIcon([
    "M9 13a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M14.167 10.5c.722 -1.538 1.156 -3.043 1.303 -4.514c.22 -1.63 -.762 -2.986 -3.47 -2.986s-3.69 1.357 -3.47 2.986c.147 1.471 .581 2.976 1.303 4.514",
    "M13.169 16.751c.97 1.395 2.057 2.523 3.257 3.386c1.3 1 2.967 .833 4.321 -1.512c1.354 -2.345 .67 -3.874 -.85 -4.498c-1.348 -.608 -2.868 -.985 -4.562 -1.128",
    "M8.664 13c-1.693 .143 -3.213 .52 -4.56 1.128c-1.522 .623 -2.206 2.153 -.852 4.498s3.02 2.517 4.321 1.512c1.2 -.863 2.287 -1.991 3.258 -3.386",
  ]),
  shield: defineTablerIcon([
    "M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3",
  ]),
  door: defineTablerIcon([
    "M14 12v.01",
    "M3 21h18",
    "M6 21v-16a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v16",
  ]),
  lock: defineTablerIcon([
    "M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6",
    "M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0",
    "M8 11v-4a4 4 0 1 1 8 0v4",
  ]),
  music: defineTablerIcon([
    "M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
    "M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
    "M9 17v-13h10v13",
    "M9 8h10",
  ]),
  camera: defineTablerIcon([
    "M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2",
    "M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
  ]),
  plug: defineTablerIcon([
    "M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215l2.054 -2.054",
    "M4 20l3.5 -3.5",
    "M15 4l-3.5 3.5",
    "M20 9l-3.5 3.5",
  ]),
  power: defineTablerIcon([
    "M7 6a7.75 7.75 0 1 0 10 0",
    "M12 4l0 8",
  ]),
  movie: defineTablerIcon([
    "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12",
    "M8 4l0 16",
    "M16 4l0 16",
    "M4 8l4 0",
    "M4 16l4 0",
    "M4 12l16 0",
    "M16 8l4 0",
    "M16 16l4 0",
  ]),
  "layout-grid": defineTablerIcon([
    "M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
    "M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
    "M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
    "M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
  ]),
  settings: defineTablerIcon([
    "M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065",
    "M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
  ]),
  plus: defineTablerIcon([
    "M12 5l0 14",
    "M5 12l14 0",
  ]),
  x: defineTablerIcon([
    "M18 6l-12 12",
    "M6 6l12 12",
  ]),
  pencil: defineTablerIcon([
    "M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4",
    "M13.5 6.5l4 4",
  ]),
  trash: defineTablerIcon([
    "M4 7l16 0",
    "M10 11l0 6",
    "M14 11l0 6",
    "M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12",
    "M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3",
  ]),
  check: defineTablerIcon([
    "M5 12l5 5l10 -10",
  ]),
  "device-speaker": defineTablerIcon([
    "M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14",
    "M9 14a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M12 7l0 .01",
  ]),
  "player-play": defineTablerIcon([
    "M7 4v16l13 -8l-13 -8",
  ]),
  "player-pause": defineTablerIcon([
    "M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12",
    "M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12",
  ]),
  "player-skip-back": defineTablerIcon([
    "M20 5v14l-12 -7l12 -7",
    "M4 5l0 14",
  ]),
  "player-skip-forward": defineTablerIcon([
    "M4 5v14l12 -7l-12 -7",
    "M20 5l0 14",
  ]),
  volume: defineTablerIcon([
    "M15 8a5 5 0 0 1 0 8",
    "M17.7 5a9 9 0 0 1 0 14",
    "M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5",
  ]),
  "volume-off": defineTablerIcon([
    "M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464",
    "M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615",
    "M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664",
    "M3 3l18 18",
  ]),
  minus: defineTablerIcon([
    "M5 12l14 0",
  ]),
  search: defineTablerIcon([
    "M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0",
    "M21 21l-6 -6",
  ]),
  palette: defineTablerIcon([
    "M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25",
    "M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
  ]),
  photo: defineTablerIcon([
    "M15 8h.01",
    "M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12",
    "M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5",
    "M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3",
  ]),
  sun: defineTablerIcon([
    "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
    "M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7",
  ]),
  moon: defineTablerIcon([
    "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008",
  ]),
});

export const MHA_TABLER_ICON_REGISTRY = Object.freeze({
  home: "home",
  apps: "apps",
  clock: "clock",
  coffee: "coffee",
  tv: "device-tv",
  light: "bulb",
  lamp: "lamp",
  temperature: "temperature",
  flame: "flame",
  snowflake: "snowflake",
  fan: "propeller",
  shield: "shield",
  door: "door",
  lock: "lock",
  music: "music",
  camera: "camera",
  plug: "plug",
  power: "power",
  movie: "movie",
  grid: "layout-grid",
  settings: "settings",
  gear: "settings",
  plus: "plus",
  close: "x",
  edit: "pencil",
  trash: "trash",
  check: "check",
  "media-player": "device-speaker",
  play: "player-play",
  pause: "player-pause",
  previous: "player-skip-back",
  next: "player-skip-forward",
  volume: "volume",
  "volume-off": "volume-off",
  minus: "minus",
  search: "search",
  palette: "palette",
  image: "photo",
  sun: "sun",
  moon: "moon",
});

export function getTablerIcon(name = "") {
  return TABLER_ICON_REGISTRY[name] || null;
}

export function resolveTablerIconForMhaName(name = "") {
  const tablerName = MHA_TABLER_ICON_REGISTRY[name];
  const icon = getTablerIcon(tablerName);

  if (!icon) return null;

  return Object.freeze({
    ...icon,
    name: tablerName,
  });
}
