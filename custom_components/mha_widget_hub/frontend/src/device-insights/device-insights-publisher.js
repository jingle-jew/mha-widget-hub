import {
  deleteDeviceInsightsSnapshot,
  publishDeviceInsightsSnapshot,
} from "./device-insights-ha-api.js";
import {
  getDeviceInsightsId,
  isDeviceInsightsEnabled,
  setDeviceInsightsEnabled,
  setDeviceInsightsLastPublished,
} from "./device-insights-storage.js";
import { buildDeviceInsightsSnapshot } from "./device-insights-snapshot.js";

const PUBLISH_THROTTLE_MS = 30000;

export function createDeviceInsightsPublisher(host) {
  let publishTimer = 0;
  let lastPublishAt = 0;
  let publishing = false;

  function getHass() {
    return host?._hass || host?.hass || null;
  }

  async function publishNow({ force = false } = {}) {
    if (!isDeviceInsightsEnabled()) return false;
    const hass = getHass();
    if (!hass) return false;
    if (publishing) return false;

    const now = Date.now();
    if (!force && lastPublishAt && now - lastPublishAt < PUBLISH_THROTTLE_MS) {
      schedulePublish(PUBLISH_THROTTLE_MS - (now - lastPublishAt));
      return false;
    }

    publishing = true;
    try {
      const snapshot = buildDeviceInsightsSnapshot({ host, hass });
      await publishDeviceInsightsSnapshot(hass, snapshot);
      lastPublishAt = Date.now();
      setDeviceInsightsLastPublished(new Date(lastPublishAt).toISOString());
      return true;
    } catch (error) {
      console.warn("[MHA Insights] Unable to publish device snapshot.", error);
      return false;
    } finally {
      publishing = false;
    }
  }

  function schedulePublish(delay = 0) {
    if (!isDeviceInsightsEnabled()) return;
    clearTimeout(publishTimer);
    publishTimer = window.setTimeout(() => {
      publishTimer = 0;
      publishNow();
    }, Math.max(0, delay));
  }

  async function deleteCurrentSnapshot() {
    clearTimeout(publishTimer);
    publishTimer = 0;
    const hass = getHass();
    if (!hass) return false;

    try {
      await deleteDeviceInsightsSnapshot(hass, getDeviceInsightsId());
      return true;
    } catch (error) {
      console.warn("[MHA Insights] Unable to delete device snapshot.", error);
      return false;
    }
  }

  async function setEnabled(enabled = false) {
    setDeviceInsightsEnabled(Boolean(enabled));
    if (enabled) {
      await publishNow({ force: true });
      return true;
    }
    await deleteCurrentSnapshot();
    return false;
  }

  function destroy() {
    clearTimeout(publishTimer);
    publishTimer = 0;
  }

  return {
    isEnabled: isDeviceInsightsEnabled,
    setEnabled,
    schedulePublish,
    publishNow,
    deleteCurrentSnapshot,
    destroy,
  };
}
