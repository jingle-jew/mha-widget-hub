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
    this.render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._upgradePredefinedProperty("hass");
    window.addEventListener("storage", this._onStorage);
    window.addEventListener("mha-extension-panel-appearance-change", this._onAppearanceChange);
    this.render();
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

  render() {
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
  }
}

if (!customElements.get(DIAGNOSTICS_ELEMENT)) {
  customElements.define(DIAGNOSTICS_ELEMENT, MhaDiagnosticsPanel);
}
