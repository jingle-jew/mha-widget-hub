import {
  OVERVIEW_DEFAULT_INACTIVITY_SECONDS,
  normalizeOverviewPageConfig,
} from "./overview-page-config.js";

const VALID_EDITING_SECTIONS = new Set(["", "rooms", "devices"]);

export class OverviewPageController {
  constructor({
    config = {},
    mobile = false,
    onStateChange = () => {},
    setTimeoutFn = globalThis.setTimeout,
    clearTimeoutFn = globalThis.clearTimeout,
  } = {}) {
    this.config = normalizeOverviewPageConfig(config);
    this.mobile = Boolean(mobile);
    this.onStateChange = onStateChange;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.selectedAreaId = "";
    this.editingSection = "";
    this.sheetOpen = false;
    this.destroyed = false;
    this.inactivityTimer = null;
  }

  read() {
    return {
      selectedAreaId: this.selectedAreaId,
      editingSection: this.editingSection,
      sheetOpen: this.sheetOpen,
    };
  }

  updateConfig(config = {}) {
    this.config = normalizeOverviewPageConfig(config);
    if (this.selectedAreaId && !this.editingSection) this.restartInactivityTimer();
    return this.config;
  }

  notify(reason = "state") {
    if (this.destroyed) return;
    this.onStateChange(this.read(), reason);
  }

  selectArea(areaId = "") {
    const nextAreaId = String(areaId || "").trim();
    if (!nextAreaId || this.destroyed) return false;
    this.selectedAreaId = nextAreaId;
    this.sheetOpen = this.mobile;
    if (this.editingSection === "devices") this.editingSection = "";
    this.restartInactivityTimer();
    this.notify("area-selected");
    return true;
  }

  clearSelection(reason = "selection-cleared") {
    const changed = Boolean(this.selectedAreaId || this.sheetOpen || this.editingSection === "devices");
    this.clearInactivityTimer();
    this.selectedAreaId = "";
    this.sheetOpen = false;
    if (this.editingSection === "devices") this.editingSection = "";
    if (changed) this.notify(reason);
    return changed;
  }

  closeSheet() {
    if (!this.mobile) return false;
    return this.clearSelection("sheet-closed");
  }

  setEditingSection(section = "") {
    const next = VALID_EDITING_SECTIONS.has(section) ? section : "";
    if (next === "devices" && !this.selectedAreaId) return false;
    if (next === this.editingSection) return true;
    this.editingSection = next;
    if (next) this.clearInactivityTimer();
    else this.restartInactivityTimer();
    this.notify("editing-changed");
    return true;
  }

  toggleEditingSection(section = "") {
    return this.setEditingSection(this.editingSection === section ? "" : section);
  }

  activity() {
    if (!this.selectedAreaId || this.editingSection || this.destroyed) return false;
    this.restartInactivityTimer();
    return true;
  }

  clearInactivityTimer() {
    if (this.inactivityTimer == null) return false;
    this.clearTimeoutFn(this.inactivityTimer);
    this.inactivityTimer = null;
    return true;
  }

  restartInactivityTimer() {
    this.clearInactivityTimer();
    if (!this.selectedAreaId || this.editingSection || this.destroyed) return false;
    const seconds = Number(this.config.inactivitySeconds) || OVERVIEW_DEFAULT_INACTIVITY_SECONDS;
    this.inactivityTimer = this.setTimeoutFn(() => {
      this.inactivityTimer = null;
      this.clearSelection("inactivity-expired");
    }, seconds * 1000);
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearInactivityTimer();
    this.selectedAreaId = "";
    this.sheetOpen = false;
    this.editingSection = "";
    this.onStateChange = () => {};
  }
}

export function createOverviewPageController(options = {}) {
  return new OverviewPageController(options);
}
