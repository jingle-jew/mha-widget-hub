import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/media-page-settings.js", import.meta.url),
  "utf8",
);
const mediaPageSource = readFileSync(
  new URL("../src/pages/media-page.js", import.meta.url),
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

test("media page settings uses shared MHA choice controls", () => {
  assert.match(
    source,
    /import \{ createMhaCheckbox, createMhaSelect \} from "\.\.\/ui\/form-controls\.js";/,
  );
  assert.match(source, /const row = createMhaCheckbox\(\{[\s\S]*indicatorPlacement: "end"/);
  assert.match(source, /const control = createMhaSelect\(\{[\s\S]*triggerClassName: "mha-settings-select mha-media-page-settings-select"/);
  assert.doesNotMatch(source, /document\.createElement\("select"\)|input\.type = "checkbox"/);
});

test("media page settings persist the effective player selection with non-player changes", () => {
  assert.match(source, /const buildConfigPatch = \(patch = \{\}\) => \(\{[\s\S]*enabledPlayerIds: \[\.\.\.enabledPlayerIds\][\s\S]*enabledPlayerIdsConfigured: true/);
  assert.match(source, /onChange: value => onConfigChange\(buildConfigPatch\(\{ defaultPlayerId: value \}\)\)/);
  assert.match(source, /onChange: checked => onConfigChange\(buildConfigPatch\(\{ blurBackground: checked \}\)\)/);
});

test("media page settings no longer exposes the visual style option", () => {
  assert.doesNotMatch(source, /getMediaPageVisualStyleOptions|mediaPage\.visualStyle|controlId: "visual-style"|visualStyle: value/);
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

test("media page player panel applies shared sheet behavior only on mobile", () => {
  assert.match(
    mediaPageSource,
    /rootClassName:\s*"mha-media-page-widget-panel-surface"/,
  );
  assert.match(
    mediaPageSource,
    /availablePlayersPanel\.classList\.toggle\("mha-settings-panel", isMobileLayout\);[\s\S]*widgetPanel\?\.classList\.toggle\("mha-settings-sheet", isMobileLayout\);[\s\S]*header\?\.classList\.toggle\("mha-settings-header", isMobileLayout\);/,
  );
  assert.match(
    mediaPageSource,
    /if \(isMobileLayout\) \{[\s\S]*applyPanelSurfaceContract\(availablePlayersPanel,[\s\S]*return;[\s\S]*widgetPanel\?\.setAttribute\("role", "complementary"\);[\s\S]*delete availablePlayersPanel\.dataset\.surfaceRole;/,
  );
  assert.match(
    mediaPageSource,
    /shellActions\.replaceChildren\(settingsButton, editButton, closeEditButton\);/,
  );
  assert.match(
    mediaPageSource,
    /const syncAvailablePlayersSheetVisibility = \(open\) => \{[\s\S]*host\.dataset\.mediaPlayersSheetOpen = String\(mobileOpen\);[\s\S]*return syncPanelVisibility\(availablePlayersPanel, open,/,
  );
  assert.match(
    mediaPageSource,
    /const shouldOpen = [\s\S]*syncAvailablePlayersSheetVisibility\(shouldOpen\);/,
  );
  assert.match(
    mediaPageSource,
    /const shellCloseButton = widgetPanel\?\.querySelector\("\.mha-media-page-widget-panel-close"\);\s*shellCloseButton\?\.remove\(\);/,
  );
  assert.match(
    mediaPageSource,
    /headerClassName:\s*"mha-media-page-widget-panel-header"/,
  );
  assert.match(
    mediaPageCss,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-widget-panel-header\.mha-settings-header\s*\{[\s\S]*touch-action:\s*none;/,
  );
  assert.doesNotMatch(
    widgetPlacementSource,
    /mha-media-page-widget-panel-surface/,
  );
});
