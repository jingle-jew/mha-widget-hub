import {
  getAllowedDomains,
  normalizeEntityVisibilityConfig,
} from "./entity-permissions.js";
import {
  loadEntityVisibilityConfig,
  loadHomeAssistantUsers,
  saveEntityVisibilityConfig,
} from "./admin-ha-api.js";
import { STYLES } from "./admin-constants.js";
import {
  createInitialAdminState,
  getDefaultUserConfig,
  getHassRenderSignature,
  setEntityAllowed,
  updateUserConfig,
} from "./admin-state.js";
import {
  captureAdminRenderState,
  renderAdminPanel,
  restoreAdminRenderState,
} from "./admin-render.js";
import {
  assetUrl,
  createLoadFailure,
  createOption,
  describeLoadError,
} from "./admin-utils.js";
import { createThemeController } from "../settings/theme-controller.js";
import { configureI18n, t } from "../i18n/index.js";

class MhaAdminPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    const initialState = createInitialAdminState();
    this._loadedUserId = initialState.loadedUserId;
    this._failedUserId = initialState.failedUserId;
    this._loadingUserId = initialState.loadingUserId;
    this._loadPromise = initialState.loadPromise;
    this._loadRequestId = initialState.loadRequestId;
    this._users = initialState.users;
    this._config = initialState.config;
    this._selectedUserId = initialState.selectedUserId;
    this._selectedDomain = initialState.selectedDomain;
    this._search = initialState.search;
    this._loading = initialState.loading;
    this._saving = initialState.saving;
    this._error = initialState.error;
    this._hassRenderSignature = initialState.hassRenderSignature;
    this._themeController = createThemeController(this);
  }

  set hass(value) {
    this._hass = value;
    configureI18n({ hass: value });
    this._themeController.sync();
    if (this._ensureAdminDataLoaded()) return;
    this._renderIfHassDataChanged();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._upgradePredefinedProperty("hass");
    this._themeController.sync();
    this._ensureAdminDataLoaded();
    this.render();
  }

  _upgradePredefinedProperty(name) {
    if (!Object.prototype.hasOwnProperty.call(this, name)) return;
    const value = this[name];
    delete this[name];
    this[name] = value;
  }

  _getHassRenderSignature(hass = this._hass) {
    return getHassRenderSignature(hass, this._selectedDomain);
  }

  _renderIfHassDataChanged() {
    const signature = this._getHassRenderSignature();
    if (signature === this._hassRenderSignature) return false;
    this._hassRenderSignature = signature;
    this.render();
    return true;
  }

  _ensureAdminDataLoaded() {
    const userId = String(this._hass?.user?.id || "");
    if (!this._hass || !userId) {
      return false;
    }
    if (this._loadedUserId === userId) {
      return false;
    }
    if (this._failedUserId === userId) {
      return false;
    }
    if (this._loadPromise && this._loadingUserId === userId) {
      return true;
    }
    this._load(userId);
    return true;
  }

  async _load(userId = String(this._hass?.user?.id || "")) {
    if (!this._hass || !userId) {
      this._loading = true;
      this.render();
      return;
    }

    const hass = this._hass;
    const requestId = ++this._loadRequestId;
    this._loadingUserId = userId;
    this._loading = true;
    this._error = "";
    this.render();
    const loadPromise = Promise.allSettled([
      loadHomeAssistantUsers(hass),
      loadEntityVisibilityConfig(hass),
    ]);
    this._loadPromise = loadPromise;
    const [usersResult, configResult] = await loadPromise;

    if (requestId !== this._loadRequestId) return;

    try {
      if (usersResult.status === "rejected") {
        throw createLoadFailure(
          "users/list",
          usersResult.reason,
          t("admin.loadUsersFailed", "Unable to load Home Assistant users."),
        );
      }
      if (configResult.status === "rejected") {
        throw createLoadFailure(
          "entity_visibility/get",
          configResult.reason,
          t("admin.loadConfigFailed", "Unable to load MHA configuration."),
        );
      }

      const users = usersResult.value;
      this._users = users;
      this._config = normalizeEntityVisibilityConfig(configResult.value);
      this._loadedUserId = userId;
      this._failedUserId = "";
      this._selectedUserId = this._selectedUserId || users[0]?.id || "";
      this._hassRenderSignature = this._getHassRenderSignature(hass);
    } catch (error) {
      const source = error?.mhaLoadSource || "loading";
      const cause = error?.cause || error;
      console.error(
        "[MHA Admin] Loading failed.",
        describeLoadError(source, cause),
      );
      this._error = source === "users/list"
        ? t("admin.loadUsersFailed", "Unable to load Home Assistant users.")
        : t("admin.loadConfigFailed", "Unable to load MHA configuration.");
      this._failedUserId = userId;
    } finally {
      if (this._loadPromise === loadPromise) {
        this._loadPromise = null;
        this._loadingUserId = "";
      }
      this._loading = false;
      this.render();
    }
  }

  _getUserConfig() {
    return getDefaultUserConfig(this._config, this._selectedUserId);
  }

  _updateUserConfig(patch) {
    this._config = updateUserConfig(this._config, this._selectedUserId, patch);
    this.render();
  }

  _setEntityAllowed(entityId, checked) {
    this._config = setEntityAllowed(this._config, {
      selectedUserId: this._selectedUserId,
      selectedDomain: this._selectedDomain,
      entityId,
      checked,
    });
    this.render();
  }

  async _save() {
    this._saving = true;
    this._error = "";
    this.render();
    try {
      this._config = await saveEntityVisibilityConfig(this._hass, this._config);
    } catch (error) {
      console.error("[MHA Admin] Save failed.", error);
      this._error = t("admin.saveFailed", "Save failed. Check administrator permissions.");
    } finally {
      this._saving = false;
      this.render();
    }
  }

  _captureRenderState() {
    return captureAdminRenderState(this.shadowRoot, this);
  }

  _restoreRenderState(state) {
    restoreAdminRenderState(this.shadowRoot, this, state);
  }

  render() {
    const renderState = this._captureRenderState();
    const theme = this._themeController.sync();
    const links = STYLES.map(path => `<link rel="stylesheet" href="${assetUrl(path)}">`).join("");
    renderAdminPanel(this.shadowRoot, {
      linksHtml: links,
      theme,
      loading: this._loading,
      saving: this._saving,
      error: this._error,
      selectedUserId: this._selectedUserId,
      selectedDomain: this._selectedDomain,
      searchQuery: this._search,
      users: this._users,
      userConfig: this._getUserConfig(),
      hass: this._hass,
      createOption,
      onSave: () => this._save(),
      onSelectUser: userId => {
        this._selectedUserId = userId;
        this._search = "";
        this.render();
      },
      onToggleUnrestricted: unrestricted => {
        this._updateUserConfig({ unrestricted });
      },
      onSelectDomain: domain => {
        this._selectedDomain = domain;
        this._search = "";
        this.render();
      },
      onSearchInput: value => {
        this._search = value;
        this.render();
        this.shadowRoot.querySelector(".mha-admin-search")?.focus();
      },
      onSetEntityAllowed: (entityId, checked) => this._setEntityAllowed(entityId, checked),
    });

    this._hassRenderSignature = this._getHassRenderSignature();
    this._restoreRenderState(renderState);
  }
}

if (!customElements.get("mha-admin-panel")) {
  customElements.define("mha-admin-panel", MhaAdminPanel);
}
