import {
  getWidgetConfigDefinition,
  getWidgetConfigType,
} from "./widget-config-registry.js";
import { createPanelShell } from "../panels/panel-shell.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { t } from "../i18n/index.js";

export function supportsWidgetConfiguration(widget = {}) {
  return Boolean(getWidgetConfigType(widget));
}

export function createWidgetConfigSession(widget, hass, {
  mode = "create",
  visibilityConfig,
  ...sessionMetadata
} = {}) {
  const configType = getWidgetConfigType(widget);
  const configDefinition = getWidgetConfigDefinition(configType);
  if (!configDefinition) return null;
  return {
    mode,
    widget,
    configType,
    ...sessionMetadata,
    draft: configDefinition.createDraft(widget, hass, visibilityConfig).draft,
  };
}

export function buildConfiguredWidget(session, hass, visibilityConfig) {
  if (!session) return null;
  const configDefinition = getWidgetConfigDefinition(session.configType);
  return configDefinition?.build(session.widget, session.draft, hass, visibilityConfig) || null;
}

function createField(labelText, control, { hint = "" } = {}) {
  const field = document.createElement("label");
  field.className = "mha-widget-config-field";

  const label = document.createElement("span");
  label.className = "mha-widget-config-label";
  label.textContent = labelText;
  field.append(label, control);

  if (hint) {
    const note = document.createElement("small");
    note.className = "mha-widget-config-note";
    note.textContent = hint;
    field.append(note);
  }
  return field;
}

function configOptionLabel(group, option = {}) {
  if (!option?.value) return option?.label || "";
  return t(`${group}.${option.value}`, option.label);
}

function emptyLabelForConfigOption(group, option = {}) {
  if (!option?.value) return option?.emptyLabel || "";
  return t(`${group}.${option.value}`, option.emptyLabel || "");
}

function createRenderHelpers() {
  return Object.freeze({
    createField,
    configOptionLabel,
    emptyLabelForConfigOption,
    t,
  });
}

function resolveConfigTitle(configDefinition, session, helpers) {
  if (typeof configDefinition?.getTitle === "function") {
    return configDefinition.getTitle(session, helpers);
  }
  if (configDefinition?.titleKey) {
    return helpers.t(configDefinition.titleKey, configDefinition.title || "Configure widget");
  }
  return configDefinition?.title || helpers.t("widgets.config.configureWidget", "Configure widget");
}

function resolveConfigHint(configDefinition, session, helpers) {
  if (typeof configDefinition?.getHint === "function") {
    return configDefinition.getHint(session, helpers);
  }
  if (configDefinition?.hintKey) {
    return helpers.t(configDefinition.hintKey, configDefinition.hint || "");
  }
  return configDefinition?.hint || "";
}

function resolveConfigContent(configDefinition, session, hass, visibilityConfig, onChange, helpers) {
  if (!session || typeof configDefinition?.renderFields !== "function") {
    return { fields: document.createElement("div"), canSave: false };
  }
  return configDefinition.renderFields(session, hass, visibilityConfig, onChange, helpers);
}

export function createWidgetConfigPopup({
  session,
  hass,
  visibilityConfig,
  onCancel,
  onSave,
  onChange,
} = {}) {
  const configDefinition = session
    ? getWidgetConfigDefinition(session.configType)
    : null;
  const renderHelpers = createRenderHelpers();
  const content = resolveConfigContent(
    configDefinition,
    session,
    hass,
    visibilityConfig,
    onChange,
    renderHelpers,
  );

  const hint = document.createElement("p");
  hint.className = "mha-widget-config-hint mha-page-creator-hint";
  hint.textContent = resolveConfigHint(configDefinition, session, renderHelpers);

  const actions = document.createElement("div");
  actions.className = "mha-widget-config-actions mha-page-creator-actions";
  const cancel = document.createElement("button");
  cancel.className = "mha-widget-config-secondary mha-page-creator-secondary";
  cancel.type = "button";
  cancel.textContent = t("common.cancel", "Cancel");
  cancel.onclick = () => onCancel?.();

  const save = document.createElement("button");
  save.className = "mha-widget-config-primary mha-page-creator-primary";
  save.type = "button";
  save.textContent = session?.mode === "edit"
    ? t("common.save", "Save")
    : t("common.continue", "Continue");
  save.disabled = !content.canSave;
  content.fields.addEventListener("input", () => {
    if (content.isValid) save.disabled = !content.isValid();
  });
  save.onclick = () => onSave?.();
  actions.append(cancel, save);

  return applyPanelSurfaceContract(createPanelShell({
    open: Boolean(session),
    rootClassName: "mha-widget-config-popup mha-page-creator",
    scrimClassName: "mha-widget-config-scrim mha-page-creator-scrim",
    sheetClassName: "mha-widget-config-sheet mha-page-creator-sheet",
    headerClassName: "mha-widget-config-header mha-page-creator-header",
    closeClassName: "mha-widget-config-close mha-page-creator-close",
    title: resolveConfigTitle(configDefinition, session, renderHelpers),
    ariaLabel: t("widgets.config.ariaLabel", "Configure widget"),
    closeLabel: t("common.close", "Close"),
    scrimLabel: t("widgets.config.close", "Close configuration"),
    onClose: () => onCancel?.(),
    children: [hint, content.fields, actions],
  }), {
    surfaceRole: PANEL_SURFACE_ROLES.POPUP,
    mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
  });
}
