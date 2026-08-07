import { getEntityOptionsByDomain } from "./light-options.js";
import {
  CAMERA_PTZ_PROVIDERS,
  getCameraPtzCustomActionExample,
  normalizeCameraPopupConfig,
  normalizeCameraPtzCustomActions,
} from "../camera-popup/camera-popup-config.js";

const CAMERA_REFRESH_INTERVALS = Object.freeze([1000, 3000, 5000]);
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
  const cameraPopup = normalizeCameraPopupConfig(widget.cameraPopup);
  return {
    draft: {
      entityId,
      label: String(widget.label || widget.title || selected?.label || "").trim(),
      labelCustomized: Boolean(String(widget.label || widget.title || "").trim()),
      refreshInterval: normalizeCameraRefreshInterval(widget.refreshInterval),
      cameraPopup,
      customActionsValid: cameraPopup.ptz.provider !== "custom"
        || Object.keys(cameraPopup.ptz.customActions).length > 0,
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
    cameraPopup: normalizeCameraPopupConfig(draft.cameraPopup),
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
    ],
    onChange: (value) => {
      draft.refreshInterval = normalizeCameraRefreshInterval(value);
      onChange?.();
    },
  });
  fields.append(createField(refreshLabel, refreshSelect));

  const providerLabel = t("widgets.config.cameraPtzProvider", "PTZ integration");
  const providerSelect = createSelectControl({
    label: providerLabel,
    value: draft.cameraPopup.ptz.provider,
    options: CAMERA_PTZ_PROVIDERS.map(provider => ({
      value: provider,
      label: t(`cameraPopup.providers.${provider}`, provider),
    })),
    onChange: (value) => {
      draft.cameraPopup.ptz.provider = CAMERA_PTZ_PROVIDERS.includes(value) ? value : "auto";
      draft.customActionsValid = draft.cameraPopup.ptz.provider !== "custom"
        || Object.keys(draft.cameraPopup.ptz.customActions).length > 0;
      onChange?.({ rerender: true });
    },
  });
  fields.append(createField(providerLabel, providerSelect, {
    hint: t(
      "widgets.config.cameraPtzProviderHint",
      "Automatic uses the camera entity platform when it is Esee Cloud or ONVIF.",
    ),
  }));

  if (draft.cameraPopup.ptz.provider === "custom") {
    const customActions = document.createElement("textarea");
    customActions.className = "mha-widget-config-control";
    customActions.rows = 10;
    customActions.value = Object.keys(draft.cameraPopup.ptz.customActions || {}).length
      ? JSON.stringify(draft.cameraPopup.ptz.customActions, null, 2)
      : "";
    customActions.placeholder = JSON.stringify(getCameraPtzCustomActionExample(), null, 2);
    customActions.addEventListener("input", (event) => {
      const value = String(event.currentTarget.value || "").trim();
      try {
        const parsed = value ? JSON.parse(value) : {};
        draft.customActionsValid = Boolean(
          parsed
          && typeof parsed === "object"
          && !Array.isArray(parsed)
          && Object.keys(normalizeCameraPtzCustomActions(parsed)).length > 0,
        );
        if (draft.customActionsValid) {
          draft.cameraPopup.ptz.customActions = normalizeCameraPtzCustomActions(parsed);
        }
      } catch {
        draft.customActionsValid = false;
      }
      onChange?.();
    });
    fields.append(createField(
      t("widgets.config.cameraCustomActions", "Custom PTZ actions (JSON)"),
      customActions,
      {
        hint: t(
          "widgets.config.cameraCustomActionsHint",
          "Map direction, home, and preset commands to HA services. Templates: {{entity_id}}, {{command}}, {{speed}}, {{preset}}.",
        ),
      },
    ));
  }

  const isValid = () => Boolean(
    options.some(option => option.value === draft.entityId)
    && (draft.cameraPopup.ptz.provider !== "custom" || draft.customActionsValid),
  );
  return { fields, canSave: isValid(), isValid };
}
