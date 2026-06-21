import { loadDeviceInsights } from "../device-insights/device-insights-ha-api.js";
import {
  applyExtensionPanelAppearance,
  EXTENSION_PANEL_APPEARANCE_STORAGE,
  resolveExtensionPanelAppearance,
} from "../extensions/extension-panel-appearance.js";
import {
  bindExtensionPanelAppearanceControl,
} from "../extensions/extension-panel-appearance-control.js";
import {
  assetUrl,
  DIAGNOSTICS_ELEMENT,
  DIAGNOSTICS_PANEL_ID,
  STYLES,
} from "./diagnostics-constants.js";
import { renderDiagnosticsPanel } from "./diagnostics-render.js";

const DEVICE_INSIGHTS_REFRESH_INTERVAL = 5000;

function getDeviceInsightsSignature(devices = []) {
  return JSON.stringify(devices.map(device => ({
    id: device.device_id,
    lastSeen: device.last_seen,
    pages: device.pages,
    widgets: device.widgets,
  })));
}

class MhaDiagnosticsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._hassRenderSignature = "";
    this._hasRendered = false;
    this._deviceInsights = [];
    this._deviceInsightsSignature = "";
    this._deviceInsightsLoading = false;
    this._deviceInsightsRefreshing = false;
    this._deviceInsightsError = "";
    this._deviceInsightsLoadedUserId = "";
    this._deviceInsightsRequestId = 0;
    this._deviceInsightsRefreshTimer = 0;
    this._onStorage = event => {
      if (event.key && !event.key.startsWith("mha-")) return;
      this.render();
    };
    this._onAppearanceChange = event => {
      if (event.detail?.storageKey !== EXTENSION_PANEL_APPEARANCE_STORAGE) return;
      this.render();
    };
    this._onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        this._ensureDeviceInsightsLoaded({ force: true, silent: true });
        this._scheduleDeviceInsightsRefresh();
      }
    };
  }

  set hass(value) {
    this._hass = value;
    this._ensureDeviceInsightsLoaded();
    this._scheduleDeviceInsightsRefresh();
    const signature = this._getHassRenderSignature(value);
    if (this._hasRendered && signature === this._hassRenderSignature) return;
    this._hassRenderSignature = signature;
    this.render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._upgradePredefinedProperty("hass");
    window.addEventListener("storage", this._onStorage);
    window.addEventListener("mha-extension-panel-appearance-change", this._onAppearanceChange);
    document.addEventListener("visibilitychange", this._onVisibilityChange);
    this._ensureDeviceInsightsLoaded();
    this._scheduleDeviceInsightsRefresh();
    if (!this._hasRendered) this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("storage", this._onStorage);
    window.removeEventListener("mha-extension-panel-appearance-change", this._onAppearanceChange);
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this._clearDeviceInsightsRefresh();
  }

  _upgradePredefinedProperty(name) {
    if (!Object.prototype.hasOwnProperty.call(this, name)) return;
    const value = this[name];
    delete this[name];
    this[name] = value;
  }

  _getHassRenderSignature(hass = this._hass) {
    const states = hass?.states || {};
    return JSON.stringify({
      connected: Boolean(hass),
      entityCount: Object.keys(states).length,
      deviceInsightsSignature: this._deviceInsightsSignature,
      deviceInsightsLoading: this._deviceInsightsLoading,
      deviceInsightsRefreshing: this._deviceInsightsRefreshing,
      deviceInsightsError: this._deviceInsightsError,
    });
  }

  _ensureDeviceInsightsLoaded({ force = false, silent = false } = {}) {
    const userId = String(this._hass?.user?.id || "");
    if (!this._hass || !userId) return false;
    if (this._deviceInsightsLoading || this._deviceInsightsRefreshing) return true;
    if (!force && this._deviceInsightsLoadedUserId === userId) return false;
    this._loadDeviceInsights(userId, { silent });
    return true;
  }

  _clearDeviceInsightsRefresh() {
    clearTimeout(this._deviceInsightsRefreshTimer);
    this._deviceInsightsRefreshTimer = 0;
  }

  _scheduleDeviceInsightsRefresh() {
    this._clearDeviceInsightsRefresh();
    if (!this.isConnected || !this._hass) return;
    if (document.visibilityState === "hidden") return;

    this._deviceInsightsRefreshTimer = window.setTimeout(() => {
      this._deviceInsightsRefreshTimer = 0;
      this._ensureDeviceInsightsLoaded({ force: true, silent: true });
      this._scheduleDeviceInsightsRefresh();
    }, DEVICE_INSIGHTS_REFRESH_INTERVAL);
  }

  async _loadDeviceInsights(userId, { silent = false } = {}) {
    const requestId = ++this._deviceInsightsRequestId;
    if (silent) {
      this._deviceInsightsRefreshing = true;
    } else {
      this._deviceInsightsLoading = true;
      this.render();
    }
    this._deviceInsightsError = "";

    try {
      const devices = await loadDeviceInsights(this._hass);
      if (requestId !== this._deviceInsightsRequestId) return;
      const signature = getDeviceInsightsSignature(devices);
      const changed = signature !== this._deviceInsightsSignature;
      this._deviceInsights = devices;
      this._deviceInsightsSignature = signature;
      this._deviceInsightsLoadedUserId = userId;
      if (changed || !silent) this.render();
    } catch (error) {
      console.warn("[MHA Insights] Unable to load multi-device snapshots.", error);
      if (requestId !== this._deviceInsightsRequestId) return;
      this._deviceInsights = [];
      this._deviceInsightsSignature = "";
      this._deviceInsightsError = "Multi-device insights unavailable.";
      this.render();
    } finally {
      if (requestId === this._deviceInsightsRequestId) {
        this._deviceInsightsLoading = false;
        this._deviceInsightsRefreshing = false;
      }
    }
  }

  _captureRenderState() {
    return {
      scrollTop: this.shadowRoot?.querySelector(".mha-extension-shell")?.scrollTop || 0,
      activeField: this.shadowRoot?.activeElement?.dataset?.appearanceField || "",
    };
  }

  _restoreRenderState(state = {}) {
    const shell = this.shadowRoot?.querySelector(".mha-extension-shell");
    if (shell && state.scrollTop) shell.scrollTop = state.scrollTop;
    if (state.activeField && typeof CSS !== "undefined" && CSS.escape) {
      this.shadowRoot
        ?.querySelector(`[data-appearance-field='${CSS.escape(state.activeField)}']`)
        ?.focus();
    }
  }

  render() {
    const renderState = this._captureRenderState();
    const appearance = resolveExtensionPanelAppearance(this, DIAGNOSTICS_PANEL_ID);
    applyExtensionPanelAppearance(this, appearance.state);

    const links = STYLES.map(path => `<link rel="stylesheet" href="${assetUrl(path)}">`).join("");
    renderDiagnosticsPanel(this.shadowRoot, {
      linksHtml: links,
      appearance,
      hass: this._hass,
      deviceInsights: {
        devices: this._deviceInsights,
        loading: this._deviceInsightsLoading,
        refreshing: this._deviceInsightsRefreshing,
        error: this._deviceInsightsError,
        refreshInterval: DEVICE_INSIGHTS_REFRESH_INTERVAL,
      },
    });

    bindExtensionPanelAppearanceControl(this.shadowRoot, {
      panelId: DIAGNOSTICS_PANEL_ID,
      appearance,
      onChange: () => this.render(),
    });

    this._hassRenderSignature = this._getHassRenderSignature();
    this._hasRendered = true;
    this._restoreRenderState(renderState);
  }
}

if (!customElements.get(DIAGNOSTICS_ELEMENT)) {
  customElements.define(DIAGNOSTICS_ELEMENT, MhaDiagnosticsPanel);
}
