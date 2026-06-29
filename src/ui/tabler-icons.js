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
  bulb: defineTablerIcon([
    "M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7",
    "M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3",
    "M9.7 17l4.6 0",
  ]),
  temperature: defineTablerIcon([
    "M10 13.5a4 4 0 1 0 4 0v-8.5a2 2 0 0 0 -4 0v8.5",
    "M10 9l4 0",
  ]),
  shield: defineTablerIcon([
    "M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3",
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
  light: "bulb",
  temperature: "temperature",
  shield: "shield",
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
