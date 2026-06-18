import { getAllowedDomains } from "./entity-permissions.js";
import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { t } from "../i18n/index.js";

export function captureAdminRenderState(shadowRoot, host) {
  const active = shadowRoot?.activeElement;
  const search = shadowRoot?.querySelector(".mha-admin-search");
  return {
    hostScrollTop: host?.scrollTop || 0,
    entityListScrollTop: shadowRoot?.querySelector(".mha-admin-entity-list")?.scrollTop || 0,
    searchFocused: Boolean(active && search && active === search),
    searchSelectionStart: search?.selectionStart ?? null,
    searchSelectionEnd: search?.selectionEnd ?? null,
  };
}

export function restoreAdminRenderState(shadowRoot, host, state) {
  if (!state) return;
  const restore = () => {
    if (host) host.scrollTop = state.hostScrollTop;
    const list = shadowRoot?.querySelector(".mha-admin-entity-list");
    if (list) list.scrollTop = state.entityListScrollTop;
    if (state.searchFocused) {
      const search = shadowRoot?.querySelector(".mha-admin-search");
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

export function renderAdminPanel(shadowRoot, {
  linksHtml = "",
  theme,
  loading = true,
  saving = false,
  error = "",
  selectedUserId = "",
  selectedDomain = "",
  searchQuery = "",
  users = [],
  userConfig = { unrestricted: true, allowedEntities: {} },
  hass = null,
  createOption,
  onSave,
  onSelectUser,
  onToggleUnrestricted,
  onSelectDomain,
  onSearchInput,
  onSetEntityAllowed,
} = {}) {
  shadowRoot.innerHTML = `${linksHtml}<main class="mha-admin-root"></main>`;
  const root = shadowRoot.querySelector(".mha-admin-root");
  root.dataset.loading = String(loading);

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
  save.disabled = loading || saving || !selectedUserId;
  save.textContent = saving ? t("common.saving", "Saving...") : t("common.save", "Save");
  save.onclick = () => onSave?.();
  header.append(save);
  root.append(header);

  const warning = document.createElement("aside");
  warning.className = "mha-admin-warning";
  warning.textContent = t("admin.warning", "MHA visibility only: these rules do not replace native Home Assistant permissions.");
  root.append(warning);

  if (error) {
    const errorNode = document.createElement("p");
    errorNode.className = "mha-admin-error";
    errorNode.textContent = error;
    root.append(errorNode);
  }

  if (loading) {
    const loadingNode = document.createElement("p");
    loadingNode.className = "mha-admin-empty";
    loadingNode.textContent = t("admin.loading", "Loading Home Assistant...");
    root.append(loadingNode);
    return root;
  }

  const layout = document.createElement("div");
  layout.className = "mha-admin-layout";

  const sidebar = document.createElement("section");
  sidebar.className = "mha-admin-card mha-admin-sidebar";

  const userLabel = document.createElement("label");
  userLabel.textContent = t("admin.homeAssistantUser", "Home Assistant user");
  const userSelect = document.createElement("select");
  userSelect.className = "mha-admin-control";
  users.forEach(user => userSelect.append(createOption(
    user.id,
    `${user.name}${user.is_admin ? " · Admin" : ""}`,
    selectedUserId,
  )));
  userSelect.onchange = event => onSelectUser?.(event.currentTarget.value);
  userLabel.append(userSelect);

  const unrestricted = document.createElement("label");
  unrestricted.className = "mha-admin-mode";
  const unrestrictedInput = document.createElement("input");
  unrestrictedInput.type = "checkbox";
  unrestrictedInput.checked = userConfig.unrestricted !== false;
  unrestrictedInput.onchange = event => onToggleUnrestricted?.(event.currentTarget.checked);
  unrestricted.append(unrestrictedInput, document.createTextNode(` ${t("admin.noRestrictions", "No MHA restrictions")}`));
  sidebar.append(userLabel, unrestricted);

  const domainNav = document.createElement("nav");
  domainNav.className = "mha-admin-domains";
  getAllowedDomains().forEach(domain => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.active = String(domain.value === selectedDomain);
    button.textContent = t(`admin.domainsList.${domain.value}`, domain.label);
    button.onclick = () => onSelectDomain?.(domain.value);
    domainNav.append(button);
  });
  sidebar.append(domainNav);

  const content = document.createElement("section");
  content.className = "mha-admin-card mha-admin-content";
  const domain = getAllowedDomains().find(item => item.value === selectedDomain);
  const contentHeader = document.createElement("div");
  contentHeader.className = "mha-admin-content-header";

  const title = document.createElement("h2");
  title.textContent = domain ? t(`admin.domainsList.${domain.value}`, domain.label) : t("admin.entities", "Entities");

  const search = document.createElement("input");
  search.className = "mha-admin-control mha-admin-search";
  search.type = "search";
  search.placeholder = t("admin.searchEntity", "Search entity");
  search.value = searchQuery;
  search.oninput = event => onSearchInput?.(event.currentTarget.value);

  contentHeader.append(title, search);
  content.append(contentHeader);

  const query = searchQuery.trim().toLocaleLowerCase();
  const entities = getEntitiesForDomain(hass, selectedDomain)
    .filter(entity => !query || entity.name.toLocaleLowerCase().includes(query));
  const allowed = new Set(userConfig.allowedEntities?.[selectedDomain] || []);
  const list = document.createElement("div");
  list.className = "mha-admin-entity-list";

  entities.forEach(entity => {
    const row = document.createElement("label");
    row.className = "mha-admin-entity-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = userConfig.unrestricted !== false || allowed.has(entity.entity_id);
    checkbox.disabled = userConfig.unrestricted !== false;
    checkbox.onchange = event => onSetEntityAllowed?.(
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

  if (theme) {
    const host = shadowRoot.host;
    host.dataset.theme = theme.theme;
    host.dataset.themeStyle = theme.themeStyle;
    host.dataset.iosGlass = theme.iosGlass;
  }

  return root;
}
