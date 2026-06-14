import { buildSliderServiceCall } from "./slider.js";
import { buildToggleServiceCall } from "./toggle.js";

export function createLatestValueAction(runAction, { intervalMs = 80 } = {}) {
  let inFlight = false;
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  let pendingValue = null;
  let pendingFinal = false;

  const start = async (value, isFinal = false) => {
    inFlight = true;
    lastStartedAt = performance.now();

    try {
      await runAction(value);
    } finally {
      inFlight = false;
      if (pendingValue === null) return;

      const nextValue = pendingValue;
      const nextIsFinal = pendingFinal;
      pendingValue = null;
      pendingFinal = false;

      if (nextIsFinal || performance.now() - lastStartedAt >= intervalMs) {
        start(nextValue, nextIsFinal);
      } else {
        pendingValue = nextValue;
      }
    }
  };

  return {
    update(value) {
      pendingValue = value;
      if (inFlight || performance.now() - lastStartedAt < intervalMs) return;

      const nextValue = pendingValue;
      pendingValue = null;
      start(nextValue);
    },
    commit(value) {
      pendingValue = value;
      pendingFinal = true;
      if (inFlight) return;

      const nextValue = pendingValue;
      pendingValue = null;
      pendingFinal = false;
      start(nextValue, true);
    },
    clear() {
      pendingValue = null;
      pendingFinal = false;
    },
  };
}

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

export function runToggleAction(hass, entityState, nextOn) {
  return callHomeAssistantService(hass, buildToggleServiceCall(entityState, nextOn));
}

export function runSliderAction(hass, entityState, value) {
  return callHomeAssistantService(hass, buildSliderServiceCall(entityState, value));
}
