import test from "node:test";
import assert from "node:assert/strict";

import { createPageUiCoordinator } from "../src/pages/page-ui-coordinator.js";

function createHarness(overrides = {}) {
  const calls = {
    syncDocks: 0,
    syncPageCreator: 0,
    refreshActiveGridOnly: 0,
    transitionPageRender: [],
    syncActivePageBackdrop: [],
    syncWidgetDropSlots: 0,
    syncSettingsDom: 0,
    renderRoot: 0,
    exitEditMode: 0,
    recordPersistenceResult: [],
    writeActivePage: [],
    writeWidgetPositions: [],
  };

  const state = {
    pages: [
      { id: "home", name: "Home", icon: "home", widgets: [{ id: "clock" }] },
      { id: "lights", name: "Lights", icon: "light", widgets: [{ id: "lamp" }] },
    ],
    activePageId: "home",
    widgets: [{ id: "clock" }],
    widgetPositions: {
      "home:desktop:8x6": { clock: { x: 1, y: 1 } },
      "lights:desktop:8x6": { lamp: { x: 2, y: 1 } },
    },
    pageCreatorOpen: false,
    newPageType: "grid",
    newPageName: "",
    newPageIcon: "grid",
    dockSettingsPageId: "lights",
    settingsPage: "dock-detail",
    isEditing: true,
    dockPosition: "right",
    isMobileLandscapeLayout: false,
    activeMoveWidgetId: "clock",
    pendingWidgetPlacement: { id: "pending" },
    widgetManagerOpen: true,
    widgetManagerCategory: "media",
    ...overrides.state,
  };

  const coordinator = createPageUiCoordinator({
    getRoot: () => ({ appended: true }),
    getPages: () => state.pages,
    setPages: (pages) => { state.pages = pages; },
    getActivePageId: () => state.activePageId,
    setActivePageId: (id) => { state.activePageId = id; },
    getWidgets: () => state.widgets,
    setWidgets: (widgets) => { state.widgets = widgets; },
    getWidgetPositions: () => state.widgetPositions,
    setWidgetPositions: (positions) => { state.widgetPositions = positions; },
    getPageCreatorOpen: () => state.pageCreatorOpen,
    setPageCreatorOpen: (open) => { state.pageCreatorOpen = open; },
    getNewPageType: () => state.newPageType,
    setNewPageType: (type) => { state.newPageType = type; },
    getNewPageName: () => state.newPageName,
    setNewPageName: (name) => { state.newPageName = name; },
    getNewPageIcon: () => state.newPageIcon,
    setNewPageIcon: (icon) => { state.newPageIcon = icon; },
    getDockSettingsPageId: () => state.dockSettingsPageId,
    setDockSettingsPageId: (id) => { state.dockSettingsPageId = id; },
    setSettingsPage: (page) => { state.settingsPage = page; },
    getIsEditing: () => state.isEditing,
    getDockPosition: () => state.dockPosition,
    isMobileLandscapeLayout: () => state.isMobileLandscapeLayout,
    normalizeWidget: (widget) => widget,
    savePages: () => true,
    readWidgets: () => [{ id: `widgets-for-${state.activePageId}` }],
    writeActivePage: (id) => {
      calls.writeActivePage.push(id);
      return true;
    },
    writeWidgetPositions: (positions) => {
      calls.writeWidgetPositions.push(positions);
      return true;
    },
    recordPersistenceResult: (success) => {
      calls.recordPersistenceResult.push(success);
      return success;
    },
    refreshActiveGridOnly: () => { calls.refreshActiveGridOnly += 1; },
    transitionPageRender: (previousPage, nextPage) => {
      calls.transitionPageRender.push({
        previousPageId: previousPage?.id || "",
        nextPageId: nextPage?.id || "",
        previousPageType: previousPage?.type || "grid",
        nextPageType: nextPage?.type || "grid",
      });
    },
    syncActivePageBackdrop: (activePage) => {
      calls.syncActivePageBackdrop.push({
        pageId: activePage?.id || "",
        pageType: activePage?.type || "grid",
      });
    },
    syncWidgetDropSlots: () => { calls.syncWidgetDropSlots += 1; },
    syncSettingsDom: () => { calls.syncSettingsDom += 1; },
    renderRoot: () => { calls.renderRoot += 1; },
    openDockSettings: () => {},
    openSettings: () => {},
    exitEditMode: () => { calls.exitEditMode += 1; },
    clearPlacementState: () => {
      state.activeMoveWidgetId = "";
      state.pendingWidgetPlacement = null;
      state.widgetManagerOpen = false;
      state.widgetManagerCategory = "";
    },
    syncDocksFn: () => { calls.syncDocks += 1; },
    syncPageCreatorPanelFn: () => { calls.syncPageCreator += 1; },
    ...overrides.options,
  });

  return { coordinator, state, calls };
}

