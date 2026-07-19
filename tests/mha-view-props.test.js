import test from "node:test";
import assert from "node:assert/strict";
import { buildDockStateProps } from "../src/layout/dock-props.js";
import {
  buildSettingsPanelState,
  resolveEffectiveIconShape,
} from "../src/settings/settings-panel-props.js";

test("dock state props keep only the dock view model contract", () => {
  assert.deepEqual(buildDockStateProps({
    pages: [{ id: "home" }],
    activePageId: "home",
    isEditing: true,
  }), {
    pages: [{ id: "home" }],
    activePageId: "home",
    isEditing: true,
  });
});

test("settings panel state derives the current scope openness and preserves state payloads", () => {
  const themeState = {
    themeSetting: "dark",
    themeStyle: "oneui",
    themeVariant: "",
    iosGlass: "liquid",
    accent: "sky",
    accentMode: "manual",
    iconShapeSetting: "auto",
    iconShape: "squircle",
    oneUiPrimarySurfaceOpacity: 64,
  };
  const screensaverState = {
    enabled: true,
    delay: 30000,
    preview: false,
    nowBar: true,
    nowBarItems: { media: true },
    nowBarConfig: { tiles: { media: true } },
    clockVariant: "digital",
  };

  assert.deepEqual(buildSettingsPanelState({
    scope: "screensaver",
    settingsOpen: true,
    screensaverSettingsOpen: false,
    language: "fr",
    hideHaSidebar: true,
    showDockLabels: true,
    statusBarMode: "top-bar",
    accentPaletteExpanded: true,
    settingsPage: "dock",
    dockPages: [{ id: "home" }],
    activeDockPageId: "home",
    selectedDockPageId: "home",
    dockPosition: "left",
    isMobileLayout: false,
    customWallpapers: { light: null, dark: null },
    hass: { states: {} },
    entityVisibilityConfig: { users: [] },
    themeState,
    screensaverState,
    effectiveIconShape: "circle",
  }), {
    open: false,
    scope: "screensaver",
    theme: "dark",
    language: "fr",
    themeStyle: "oneui",
    themeVariant: "",
    iosGlass: "liquid",
    accent: "sky",
    accentMode: "manual",
    accentPaletteExpanded: true,
    iconShape: "auto",
    oneUiPrimarySurfaceOpacity: 64,
    effectiveIconShape: "circle",
    hideHaSidebar: true,
    showDockLabels: true,
    statusBarMode: "top-bar",
    screensaverEnabled: true,
    screensaverDelay: 30000,
    screensaverPreview: false,
    screensaverNowBar: true,
    screensaverNowBarItems: { media: true },
    screensaverNowBarConfig: { tiles: { media: true } },
    screensaverClockVariant: "digital",
    supportsScreensaver: true,
    hass: { states: {} },
    entityVisibilityConfig: { users: [] },
    settingsPage: "dock",
    dockPages: [{ id: "home" }],
    activeDockPageId: "home",
    selectedDockPageId: "home",
    dockPosition: "left",
    isMobileLayout: false,
    isMobileLandscape: false,
    customWallpapers: { light: null, dark: null },
    weatherLandscapeId: "alpine-lake",
    supportsDockPosition: true,
    supportsSidebarToggle: true,
    showsStatusBarOptions: true,
  });
});

test("effective icon shape prefers host, then document, then theme fallback", () => {
  assert.equal(resolveEffectiveIconShape({
    hostIconShape: "circle",
    documentIconShape: "squircle",
    themeIconShape: "rounded-square",
  }), "circle");
  assert.equal(resolveEffectiveIconShape({
    hostIconShape: "",
    documentIconShape: "squircle",
    themeIconShape: "rounded-square",
  }), "squircle");
  assert.equal(resolveEffectiveIconShape({
    hostIconShape: "",
    documentIconShape: "",
    themeIconShape: "rounded-square",
  }), "rounded-square");
});
