import { createSystemIconSymbol } from "./system-icons.js";

export const SYSTEM_MESSAGE_VARIANTS = Object.freeze([
  "confirmation",
  "info",
  "warning",
  "error",
]);

const DEFAULT_DURATION_MS = 2400;

export function normalizeSystemMessageVariant(value = "info") {
  const normalized = String(value || "").trim().toLowerCase();
  return SYSTEM_MESSAGE_VARIANTS.includes(normalized) ? normalized : "info";
}

export function createSystemMessagePopup({
  defaultDuration = DEFAULT_DURATION_MS,
  className = "",
} = {}) {
  const popup = document.createElement("div");
  popup.className = ["mha-system-message-popup", className].filter(Boolean).join(" ");
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");
  popup.setAttribute("aria-atomic", "true");
  popup.dataset.open = "false";
  popup.dataset.variant = "info";

  const icon = document.createElement("span");
  icon.className = "mha-system-message-popup-icon";
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "mha-system-message-popup-text";
  popup.append(icon, text);

  let dismissTimer = 0;

  const clearDismissTimer = () => {
    if (!dismissTimer) return;
    globalThis.clearTimeout?.(dismissTimer);
    dismissTimer = 0;
  };

  const hide = () => {
    clearDismissTimer();
    popup.dataset.open = "false";
  };

  const show = ({
    message,
    variant = "info",
    duration = defaultDuration,
  } = {}) => {
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) {
      hide();
      return false;
    }

    clearDismissTimer();
    const normalizedVariant = normalizeSystemMessageVariant(variant);
    popup.dataset.variant = normalizedVariant;
    popup.dataset.open = "true";
    popup.setAttribute("role", normalizedVariant === "error" ? "alert" : "status");
    popup.setAttribute("aria-live", normalizedVariant === "error" ? "assertive" : "polite");
    icon.replaceChildren(createSystemIconSymbol({ name: normalizedVariant }));
    text.textContent = normalizedMessage;

    const normalizedDuration = Number(duration);
    if (Number.isFinite(normalizedDuration) && normalizedDuration > 0) {
      dismissTimer = globalThis.setTimeout?.(hide, normalizedDuration) || 0;
    }
    return true;
  };

  popup.__mhaShowMessage = show;
  popup.__mhaHideMessage = hide;
  popup.__mhaDestroy = () => {
    clearDismissTimer();
    delete popup.__mhaShowMessage;
    delete popup.__mhaHideMessage;
    delete popup.__mhaDestroy;
  };
  return popup;
}

export function showSystemMessage(popup, options = {}) {
  return popup?.__mhaShowMessage?.(options) === true;
}
