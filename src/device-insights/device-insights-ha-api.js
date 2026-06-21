export const DEVICE_INSIGHTS_GET_COMMAND = "mha_widget_hub/device_insights/get";
export const DEVICE_INSIGHTS_PUBLISH_COMMAND = "mha_widget_hub/device_insights/publish";
export const DEVICE_INSIGHTS_DELETE_COMMAND = "mha_widget_hub/device_insights/delete";

async function callDeviceInsightsWebSocket(hass, payload) {
  if (typeof hass?.callWS !== "function") {
    throw new Error("Home Assistant connection unavailable.");
  }
  return hass.callWS(payload);
}

export async function loadDeviceInsights(hass) {
  const response = await callDeviceInsightsWebSocket(hass, {
    type: DEVICE_INSIGHTS_GET_COMMAND,
  });
  return Array.isArray(response?.devices) ? response.devices : [];
}

export async function publishDeviceInsightsSnapshot(hass, snapshot) {
  return callDeviceInsightsWebSocket(hass, {
    type: DEVICE_INSIGHTS_PUBLISH_COMMAND,
    snapshot,
  });
}

export async function deleteDeviceInsightsSnapshot(hass, deviceId) {
  return callDeviceInsightsWebSocket(hass, {
    type: DEVICE_INSIGHTS_DELETE_COMMAND,
    device_id: deviceId,
  });
}
