import test from "node:test";
import assert from "node:assert/strict";
import { buildPageCreatorState } from "../src/pages/page-creator-props.js";
import {
  buildWidgetConfigPopupState,
  getScenesDefaultButtonIndex,
} from "../src/widget-config/widget-config-props.js";

test("page creator state exposes typed page options with one selected entry", () => {
  const state = buildPageCreatorState({
    open: true,
    themeStyle: "oneui",
    selectedPageType: "media-players",
  });

  assert.equal(state.open, true);
  assert.equal(state.selectedPageType, "media-players");
  assert.equal(state.pageTypeOptions.some((option) => option.value === "media-players" && option.selected), true);
  assert.equal(state.pageTypeOptions.some((option) => option.label && option.description), true);
});

test("page creator keeps the media page option on ios", () => {
  const state = buildPageCreatorState({
    open: true,
    themeStyle: "ios",
    selectedPageType: "media-players",
  });

  assert.equal(state.selectedPageType, "media-players");
  assert.equal(state.pageTypeOptions.some((option) => option.value === "media-players"), true);
  assert.equal(state.pageTypeOptions.some((option) => option.value === "media-players" && option.selected), true);
});

test("widget config popup state preserves the current session payload", () => {
  const state = buildWidgetConfigPopupState({
    session: { mode: "edit", configType: "scenes" },
    hass: { states: {} },
    visibilityConfig: { users: [] },
  });

  assert.deepEqual(state, {
    session: { mode: "edit", configType: "scenes" },
    hass: { states: {} },
    visibilityConfig: { users: [] },
  });
});

test("scenes default button index prefers the first unconfigured button", () => {
  assert.equal(getScenesDefaultButtonIndex({
    buttons: [
      { entityId: "scene.morning" },
      { entityId: "" },
      { entity_id: "scene.evening" },
    ],
  }), 1);

  assert.equal(getScenesDefaultButtonIndex({
    buttons: [
      { entityId: "scene.morning" },
      { entity_id: "scene.evening" },
    ],
  }), 0);
});
