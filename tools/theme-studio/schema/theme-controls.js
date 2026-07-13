const control = (definition) => Object.freeze({
  category: "general",
  control: "text",
  mode: "shared",
  readOnly: false,
  themes: [],
  ...definition,
});

const common = (theme, selector) => [
  control({ id: "radius.widget", token: "--mha-widget-radius", label: "Widget radius", description: "Rayon principal des widgets.", category: "rayons", control: "range", min: 0, max: 64, step: 1, unit: "px", themes: [theme], file: `styles/themes/${theme}.css`, selector }),
  control({ id: "radius.control", token: "--mha-control-radius", label: "Control radius", description: "Rayon des boutons, toggles et contrôles internes.", category: "rayons", control: "range", min: 0, max: 999, step: 1, unit: "px", themes: [theme], file: `styles/themes/${theme}.css`, selector }),
  control({ id: "radius.dock", token: "--mha-dock-radius", label: "Dock radius", description: "Rayon de la surface du dock.", category: "dock", control: "range", min: 0, max: 64, step: 1, unit: "px", themes: [theme], file: `styles/themes/${theme}.css`, selector }),
  control({ id: "glass.blur", token: "--mha-surface-blur", label: "Surface blur", description: "Intensité du flou appliqué derrière les surfaces.", category: "blur", control: "range", min: 0, max: 40, step: 1, unit: "px", themes: [theme], file: `styles/themes/${theme}.css`, selector }),
  control({ id: "glass.saturation", token: "--mha-surface-saturation", label: "Saturation", description: "Saturation appliquée au matériau de surface.", category: "saturation", control: "range", min: 80, max: 220, step: 1, unit: "%", themes: [theme], file: `styles/themes/${theme}.css`, selector }),
  control({ id: "grain.opacity", token: "--mha-glass-noise-opacity", label: "Grain opacity", description: "Opacité du grain optique.", category: "grain", control: "range", min: 0, max: 1, step: 0.001, unit: "", themes: [theme], file: `styles/themes/${theme}.css`, selector }),
  control({ id: "grain.blend", token: "--mha-glass-noise-blend-mode", label: "Grain blend mode", description: "Mode de fusion du grain.", category: "grain", control: "select", options: ["soft-light", "overlay", "multiply", "screen", "normal"], themes: [theme], file: `styles/themes/${theme}.css`, selector }),
];

const modeColor = (theme, selector, id, token, label, category = "couleurs", file = `styles/themes/${theme}.css`) => control({
  id, token, label, description: `${label} du thème en mode actif.`, category, control: "color-alpha", mode: id.endsWith(".light") ? "light" : "dark", themes: [theme], file, selector,
});

