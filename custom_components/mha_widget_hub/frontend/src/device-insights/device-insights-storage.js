import { readBoolean, writeStorageValue } from "../core/storage.js";
import { STORAGE_KEYS } from "../core/storage-keys.js";

const DEVICE_ID_PREFIX = "mha-device";

function createRandomToken() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function isDeviceInsightsEnabled(storage = localStorage) {
  return readBoolean(STORAGE_KEYS.deviceInsightsEnabled, false, storage);
}

export function setDeviceInsightsEnabled(enabled = false, storage = localStorage) {
  return writeStorageValue(STORAGE_KEYS.deviceInsightsEnabled, Boolean(enabled), storage);
}

export function getDeviceInsightsId(storage = localStorage) {
  let id = "";
  try {
    id = String(storage.getItem(STORAGE_KEYS.deviceInsightsId) || "").trim();
  } catch (_error) {
    id = "";
  }

  if (id) return id;

  id = `${DEVICE_ID_PREFIX}-${createRandomToken()}`;
  writeStorageValue(STORAGE_KEYS.deviceInsightsId, id, storage);
  return id;
}

export function getDeviceInsightsName(storage = localStorage) {
  try {
    return String(storage.getItem(STORAGE_KEYS.deviceInsightsName) || "").trim() || "MHA Device";
  } catch (_error) {
    return "MHA Device";
  }
}

export function setDeviceInsightsLastPublished(value = new Date().toISOString(), storage = localStorage) {
  return writeStorageValue(STORAGE_KEYS.deviceInsightsLastPublished, value, storage);
}

export function readDeviceInsightsLocalState(storage = localStorage) {
  return {
    enabled: isDeviceInsightsEnabled(storage),
    deviceId: getDeviceInsightsId(storage),
    deviceName: getDeviceInsightsName(storage),
  };
}
