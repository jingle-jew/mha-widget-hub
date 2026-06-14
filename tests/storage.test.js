import test from "node:test";
import assert from "node:assert/strict";
import {
  createStorageBackup,
  readBoolean,
  readJson,
  readJsonResult,
  readNumberOption,
  writeJson,
} from "../src/core/storage.js";
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  LEGACY_STORAGE_PREFIX,
  STORAGE_KEYS,
} from "../src/core/storage-keys.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    values,
  };
}

function withStorage(storage, run) {
  const previousStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const previousError = console.error;
  const errors = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  console.error = (...args) => errors.push(args);

  try {
    return run(errors);
  } finally {
    console.error = previousError;
    if (previousStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        "localStorage",
        previousStorageDescriptor,
      );
    } else {
      delete globalThis.localStorage;
    }
  }
}

test("JSON reads distinguish missing, valid and corrupt values", () => {
  withStorage(createStorage({
    valid: JSON.stringify({ enabled: true }),
    corrupt: "{not-json",
  }), (errors) => {
    assert.deepEqual(readJsonResult("missing"), {
      ok: true,
      exists: false,
      value: null,
      raw: null,
    });
    assert.deepEqual(readJson("valid", null), { enabled: true });

    const corrupt = readJsonResult("corrupt");
    assert.equal(corrupt.ok, false);
    assert.equal(corrupt.exists, true);
    assert.equal(corrupt.raw, "{not-json");
    assert.equal(readJson("corrupt", "fallback"), "fallback");
    assert.equal(errors.length, 2);
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
    schemaVersion: "mha-storage-schema-version",
    schemaMigrationBackup: "mha-storage-backup-before-v1",
    screensaverEnabled: "mha-screensaver-enabled",
    screensaverDelay: "mha-screensaver-delay",
    screensaverNowBar: "mha-screensaver-nowbar",
    screensaverClockVariant: "mha-screensaver-clock-variant",
    legacyScreensaverClockVariant: "mha-screensaver-clock",
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
    assert.equal(writeJson("mha-grid-pages", []), false);
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0][1], {
      operation: "write",
      key: "mha-grid-pages",
      error: "QuotaExceededError",
    });
  });
});

test("migration backups preserve raw values and never overwrite the first backup", () => {
  const storage = createStorage({
    "mha-grid-pages": "{corrupt",
    "mha-grid-order": "[\"legacy-widget\"]",
  });

  withStorage(storage, () => {
    assert.equal(createStorageBackup(
      "mha-storage-backup-before-v1",
      ["mha-grid-pages", "mha-grid-order", "missing"],
      { fromSchemaVersion: 0, toSchemaVersion: 1 },
    ), true);

    const backup = JSON.parse(storage.values.get("mha-storage-backup-before-v1"));
    assert.equal(backup.entries["mha-grid-pages"], "{corrupt");
    assert.equal(backup.entries["mha-grid-order"], "[\"legacy-widget\"]");
    assert.equal(backup.entries.missing, null);

    storage.values.set("mha-grid-pages", "replacement");
    assert.equal(createStorageBackup(
      "mha-storage-backup-before-v1",
      ["mha-grid-pages"],
    ), true);
    assert.equal(
      JSON.parse(storage.values.get("mha-storage-backup-before-v1"))
        .entries["mha-grid-pages"],
      "{corrupt",
    );
  });
});
