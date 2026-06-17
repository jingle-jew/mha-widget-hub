import { buildSliderServiceCall } from "./slider.js";
import { buildToggleServiceCall } from "./toggle.js";
import { buildMediaPlayerServiceCall } from "./media.js";

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

export function buildButtonServiceCall(widget, entityState) {
  const domain = entityState?.entity_id?.split(".")[0] || "";
  if (["light", "switch", "input_boolean"].includes(domain)) {
    return buildToggleServiceCall(entityState);
  }
  if (domain === "button" && entityState?.entity_id) {
    return {
      domain: "button",
      service: "press",
      data: { entity_id: entityState.entity_id },
    };
  }

  const action = widget?.action && typeof widget.action === "object"
    ? widget.action
    : widget;
  const actionDomain = String(action.actionDomain || action.domain || "").trim();
  const actionService = String(action.actionService || action.service || "").trim();
  if (!actionDomain || !actionService) return null;

  return {
    domain: actionDomain,
    service: actionService,
    data: action.actionData && typeof action.actionData === "object"
      ? action.actionData
      : action.data && typeof action.data === "object"
        ? action.data
        : {},
  };
}

export function runButtonAction(hass, widget, entityState) {
  return callHomeAssistantService(hass, buildButtonServiceCall(widget, entityState));
}

export function runSliderAction(hass, entityState, value) {
  return callHomeAssistantService(hass, buildSliderServiceCall(entityState, value));
}

export function runMediaPlayerAction(hass, entityState, action) {
  return callHomeAssistantService(hass, buildMediaPlayerServiceCall(entityState, action));
}
