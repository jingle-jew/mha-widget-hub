import { normalizeEntityVisibilityConfig } from "./entity-permissions.js";

const GET_COMMAND = "mha_widget_hub/entity_visibility/get";
const SAVE_COMMAND = "mha_widget_hub/entity_visibility/save";
const USERS_COMMAND = "mha_widget_hub/users/list";

export async function loadEntityVisibilityConfig(hass) {
  if (typeof hass?.callWS !== "function") {
    return normalizeEntityVisibilityConfig(null);
  }
  return normalizeEntityVisibilityConfig(
    await hass.callWS({ type: GET_COMMAND }),
  );
}

export async function saveEntityVisibilityConfig(hass, config) {
  if (typeof hass?.callWS !== "function") {
    throw new Error("Connexion Home Assistant indisponible.");
  }
  return normalizeEntityVisibilityConfig(await hass.callWS({
    type: SAVE_COMMAND,
    config: normalizeEntityVisibilityConfig(config),
  }));
}

export async function loadHomeAssistantUsers(hass) {
  if (typeof hass?.callWS !== "function") return [];
  const response = await hass.callWS({ type: USERS_COMMAND });
  return Array.isArray(response?.users) ? response.users : [];
}
