function reportStorageError(operation, key, error) {
  console.error("[mha-widget-hub] Storage operation failed", {
    operation,
    key,
    error: error?.name || "Error",
  });
}

export function readJsonResult(key) {
  let raw;

  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    reportStorageError("read", key, error);
    return { ok: false, exists: false, value: null, raw: null };
  }

  if (raw === null) {
    return { ok: true, exists: false, value: null, raw: null };
  }

  try {
    return { ok: true, exists: true, value: JSON.parse(raw), raw };
  } catch (error) {
    reportStorageError("parse", key, error);
    return { ok: false, exists: true, value: null, raw };
  }
}

export function readJson(key, fallback) {
  const result = readJsonResult(key);
  return result.ok && result.exists ? result.value ?? fallback : fallback;
}

export function writeStorageValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    reportStorageError("write", key, error);
    return false;
  }
}

export function writeJson(key, value) {
  try {
    return writeStorageValue(key, JSON.stringify(value));
  } catch (error) {
    reportStorageError("serialize", key, error);
    return false;
  }
}

export function createStorageBackup(backupKey, keys, metadata = {}) {
  try {
    if (localStorage.getItem(backupKey) !== null) return true;

    const entries = Object.fromEntries(
      keys.map(key => [key, localStorage.getItem(key)]),
    );

    return writeJson(backupKey, {
      ...metadata,
      createdAt: new Date().toISOString(),
      entries,
    });
  } catch (error) {
    reportStorageError("backup", backupKey, error);
    return false;
  }
}