test("selecting a page closes placement state and reloads widgets", () => {
  const { coordinator, state, calls } = createHarness();

  assert.equal(coordinator.selectPage("lights"), true);
  assert.equal(state.activePageId, "lights");
  assert.deepEqual(state.widgets, [{ id: "widgets-for-lights" }]);
  assert.equal(state.activeMoveWidgetId, "");
  assert.equal(state.pendingWidgetPlacement, null);
  assert.equal(state.widgetManagerOpen, false);
  assert.equal(state.widgetManagerCategory, "");
  assert.deepEqual(calls.writeActivePage, ["lights"]);
  assert.deepEqual(calls.transitionPageRender, []);
  assert.deepEqual(calls.syncActivePageBackdrop, [{ pageId: "lights", pageType: "grid" }]);
  assert.equal(calls.refreshActiveGridOnly, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
  assert.equal(calls.syncDocks, 1);
});

test("grid and weather page changes synchronize the active backdrop before refreshing the grid", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      pages: [
        { id: "home", name: "Home", icon: "home", type: "grid", widgets: [] },
        { id: "weather", name: "Weather", icon: "weather", type: "weather", widgets: [] },
      ],
    },
  });

  assert.equal(coordinator.selectPage("weather"), true);
  assert.equal(state.activePageId, "weather");
  assert.deepEqual(calls.syncActivePageBackdrop, [{ pageId: "weather", pageType: "weather" }]);
  assert.equal(calls.refreshActiveGridOnly, 1);

  calls.syncActivePageBackdrop.length = 0;
  calls.refreshActiveGridOnly = 0;

  assert.equal(coordinator.selectPage("home"), true);
  assert.equal(state.activePageId, "home");
  assert.deepEqual(calls.syncActivePageBackdrop, [{ pageId: "home", pageType: "grid" }]);
  assert.equal(calls.refreshActiveGridOnly, 1);
});

test("selecting a media page keeps edit mode available while using the dedicated transition", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      pages: [
        { id: "home", name: "Home", icon: "home", type: "grid", widgets: [{ id: "clock" }] },
        {
          id: "media",
          name: "Media Players",
          icon: "media-player",
          type: "media-players",
          widgets: [{ id: "speaker-a" }],
        },
      ],
    },
  });

  assert.equal(coordinator.selectPage("media"), true);
  assert.equal(state.activePageId, "media");
  assert.deepEqual(calls.transitionPageRender, [{
    previousPageId: "home",
    nextPageId: "media",
    previousPageType: "grid",
    nextPageType: "media-players",
  }]);
  assert.equal(calls.exitEditMode, 0);
});

test("deleting a selected dock-detail page returns settings to dock and cleans positions when the active page changes", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      pages: [
        { id: "home", name: "Home", icon: "home", widgets: [{ id: "clock" }] },
        { id: "lights", name: "Lights", icon: "light", widgets: [{ id: "lamp" }] },
      ],
      activePageId: "lights",
      widgets: [{ id: "lamp" }],
      widgetPositions: {
        "home:desktop:8x6": { clock: { x: 1, y: 1 }, lamp: { x: 3, y: 1 } },
        "lights:desktop:8x6": { lamp: { x: 2, y: 1 } },
      },
      dockSettingsPageId: "lights",
      settingsPage: "dock-detail",
    },
  });

  assert.equal(coordinator.deleteDockPage("lights"), true);
  assert.equal(state.activePageId, "home");
  assert.deepEqual(state.widgets, [{ id: "widgets-for-home" }]);
  assert.deepEqual(state.widgetPositions, {
    "home:desktop:8x6": { clock: { x: 1, y: 1 } },
  });
  assert.equal(state.settingsPage, "dock");
  assert.equal(state.dockSettingsPageId, "");
  assert.deepEqual(calls.writeWidgetPositions, [{
    "home:desktop:8x6": { clock: { x: 1, y: 1 } },
  }]);
  assert.deepEqual(calls.transitionPageRender, []);
  assert.equal(calls.refreshActiveGridOnly, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
});

