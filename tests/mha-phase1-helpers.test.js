import test from "node:test";
import assert from "node:assert/strict";
import {
  createCriticalBootStyle,
  createFrontendStyleLinks,
  resolveFrontendAssetUrl,
} from "../src/core/mha-frontend-assets.js";
import {
  ACTIVE_PAGE,
  ORDER,
  PAGES,
  POSITIONS,
  REMOVED,
  SIZES,
  clearGridStorage,
  getStoredDockPosition,
  getStoredHideHaSidebar,
  getStoredLanguageSetting,
  readStoredStatusBarMode,
  getStoredStatusBarMode,
  normalizeDockPosition,
  normalizeLanguageSetting,
} from "../src/core/mha-persistence.js";
import { PAGE_ICON_OPTIONS } from "../src/pages/page-icons.js";
import { normalizeStoredWidgetContract } from "../src/widgets/widget-storage.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    values,
  };
}

test("frontend asset helpers keep stylesheet URLs versioned and rooted from the host entrypoint", () => {
  const frontendRootUrl = new URL("https://example.test/frontend/");
  const frontendVersion = "2026-06-18";

  assert.equal(
    resolveFrontendAssetUrl("styles/core/tokens.css", { frontendRootUrl, frontendVersion }),
    "https://example.test/frontend/styles/core/tokens.css?v=2026-06-18",
  );

  const links = createFrontendStyleLinks(
    [["styles/core/tokens.css", "tokens"], ["styles/layout/shell.css", "structure"]],
    { frontendRootUrl, frontendVersion },
  );

  assert.match(links, /data-mha-style-layer="tokens"/);
  assert.match(links, /styles\/layout\/shell\.css\?v=2026-06-18/);
});

test("critical boot style still includes the wallpaper boot guards", () => {
  const markup = createCriticalBootStyle();

  assert.match(markup, /data-mha-critical-boot/);
  assert.match(markup, /data-wallpaper-kind="image"/);
  assert.match(markup, /data-wallpaper-source="theme"/);
});

test("persistence helpers normalize dock and language settings safely", () => {
  const storage = createStorage({
    "mha-dock-position": "sideways",
    "mha-hide-ha-sidebar": "true",
    "mha-status-bar-mode": "unsupported",
    "mha-language": "de",
  });

  assert.equal(normalizeDockPosition("right"), "right");
  assert.equal(normalizeDockPosition("sideways"), "left");
  assert.equal(getStoredDockPosition(storage), "left");
  assert.equal(getStoredHideHaSidebar(storage), true);
  assert.equal(getStoredStatusBarMode(storage), "pill");
  assert.equal(normalizeLanguageSetting("fr"), "fr");
  assert.equal(normalizeLanguageSetting("de"), "auto");
  assert.equal(getStoredLanguageSetting(storage), "auto");
});

test("status bar persistence falls back to top bar when no value is stored", () => {
  const storage = createStorage();

  assert.equal(getStoredStatusBarMode(storage), "top-bar");
  assert.deepEqual(readStoredStatusBarMode(storage), {
    mode: "top-bar",
    persisted: false,
  });
});

test("status bar persistence reports whether the preference already exists", () => {
  const storage = createStorage({
    "mha-status-bar-mode": "hidden",
  });

  assert.deepEqual(readStoredStatusBarMode(storage), {
    mode: "hidden",
    persisted: true,
  });
});

test("grid reset helper clears only the persisted grid-related keys", () => {
  const storage = createStorage({
    [ORDER]: "[]",
    [SIZES]: "{}",
    [REMOVED]: "[]",
    [POSITIONS]: "{}",
    [PAGES]: "[]",
    [ACTIVE_PAGE]: "home",
    untouched: "keep",
  });

  clearGridStorage(storage);

  assert.equal(storage.getItem(ORDER), null);
  assert.equal(storage.getItem(SIZES), null);
  assert.equal(storage.getItem(REMOVED), null);
  assert.equal(storage.getItem(POSITIONS), null);
  assert.equal(storage.getItem(PAGES), null);
  assert.equal(storage.getItem(ACTIVE_PAGE), null);
  assert.equal(storage.getItem("untouched"), "keep");
});

test("page icon options remain stable and widget storage normalization keeps registry defaults", () => {
  assert.equal(PAGE_ICON_OPTIONS.some((item) => item.name === "gear"), true);

  const normalized = normalizeStoredWidgetContract({
    id: "clock-1",
    type: "clock",
    variant: "digital",
    w: 1,
    h: 1,
  });

  assert.equal(normalized.kind, "clock");
  assert.equal(normalized.type, "clock");
  assert.equal(normalized.variant, "digital");
  assert.equal(normalized.w, 2);
  assert.equal(normalized.h, 2);
});
