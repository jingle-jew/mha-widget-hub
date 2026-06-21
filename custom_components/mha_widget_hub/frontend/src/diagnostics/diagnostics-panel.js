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

class MhaDiagnosticsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._hassRenderSignature = "";
    this._hasRendered = false;
    this._onStorage = event => {
      if (event.key && !event.key.startsWith("mha-")) return;
      this.render();
    };
    this._onAppearanceChange = event => {
      if (event.detail?.storageKey !== EXTENSION_PANEL_APPEARANCE_STORAGE) return;
      this.render();
    };
  }

  set hass(value) {
    this._hass = value;
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
    if (!this._hasRendered) this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("storage", this._onStorage);
    window.removeEventListener("mha-extension-panel-appearance-change", this._onAppearanceChange);
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
    });
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
    if (state.activeField) {
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
