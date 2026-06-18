import { FRONTEND_VERSION, ROOT_URL } from "./admin-constants.js";

export function assetUrl(path) {
  const url = new URL(path, ROOT_URL);
  if (FRONTEND_VERSION) url.searchParams.set("v", FRONTEND_VERSION);
  return url.href;
}

export function createOption(value, label, selected) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = value === selected;
  return option;
}

export function describeLoadError(label, error) {
  return {
    source: label,
    raw: error,
    message: error?.message || String(error || "Unknown error"),
    code: error?.code || "",
    stack: error?.stack || "",
  };
}

export function createLoadFailure(source, cause, fallbackMessage) {
  return {
    mhaLoadSource: source,
    cause: cause || new Error(fallbackMessage),
  };
}
