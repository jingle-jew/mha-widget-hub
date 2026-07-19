import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildLightControlServiceCall,
  getLightCapabilities,
  getLightColorTemperatureRange,
  hexToRgb,
  hsvToRgb,
  kelvinToRgb,
  rgbToHsv,
  rgbToHex,
} from "../src/ha/light.js";
import {
  cloneLightControlConfig,
  normalizeLightControlConfig,
} from "../src/light-control/light-control-config.js";
import {
  buildAmbienceLightPatch,
  canOpenLightControlPopup,
  getAmbienceDisplayColor,
  getColorWheelIndicatorPosition,
  getColorWheelSelection,
  getLightDisplayColor,
  normalizeLightControlView,
} from "../src/light-control/light-control-popup.js";
import { normalizeWidgetContract } from "../src/widgets/widget-registry.js";
import { normalizeWidgetSize } from "../src/layout/layout-engine.js";

const entity = (entityId, state = "on", attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes,
});

test("light popup eligibility is restricted to interactive authorized light entities", () => {
  assert.equal(canOpenLightControlPopup({ entityId: "light.salon" }), true);
  assert.equal(canOpenLightControlPopup({ entityId: "switch.salon" }), false);
  assert.equal(canOpenLightControlPopup({ entityId: "input_boolean.salon" }), false);
  assert.equal(canOpenLightControlPopup({ entityId: "light.salon" }, { interactive: false }), false);
  assert.equal(canOpenLightControlPopup({ entityId: "light.salon" }, { entityAllowed: false }), false);
});

test("the local view machine stays inside one popup and ambience patches choose one color model", () => {
  assert.equal(normalizeLightControlView("presets"), "presets");
  assert.equal(normalizeLightControlView("color"), "color");
  assert.equal(normalizeLightControlView("config"), "config");
  assert.equal(normalizeLightControlView("unknown"), "presets");
  assert.deepEqual(buildAmbienceLightPatch({
    mode: "color",
    color: "#2244ff",
    colorTemperature: 3500,
    brightness: 72,
  }), { color: "#2244ff", brightness: 72 });
  assert.deepEqual(buildAmbienceLightPatch({
    mode: "temperature",
    color: "#2244ff",
    colorTemperature: 3500,
    brightness: 72,
  }), { colorTemperature: 3500, brightness: 72 });
});

test("popup display colors follow the effective light and ambience color models", () => {
  assert.equal(getAmbienceDisplayColor({
    mode: "color",
    color: "#2244ff",
  }), "#2244ff");
  assert.equal(getAmbienceDisplayColor({
    mode: "temperature",
    color: "#2244ff",
    colorTemperature: 3500,
  }), rgbToHex(kelvinToRgb(3500)));
  assert.equal(getLightDisplayColor(entity("light.rgb", "on", {
    rgb_color: [34, 68, 255],
  })), "#2244ff");
  assert.equal(getLightDisplayColor(entity("light.warm", "on", {
    color_temp_kelvin: 2700,
  })), rgbToHex(kelvinToRgb(2700)));
});

test("color wheel geometry aligns red at the top and green-yellow on the right", () => {
  assert.deepEqual(getColorWheelSelection(0, -100, 100), {
    hue: 0,
    saturation: 1,
  });
  assert.deepEqual(getColorWheelSelection(100, 0, 100), {
    hue: 90,
    saturation: 1,
  });
  assert.deepEqual(getColorWheelIndicatorPosition(0, 1), { x: 50, y: 4 });
  assert.deepEqual(getColorWheelIndicatorPosition(90, 1), { x: 96, y: 50 });
});

test("light capabilities distinguish brightness, temperature, and color independently", () => {
  assert.deepEqual(getLightCapabilities(entity("light.dimmer", "on", {
    supported_color_modes: ["brightness"],
  })), {
    brightness: true,
    colorTemperature: false,
    color: false,
  });

  assert.deepEqual(getLightCapabilities(entity("light.tunable", "on", {
    supported_color_modes: ["color_temp"],
  })), {
    brightness: true,
    colorTemperature: true,
    color: false,
  });

  assert.deepEqual(getLightCapabilities(entity("light.rgb", "on", {
    supported_color_modes: ["hs"],
  })), {
    brightness: true,
    colorTemperature: false,
    color: true,
  });
});