const controls = [
  ...common("ios", ':host([data-theme-style="ios"])').filter(item => !["glass.blur", "glass.saturation", "grain.opacity", "grain.blend"].includes(item.id)),
  control({ id: "ios.glass.grain", token: "--mha-glass-noise-opacity", label: "Grain opacity", description: "Opacité du grain optique iOS.", category: "grain", control: "range", min: 0, max: 1, step: 0.001, unit: "", themes: ["ios"], file: "styles/themes/ios-raw-materials.css", selector: ':host([data-theme-style="ios"][data-ios-glass="liquid"])' }),
  control({ id: "ios.glass.blend", token: "--mha-glass-noise-blend-mode", label: "Grain blend mode", description: "Mode de fusion du grain iOS.", category: "grain", control: "select", options: ["soft-light", "overlay", "multiply", "screen", "normal"], themes: ["ios"], file: "styles/themes/ios-raw-materials.css", selector: ':host([data-theme-style="ios"][data-ios-glass="liquid"])' }),
  control({ id: "ios.shell.blur", token: "--mha-ios-raw-liquid-shell-blur", label: "Shell blur", description: "Flou de la coque iOS Liquid Glass.", category: "blur", control: "range", min: 0, max: 40, step: 1, unit: "px", themes: ["ios"], file: "styles/themes/ios-raw-materials.css", selector: ':host([data-theme-style="ios"][data-ios-glass="liquid"])' }),
  control({ id: "ios.shell.saturation", token: "--mha-ios-raw-liquid-shell-saturation", label: "Shell saturation", description: "Saturation de la coque iOS Liquid Glass.", category: "saturation", control: "range", min: 80, max: 240, step: 1, unit: "%", themes: ["ios"], file: "styles/themes/ios-raw-materials.css", selector: ':host([data-theme-style="ios"][data-ios-glass="liquid"])' }),
  control({ id: "ios.reflection.opacity", token: "--mha-ios-raw-liquid-shell-highlight-opacity", label: "Reflection opacity", description: "Intensité du reflet de surface iOS.", category: "reflets", control: "range", min: 0, max: 1, step: 0.01, unit: "", themes: ["ios"], file: "styles/themes/ios-raw-materials.css", selector: ':host([data-theme-style="ios"][data-ios-glass="liquid"])' }),
  control({ id: "ios.grain.opacity", token: "--mha-glass-noise-opacity", label: "Liquid grain opacity", description: "Grain du matériau Liquid Glass.", category: "grain", control: "range", min: 0, max: 1, step: 0.001, unit: "", themes: ["ios"], file: "styles/themes/ios-raw-materials.css", selector: ':host([data-theme-style="ios"][data-ios-glass="liquid"])' }),
  modeColor("ios", ':host([data-theme-style="ios"][data-ios-glass="liquid"][data-theme="light"])', "ios.surface.light", "--mha-ios-raw-liquid-primary-surface", "Light primary surface", "surfaces", "styles/themes/ios-raw-materials.css"),
  modeColor("ios", ':host([data-theme-style="ios"][data-ios-glass="liquid"][data-theme="dark"])', "ios.surface.dark", "--mha-ios-raw-liquid-primary-surface", "Dark primary surface", "surfaces", "styles/themes/ios-raw-materials.css"),
  modeColor("ios", ':host([data-theme-style="ios"][data-ios-glass="liquid"][data-theme="light"])', "ios.border.light", "--mha-ios-raw-liquid-primary-border", "Light primary border", "bordures", "styles/themes/ios-raw-materials.css"),
  modeColor("ios", ':host([data-theme-style="ios"][data-ios-glass="liquid"][data-theme="dark"])', "ios.border.dark", "--mha-ios-raw-liquid-primary-border", "Dark primary border", "bordures", "styles/themes/ios-raw-materials.css"),
  ...common("oneui", ':host([data-theme-style="oneui"])'),
  modeColor("oneui", ':host([data-theme-style="oneui"][data-theme="light"])', "oneui.text.light", "--mha-text", "Light primary text"),
  modeColor("oneui", ':host([data-theme-style="oneui"][data-theme="dark"])', "oneui.text.dark", "--mha-text", "Dark primary text"),
  modeColor("oneui", ':host([data-theme-style="oneui"][data-theme="light"])', "oneui.widget.border.light", "--mha-widget-border", "Light widget border", "bordures"),
  modeColor("oneui", ':host([data-theme-style="oneui"][data-theme="dark"])', "oneui.widget.border.dark", "--mha-widget-border", "Dark widget border", "bordures"),
  ...common("material", ':host([data-theme-style="material"])'),
  modeColor("material", ':host([data-theme-style="material"][data-theme="light"])', "material.surface.light", "--mha-material-surface", "Light Material surface", "surfaces"),
  modeColor("material", ':host([data-theme-style="material"][data-theme="dark"])', "material.surface.dark", "--mha-material-surface", "Dark Material surface", "surfaces"),
  modeColor("material", ':host([data-theme-style="material"][data-theme="light"])', "material.onSurface.light", "--mha-material-on-surface", "Light Material text"),
  modeColor("material", ':host([data-theme-style="material"][data-theme="dark"])', "material.onSurface.dark", "--mha-material-on-surface", "Dark Material text"),
];

export const THEME_STUDIO_SCHEMA_VERSION = 1;
export const THEME_CONTROLS = Object.freeze(controls);

export function getControlsForTheme(themeId) {
  return THEME_CONTROLS.filter(({ themes }) => themes.includes(themeId));
}

export function getControlById(themeId, id) {
  return getControlsForTheme(themeId).find(controlDefinition => controlDefinition.id === id) || null;
}
