import { normalizeEntityVisibilityConfig } from "./entity-permissions.js";

export const GET_COMMAND = "mha_widget_hub/entity_visibility/get";
export const SAVE_COMMAND = "mha_widget_hub/entity_visibility/save";
export const USERS_COMMAND = "mha_widget_hub/users/list";

function serializeWebSocketError(error) {
  return {
    raw: error,
    message: error?.message || String(error || "Unknown WebSocket error"),
    code: error?.code || "",
    stack: error?.stack || "",
  };
}

async function callMhaWebSocket(hass, payload) {
  if (typeof hass?.callWS !== "function") {
    const error = new Error("Home Assistant connection unavailable.");
    console.error("[MHA Admin] WebSocket unavailable.", {
      type: payload?.type,
      payload,
      ...serializeWebSocketError(error),
    });
    throw error;
  }

  try {
    return await hass.callWS(payload);
  } catch (error) {
    console.error("[MHA Admin] WebSocket call failed.", {
      type: payload?.type,
      payload,
      ...serializeWebSocketError(error),
    });
    throw error;
  }
}

export async function loadEntityVisibilityConfig(hass) {
  const response = await callMhaWebSocket(hass, { type: GET_COMMAND });
  return normalizeEntityVisibilityConfig(response);
}

export async function saveEntityVisibilityConfig(hass, config) {
  return normalizeEntityVisibilityConfig(await callMhaWebSocket(hass, {
    type: SAVE_COMMAND,
    config: normalizeEntityVisibilityConfig(config),
  }));
}

export async function loadHomeAssistantUsers(hass) {
  const response = await callMhaWebSocket(hass, { type: USERS_COMMAND });
  return Array.isArray(response?.users) ? response.users : [];
}
