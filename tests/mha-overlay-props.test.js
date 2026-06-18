import test from "node:test";
import assert from "node:assert/strict";
import { buildWidgetManagerState } from "../src/widget-manager/widget-manager-props.js";
import {
  buildScreensaverViewState,
  getNowBarCalendarSignature,
} from "../src/screensaver/screensaver-props.js";

test("widget manager state keeps only the current overlay view model", () => {
  assert.deepEqual(buildWidgetManagerState({
    open: true,
    activeCategory: "media",
    categories: [{ id: "media" }],
  }), {
    open: true,
    activeCategory: "media",
    categories: [{ id: "media" }],
  });
});

test("screensaver view state preserves visible clock and now bar payloads", () => {
  assert.deepEqual(buildScreensaverViewState({
    isVisible: true,
    screensaverState: {
      nowBar: true,
      nowBarItems: { media: true, weather: false },
      clockVariant: "digital",
    },
    nowBarTiles: [{ id: "media" }],
  }), {
    isVisible: true,
    showNowBar: true,
    nowBarItems: { media: true, weather: false },
    nowBarTiles: [{ id: "media" }],
    clockVariant: "digital",
  });
});

test("now bar calendar signature stays normalized and order-preserving", () => {
  assert.equal(getNowBarCalendarSignature({
    entities: {
      calendar: ["calendar.work", "calendar.family"],
    },
  }), "calendar.work|calendar.family");

  assert.equal(getNowBarCalendarSignature({
    entities: {
      calendar: [],
    },
  }), "");
});
