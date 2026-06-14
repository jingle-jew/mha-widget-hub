import test from "node:test";
import assert from "node:assert/strict";
import {
  addPage,
  changePageIcon,
  deletePage,
  movePage,
  removePageWidgetPositions,
  renamePage,
  selectPage,
} from "../src/pages/page-controller.js";

const pages = [
  { id: "home", name: "Accueil", icon: "home", widgets: [] },
  { id: "lights", name: "Lumières", icon: "light", widgets: [] },
  {
    id: "climate",
    name: "Climat",
    icon: "weather",
    widgets: [{ id: "weather" }, { id: "temperature" }],
  },
];

test("page selection accepts only a different existing page", () => {
  assert.deepEqual(selectPage(pages, "home", "lights"), {
    activePageId: "lights",
  });
  assert.equal(selectPage(pages, "home", "home"), null);
  assert.equal(selectPage(pages, "home", "missing"), null);
});

test("page creation keeps the existing id and naming contract", () => {
  const result = addPage(pages, {
    icon: "star",
    now: () => 123456789,
  });

  assert.equal(result.activePageId, "page-21i3v9-4");
  assert.deepEqual(result.page, {
    id: "page-21i3v9-4",
    name: "Page 4",
    icon: "star",
    widgets: [],
  });
  assert.equal(result.pages.length, 4);
  assert.equal(pages.length, 3);
});

test("page movement respects list boundaries", () => {
  assert.deepEqual(
    movePage(pages, "lights", -1).pages.map(page => page.id),
    ["lights", "home", "climate"],
  );
  assert.deepEqual(
    movePage(pages, "lights", 1).pages.map(page => page.id),
    ["home", "climate", "lights"],
  );
  assert.equal(movePage(pages, "home", -1), null);
  assert.equal(movePage(pages, "climate", 1), null);
});

test("rename and icon transitions preserve unrelated page objects", () => {
  const renamed = renamePage(pages, "lights", "  Salon  ");
  const changedIcon = changePageIcon(renamed.pages, "lights", "star");

  assert.equal(renamed.name, "Salon");
  assert.equal(changedIcon.pages[1].name, "Salon");
  assert.equal(changedIcon.pages[1].icon, "star");
  assert.equal(changedIcon.pages[0], pages[0]);
  assert.equal(renamePage(pages, "lights", "   "), null);
});

test("deleting the active page reports widgets and selects the first survivor", () => {
  const result = deletePage(pages, "climate", "climate");

  assert.deepEqual(result.pages.map(page => page.id), ["home", "lights"]);
  assert.equal(result.activePageId, "home");
  assert.equal(result.activePageChanged, true);
  assert.deepEqual(result.removedWidgetIds, ["weather", "temperature"]);
  assert.equal(deletePage([pages[0]], "home", "home"), null);
});

test("deleted page positions and removed widget ids are cleaned immutably", () => {
  const positions = {
    "climate:desktop:8x6": {
      weather: { x: 1, y: 1 },
    },
    "home:desktop:8x6": {
      weather: { x: 1, y: 1 },
      clock: { x: 3, y: 1 },
    },
    metadata: "preserved",
  };

  const result = removePageWidgetPositions(
    positions,
    "climate",
    ["weather"],
  );

  assert.deepEqual(result, {
    "home:desktop:8x6": {
      clock: { x: 3, y: 1 },
    },
    metadata: "preserved",
  });
  assert.ok(positions["climate:desktop:8x6"]);
  assert.ok(positions["home:desktop:8x6"].weather);
});