test("light service calls apply only supported changed values", () => {
  const light = entity("light.salon", "on", {
    supported_color_modes: ["color_temp", "hs"],
    brightness: 128,
    color_temp_kelvin: 3500,
    rgb_color: [255, 0, 0],
    min_color_temp_kelvin: 2200,
    max_color_temp_kelvin: 5000,
  });

  assert.equal(buildLightControlServiceCall(light, { brightness: 50 }), null);
  assert.equal(buildLightControlServiceCall(light, { colorTemperature: 3504 }), null);
  assert.equal(buildLightControlServiceCall(light, { color: "#ff0000" }), null);
  assert.deepEqual(buildLightControlServiceCall(light, { brightness: 71 }), {
    domain: "light",
    service: "turn_on",
    data: { entity_id: "light.salon", brightness_pct: 71 },
  });
  assert.deepEqual(buildLightControlServiceCall(light, { colorTemperature: 9000 }), {
    domain: "light",
    service: "turn_on",
    data: { entity_id: "light.salon", color_temp_kelvin: 5000 },
  });
  assert.deepEqual(buildLightControlServiceCall(light, { color: "#00ff00" }), {
    domain: "light",
    service: "turn_on",
    data: { entity_id: "light.salon", rgb_color: [0, 255, 0] },
  });
  assert.equal(buildLightControlServiceCall(entity("switch.salon"), { on: false }), null);
});

test("an off light receives one turn_on call even when its retained value matches", () => {
  const light = entity("light.salon", "off", {
    supported_color_modes: ["brightness"],
    brightness: 128,
  });
  assert.deepEqual(buildLightControlServiceCall(light, { brightness: 50 }), {
    domain: "light",
    service: "turn_on",
    data: { entity_id: "light.salon" },
  });
  assert.deepEqual(buildLightControlServiceCall(light, { on: false }), null);
});

test("legacy mired ranges and color conversions remain deterministic", () => {
  assert.deepEqual(getLightColorTemperatureRange(entity("light.legacy", "on", {
    min_mireds: 153,
    max_mireds: 500,
  })), { min: 2000, max: 6536 });
  assert.deepEqual(hexToRgb("#21c7ad"), [33, 199, 173]);
  assert.equal(rgbToHex([33, 199, 173]), "#21c7ad");
  assert.deepEqual(hsvToRgb(120, 1, 1), [0, 255, 0]);
  assert.deepEqual(rgbToHsv([0, 255, 0]), { hue: 120, saturation: 1, value: 1 });
  assert.equal(kelvinToRgb(2200).length, 3);
});

test("light control configuration is bounded, cloned, and persisted by both widget contracts", () => {
  const normalized = normalizeLightControlConfig({
    orientation: "horizontal",
    whiteTemperatures: [2100, 2800, 3600, 5100, 6500],
    quickColors: ["#abc", "invalid"],
    ambiences: [{
      id: "focus",
      enabled: true,
      name: "Focus",
      icon: "book",
      mode: "color",
      color: "#2244ff",
      colorTemperature: 4000,
      brightness: 74,
    }],
  });
  assert.equal(normalized.orientation, "horizontal");
  assert.deepEqual(normalized.whiteTemperatures, [2100, 2800, 3600, 5100]);
  assert.equal(normalized.quickColors.length, 6);
  assert.equal(normalized.quickColors[0], "#aabbcc");
  assert.equal(normalized.ambiences.length, 4);
  assert.equal(normalized.ambiences[0].mode, "color");

  const cloned = cloneLightControlConfig(normalized);
  cloned.ambiences[0].name = "Changed";
  assert.equal(normalized.ambiences[0].name, "Focus");

  for (const kind of ["toggle", "toggle-slider"]) {
    const widget = normalizeWidgetContract({
      kind,
      entityId: "light.salon",
      lightControl: normalized,
    }, normalizeWidgetSize);
    assert.equal(widget.lightControl.orientation, "horizontal");
    assert.equal(widget.lightControl.ambiences[0].name, "Focus");
  }
});

