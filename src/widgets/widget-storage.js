import { normalizeWidgetSize } from "../layout/layout-engine.js";
import { normalizeWidgetContract } from "./widget-registry.js";

export function normalizeStoredWidgetContract(widget = {}) {
  return normalizeWidgetContract(widget, normalizeWidgetSize);
}
