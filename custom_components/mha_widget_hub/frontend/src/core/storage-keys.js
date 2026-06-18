export const STORAGE_KEYS = Object.freeze({
  gridOrder: "mha-grid-order",
  widgetSizes: "mha-widget-sizes",
  hiddenWidgets: "mha-hidden-widgets",
  widgetPositions: "mha-widget-positions",
  customWidgets: "mha-custom-widgets",
  gridPages: "mha-grid-pages",
  activePage: "mha-active-page",
  dockPosition: "mha-dock-position",
  hideHaSidebar: "mha-hide-ha-sidebar",
  language: "mha-language",
  schemaVersion: "mha-storage-schema-version",
  schemaMigrationBackup: "mha-storage-backup-before-v1",
  screensaverEnabled: "mha-screensaver-enabled",
  screensaverDelay: "mha-screensaver-delay",
  screensaverNowBar: "mha-screensaver-nowbar",
  screensaverNowBarItems: "mha-screensaver-nowbar-items",
  screensaverClockVariant: "mha-screensaver-clock-variant",
  legacyScreensaverClockVariant: "mha-screensaver-clock",
});

export const CURRENT_STORAGE_SCHEMA_VERSION = 1;
export const LEGACY_STORAGE_PREFIX = ["mha", "v2"].join("-");
