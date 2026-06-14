import {
  getAllowedDomains,
  normalizeEntityVisibilityConfig,
} from "./entity-permissions.js";
import {
  loadEntityVisibilityConfig,
  loadHomeAssistantUsers,
  saveEntityVisibilityConfig,
} from "./entity-visibility-store.js";
import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { createThemeController } from "../settings/theme-controller.js";

const ROOT_URL = new URL("../../", import.meta.url);
const FRONTEND_VERSION = new URL(import.meta.url).searchParams.get("v");
const STYLES = [
  "styles/core/tokens.css",
  "styles/themes/ios.css",
  "styles/themes/oneui.css",
  "styles/themes/material.css",
  "styles/themes/accent-palettes.css",
  "styles/themes/semantic-tokens.css",
  "styles/admin/admin-panel.css",
];

function assetUrl(path) {
  const url = new URL(path, ROOT_URL);
  if (FRONTEND_VERSION) url.searchParams.set("v", FRONTEND_VERSION);
  return url.href;
}

function createOption(value, label, selected) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = value === selected;
  return option;
}

class MhaAdminPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._loadedUserId = "";
    this._users = [];
    this._config = normalizeEntityVisibilityConfig(null);
    this._selectedUserId = "";
    this._selectedDomain = getAllowedDomains()[0].value;
    this._search = "";
    this._loading = true;
    this._saving = false;
    this._error = "";
    this._themeController = createThemeController(this);
  }

  set hass(value) {
    this._hass = value;
    this._themeController.sync();
    const userId = String(value?.user?.id || "");
    if (value && userId && this._loadedUserId !== userId) {
      this._loadedUserId = userId;
      this._load();
    } else {
      this.render();
    }
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._themeController.sync();
    this.render();
  }

  async _load() {
    this._loading = true;
    this._error = "";
    this.render();
    try {
      const [users, config] = await Promise.all([
        loadHomeAssistantUsers(this._hass),
        loadEntityVisibilityConfig(this._hass),
      ]);
      this._users = users;
      this._config = config;
      this._selectedUserId = this._selectedUserId || users[0]?.id || "";
    } catch (error) {
      console.error("[MHA Admin] Loading failed.", error);
      this._error = "Impossible de charger la configuration MHA.";
    } finally {
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
      this._error = "La sauvegarde a échoué. Vérifie les droits administrateur.";
    } finally {
      this._saving = false;
      this.render();
    }
  }

  render() {
    const theme = this._themeController.sync();
    const links = STYLES.map(path => `<link rel="stylesheet" href="${assetUrl(path)}">`).join("");
    this.shadowRoot.innerHTML = `${links}<main class="mha-admin-root"></main>`;
    const root = this.shadowRoot.querySelector(".mha-admin-root");
    root.dataset.loading = String(this._loading);

    const header = document.createElement("header");
    header.className = "mha-admin-header";
    header.innerHTML = `
      <div>
        <span class="mha-admin-eyebrow">Configuration avancée</span>
        <h1>MHA Admin</h1>
        <p>Contrôle les entités proposées dans l’interface MHA pour chaque utilisateur.</p>
      </div>
    `;
    const save = document.createElement("button");
    save.className = "mha-admin-save";
    save.type = "button";
    save.disabled = this._loading || this._saving || !this._selectedUserId;
    save.textContent = this._saving ? "Sauvegarde…" : "Sauvegarder";
    save.onclick = () => this._save();
    header.append(save);
    root.append(header);

    const warning = document.createElement("aside");
    warning.className = "mha-admin-warning";
    warning.textContent = "Visibilité MHA uniquement : ces règles ne remplacent pas les permissions natives de Home Assistant.";
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
      loading.textContent = "Chargement de Home Assistant…";
      root.append(loading);
      return;
    }

    const layout = document.createElement("div");
    layout.className = "mha-admin-layout";
    const sidebar = document.createElement("section");
    sidebar.className = "mha-admin-card mha-admin-sidebar";
    const userLabel = document.createElement("label");
    userLabel.textContent = "Utilisateur Home Assistant";
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
    unrestricted.append(unrestrictedInput, document.createTextNode(" Aucune restriction MHA"));
    sidebar.append(userLabel, unrestricted);

    const domainNav = document.createElement("nav");
    domainNav.className = "mha-admin-domains";
    getAllowedDomains().forEach(domain => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.active = String(domain.value === this._selectedDomain);
      button.textContent = domain.label;
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
    title.textContent = domain?.label || "Entités";
    const search = document.createElement("input");
    search.className = "mha-admin-control mha-admin-search";
    search.type = "search";
    search.placeholder = "Rechercher une entité";
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
      empty.textContent = "Aucune entité correspondante.";
      list.append(empty);
    }
    content.append(list);
    layout.append(sidebar, content);
    root.append(layout);

    this.dataset.theme = theme.theme;
    this.dataset.themeStyle = theme.themeStyle;
    this.dataset.iosGlass = theme.iosGlass;
  }
}

if (!customElements.get("mha-admin-panel")) {
  customElements.define("mha-admin-panel", MhaAdminPanel);
}
