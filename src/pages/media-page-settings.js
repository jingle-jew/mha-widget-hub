import {
  getAvailableMediaPlayers,
  resolveEnabledMediaPlayerIds,
} from "../ha/media-players.js?v=media-persistence-v2";
import { t } from "../i18n/index.js";
import { createPanelShell } from "../panels/panel-shell.js";
import { syncPanelVisibility } from "../panels/panel-visibility-controller.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { createMhaCheckbox, createMhaSelect } from "../ui/form-controls.js";
import { SETTINGS_PANEL_VISIBILITY_TRANSITION_MS } from "../panels/panel-transition-timing.js";
import { replaceSettingsPanelPreservingUiState } from "../settings/settings-panel-orchestrator.js";
import {
  applyWidgetSurfaceHostLayoutState,
  syncWidgetSurfaceOpenState,
} from "../widgets/widget-placement-orchestrator.js";

function syncDataset(target, source) {
  if (!target?.dataset || !source?.dataset) return;
  Object.keys(target.dataset).forEach((key) => {
    if (key === "open" || key === "panelCloseState") return;
    if (!(key in source.dataset)) delete target.dataset[key];
  });
  Object.entries(source.dataset).forEach(([key, value]) => {
    if (key === "open" || key === "panelCloseState") return;
    target.dataset[key] = value;
  });
}

function updateMediaPageSettingsPanel(existing, next) {
  if (!existing || !next) return false;
  syncDataset(existing, next);
  const existingSheet = existing.querySelector(".mha-media-page-settings-sheet");
  const nextSheet = next.querySelector(".mha-media-page-settings-sheet");
  const existingScrim = existing.querySelector(".mha-media-page-settings-scrim");
  const nextScrim = next.querySelector(".mha-media-page-settings-scrim");
  if (!existingSheet || !nextSheet || !existingScrim || !nextScrim) return false;
  existingScrim.replaceWith(nextScrim);
  existingSheet.replaceChildren(...nextSheet.childNodes);
  return true;
}

function createCheckboxRow({
  label,
  checked = false,
  controlId = "",
  onChange = () => {},
} = {}) {
  const row = createMhaCheckbox({
    label,
    checked,
    indicatorPlacement: "end",
    className: "mha-settings-checkbox mha-media-page-settings-checkbox",
    inputClassName: "mha-settings-checkbox-input",
    labelClassName: "mha-settings-label",
    onChange,
  });
  const input = row.querySelector(".mha-settings-checkbox-input");
  if (controlId && input) input.dataset.settingsControl = controlId;
  if (input) input.dataset.settingsValueControl = "true";
  return row;
}

function createSelectField({
  label,
  value = "",
  options = [],
  controlId = "",
  onChange = () => {},
} = {}) {
  const field = document.createElement("div");
  field.className = "mha-settings-field mha-media-page-settings-field";

  const text = document.createElement("span");
  text.className = "mha-settings-label mha-media-page-settings-field-label";
  text.textContent = label;

  const control = createMhaSelect({
    label,
    value,
    options,
    className: "mha-media-page-settings-select-control",
    triggerClassName: "mha-settings-select mha-media-page-settings-select",
    onChange,
  });
  const select = control.querySelector(".mha-select-native");
  const trigger = control.querySelector(".mha-select-trigger");
  if (controlId) {
    if (select) select.dataset.settingsControl = controlId;
    if (trigger) trigger.dataset.settingsControl = controlId;
  }
  if (select) select.dataset.settingsValueControl = "true";

  field.append(text, control);
  return field;
}

function createSection(title, children = []) {
  const section = document.createElement("section");
  section.className = "mha-settings-section mha-media-page-settings-section";

  const heading = document.createElement("h3");
  heading.className = "mha-settings-section-title mha-media-page-settings-section-title";
  heading.textContent = title;
  section.append(heading, ...children);
  return section;
}

