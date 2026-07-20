import { getEntityOptionsByDomain } from "./light-options.js";

const CAMERA_REFRESH_INTERVALS = Object.freeze([0, 1000, 3000, 5000]);
const DEFAULT_CAMERA_REFRESH_INTERVAL = 5000;

function normalizeCameraRefreshInterval(value) {
  const numericValue = Number(value);
  return CAMERA_REFRESH_INTERVALS.includes(numericValue)
    ? numericValue
    : DEFAULT_CAMERA_REFRESH_INTERVAL;
}

export function createCameraConfigDraft(widget = {}, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "camera", visibilityConfig);
  const configuredEntityId = String(widget.entityId || widget.entity_id || "").trim();
  const entityId = options.some(option => option.value === configuredEntityId)
    ? configuredEntityId
    : options[0]?.value || "";
  const selected = options.find(option => option.value === entityId) || null;
  return {
    draft: {
      entityId,
      label: String(widget.label || widget.title || selected?.label || "").trim(),
      labelCustomized: Boolean(String(widget.label || widget.title || "").trim()),
      refreshInterval: normalizeCameraRefreshInterval(widget.refreshInterval),
    },
  };
}

function reconcileCameraConfigDraft(draft, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "camera", visibilityConfig);
  if (!options.some(option => option.value === draft.entityId)) {
    draft.entityId = options[0]?.value || "";
  }
  const selected = options.find(option => option.value === draft.entityId) || null;
  if (!draft.labelCustomized) draft.label = selected?.label || "";
  return { draft, options, selected };
}

export function buildCameraWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { selected } = reconcileCameraConfigDraft(draft, hass, visibilityConfig);
  const label = String(draft.label || selected?.label || "Camera").trim();
  return {
    ...widget,
    kind: "camera",
    type: "camera",
    component: "camera-widget",
    variant: "camera",
    entityId: draft.entityId || "",
    label,
    title: label,
    refreshInterval: normalizeCameraRefreshInterval(draft.refreshInterval),
    w: 4,
    h: 3,
  };
}

export function renderCameraConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, createSelectControl, t } = helpers;
  const reconciled = reconcileCameraConfigDraft(session.draft, hass, visibilityConfig);
  const { draft, options, selected } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const entityLabel = t("widgets.config.cameraEntity", "Camera entity");
  const entitySelect = createSelectControl({
    label: entityLabel,
    value: draft.entityId,
    disabled: !options.length,
    options: options.length
      ? options
      : [{ value: "", label: t("widgets.config.noCameraEntity", "No authorized and available camera entity.") }],
    onChange: (value) => {
      draft.entityId = String(value || "");
      const nextSelected = options.find(option => option.value === draft.entityId) || null;
      if (!draft.labelCustomized) draft.label = nextSelected?.label || "";
      onChange?.({ rerender: true });
    },
  });
  fields.append(createField(entityLabel, entitySelect));

  const label = document.createElement("input");
  label.className = "mha-widget-config-control";
  label.value = draft.label;
  label.placeholder = selected?.label || t("widgets.camera.title", "Camera");
  label.addEventListener("input", (event) => {
    draft.label = String(event.currentTarget.value || "");
    draft.labelCustomized = true;
    onChange?.();
  });
  fields.append(createField(t("widgets.config.displayName", "Display name"), label));

  const refreshLabel = t("widgets.config.refresh", "Refresh");
  const refreshSelect = createSelectControl({
    label: refreshLabel,
    value: String(normalizeCameraRefreshInterval(draft.refreshInterval)),
    options: [
      { value: "1000", label: t("widgets.config.refreshOptions.oneSecond", "Every second") },
      { value: "3000", label: t("widgets.config.refreshOptions.threeSeconds", "Every 3 seconds") },
      { value: "5000", label: t("widgets.config.refreshOptions.fiveSeconds", "Every 5 seconds") },
      { value: "0", label: t("widgets.config.refreshOptions.onClick", "On click") },
    ],
    onChange: (value) => {
      draft.refreshInterval = normalizeCameraRefreshInterval(value);
      onChange?.();
    },
  });
  fields.append(createField(refreshLabel, refreshSelect));

  const isValid = () => Boolean(options.some(option => option.value === draft.entityId));
  return { fields, canSave: isValid(), isValid };
}
