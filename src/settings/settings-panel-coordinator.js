import { createSettingsPanel, updateSettingsPanel } from "./settings-panel.js";
import {
  buildSettingsPanelState,
  resolveEffectiveIconShape,
} from "./settings-panel-props.js";
import { replaceSettingsPanelPreservingUiState } from "./settings-panel-orchestrator.js";

export function buildSettingsCoordinatorProps({
  settingsOpen = false,
  screensaverSettingsOpen = false,
  language = "auto",
  hideHaSidebar = false,
  accentPaletteExpanded = false,
  settingsPage = "main",
  dockPages = [],
  activeDockPageId = "",
  selectedDockPageId = "",
  dockPosition = "left",
  customWallpapers = {},
  hass = null,
  entityVisibilityConfig = null,
  themeState = {},
  screensaverState = {},
  hostIconShape = "",
  documentIconShape = "",
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
      accentPaletteExpanded,
      settingsPage,
      dockPages,
      activeDockPageId,
      selectedDockPageId,
      dockPosition,
      customWallpapers,
      hass,
      entityVisibilityConfig,
      themeState,
      screensaverState,
      effectiveIconShape,
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

export function syncSettingsPanels({
  root,
  props = {},
  createPanel = createSettingsPanel,
  updatePanel = updateSettingsPanel,
} = {}) {
  const all = replaceSettingsPanelPreservingUiState({
    root,
    existing: root?.querySelector?.('.mha-settings-panel[data-settings-scope="all"]'),
    next: createPanel(props.all),
    updatePanel,
  });

  const screensaver = replaceSettingsPanelPreservingUiState({
    root,
    existing: root?.querySelector?.('.mha-settings-panel[data-settings-scope="screensaver"]'),
    next: createPanel(props.screensaver),
    updatePanel,
  });

  return { all, screensaver };
}
