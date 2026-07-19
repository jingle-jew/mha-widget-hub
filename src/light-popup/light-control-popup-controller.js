import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import { getEntityDomain, getEntityState, getWidgetEntityId } from "../ha/entity.js";
import { getLightSnapshot } from "../ha/light-popup-adapter.js";
import { t } from "../i18n/index.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { createPanelShell } from "../panels/panel-shell.js";
import { createSystemIconButton } from "../system/system-buttons.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createLightPopupColorView } from "./light-popup-color-view.js";
import { normalizeLightPopupConfig } from "./light-popup-config.js";
import { createLightPopupConfigView } from "./light-popup-config-view.js";
import { createLightPopupMainView } from "./light-popup-main-view.js";

function resolveShadowRoot(anchor) {
  const root = anchor?.getRootNode?.();
  return root?.host ? root : null;
}

function applyHostLayoutState(root, panel) {
  const host = root?.host;
  const layout = String(host?.dataset?.layout || host?._layout || "");
  const variant = String(host?.dataset?.layoutVariant || "");
  panel.dataset.layout = layout;
  panel.dataset.mobileLayout = String(layout === "mobile");
  panel.dataset.mobileLandscape = String(variant === "mobile-landscape");
  if (variant) panel.dataset.layoutVariant = variant;
  return panel;
}

function syncHostSurfaceState(root) {
  const host = root?.host;
  if (!host) return;
  const open = Boolean(root.querySelector?.([
    '.mha-light-control-popup[data-open="true"]:not([hidden])',
    '.mha-widget-manager-panel[data-open="true"]:not([hidden])',
    'section.mha-page-creator[data-open="true"]:not([hidden])',
    '.mha-settings-panel[data-open="true"]:not([hidden])',
  ].join(",")));
  host.classList.toggle("is-widget-surface-open", open);
  host.dataset.widgetSurfaceOpen = String(open);
}

function createIdentity(widget, entityState) {
  const identity = document.createElement("div");
  identity.className = "mha-light-popup-identity";
  const icon = document.createElement("span");
  icon.className = "mha-light-popup-identity-icon";
  icon.append(createIconSymbol({ name: widget.icon || "lamp" }));
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = widget.label || widget.title || entityState?.attributes?.friendly_name || t("lightPopup.light", "Light");
  const state = document.createElement("span");
  state.className = "mha-light-popup-identity-state";
  copy.append(title, state);
  identity.append(icon, copy);
  identity.__mhaState = state;
  return identity;
}

function updateIdentity(identity, entityState) {
  const snapshot = getLightSnapshot(entityState);
  const state = identity?.__mhaState;
  if (!state) return;
  state.textContent = snapshot.on
    ? `${t("states.on", "On")}  ·  ${snapshot.brightness} %  ·  ${snapshot.kelvin} K`
    : t("states.off", "Off");
  identity.dataset.on = String(snapshot.on);
}

