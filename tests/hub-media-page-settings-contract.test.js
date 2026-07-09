import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const hubSource = readFileSync(
  new URL("../mha-widget-hub.js", import.meta.url),
  "utf8",
);

function sliceBetween(startMarker, endMarker) {
  const start = hubSource.indexOf(startMarker);
  const end = hubSource.indexOf(endMarker, start);
  return hubSource.slice(start, end >= 0 ? end : hubSource.length);
}

test("media page settings open and close avoid full app renders", () => {
  const openSection = sliceBetween("_openMediaPageSettings(){", "_closeMediaPageSettings(){");
  const closeSection = sliceBetween("_closeMediaPageSettings(){", "_updatePageConfig(pageId,updater){");

  assert.match(
    openSection,
    /this\._mediaPageSettingsOpen=true;[\s\S]*this\._syncMediaPageSettingsDom\(\);[\s\S]*return true;/,
  );
  assert.doesNotMatch(
    openSection,
    /this\.render\(\);/,
  );
  assert.match(
    closeSection,
    /this\._mediaPageSettingsOpen=false;[\s\S]*this\._syncMediaPageSettingsDom\(\);[\s\S]*return true;/,
  );
  assert.doesNotMatch(
    closeSection,
    /this\.render\(\);/,
  );
});

test("active media page config updates patch the current media surface in place", () => {
  const updateSection = sliceBetween("_updateActiveMediaPageConfig(patch={}){", "_selectMediaPagePlayer(playerId=\"\"){");
  assert.match(updateSection, /const result=updatePageConfig\(this\._pages,page\.id,/);
  assert.match(updateSection, /this\._pages=result\.pages;/);
  assert.match(updateSection, /this\._syncMediaPageSettingsDom\(\);/);
  assert.match(updateSection, /this\.shadowRoot\?\.querySelector\?\.\("\.mha-media-page"\)\?\.__mhaUpdatePage\?\.\(nextPage\);/);
  assert.match(updateSection, /this\._syncActivePageBackdropState\(\{activePage:nextPage\}\);/);
  assert.match(updateSection, /return true;/);
});
