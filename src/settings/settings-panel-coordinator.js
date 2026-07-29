import { createSettingsPanel, updateSettingsPanel } from "./settings-panel.js";
import {
  buildSettingsPanelState,
  resolveEffectiveIconShape,
} from "./settings-panel-props.js";
import { appendAdvancedSettingsControls } from "./advanced-settings-control.js";
import { appendLayoutModeControl } from "./layout-mode-control.js";
import { replaceSettingsPanelPreservingUiState } from "./settings-panel-orchestrator.js";

export function buildSettingsCoordinatorProps({
  settingsOpen = false,
  screensaverSettingsOpen = false,
  language = "auto",
  hideHaSidebar = false,
  showDockLabels = false,
  statusBarMode = "top-bar",
  accentPaletteExpanded = false,
  settingsPage = "main",
  dockPages = [],
  activeDockPageId = "",
  selectedDockPageId = "",
  dockPosition = "left",
  isMobileLayout = false,
  isMobileLandscape = false,
  customWallpapers = {},
  gridWallpaper = {},
  weatherLandscapeId = "alpine-lake",
  hass = null,
  entityVisibilityConfig = null,
  themeState = {},
  screensaverState = {},
  hostIconShape = "",
  documentIconShape = "",
  supportsScreensaver = true,
  supportsDockPosition = true,
  supportsSidebarToggle = true,
  showsStatusBarOptions = true,
  callbacks = {},
} = {}) {
  const effectiveIconShape = resolveEffectiveIconShape({
    hostIconShape,
    documentIconShape,
    themeIconShape: themeState.iconShape,
  });

  const buildProps = (scope) => ({
    ...buildSettingsPanelState({
      scope,
      settingsOpen,
      screensaverSettingsOpen,
      language,
      hideHaSidebar,
      showDockLabels,
      statusBarMode,
      accentPaletteExpanded,
      settingsPage,
      dockPages,
      activeDockPageId,
      selectedDockPageId,
      dockPosition,
      isMobileLayout,
      isMobileLandscape,
      customWallpapers,
      gridWallpaper,
      weatherLandscapeId,
      hass,
      entityVisibilityConfig,
      themeState,
      screensaverState,
      effectiveIconShape,
      supportsScreensaver,
      supportsDockPosition,
      supportsSidebarToggle,
      showsStatusBarOptions,
    }),
    ...callbacks,
    onClose: scope === "screensaver"
      ? callbacks.onCloseScreensaver
      : callbacks.onClose,
  });

  return {
    all: buildProps("all"),
    screensaver: buildProps("screensaver"),
  };
}

function decorateSettingsPanel(panel, props = {}) {
  return appendAdvancedSettingsControls(
    appendLayoutModeControl(panel),
    props,
  );
}

export function syncSettingsPanels({
  root,
  props = {},
  createPanel = createSettingsPanel,
  updatePanel = updateSettingsPanel,
} = {}) {
  const existingAll = root?.querySelector?.('.mha-settings-panel[data-settings-scope="all"]');
  const all = props.all?.open || existingAll
    ? replaceSettingsPanelPreservingUiState({
      root,
      existing: existingAll,
      next: decorateSettingsPanel(createPanel(props.all), props.all),
      updatePanel,
    })
    : null;

  const existingScreensaver = root?.querySelector?.('.mha-settings-panel[data-settings-scope="screensaver"]');
  const screensaver = props.screensaver?.open || existingScreensaver
    ? replaceSettingsPanelPreservingUiState({
      root,
      existing: existingScreensaver,
      next: appendLayoutModeControl(createPanel(props.screensaver)),
      updatePanel,
    })
    : null;

  return { all, screensaver };
}