test("desktop popup sections share one stretching grid and views stay in one dialog", () => {
  const cssPath = fileURLToPath(new URL("../styles/components/light-control-popup.css", import.meta.url));
  const sourcePath = fileURLToPath(new URL("../src/light-control/light-control-popup.js", import.meta.url));
  const css = readFileSync(cssPath, "utf8");
  const source = readFileSync(sourcePath, "utf8");

  assert.match(css, /\.mha-light-control-main-view\s*\{[\s\S]*?align-items:\s*stretch;/u);
  assert.match(css, /\.mha-light-control-section\s*\{[\s\S]*?block-size:\s*100%;/u);
  assert.match(source, /mainView\.dataset\.view = "presets"/u);
  assert.match(source, /colorView\.dataset\.view = "color"/u);
  assert.match(source, /configView\.dataset\.view = "config"/u);
  assert.equal((source.match(/setAttribute\("role", "dialog"\)/gu) || []).length, 1);
  assert.match(source, /root\.__mhaUpdateFromHass = syncFromHass/u);
  assert.match(source, /if \(nextStateSignature === lastStateSignature\) return;/u);
  assert.match(source, /mha-update-widget-config/u);
});

test("popup controls map vertical and horizontal modes without inverting them", () => {
  const cssPath = fileURLToPath(new URL("../styles/components/light-control-popup.css", import.meta.url));
  const sourcePath = fileURLToPath(new URL("../src/light-control/light-control-popup.js", import.meta.url));
  const css = readFileSync(cssPath, "utf8");
  const source = readFileSync(sourcePath, "utf8");

  assert.match(source, /import \{ createSlider \} from "\.\.\/ui\/slider\.js";/u);
  assert.equal((source.match(/orientation: config\.orientation/gu) || []).length, 2);
  assert.match(source, /const sliderOrientation = config\.orientation;/u);
  assert.match(css, /data-orientation="vertical"[\s\S]*?grid-template-columns:[^;]+repeat\(2,/u);
  assert.match(css, /data-orientation="vertical"[\s\S]*?mha-light-control-power-group[\s\S]*?grid-template-rows:\s*repeat\(2,/u);
  assert.doesNotMatch(source, /function createRange|input\.type = "range"/u);
  assert.doesNotMatch(css, /mha-light-control-range|::-webkit-slider/u);
});

test("iOS light controls use slider2 while other themes keep the standard MHA slider", () => {
  const cssPath = fileURLToPath(new URL("../styles/components/light-control-popup.css", import.meta.url));
  const slider2CssPath = fileURLToPath(new URL("../styles/components/slider2.css", import.meta.url));
  const sourcePath = fileURLToPath(new URL("../src/light-control/light-control-popup.js", import.meta.url));
  const slider2SourcePath = fileURLToPath(new URL("../src/ui/slider2.js", import.meta.url));
  const manifestPath = fileURLToPath(new URL("../src/styles/style-manifest.js", import.meta.url));
  const css = readFileSync(cssPath, "utf8");
  const slider2Css = readFileSync(slider2CssPath, "utf8");
  const source = readFileSync(sourcePath, "utf8");
  const slider2Source = readFileSync(slider2SourcePath, "utf8");
  const manifest = readFileSync(manifestPath, "utf8");

  assert.match(source, /import \{ createSlider2 \} from "\.\.\/ui\/slider2\.js";/u);
  assert.match(source, /slot\.append\(standard, ios\)/u);
  assert.match(css, /:host\(\[data-theme-style="ios"\]\) \.mha-light-control-slider--default\s*\{[\s\S]*?display:\s*none;/u);
  assert.match(slider2Css, /\.slider2\[data-orientation="vertical"\]/u);
  assert.doesNotMatch(slider2Source, /orientation:\s*"horizontal"/u);
  assert.match(manifest, /styles\/components\/slider2\.css/u);
});

test("toggle-slider opens details through its toggle information area, never its slider callbacks", () => {
  const sourcePath = fileURLToPath(new URL("../src/widgets/toggle-slider-widget.js", import.meta.url));
  const source = readFileSync(sourcePath, "utf8");
  const sliderOptions = source.slice(
    source.indexOf("const sliderOptions"),
    source.indexOf("const slider = createSlider"),
  );
  assert.match(source, /onOpenDetails:[\s\S]*?openLightControlPopup/u);
  assert.doesNotMatch(sliderOptions, /openLightControlPopup|onOpenDetails/u);
  assert.match(sliderOptions, /sliderAction\.update/u);
  assert.match(sliderOptions, /sliderAction\.commit/u);
});
