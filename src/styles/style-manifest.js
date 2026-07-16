import { getThemeCssPaths, getThemeDockCssPaths } from "../settings/theme-registry.js";
import { WIDGET_REGISTRY } from "../widgets/widget-registry.js";

const entry = (path, layer) => Object.freeze([path, layer]);

const STATIC_STYLE_MANIFEST_BEFORE_THEMES = Object.freeze([
  entry("styles/core/base.css", "base"),
  entry("styles/core/tokens.css", "tokens"),
  entry("styles/components/icon.css", "component"),
  entry("styles/components/icon-symbol.css", "component"),
  entry("styles/components/slider.css", "component"),
  entry("styles/components/toggle.css", "component"),
  entry("styles/components/form-controls.css", "component"),
  entry("styles/components/pill.css", "component"),
  entry("styles/components/button.css", "component"),
  entry("styles/components/icon-picker.css", "component"),
  entry("styles/system/system-buttons.css", "component"),
]);

const STATIC_STYLE_MANIFEST_AFTER_THEMES = Object.freeze([
  entry("styles/themes/accent-palettes.css", "theme"),
  entry("styles/themes/semantic-tokens.css", "theme"),
  entry("styles/core/surface-contract/aliases.css", "theme"),
  entry("styles/themes/ios-raw-materials.css", "theme"),
  entry("styles/themes/ios-surface-map.css", "theme"),
  entry("styles/core/glass-surface.css", "structure"),
  entry("styles/core/background.css", "structure"),
  entry("styles/core/android-edge-to-edge.css", "structure"),
  entry("styles/layout/shell.css", "structure"),
  entry("styles/layout/widget-grid.css", "structure"),
  entry("styles/layout/layout-scale-contract.css", "structure"),
  entry("styles/layout/status-bar.css", "structure"),
  entry("styles/layout/status-bar-glass-override.css", "structure"),
  entry("styles/layout/status-bar-contract.css", "structure"),
  entry("styles/layout/dock.css", "structure"),
  entry("styles/layout/dock-contract.css", "structure"),
  entry("styles/layout/mobile-dock.css", "structure"),
  entry("styles/layout/mobile-dock-contract.css", "structure"),
  entry("styles/layout/floating-controls.css", "structure"),
  entry("styles/layout/floating-controls-contract.css", "structure"),
  entry("styles/layout/dock-glyph-stability.css", "structure"),
  entry("styles/layout/frame-alignment.css", "structure"),
  entry("styles/pages/media-page.css", "component"),
  entry("styles/pages/weather-page.css", "component"),
  entry("styles/settings/settings-panel.css", "component"),
  entry("styles/settings/settings-panel-contract.css", "component"),
  entry("styles/settings/settings-section-contract.css", "component"),
  entry("styles/widget-manager/widget-manager.css", "component"),
  entry("styles/widget-manager/widget-manager-contract.css", "component"),
  entry("styles/widget-manager/widget-config-popup.css", "component"),
  entry("styles/widget-manager/widget-config-popup-contract.css", "component"),
  entry("styles/widget-manager/widget-surface-backdrop.css", "component"),
  entry("styles/widget-manager/widget-surface-layer-contract.css", "component"),
  entry("styles/panels/panel-surface-contract.css", "component"),
  entry("styles/panels/panel-material-contract.css", "component"),
  entry("styles/panels/panel-frame-alignment.css", "component"),
  entry("styles/panels/page-creator.css", "component"),
  entry("styles/panels/page-creator-sheet.css", "component"),
  entry("styles/panels/page-creator-bottom.css", "component"),
  entry("styles/panels/page-creator-contract.css", "component"),
  entry("styles/panels/page-creator-popup-center.css", "component"),
  entry("styles/settings/settings-bottom.css", "component"),
  entry("styles/themes/light-text-contract.css", "theme"),
  entry("styles/widgets/widget-layout.css", "structure"),
  entry("styles/layout/layout-density-breakpoints.css", "structure"),
  entry("styles/widgets/widget-shell.css", "structure"),
  entry("styles/widgets/widget-drag.css", "structure"),
  entry("styles/widgets/widget-shell-contract.css", "structure"),
  entry("styles/widgets/widget-internals-contract.css", "structure"),
]);

const STATIC_STYLE_MANIFEST_AFTER_WIDGETS = Object.freeze([
  entry("styles/widgets/weather-detail-chips.css", "component"),
  entry("styles/widgets/widget-control-internals-contract.css", "component"),
  entry("styles/widgets/widget-slider-internals-contract.css", "component"),
  entry("styles/widgets/widget-media-internals-contract.css", "component"),
  entry("styles/widgets/widget-scenes-internals-contract.css", "component"),
  entry("styles/screensaver/screensaver.css", "component"),
  entry("styles/screensaver/screensaver-contract.css", "component"),
  entry("styles/screensaver/screensaver-clock.css", "component"),
  entry("styles/screensaver/screensaver-hotcorner.css", "component"),
]);

const WIDGET_CSS_ORDER = Object.freeze([
  "slider",
  "clock",
  "button",
  "toggle",
  "toggle-slider",
  "toggle-buttons",
  "weather",
  "weather-narrative",
  "weather-radar",
  "media",
]);

function uniqueEntries(entries = []) {
  const seen = new Set();
  return entries.filter(([path]) => {
    if (!path || seen.has(path)) return false;
    seen.add(path);
    return true;
  });
}

export function getThemeStyleManifestEntries() {
  return getThemeCssPaths().map((path) => entry(path, "theme"));
}

export function getThemeDockStyleManifestEntries() {
  return getThemeDockCssPaths().map((path) => entry(path, "theme"));
}

export function getWidgetStyleManifestEntries() {
  const orderedDefinitions = [
    ...WIDGET_CSS_ORDER.map((kind) => WIDGET_REGISTRY[kind]).filter(Boolean),
    ...Object.values(WIDGET_REGISTRY).filter((definition) => !WIDGET_CSS_ORDER.includes(definition.kind)),
  ];

  return uniqueEntries(
    orderedDefinitions.flatMap((definition) => (definition.css || []).map((path) => entry(path, "component"))),
  );
}

export function getStyleManifest() {
  return uniqueEntries([
    ...STATIC_STYLE_MANIFEST_BEFORE_THEMES,
    ...getThemeStyleManifestEntries(),
    ...STATIC_STYLE_MANIFEST_AFTER_THEMES,
    ...getThemeDockStyleManifestEntries(),
    ...getWidgetStyleManifestEntries(),
    ...STATIC_STYLE_MANIFEST_AFTER_WIDGETS,
  ]);
}
