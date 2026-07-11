import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/media-page-settings.js", import.meta.url),
  "utf8",
);
const widgetPlacementSource = readFileSync(
  new URL("../src/widgets/widget-placement-orchestrator.js", import.meta.url),
  "utf8",
);
const mediaPageCss = readFileSync(
  new URL("../styles/pages/media-page.css", import.meta.url),
  "utf8",
);
const widgetManagerCss = readFileSync(
  new URL("../styles/widget-manager/widget-manager.css", import.meta.url),
  "utf8",
);

test("media page settings panel sync reuses the shared panel visibility/orchestration flow", () => {
  assert.match(
    source,
    /import \{ syncPanelVisibility \} from "\.\.\/panels\/panel-visibility-controller\.js";/,
  );
  assert.match(
    source,
    /import \{ SETTINGS_PANEL_VISIBILITY_TRANSITION_MS \} from "\.\.\/panels\/panel-transition-timing\.js";/,
  );
  assert.match(
    source,
    /import \{ replaceSettingsPanelPreservingUiState \} from "\.\.\/settings\/settings-panel-orchestrator\.js";/,
  );
  assert.match(
    source,
    /import \{[\s\S]*applyWidgetSurfaceHostLayoutState,[\s\S]*syncWidgetSurfaceOpenState,[\s\S]*\} from "\.\.\/widgets\/widget-placement-orchestrator\.js";/,
  );
  assert.match(
    source,
    /const next = applyWidgetSurfaceHostLayoutState\(root, createMediaPageSettingsPanel\(props\)\);[\s\S]*replaceSettingsPanelPreservingUiState\({[\s\S]*existing,[\s\S]*next,[\s\S]*updatePanel: updateMediaPageSettingsPanel,[\s\S]*}\);[\s\S]*syncPanelVisibility\(panel, Boolean\(props\.open\), \{[\s\S]*transitionMs: SETTINGS_PANEL_VISIBILITY_TRANSITION_MS,[\s\S]*}\);[\s\S]*syncWidgetSurfaceOpenState\(root\);/,
  );
});

test("media page settings selects assign the selected value after their options exist", () => {
  assert.match(
    source,
    /options\.forEach\(\(option\) => \{[\s\S]*select\.append\(node\);[\s\S]*}\);\s*select\.value = value;/,
  );
});

test("media page settings panel restores its own scrim instead of inheriting the transparent settings sub-panel scrim", () => {
  assert.match(
    mediaPageCss,
    /\.mha-media-page-settings-panel\[data-settings-scope\] \.mha-media-page-settings-scrim \{[\s\S]*background:\s*var\(--mha-scrim-surface, var\(--mha-surface-scrim, var\(--mha-bg-overlay\)\)\);[\s\S]*opacity:\s*0;/,
  );
  assert.match(
    mediaPageCss,
    /:host\(\[data-theme-style="ios"\]\) \.mha-media-page-settings-panel\[data-settings-scope\] \.mha-media-page-settings-scrim,\s*:host\(\[data-theme-style="oneui"\]\) \.mha-media-page-settings-panel\[data-settings-scope\] \.mha-media-page-settings-scrim \{[\s\S]*-webkit-backdrop-filter:\s*var\(--mha-backdrop-filter, var\(--mha-shell-filter, none\)\);[\s\S]*backdrop-filter:\s*var\(--mha-backdrop-filter, var\(--mha-shell-filter, none\)\);/,
  );
  assert.match(
    mediaPageCss,
    /\.mha-media-page-settings-panel\[data-settings-scope\]\[data-open="true"\] \.mha-media-page-settings-scrim \{[\s\S]*opacity:\s*var\(--mha-scrim-opacity, 1\);[\s\S]*pointer-events:\s*auto;/,
  );
});

test("media page settings panel participates in the shared widget-surface open-state selector", () => {
  assert.match(
    widgetPlacementSource,
    /'\.mha-media-page-settings-panel\[data-open="true"\]:not\(\[hidden\]\)'/,
  );
});

test("media page local widget editing hides redundant global/category controls", () => {
  assert.match(
    mediaPageCss,
    /:host\(\.is-editing\) \.mha-media-page-widget-panel-edit\s*\{[\s\S]*display:\s*none;/,
  );
  assert.match(
    widgetManagerCss,
    /:host\(\[data-media-page-active="true"\]\) \.mha-widget-manager-back\s*\{[\s\S]*display:\s*none !important;/,
  );
});