export function createMediaPageSettingsPanel({
  open = false,
  page = null,
  hass = null,
  visibilityConfig = null,
  onClose = () => {},
  onConfigChange = () => {},
} = {}) {
  const availablePlayers = getAvailableMediaPlayers(hass, visibilityConfig);
  const enabledPlayerIds = resolveEnabledMediaPlayerIds(page?.config, availablePlayers);
  const enabledSet = new Set(enabledPlayerIds);
  const buildConfigPatch = (patch = {}) => ({
    enabledPlayerIds: [...enabledPlayerIds],
    enabledPlayerIdsConfigured: true,
    ...patch,
  });

  const root = applyPanelSurfaceContract(createPanelShell({
    open,
    rootClassName: "mha-settings-panel mha-media-page-settings-panel",
    scrimClassName: "mha-settings-scrim mha-media-page-settings-scrim",
    sheetClassName: "mha-settings-sheet mha-media-page-settings-sheet",
    headerClassName: "mha-settings-header mha-media-page-settings-header",
    closeClassName: "mha-settings-close mha-media-page-settings-close",
    title: t("mediaPage.settingsTitle", "Media page settings"),
    ariaLabel: t("mediaPage.settingsTitle", "Media page settings"),
    closeLabel: t("common.close", "Close"),
    scrimLabel: t("mediaPage.closeSettings", "Close media page settings"),
    onClose,
  }), {
    surfaceRole: PANEL_SURFACE_ROLES.PANEL,
    mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
  });
  root.dataset.settingsScope = "media-page";
  root.dataset.settingsPage = "main";

  root.hidden = !open;

  const body = document.createElement("div");
  body.className = "mha-settings-body mha-media-page-settings-body";

  const playerRows = availablePlayers.length
    ? availablePlayers.map((player) => createCheckboxRow({
      label: player.name,
      checked: enabledSet.has(player.entity_id),
      controlId: `media-player:${player.entity_id}`,
      onChange: (checked) => {
        const nextEnabled = checked
          ? [...new Set([...enabledPlayerIds, player.entity_id])]
          : enabledPlayerIds.filter(id => id !== player.entity_id);
        onConfigChange({
          enabledPlayerIds: nextEnabled,
          enabledPlayerIdsConfigured: true,
        });
      },
    }))
    : [createEmptyState(t("mediaPage.noPlayersAvailable", "No media players available"))];

  body.append(
    createSection(t("mediaPage.availablePlayers", "Available players"), playerRows),
    createSection(t("mediaPage.defaultPlayer", "Default player"), [
      createSelectField({
        label: t("mediaPage.defaultPlayer", "Default player"),
        value: page?.config?.defaultPlayerId || "",
        controlId: "default-player",
        options: [
          { value: "", label: t("mediaPage.autoPlayerFallback", "Automatic fallback") },
          ...availablePlayers
            .filter(player => enabledSet.has(player.entity_id))
            .map(player => ({ value: player.entity_id, label: player.name })),
        ],
        onChange: value => onConfigChange(buildConfigPatch({ defaultPlayerId: value })),
      }),
    ]),
    createSection(t("mediaPage.appearance", "Appearance"), [
      createCheckboxRow({
        label: t("mediaPage.blurBackground", "Blur artwork in the background"),
        checked: page?.config?.blurBackground !== false,
        controlId: "blur-background",
        onChange: checked => onConfigChange(buildConfigPatch({ blurBackground: checked })),
      }),
    ]),
  );

  root.querySelector(".mha-settings-sheet")?.append(body);
  return root;
}

function createEmptyState(text = "") {
  const node = document.createElement("p");
  node.className = "mha-settings-description mha-media-page-settings-empty";
  node.textContent = text;
  return node;
}

export function syncMediaPageSettingsPanel(root, props = {}) {
  const existing = root?.querySelector?.(".mha-media-page-settings-panel") || null;
  const next = applyWidgetSurfaceHostLayoutState(root, createMediaPageSettingsPanel(props));
  const panel = replaceSettingsPanelPreservingUiState({
    root,
    existing,
    next,
    updatePanel: updateMediaPageSettingsPanel,
  });
  syncPanelVisibility(panel, Boolean(props.open), {
    transitionMs: SETTINGS_PANEL_VISIBILITY_TRANSITION_MS,
    closeStateDatasetKey: "panelCloseState",
  });
  syncWidgetSurfaceOpenState(root);
  return panel;
}
