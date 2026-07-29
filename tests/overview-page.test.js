import test from "node:test";
import assert from "node:assert/strict";

import { addPage } from "../src/pages/page-controller.js";
import { normalizePage } from "../src/pages/page-model.js";
import {
  createDefaultPageConfig,
  getDefaultPageIcon,
  getDefaultPageName,
  getPageCreatorTypeOptions,
  isOverviewPage,
  PAGE_TYPES,
} from "../src/pages/page-types.js";
import {
  buildOverviewDeviceWidgets,
  createOverviewEntityWidget,
  persistOverviewAreaDeviceWidgets,
  resolveOverviewRoomGridUnits,
  syncOverviewSheetPortal,
} from "../src/pages/overview-page.js";

function createPortalNode(name) {
  return {
    name,
    parentNode: null,
    removed: false,
    remove() {
      const siblings = this.parentNode?.children;
      const index = Array.isArray(siblings) ? siblings.indexOf(this) : -1;
      if (index >= 0) siblings.splice(index, 1);
      this.removed = true;
      this.parentNode = null;
    },
  };
}

function createSurfaceRoot() {
  return {
    children: [],
    append(node) {
      node.parentNode = this;
      this.children.push(node);
    },
  };
}

test("overview is a public specialized page type with defaults", () => {
  assert.equal(PAGE_TYPES.OVERVIEW, "overview");
  assert.equal(getPageCreatorTypeOptions({ themeStyle: "oneui" }).some(option => (
    option.value === PAGE_TYPES.OVERVIEW
  )), true);
  assert.equal(getDefaultPageName(PAGE_TYPES.OVERVIEW), "Overview");
  assert.equal(getDefaultPageIcon(PAGE_TYPES.OVERVIEW), "home");
  assert.deepEqual(createDefaultPageConfig(PAGE_TYPES.OVERVIEW), {
    inactivitySeconds: 15,
    roomOrder: [],
    hiddenRoomIds: [],
    areas: {},
  });
});

test("overview page creation, normalization, and persistence keep page.config", () => {
  const created = addPage([], {
    pageType: PAGE_TYPES.OVERVIEW,
    now: () => 123,
  }).page;
  const normalized = normalizePage({
    ...created,
    config: {
      inactivitySeconds: 18,
      roomOrder: ["living"],
      hiddenRoomIds: ["garage"],
      areas: {
        living: {
          entityOrder: ["light.floor"],
          variants: { "light.floor": "toggle-4x1" },
        },
      },
    },
  });

  assert.equal(isOverviewPage(normalized), true);
  assert.equal(normalized.widgets.length, 0);
  assert.equal(normalized.config.inactivitySeconds, 18);
  assert.deepEqual(normalized.config.roomOrder, ["living"]);
  assert.equal(normalized.config.areas.living.variants["light.floor"], "toggle-4x1");
});

test("overview entity widgets reuse only the approved existing contracts", () => {
  const lightToggle = createOverviewEntityWidget(
    { entityId: "light.floor", domain: "light", name: "Floor lamp" },
    "toggle-4x1",
  );
  const lightButton = createOverviewEntityWidget(
    { entityId: "light.floor", domain: "light", name: "Floor lamp" },
    "button-2x1",
  );
  const mediaCompact = createOverviewEntityWidget(
    { entityId: "media_player.tv", domain: "media_player", name: "TV" },
    "media-2x2",
  );
  const mediaWide = createOverviewEntityWidget(
    { entityId: "media_player.tv", domain: "media_player", name: "TV" },
    "media-4x2",
  );

  assert.deepEqual([lightToggle.kind, lightToggle.w, lightToggle.h], ["toggle", 4, 1]);
  assert.deepEqual([lightButton.kind, lightButton.w, lightButton.h], ["button", 2, 1]);
  assert.deepEqual([mediaCompact.kind, mediaCompact.w, mediaCompact.h], ["media", 2, 2]);
  assert.deepEqual([mediaWide.kind, mediaWide.w, mediaWide.h], ["media", 4, 2]);
});

