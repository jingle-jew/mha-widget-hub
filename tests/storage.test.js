import test from "node:test";
import assert from "node:assert/strict";
import {
  createStorageBackup,
  readBoolean,
  readJson,
  readJsonResult,
  readNumberOption,
  writeJson,
  writeStorageValue,
} from "../src/core/storage.js";
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  LEGACY_STORAGE_PREFIX,
  STORAGE_KEYS,
} from "../src/core/storage-keys.js";

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    get length() {
      return data.size;
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    },
  };
}

function withStorage(storage, callback) {
  const original = globalThis.localStorage;
  const errors = [];
  const originalConsoleError = console.error;
  globalThis.localStorage = storage;
  console.error = (...args) => errors.push(args);
  try {
    return callback(errors);
  } finally {
    globalThis.localStorage = original;
    console.error = originalConsoleError;
  }
}

test("readJsonResult reports missing, valid, and malformed JSON", () => {
  withStorage(createStorage({
    valid: JSON.stringify({ ok: true }),
    invalid: "{bad",
  }), (errors) => {
    assert.deepEqual(readJsonResult("missing"), {
      ok: true,
      exists: false,
      value: null,
      raw: null,
    });
    assert.deepEqual(readJsonResult("valid"), {
      ok: true,
      exists: true,
      value: { ok: true },
      raw: JSON.stringify({ ok: true }),
    });
    assert.equal(readJsonResult("invalid").ok, false);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], "[mha-widget-hub] Storage operation failed");
    assert.equal(errors[0][1].operation, "parse");
    assert.equal(errors[0][1].key, "invalid");
  });
});

test("readJson returns fallback on missing or invalid values", () => {
  withStorage(createStorage({ valid: JSON.stringify([1, 2]) }), () => {
    assert.deepEqual(readJson("valid", []), [1, 2]);
    assert.deepEqual(readJson("missing", [3]), [3]);
  });
});

test("write helpers persist strings and JSON", () => {
  const storage = createStorage();
  withStorage(storage, () => {
    assert.equal(writeStorageValue("key", 123), true);
    assert.equal(writeJson("json", { value: true }), true);
    assert.deepEqual(storage.snapshot(), {
      key: "123",
      json: JSON.stringify({ value: true }),
    });
  });
});

test("typed reads preserve stored preferences and use explicit fallbacks", () => {
  withStorage(createStorage({
    enabled: "true",
    disabled: "false",
    invalidBoolean: "yes",
    allowedDelay: "30000",
    invalidDelay: "45000",
  }), () => {
    assert.equal(readBoolean("enabled", false), true);
    assert.equal(readBoolean("disabled", true), false);
    assert.equal(readBoolean("invalidBoolean", true), false);
    assert.equal(readBoolean("missing", true), true);
    assert.equal(
      readNumberOption("allowedDelay", 15000, [15000, 30000]),
      30000,
    );
    assert.equal(
      readNumberOption("invalidDelay", 15000, [15000, 30000]),
      15000,
    );
    assert.equal(
      readNumberOption("missingDelay", 15000, [15000, 30000]),
      15000,
    );
  });
});

test("storage keys keep the existing browser persistence contract", () => {
  assert.deepEqual(STORAGE_KEYS, {
    gridOrder: "mha-grid-order",
    widgetSizes: "mha-widget-sizes",
    hiddenWidgets: "mha-hidden-widgets",
    widgetPositions: "mha-widget-positions",
    customWidgets: "mha-custom-widgets",
    gridPages: "mha-grid-pages",
    activePage: "mha-active-page",
    dockPosition: "mha-dock-position",
    hideHaSidebar: "mha-hide-ha-sidebar",
    dockLabels: "mha-dock-labels",
    language: "mha-language",
    schemaVersion: "mha-storage-schema-version",
    schemaMigrationBackup: "mha-storage-backup-before-v1",
    screensaverEnabled: "mha-screensaver-enabled",
    screensaverDelay: "mha-screensaver-delay",
    screensaverNowBar: "mha-screensaver-nowbar",
    screensaverNowBarItems: "mha-screensaver-nowbar-items",
    screensaverNowBarConfig: "mha-screensaver-nowbar-config",
    screensaverClockVariant: "mha-screensaver-clock-variant",
    legacyScreensaverClockVariant: "mha-screensaver-clock",
    deviceInsightsEnabled: "mha-device-insights-enabled",
    deviceInsightsId: "mha-device-insights-id",
    deviceInsightsName: "mha-device-insights-name",
    deviceInsightsLastPublished: "mha-device-insights-last-published",
  });
  assert.equal(CURRENT_STORAGE_SCHEMA_VERSION, 1);
  assert.equal(LEGACY_STORAGE_PREFIX, "mha-v2");
});

test("JSON writes return false and report non-sensitive failure metadata", () => {
  const storage = createStorage();
  storage.setItem = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };

  withStorage(storage, (errors) => {
    assert.equal(writeJson("too-big", { value: true }), false);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], "[mha-widget-hub] Storage operation failed");
    assert.deepEqual(errors[0][1], {
      operation: "write",
      key: "too-big",
      error: "QuotaExceededError",
    });
  });
});

test("createStorageBackup stores raw entries only once", () => {
  const storage = createStorage({ a: "1", b: "2" });
  withStorage(storage, () => {
    assert.equal(createStorageBackup("backup", ["a", "b"], { version: 1 }), true);
    const first = JSON.parse(storage.getItem("backup"));
    assert.equal(first.version, 1);
    assert.deepEqual(first.entries, { a: "1", b: "2" });
    assert.equal(createStorageBackup("backup", ["a"], { version: 2 }), true);
    const second = JSON.parse(storage.getItem("backup"));
    assert.equal(second.version, 1);
    assert.deepEqual(second.entries, { a: "1", b: "2" });
  });
});
