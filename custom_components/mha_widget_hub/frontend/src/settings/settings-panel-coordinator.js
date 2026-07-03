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
  const all = replaceSettingsPanelPreservingUiState({
    root,
    existing: root?.querySelector?.('.mha-settings-panel[data-settings-scope="all"]'),
    next: decorateSettingsPanel(createPanel(props.all), props.all),
    updatePanel,
  });

  const screensaver = replaceSettingsPanelPreservingUiState({
    root,
    existing: root?.querySelector?.('.mha-settings-panel[data-settings-scope="screensaver"]'),
    next: appendLayoutModeControl(createPanel(props.screensaver)),
    updatePanel,
  });

  return { all, screensaver };
}