export function openLightControlPopup({
  anchor,
  widget,
  hass,
  entityVisibilityConfig,
  updateWidgetConfig,
} = {}) {
  const shadowRoot = resolveShadowRoot(anchor);
  const entityId = getWidgetEntityId(widget);
  if (!shadowRoot || getEntityDomain(entityId) !== "light") return null;

  const previous = shadowRoot.querySelector(".mha-light-control-popup");
  if (previous) {
    destroyDomSubtree(previous);
    previous.remove();
  }

  const context = {
    hass,
    entityState: getEntityState(hass, entityId),
    config: normalizeLightPopupConfig(widget.lightPopup),
    view: "main",
    trigger: anchor,
  };
  let activeView = null;
  let identity = null;

  const close = () => {
    if (!root.isConnected) return;
    root.dataset.open = "false";
    root.setAttribute("aria-hidden", "true");
    root.hidden = true;
    destroyDomSubtree(root);
    root.remove();
    syncHostSurfaceState(shadowRoot);
    context.trigger?.focus?.({ preventScroll: true });
  };

  const root = applyPanelSurfaceContract(createPanelShell({
    open: true,
    rootClassName: "mha-light-control-popup mha-page-creator",
    scrimClassName: "mha-light-control-popup-scrim mha-page-creator-scrim",
    sheetClassName: "mha-light-control-popup-sheet mha-page-creator-sheet",
    headerClassName: "mha-light-control-popup-header mha-page-creator-header",
    closeClassName: "mha-light-control-popup-close mha-page-creator-close",
    title: "",
    ariaLabel: t("lightPopup.ariaLabel", "Light control"),
    closeLabel: t("common.close", "Close"),
    onClose: close,
  }), {
    surfaceRole: PANEL_SURFACE_ROLES.POPUP,
    mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
  });
  root.dataset.widgetComponent = "light-control-popup";
  root.dataset.entityId = entityId;
  root.hidden = false;

  const sheet = root.querySelector(".mha-light-control-popup-sheet");
  const header = root.querySelector(".mha-light-control-popup-header");
  const generatedHeading = header.querySelector("h2");
  const generatedClose = header.querySelector(".mha-light-control-popup-close");
  const body = document.createElement("div");
  body.className = "mha-light-control-popup-body";
  sheet.append(body);

  function renderHeader() {
    header.replaceChildren();
    if (context.view === "main") {
      identity = createIdentity(widget, context.entityState);
      updateIdentity(identity, context.entityState);
      const actions = document.createElement("div");
      actions.className = "mha-light-popup-header-actions";
      const settings = createSystemIconButton({
        icon: "settings",
        label: t("lightPopup.configurePresets", "Configure light presets"),
        className: "mha-light-popup-settings",
        onClick: () => renderView("config"),
      });
      actions.append(settings, generatedClose);
      header.append(identity, actions);
      return;
    }

    const back = createSystemIconButton({
      icon: "back",
      label: context.view === "color"
        ? t("lightPopup.backToPresets", "Back to presets")
        : t("lightPopup.backToControl", "Back to control"),
      className: "mha-light-popup-back",
      onClick: () => renderView("main"),
    });
    const title = document.createElement("strong");
    title.className = "mha-light-popup-view-title";
    title.textContent = context.view === "color"
      ? t("lightPopup.customColor", "Custom color")
      : t("lightPopup.configurePresets", "Configure light presets");
    const start = document.createElement("div");
    start.className = "mha-light-popup-header-start";
    start.append(back, title);
    header.append(start, generatedClose);
  }

  function renderView(view) {
    context.view = view;
    root.dataset.activeView = view;
    if (activeView) destroyDomSubtree(activeView);
    activeView = view === "color"
      ? createLightPopupColorView({ hass: context.hass, entityState: context.entityState })
      : view === "config"
        ? createLightPopupConfigView({
          config: context.config,
          onCancel: () => renderView("main"),
          onSave: (nextConfig) => {
            context.config = normalizeLightPopupConfig(nextConfig);
            updateWidgetConfig?.({ lightPopup: context.config });
            renderView("main");
          },
        })
        : createLightPopupMainView({
          hass: context.hass,
          entityState: context.entityState,
          config: context.config,
          onOpenColor: () => renderView("color"),
        });
    body.replaceChildren(activeView);
    renderHeader();
  }

  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    if (context.view !== "main") renderView("main");
    else close();
    event.preventDefault();
  };
  root.addEventListener("keydown", onKeyDown);
  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    context.entityState = getEntityState(nextHass, entityId) || context.entityState;
    updateIdentity(identity, context.entityState);
    activeView?.__mhaUpdateFromHass?.(nextHass);
  };
  root.__mhaDestroy = () => {
    root.removeEventListener("keydown", onKeyDown);
    delete root.__mhaUpdateFromHass;
  };

  generatedHeading.remove();
  renderView("main");
  shadowRoot.append(applyHostLayoutState(shadowRoot, root));
  syncHostSurfaceState(shadowRoot);
  requestAnimationFrame(() => sheet.focus?.({ preventScroll: true }));
  return root;
}
