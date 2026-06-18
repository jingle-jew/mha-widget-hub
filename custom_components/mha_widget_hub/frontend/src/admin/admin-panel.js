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
  assetUrl,
  createLoadFailure,
  createOption,
  describeLoadError,
} from "./admin-utils.js";
import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { createThemeController } from "../settings/theme-controller.js";
import { configureI18n, t } from "../i18n/index.js";

class MhaAdminPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._loadedUserId = "";
    this._failedUserId = "";
    this._loadingUserId = "";
    this._loadPromise = null;
    this._loadRequestId = 0;
    this._users = [];
    this._config = normalizeEntityVisibilityConfig(null);
    this._selectedUserId = "";
    this._selectedDomain = getAllowedDomains()[0].value;
    this._search = "";
    this._loading = true;
    this._saving = false;
    this._error = "";
    this._hassRenderSignature = "";
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
    const userId = String(hass?.user?.id || "");
    const states = hass?.states || {};
    const entities = Object.keys(states)
      .filter(entityId => entityId.startsWith(`${this._selectedDomain}.`))
      .sort()
      .map(entityId => {
        const name = String(states[entityId]?.attributes?.friendly_name || "");
        return `${entityId}:${name}`;
      })
      .join("|");
    return `${userId}|${this._selectedDomain}|${entities}`;
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
    return this._config.users[this._selectedUserId] || {
      unrestricted: true,
      allowedEntities: {},
    };
  }

  _updateUserConfig(patch) {
    const current = this._getUserConfig();
    this._config = normalizeEntityVisibilityConfig({
      ...this._config,
      users: {
        ...this._config.users,
        [this._selectedUserId]: { ...current, ...patch },
      },
    });
    this.render();
  }

  _setEntityAllowed(entityId, checked) {
    const current = this._getUserConfig();
    const selected = new Set(current.allowedEntities?.[this._selectedDomain] || []);
    if (checked) selected.add(entityId);
    else selected.delete(entityId);
    this._updateUserConfig({
      unrestricted: false,
      allowedEntities: {
        ...current.allowedEntities,
        [this._selectedDomain]: [...selected],
      },
    });
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
    const active = this.shadowRoot.activeElement;
    const search = this.shadowRoot.querySelector(".mha-admin-search");
    return {
      hostScrollTop: this.scrollTop || 0,
      entityListScrollTop: this.shadowRoot.querySelector(".mha-admin-entity-list")?.scrollTop || 0,
      searchFocused: Boolean(active && search && active === search),
      searchSelectionStart: search?.selectionStart ?? null,
      searchSelectionEnd: search?.selectionEnd ?? null,
    };
  }

  _restoreRenderState(state) {
    if (!state) return;
    const restore = () => {
      this.scrollTop = state.hostScrollTop;
      const list = this.shadowRoot.querySelector(".mha-admin-entity-list");
      if (list) list.scrollTop = state.entityListScrollTop;
      if (state.searchFocused) {
        const search = this.shadowRoot.querySelector(".mha-admin-search");
        search?.focus?.({ preventScroll: true });
        if (
          search
          && state.searchSelectionStart !== null
          && state.searchSelectionEnd !== null
        ) {
          search.setSelectionRange(state.searchSelectionStart, state.searchSelectionEnd);
        }
      }
    };
    restore();
    requestAnimationFrame(restore);
  }

  render() {
    const renderState = this._captureRenderState();
    const theme = this._themeController.sync();
    const links = STYLES.map(path => `<link rel="stylesheet" href="${assetUrl(path)}">`).join("");
    this.shadowRoot.innerHTML = `${links}<main class="mha-admin-root"></main>`;
    const root = this.shadowRoot.querySelector(".mha-admin-root");
    root.dataset.loading = String(this._loading);

    const header = document.createElement("header");
    header.className = "mha-admin-header";
    header.innerHTML = `
      <div>
        <span class="mha-admin-eyebrow">${t("admin.eyebrow", "Advanced configuration")}</span>
        <h1>${t("admin.title", "MHA Admin")}</h1>
        <p>${t("admin.description", "Control which entities are available in the MHA interface for each user.")}</p>
      </div>
    `;
    const save = document.createElement("button");
    save.className = "mha-admin-save";
    save.type = "button";
    save.disabled = this._loading || this._saving || !this._selectedUserId;
    save.textContent = this._saving ? t("common.saving", "Saving...") : t("common.save", "Save");
    save.onclick = () => this._save();
    header.append(save);
    root.append(header);

    const warning = document.createElement("aside");
    warning.className = "mha-admin-warning";
    warning.textContent = t("admin.warning", "MHA visibility only: these rules do not replace native Home Assistant permissions.");
    root.append(warning);

    if (this._error) {
      const error = document.createElement("p");
      error.className = "mha-admin-error";
      error.textContent = this._error;
      root.append(error);
    }

    if (this._loading) {
      const loading = document.createElement("p");
      loading.className = "mha-admin-empty";
      loading.textContent = t("admin.loading", "Loading Home Assistant...");
      root.append(loading);
      this._hassRenderSignature = this._getHassRenderSignature();
      this._restoreRenderState(renderState);
      return;
    }

    const layout = document.createElement("div");
    layout.className = "mha-admin-layout";
    const sidebar = document.createElement("section");
    sidebar.className = "mha-admin-card mha-admin-sidebar";
    const userLabel = document.createElement("label");
    userLabel.textContent = t("admin.homeAssistantUser", "Home Assistant user");
    const userSelect = document.createElement("select");
    userSelect.className = "mha-admin-control";
    this._users.forEach(user => userSelect.append(createOption(
      user.id,
      `${user.name}${user.is_admin ? " · Admin" : ""}`,
      this._selectedUserId,
    )));
    userSelect.onchange = event => {
      this._selectedUserId = event.currentTarget.value;
      this._search = "";
      this.render();
    };
    userLabel.append(userSelect);

    const userConfig = this._getUserConfig();
    const unrestricted = document.createElement("label");
    unrestricted.className = "mha-admin-mode";
    const unrestrictedInput = document.createElement("input");
    unrestrictedInput.type = "checkbox";
    unrestrictedInput.checked = userConfig.unrestricted !== false;
    unrestrictedInput.onchange = event => this._updateUserConfig({
      unrestricted: event.currentTarget.checked,
    });
    unrestricted.append(unrestrictedInput, document.createTextNode(` ${t("admin.noRestrictions", "No MHA restrictions")}`));
    sidebar.append(userLabel, unrestricted);

    const domainNav = document.createElement("nav");
    domainNav.className = "mha-admin-domains";
    getAllowedDomains().forEach(domain => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.active = String(domain.value === this._selectedDomain);
      button.textContent = t(`admin.domainsList.${domain.value}`, domain.label);
      button.onclick = () => {
        this._selectedDomain = domain.value;
        this._search = "";
        this.render();
      };
      domainNav.append(button);
    });
    sidebar.append(domainNav);

    const content = document.createElement("section");
    content.className = "mha-admin-card mha-admin-content";
    const domain = getAllowedDomains().find(item => item.value === this._selectedDomain);
    const contentHeader = document.createElement("div");
    contentHeader.className = "mha-admin-content-header";
    const title = document.createElement("h2");
    title.textContent = domain ? t(`admin.domainsList.${domain.value}`, domain.label) : t("admin.entities", "Entities");
    const search = document.createElement("input");
    search.className = "mha-admin-control mha-admin-search";
    search.type = "search";
    search.placeholder = t("admin.searchEntity", "Search entity");
    search.value = this._search;
    search.oninput = event => {
      this._search = event.currentTarget.value;
      this.render();
      this.shadowRoot.querySelector(".mha-admin-search")?.focus();
    };
    contentHeader.append(title, search);
    content.append(contentHeader);

    const query = this._search.trim().toLocaleLowerCase();
    const entities = getEntitiesForDomain(this._hass, this._selectedDomain)
      .filter(entity => !query || entity.name.toLocaleLowerCase().includes(query));
    const allowed = new Set(userConfig.allowedEntities?.[this._selectedDomain] || []);
    const list = document.createElement("div");
    list.className = "mha-admin-entity-list";
    entities.forEach(entity => {
      const row = document.createElement("label");
      row.className = "mha-admin-entity-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = userConfig.unrestricted !== false || allowed.has(entity.entity_id);
      checkbox.disabled = userConfig.unrestricted !== false;
      checkbox.onchange = event => this._setEntityAllowed(
        entity.entity_id,
        event.currentTarget.checked,
      );
      const name = document.createElement("span");
      name.textContent = entity.name;
      row.append(checkbox, name);
      list.append(row);
    });
    if (!entities.length) {
      const empty = document.createElement("p");
      empty.className = "mha-admin-empty";
      empty.textContent = t("admin.noMatchingEntities", "No matching entities.");
      list.append(empty);
    }
    content.append(list);
    layout.append(sidebar, content);
    root.append(layout);

    this.dataset.theme = theme.theme;
    this.dataset.themeStyle = theme.themeStyle;
    this.dataset.iosGlass = theme.iosGlass;
    this._hassRenderSignature = this._getHassRenderSignature();
    this._restoreRenderState(renderState);
  }
}

if (!customElements.get("mha-admin-panel")) {
  customElements.define("mha-admin-panel", MhaAdminPanel);
}