test("overview maps every supported domain without exposing another size", () => {
  const cases = [
    ["light.lamp", "light", "toggle-4x1", "toggle", 4, 1],
    ["light.lamp", "light", "button-2x1", "button", 2, 1],
    ["switch.fan", "switch", "toggle-4x1", "toggle", 4, 1],
    ["switch.fan", "switch", "button-2x1", "button", 2, 1],
    ["input_boolean.guest", "input_boolean", "toggle-4x1", "toggle", 4, 1],
    ["input_boolean.guest", "input_boolean", "button-2x1", "button", 2, 1],
    ["button.coffee", "button", "button-2x1", "button", 2, 1],
    ["media_player.tv", "media_player", "media-2x2", "media", 2, 2],
    ["media_player.tv", "media_player", "media-4x2", "media", 4, 2],
  ];

  cases.forEach(([entityId, domain, variant, kind, w, h]) => {
    const widget = createOverviewEntityWidget({ entityId, domain }, variant);
    assert.deepEqual([widget.kind, widget.w, widget.h], [kind, w, h]);
  });
});

test("overview device grids preserve discovered widgets, arbitrary additions, and removals", () => {
  const area = {
    id: "living",
    entities: [
      { entityId: "light.floor", domain: "light", name: "Floor" },
      { entityId: "switch.fan", domain: "switch", name: "Fan" },
    ],
  };
  const initial = buildOverviewDeviceWidgets(area, {}, []);
  const custom = {
    id: "summary-clock",
    kind: "clock",
    type: "clock",
    variant: "digital",
    w: 2,
    h: 2,
  };
  const retained = initial.filter(widget => widget.overviewEntityId !== "switch.fan");
  retained[0] = { ...retained[0], w: 3, h: 1 };
  const config = persistOverviewAreaDeviceWidgets({}, area, [...retained, custom]);
  const resolved = buildOverviewDeviceWidgets(area, config, []);

  assert.deepEqual(
    resolved.map(widget => widget.id),
    ["overview-entity-light-floor", "summary-clock"],
  );
  assert.deepEqual([resolved[0].w, resolved[0].h], [3, 1]);
  assert.deepEqual(config.areas.living.removedEntityIds, ["switch.fan"]);
  assert.equal(config.areas.living.deviceWidgetsConfigured, true);
});

test("overview summary widgets are independent from discovered room devices", () => {
  const summary = [{ id: "summary-clock", kind: "clock", type: "clock", w: 2, h: 2 }];
  assert.deepEqual(
    buildOverviewDeviceWidgets(null, {}, summary).map(widget => widget.id),
    ["summary-clock"],
  );
});

test("overview room columns follow mobile Grid presets and stay 6 on larger layouts", () => {
  assert.equal(resolveOverviewRoomGridUnits("mobile", 4), 4);
  assert.equal(resolveOverviewRoomGridUnits("mobile", 9), 9);
  assert.equal(resolveOverviewRoomGridUnits("tablet", 12), 6);
  assert.equal(resolveOverviewRoomGridUnits("desktop", 20), 6);
});

test("overview mobile sheet portal mounts outside the page and replaces its previous surface", () => {
  const surfaceRoot = createSurfaceRoot();
  const previous = createPortalNode("previous");
  const next = createPortalNode("next");
  const destroyed = [];
  surfaceRoot.append(previous);

  const mounted = syncOverviewSheetPortal({
    surfaceRoot,
    currentSheet: previous,
    nextSheet: next,
    destroy: node => destroyed.push(node.name),
  });

  assert.equal(mounted, next);
  assert.equal(next.parentNode, surfaceRoot);
  assert.deepEqual(surfaceRoot.children, [next]);
  assert.equal(previous.removed, true);
  assert.deepEqual(destroyed, ["previous"]);
});

test("overview mobile sheet portal destroys and removes its surface on close", () => {
  const surfaceRoot = createSurfaceRoot();
  const current = createPortalNode("current");
  surfaceRoot.append(current);
  const destroyed = [];

  const mounted = syncOverviewSheetPortal({
    surfaceRoot,
    currentSheet: current,
    destroy: node => destroyed.push(node.name),
  });

  assert.equal(mounted, null);
  assert.equal(current.removed, true);
  assert.deepEqual(destroyed, ["current"]);
});
