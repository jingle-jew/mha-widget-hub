import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { t } from "../i18n/index.js";
import { createPanelShell } from "../panels/panel-shell.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { getMediaPageVisualStyleOptions } from "./page-types.js";

function createCheckboxRow({ label, checked = false, onChange = () => {} } = {}) {
  const labelNode = document.createElement("label");
  labelNode.className = "mha-media-page-settings-checkbox";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.addEventListener("change", () => onChange(input.checked));

  const text = document.createElement("span");
  text.textContent = label;
  labelNode.append(input, text);
  return labelNode;
}

function createSelectField({ label, value = "", options = [], onChange = () => {} } = {}) {
  const field = document.createElement("label");
  field.className = "mha-media-page-settings-field";

  const text = document.createElement("span");
  text.className = "mha-media-page-settings-field-label";
  text.textContent = label;

  const select = document.createElement("select");
  select.className = "mha-media-page-settings-select";
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));

  options.forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    select.append(node);
  });

  field.append(text, select);
  return field;
}

function createSection(title, children = []) {
  const section = document.createElement("section");
  section.className = "mha-media-page-settings-section";

  const heading = document.createElement("h3");
  heading.className = "mha-media-page-settings-section-title";
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
  const availablePlayers = getEntitiesForDomain(hass, "media_player", visibilityConfig);
  const enabledPlayerIds = Array.isArray(page?.config?.enabledPlayerIds) && page.config.enabledPlayerIds.length
    ? page.config.enabledPlayerIds
    : availablePlayers.map(player => player.entity_id);
  const enabledSet = new Set(enabledPlayerIds);

  const root = applyPanelSurfaceContract(createPanelShell({
    open,
    rootClassName: "mha-media-page-settings-panel",
    scrimClassName: "mha-media-page-settings-scrim",
    sheetClassName: "mha-media-page-settings-sheet",
    headerClassName: "mha-media-page-settings-header",
    closeClassName: "mha-media-page-settings-close",
    title: t("mediaPage.settingsTitle", "Media page settings"),
    ariaLabel: t("mediaPage.settingsTitle", "Media page settings"),
    closeLabel: t("common.close", "Close"),
    scrimLabel: t("mediaPage.closeSettings", "Close media page settings"),
    onClose,
  }), {
    surfaceRole: PANEL_SURFACE_ROLES.PANEL,
    mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
  });

  root.hidden = !open;

  const body = document.createElement("div");
  body.className = "mha-media-page-settings-body";

  const playerRows = availablePlayers.length
    ? availablePlayers.map((player) => createCheckboxRow({
      label: player.name,
      checked: enabledSet.has(player.entity_id),
      onChange: (checked) => {
        const nextEnabled = checked
          ? [...new Set([...enabledPlayerIds, player.entity_id])]
          : enabledPlayerIds.filter(id => id !== player.entity_id);
        onConfigChange({ enabledPlayerIds: nextEnabled });
      },
    }))
    : [createEmptyState(t("mediaPage.noPlayersAvailable", "No media players available"))];

  body.append(
    createSection(t("mediaPage.availablePlayers", "Available players"), playerRows),
    createSection(t("mediaPage.defaultPlayer", "Default player"), [
      createSelectField({
        label: t("mediaPage.defaultPlayer", "Default player"),
        value: page?.config?.defaultPlayerId || "",
        options: [
          { value: "", label: t("mediaPage.autoPlayerFallback", "Automatic fallback") },
          ...availablePlayers
            .filter(player => enabledSet.has(player.entity_id))
            .map(player => ({ value: player.entity_id, label: player.name })),
        ],
        onChange: value => onConfigChange({ defaultPlayerId: value }),
      }),
    ]),
    createSection(t("mediaPage.appearance", "Appearance"), [
      createSelectField({
        label: t("mediaPage.visualStyle", "Visual style"),
        value: page?.config?.visualStyle || "theme",
        options: getMediaPageVisualStyleOptions(),
        onChange: value => onConfigChange({ visualStyle: value }),
      }),
      createCheckboxRow({
        label: t("mediaPage.blurBackground", "Blur artwork in the background"),
        checked: page?.config?.blurBackground !== false,
        onChange: checked => onConfigChange({ blurBackground: checked }),
      }),
    ]),
  );

  root.querySelector(".mha-panel-sheet, .mha-media-page-settings-sheet")?.append(body);
  return root;
}

function createEmptyState(text = "") {
  const node = document.createElement("p");
  node.className = "mha-media-page-settings-empty";
  node.textContent = text;
  return node;
}

export function syncMediaPageSettingsPanel(root, props = {}) {
  root?.querySelector?.(".mha-media-page-settings-panel")?.remove();
  root?.append?.(createMediaPageSettingsPanel(props));
}
