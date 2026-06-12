import { buildSliderServiceCall } from "./slider.js";
import { buildToggleServiceCall } from "./toggle.js";

export async function callHomeAssistantService(hass, serviceCall) {
  if (!hass?.callService || !serviceCall?.domain || !serviceCall?.service) {
    return false;
  }

  try {
    await hass.callService(
      serviceCall.domain,
      serviceCall.service,
      serviceCall.data || {},
    );
    return true;
  } catch (error) {
    console.error("[mha-widget-hub] Home Assistant service call failed", error);
    return false;
  }
}

export function runToggleAction(hass, entityState) {
  return callHomeAssistantService(hass, buildToggleServiceCall(entityState));
}

export function runSliderAction(hass, entityState, value) {
  return callHomeAssistantService(hass, buildSliderServiceCall(entityState, value));
}