test("creating a media page resets the page creator state and keeps the media page type", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      pageCreatorOpen: true,
      newPageType: "media-players",
      newPageIcon: "star",
    },
  });

  assert.equal(coordinator.createPageFromCreator(), true);
  assert.equal(state.pageCreatorOpen, false);
  assert.equal(state.newPageType, "grid");
  assert.equal(state.activePageId.startsWith("page-"), true);
  assert.equal(state.widgets.length, 0);
  assert.equal(state.pages.at(-1)?.type, "media-players");
  assert.equal(state.pages.at(-1)?.icon, "star");
  assert.deepEqual(state.pages.at(-1)?.widgets, []);
  assert.equal(calls.syncDocks, 1);
  assert.equal(calls.syncPageCreator, 1);
  assert.deepEqual(calls.transitionPageRender, [{
    previousPageId: "home",
    nextPageId: state.activePageId,
    previousPageType: "grid",
    nextPageType: "media-players",
  }]);
  assert.equal(calls.refreshActiveGridOnly, 0);
  assert.equal(calls.syncWidgetDropSlots, 0);
  assert.equal(calls.renderRoot, 0);
});

test("page creator stays available in mobile landscape while editing", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      isMobileLandscapeLayout: true,
      pageCreatorOpen: false,
      newPageType: "media-players",
    },
  });

  assert.equal(coordinator.openPageCreator(), true);
  assert.equal(state.pageCreatorOpen, true);
  assert.equal(coordinator.createPageFromCreator(), true);
  assert.equal(state.pages.length, 3);
  assert.equal(calls.syncPageCreator, 2);
  assert.equal(calls.syncDocks, 1);
});

test("media page creation falls back to a normal grid page on unsupported themes", () => {
  const { coordinator, state } = createHarness({
    state: {
      pageCreatorOpen: true,
      newPageType: "media-players",
    },
    options: {
      getThemeStyle: () => "alexa",
    },
  });

  assert.equal(coordinator.createPageFromCreator(), true);
  assert.equal(state.pages.at(-1)?.icon, "grid");
  assert.deepEqual(state.pages.at(-1)?.widgets, []);
});

test("weather page creation keeps its type and waits for registry discovery on Alexa", async () => {
  const hass = {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "sunny",
        attributes: {
          friendly_name: "Maison Prévisions",
          temperature: 18,
          temperature_unit: "°C",
          humidity: 52,
        },
      },
      "sensor.home_dew_point": {
        entity_id: "sensor.home_dew_point",
        state: "8",
        attributes: {
          friendly_name: "Maison Point de rosée",
          device_class: "temperature",
          unit_of_measurement: "°C",
        },
      },
    },
    user: { id: "dev-user", is_admin: true },
    callWS: async ({ type }) => {
      if (type === "config/entity_registry/list") {
        return [
          {
            entity_id: "weather.home",
            platform: "met",
            config_entry_id: "weather-entry",
            device_id: "weather-device",
          },
          {
            entity_id: "sensor.home_dew_point",
            platform: "met",
            config_entry_id: "weather-entry",
            device_id: "weather-device",
          },
        ];
      }
      if (type === "config/device_registry/list") {
        return [{ id: "weather-device", config_entries: ["weather-entry"] }];
      }
      return [];
    },
  };
  const { coordinator, state } = createHarness({
    state: {
      pageCreatorOpen: true,
      newPageType: "weather",
    },
    options: {
      getThemeStyle: () => "alexa",
      getHass: () => hass,
    },
  });

  assert.equal(await coordinator.createPageFromCreator(), true);
  const page = state.pages.at(-1);
  assert.equal(page?.type, "weather");
  assert.equal(page?.icon, "weather");
  assert.equal(page?.config?.discoveryMode, "registry");
  assert.equal(page?.config?.autoDetectedMetricKeys.includes("dew-point"), true);
  assert.equal(page?.widgets.some(widget => widget.metricKey === "dew-point"), true);
});

test("buildDockProps resolves dock content from the current theme manifest", () => {
  const { coordinator } = createHarness({
    options: {
      getThemeStyle: () => "material",
    },
  });

  assert.deepEqual(coordinator.buildDockProps().contentBuilder, "material-default");
  assert.equal(coordinator.buildDockProps().themeStyle, "material");
  assert.equal(coordinator.buildDockProps().dockPosition, "right");
});

test("buildDockProps keeps media page widget editing out of dock edit mode", () => {
  const { coordinator } = createHarness({
    state: {
      activePageId: "media",
      isEditing: true,
      pages: [
        { id: "home", name: "Home", icon: "home", type: "grid", widgets: [] },
        { id: "media", name: "Media Players", icon: "media-player", type: "media-players", widgets: [] },
      ],
    },
  });

  assert.equal(coordinator.buildDockProps().isEditing, false);
});
