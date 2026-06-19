import assert from "node:assert/strict";
import test from "node:test";

import { buildScreensaverProps } from "../src/screensaver/screensaver-orchestrator.js";

test("screensaver orchestrator keeps view state and callback routing", () => {
  const onClockVariantChange = () => {};
  const onOpenScreensaverSettings = () => {};
  const onWake = () => {};
  const screensaverState = {
    active: true,
    preview: false,
    nowBar: true,
    nowBarItems: { media: true, weather: false },
    clockVariant: "digital",
  };
  const nowBarTiles = [{ key: "media", title: "Ocean Drive", subtitle: "Duke Dumont" }];

  const props = buildScreensaverProps({
    isVisible: true,
    screensaverState,
    nowBarTiles,
    onClockVariantChange,
    onOpenScreensaverSettings,
    onWake,
  });

  assert.equal(props.isVisible, true);
  assert.equal(props.clockVariant, "digital");
  assert.equal(props.showNowBar, true);
  assert.equal(props.nowBarTiles, nowBarTiles);
  assert.equal(props.onClockVariantChange, onClockVariantChange);
  assert.equal(props.onOpenScreensaverSettings, onOpenScreensaverSettings);
  assert.equal(props.onWake, onWake);
});
