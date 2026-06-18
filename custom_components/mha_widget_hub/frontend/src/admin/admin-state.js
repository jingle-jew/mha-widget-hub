import {
  getAllowedDomains,
  normalizeEntityVisibilityConfig,
} from "./entity-permissions.js";

export function createInitialAdminState() {
  return {
    loadedUserId: "",
    failedUserId: "",
    loadingUserId: "",
    loadPromise: null,
    loadRequestId: 0,
    users: [],
    config: normalizeEntityVisibilityConfig(null),
    selectedUserId: "",
    selectedDomain: getAllowedDomains()[0].value,
    search: "",
    loading: true,
    saving: false,
    error: "",
    hassRenderSignature: "",
  };
}

export function getDefaultUserConfig(config, selectedUserId = "") {
  return config?.users?.[selectedUserId] || {
    unrestricted: true,
    allowedEntities: {},
  };
}

export function getHassRenderSignature(hass, selectedDomain = "") {
  const userId = String(hass?.user?.id || "");
  const states = hass?.states || {};
  const entities = Object.keys(states)
    .filter(entityId => entityId.startsWith(`${selectedDomain}.`))
    .sort()
    .map(entityId => {
      const name = String(states[entityId]?.attributes?.friendly_name || "");
      return `${entityId}:${name}`;
    })
    .join("|");
  return `${userId}|${selectedDomain}|${entities}`;
}

export function updateUserConfig(config, selectedUserId = "", patch = {}) {
  const current = getDefaultUserConfig(config, selectedUserId);
  return normalizeEntityVisibilityConfig({
    ...config,
    users: {
      ...config?.users,
      [selectedUserId]: { ...current, ...patch },
    },
  });
}

export function setEntityAllowed(config, {
  selectedUserId = "",
  selectedDomain = "",
  entityId = "",
  checked = false,
} = {}) {
  const current = getDefaultUserConfig(config, selectedUserId);
  const selected = new Set(current.allowedEntities?.[selectedDomain] || []);
  if (checked) selected.add(entityId);
  else selected.delete(entityId);

  return updateUserConfig(config, selectedUserId, {
    unrestricted: false,
    allowedEntities: {
      ...current.allowedEntities,
      [selectedDomain]: [...selected],
    },
  });
}
