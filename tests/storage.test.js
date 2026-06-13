import test from "node:test";
import assert from "node:assert/strict";
import {
  createStorageBackup,
  readJson,
  readJsonResult,
  writeJson,
} from "../src/core/storage.js";

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
