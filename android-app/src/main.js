import "./styles.css";
import { Capacitor } from "@capacitor/core";

async function waitForLauncherFrameBeforeNavigation() {
  if (!Capacitor.isNativePlatform()) return;
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

const themeMeta = document.querySelector('meta[name="theme-color"]');
const lightSchemeQuery = window.matchMedia?.("(prefers-color-scheme: light)");

function syncAndroidShellThemeColor() {
  if (!themeMeta) return;
  themeMeta.setAttribute("content", lightSchemeQuery?.matches ? "#f4f6fb" : "#030406");
}

syncAndroidShellThemeColor();
lightSchemeQuery?.addEventListener?.("change", syncAndroidShellThemeColor);

const STORAGE_KEYS = {
  haUrl: "mha_android_ha_url",
  panelPath: "mha_android_panel_path",
};

const form = document.querySelector("#mhaLaunchForm");
const haUrlInput = document.querySelector("#mhaHaUrl");
const panelPathInput = document.querySelector("#mhaPanelPath");
const resetButton = document.querySelector("#mhaReset");

function normalizeBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return new URL(trimmed).origin + new URL(trimmed).pathname.replace(/\/+$/, "");
}

function normalizePanelPath(value) {
  const trimmed = value.trim() || "/mha-widget-hub";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildTargetUrl() {
  const baseUrl = normalizeBaseUrl(haUrlInput.value);
  const panelPath = normalizePanelPath(panelPathInput.value);
  return new URL(panelPath, `${baseUrl}/`).href;
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.haUrl, normalizeBaseUrl(haUrlInput.value));
  localStorage.setItem(STORAGE_KEYS.panelPath, normalizePanelPath(panelPathInput.value));
}

function loadSettings() {
  haUrlInput.value = localStorage.getItem(STORAGE_KEYS.haUrl) || "";
  panelPathInput.value = localStorage.getItem(STORAGE_KEYS.panelPath) || "/mha-widget-hub";
}

let isOpeningMha = false;

async function openMha() {
  if (isOpeningMha) return;
  isOpeningMha = true;

  saveSettings();
  const targetUrl = buildTargetUrl();
  await waitForLauncherFrameBeforeNavigation();

  // Important: Home Assistant blocks being displayed inside an iframe/webview
  // sub-frame with response headers such as CSP/X-Frame-Options. Navigate the
  // Capacitor WebView itself instead of embedding HA in an iframe.
  window.location.assign(targetUrl);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void openMha();
});

resetButton?.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEYS.haUrl);
  localStorage.removeItem(STORAGE_KEYS.panelPath);
  loadSettings();
  haUrlInput?.focus();
});

loadSettings();

// Once configured, behave like a launcher app: opening the Android icon should
// jump straight to MHA instead of asking the family to understand Home Assistant.
if (haUrlInput.value) {
  void openMha();
}
