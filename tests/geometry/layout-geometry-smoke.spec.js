import assert from "node:assert/strict";
import { test } from "@playwright/test";

const DEV_URL = "http://127.0.0.1:4173/dev.html";
const VIEWPORT_EPSILON = 2;

async function openMha(page) {
  await page.goto(DEV_URL);
  await page.locator("mha-widget-hub").waitFor({ state: "attached" });
  await page.waitForFunction(() => Boolean(customElements.get("mha-widget-hub")));
  await page.locator("mha-widget-hub").evaluate((host) => {
    host.requestRender?.();
    host._scheduleSquareUnitSync?.();
    host.classList.remove(
      "is-boot-revealing",
      "is-theme-backdrop-crossfading",
      "is-responsive-relayouting",
    );
  });

  await page.waitForFunction(() => {
    const host = document.querySelector("mha-widget-hub");
    const root = host?.shadowRoot;
    const shell = root?.querySelector?.(".mha-shell");
    const panel = root?.querySelector?.(".mha-page-panel--grid");
    const grid = root?.querySelector?.(".mha-grid");
    const mobileDock = root?.querySelector?.(".mha-mobile-dock");
    const panelBox = panel?.getBoundingClientRect?.();
    const gridBox = grid?.getBoundingClientRect?.();
    return Boolean(
      shell
      && (grid || mobileDock)
      && !host?.classList?.contains?.("is-boot-revealing")
      && (!panel || panelBox?.height > 0)
      && (!grid || gridBox?.height > 0),
    );
  });
}

async function setDockPosition(page, dockPosition) {
  await page.locator("mha-widget-hub").evaluate((host, nextDockPosition) => {
    host._dockPosition = nextDockPosition;
    host.dataset.dockPosition = nextDockPosition;
    host.setAttribute("data-dock-position", nextDockPosition);
    globalThis.localStorage?.setItem?.("mha-dock-position", nextDockPosition);
    host.requestRender?.();
    host._scheduleSquareUnitSync?.();
    host.classList.remove(
      "is-boot-revealing",
      "is-theme-backdrop-crossfading",
      "is-responsive-relayouting",
    );
  }, dockPosition);

  await page.waitForFunction((nextDockPosition) => {
    const host = document.querySelector("mha-widget-hub");
    const root = host?.shadowRoot || host;
    const panel = root?.querySelector?.(".mha-page-panel--grid");
    const grid = root?.querySelector?.(".mha-grid");
    const panelBox = panel?.getBoundingClientRect?.();
    const gridBox = grid?.getBoundingClientRect?.();
    const panelFrameWidth = Number(host?.dataset?.panelFrameWidth || 0);
    const panelFrameHeight = Number(host?.dataset?.panelFrameHeight || 0);
    return (
      host?.dataset?.dockPosition === nextDockPosition
      && host?.dataset?.panelFrameWidth
      && host?.dataset?.gridContainerWidth
      && !host?.classList?.contains?.("is-responsive-relayouting")
      && panel
      && grid
      && panelBox?.height > 0
      && gridBox?.height > 0
      && Math.abs(panelFrameWidth - panelBox.width) <= 2
      && Math.abs(panelFrameHeight - panelBox.height) <= 2
    );
  }, dockPosition);
}

async function getMhaGeometry(page) {
  await openMha(page);
  return readMhaGeometry(page);
}

async function configureMobileDockScenario(page, {
  pageCount = 10,
  isEditing = false,
} = {}) {
  await openMha(page);
  await page.locator("mha-widget-hub").evaluate((host, options) => {
    host._pages = Array.from({ length: options.pageCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Page ${index + 1}`,
      icon: index === 0 ? "home" : "grid",
      widgets: [],
      type: "grid",
    }));
    host._activePageId = "p1";
    host._isEditing = Boolean(options.isEditing);
    host.requestRender?.();
    host._scheduleSquareUnitSync?.();
    host.classList.remove(
      "is-boot-revealing",
      "is-theme-backdrop-crossfading",
      "is-responsive-relayouting",
    );
  }, { pageCount, isEditing });

  await page.waitForFunction((expectedPageCount) => {
    const host = document.querySelector("mha-widget-hub");
    const dock = host?.shadowRoot?.querySelector?.(".mha-mobile-dock");
    const track = dock?.querySelector?.(".mha-mobile-dock-track");
    return Boolean(
      dock
      && track
      && track.scrollWidth > track.clientWidth
      && dock.querySelectorAll?.(".mha-dock-page")?.length === expectedPageCount,
    );
  }, Math.ceil((pageCount + 1 + (isEditing ? 2 : 0)) / 4));
}

async function readMhaGeometry(page) {
  return page.locator("mha-widget-hub").evaluate((host) => {
    host.classList.remove(
      "is-boot-revealing",
      "is-theme-backdrop-crossfading",
      "is-responsive-relayouting",
    );
    const toBox = (element) => {
      const box = element?.getBoundingClientRect?.();
      if (!box) return null;
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom,
      };
    };

    const root = host.shadowRoot || host;
    const panel = root?.querySelector(".mha-page-panel--grid");
    const grid = root?.querySelector(".mha-grid");
    const desktopDock = root?.querySelector(".mha-dock");
    const mobileDock = root?.querySelector(".mha-mobile-dock");
    const dock = (
      mobileDock?.getBoundingClientRect?.().width > 0
        ? mobileDock
        : desktopDock
    ) || mobileDock || desktopDock;
    const pxNumber = (value) => Number.parseFloat(String(value || "").trim()) || 0;
    const hostStyle = getComputedStyle(host);
    const gridStyle = grid ? getComputedStyle(grid) : null;

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      host: toBox(host),
      shell: toBox(root?.querySelector(".mha-shell")),
      workspace: toBox(root?.querySelector(".mha-workspace")),
      statusBar: toBox(root?.querySelector(".mha-status-bar")),
      panel: toBox(panel),
      grid: toBox(grid),
      dockZone: toBox(root?.querySelector(".mha-dock-zone")),
      dock: toBox(dock),
      hostDataset: {
        layout: host?.dataset?.layout || "",
        dockPosition: host?.dataset?.dockPosition || "",
        logicalColumns: Number(host?.dataset?.logicalColumns || 0),
        logicalRows: Number(host?.dataset?.logicalRows || 0),
        panelFrameWidth: Number(host?.dataset?.panelFrameWidth || 0),
        panelFrameHeight: Number(host?.dataset?.panelFrameHeight || 0),
        gridContainerWidth: Number(host?.dataset?.gridContainerWidth || 0),
        gridContainerHeight: Number(host?.dataset?.gridContainerHeight || 0),
        gridTrackWidth: Number(host?.dataset?.gridTrackWidth || 0),
        gridTrackHeight: Number(host?.dataset?.gridTrackHeight || 0),
      },
      hostVars: {
        panelFrameWidth: pxNumber(hostStyle?.getPropertyValue?.("--mha-panel-frame-width")),
        panelFrameHeight: pxNumber(hostStyle?.getPropertyValue?.("--mha-panel-frame-height")),
        gridContainerWidth: pxNumber(hostStyle?.getPropertyValue?.("--mha-grid-container-width")),
        gridContainerHeight: pxNumber(hostStyle?.getPropertyValue?.("--mha-grid-container-height")),
        gridTrackWidth: pxNumber(hostStyle?.getPropertyValue?.("--mha-grid-track-width")),
        gridTrackHeight: pxNumber(hostStyle?.getPropertyValue?.("--mha-grid-track-height")),
        gridColumnSize: pxNumber(hostStyle?.getPropertyValue?.("--mha-grid-column-size")),
        gridRowSize: pxNumber(hostStyle?.getPropertyValue?.("--mha-grid-row-size")),
      },
      gridVars: {
        panelFrameWidth: pxNumber(gridStyle?.getPropertyValue?.("--mha-panel-frame-width")),
        panelFrameHeight: pxNumber(gridStyle?.getPropertyValue?.("--mha-panel-frame-height")),
        gridContainerWidth: pxNumber(gridStyle?.getPropertyValue?.("--mha-grid-container-width")),
        gridContainerHeight: pxNumber(gridStyle?.getPropertyValue?.("--mha-grid-container-height")),
        gridTrackWidth: pxNumber(gridStyle?.getPropertyValue?.("--mha-grid-track-width")),
        gridTrackHeight: pxNumber(gridStyle?.getPropertyValue?.("--mha-grid-track-height")),
        gridColumnSize: pxNumber(gridStyle?.getPropertyValue?.("--mha-grid-column-size")),
        gridRowSize: pxNumber(gridStyle?.getPropertyValue?.("--mha-grid-row-size")),
      },
      gridStyle: {
        justifyContent: gridStyle?.justifyContent || "",
      },
    };
  });
}

function assertNear(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ±${tolerance}, got ${actual}`,
  );
}

function assertVisibleBox(box, name) {
  assert.ok(box, `${name} should exist`);
  assert.ok(box.width > 0, `${name} should have width`);
  assert.ok(box.height > 0, `${name} should have height`);
}

function assertHorizontalBox(box, viewport, name) {
  assert.ok(box, `${name} should exist`);
  assert.ok(box.width > 0, `${name} should have width`);
  assert.ok(box.x >= 0, `${name} should not start before viewport left`);
  assert.ok(
    box.right <= viewport.width + VIEWPORT_EPSILON,
    `${name} should not overflow viewport right`,
  );
}

function assertInsideViewport(box, viewport, name) {
  assertVisibleBox(box, name);
  assert.ok(box.x >= 0, `${name} should not start before viewport left`);
  assert.ok(box.y >= 0, `${name} should not start before viewport top`);
  assert.ok(
    box.right <= viewport.width + VIEWPORT_EPSILON,
    `${name} should not overflow viewport right`,
  );
  assert.ok(
    box.bottom <= viewport.height + VIEWPORT_EPSILON,
    `${name} should not overflow viewport bottom`,
  );
}

function assertBoxWithin(box, bounds, tolerance, name) {
  assertVisibleBox(box, name);
  assertVisibleBox(bounds, `${name} bounds`);
  assert.ok(
    box.x >= bounds.x - tolerance,
    `${name} should stay inside bounds on the left`,
  );
  assert.ok(
    box.y >= bounds.y - tolerance,
    `${name} should stay inside bounds on the top`,
  );
  assert.ok(
    box.right <= bounds.right + tolerance,
    `${name} should stay inside bounds on the right`,
  );
  assert.ok(
    box.bottom <= bounds.bottom + tolerance,
    `${name} should stay inside bounds on the bottom`,
  );
}

test.describe("layout geometry smoke", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("main surfaces render inside the desktop viewport", async ({ page }) => {
    const geometry = await getMhaGeometry(page);

    assertInsideViewport(geometry.host, geometry.viewport, "host");
    assertInsideViewport(geometry.shell, geometry.viewport, "shell");
    assertInsideViewport(geometry.workspace, geometry.viewport, "workspace");
    assertHorizontalBox(geometry.grid, geometry.viewport, "grid");
    assertInsideViewport(geometry.dockZone, geometry.viewport, "dock zone");
    assertInsideViewport(geometry.dock, geometry.viewport, "dock");
  });

  test("desktop document does not create horizontal overflow", async ({ page }) => {
    const geometry = await getMhaGeometry(page);

    assert.ok(
      geometry.document.width <= geometry.viewport.width + 1,
      `document width ${geometry.document.width} should fit viewport ${geometry.viewport.width}`,
    );
  });
});

test.describe("mobile layout geometry smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("main surfaces render inside the mobile viewport", async ({ page }) => {
    const geometry = await getMhaGeometry(page);

    assertInsideViewport(geometry.host, geometry.viewport, "mobile host");
    assertInsideViewport(geometry.shell, geometry.viewport, "mobile shell");
    assertHorizontalBox(geometry.grid, geometry.viewport, "mobile grid");
    assertInsideViewport(geometry.dock, geometry.viewport, "mobile dock");
  });

  test("mobile document does not create horizontal overflow", async ({ page }) => {
    const geometry = await getMhaGeometry(page);

    assert.ok(
      geometry.document.width <= geometry.viewport.width + 1,
      `document width ${geometry.document.width} should fit viewport ${geometry.viewport.width}`,
    );
  });

  test("mobile dock keeps paged groups scrollable when the dock has many items", async ({ page }) => {
    await configureMobileDockScenario(page, {
      pageCount: 10,
      isEditing: true,
    });

    const dockState = await page.locator("mha-widget-hub").evaluate((host) => {
      const dock = host.shadowRoot?.querySelector(".mha-mobile-dock");
      const track = dock?.querySelector(".mha-mobile-dock-track");
      const pages = Array.from(dock?.querySelectorAll?.(".mha-dock-page") || []);
      const style = dock ? getComputedStyle(dock) : null;
      const trackStyle = track ? getComputedStyle(track) : null;
      return {
        itemCount: dock?.querySelectorAll?.(".mha-mobile-dock-item")?.length || 0,
        pageCount: pages.length,
        scrollWidth: track?.scrollWidth || 0,
        clientWidth: track?.clientWidth || 0,
        overflowX: trackStyle?.overflowX || "",
        touchAction: trackStyle?.touchAction || "",
        hasSettings: Boolean(dock?.querySelector?.('[data-dock-action="settings"]')),
        hasManageDock: Boolean(dock?.querySelector?.('[data-dock-action="dock-settings"]')),
      };
    });

    assert.equal(dockState.itemCount, 13);
    assert.equal(dockState.pageCount, 4);
    assert.ok(
      dockState.scrollWidth > dockState.clientWidth,
      `mobile dock should overflow horizontally, got ${dockState.scrollWidth} <= ${dockState.clientWidth}`,
    );
    assert.ok(
      dockState.scrollWidth >= (dockState.clientWidth * dockState.pageCount) - 2,
      `mobile dock scroll width should cover every page, got ${dockState.scrollWidth} for ${dockState.pageCount} pages of width ${dockState.clientWidth}`,
    );
    assert.equal(dockState.overflowX, "auto");
    assert.match(dockState.touchAction, /pan-x/);
    assert.equal(dockState.hasSettings, true);
    assert.equal(dockState.hasManageDock, true);
  });
});

test.describe("tablet dock geometry contract", () => {
  test.use({ viewport: { width: 1133, height: 744 } });

  test("panel, grid container, and logical matrix stay coherent across dock positions", async ({ page }) => {
    await openMha(page);

    const geometries = {};
    for (const dockPosition of ["left", "right", "bottom"]) {
      await setDockPosition(page, dockPosition);
      geometries[dockPosition] = await readMhaGeometry(page);
    }

    for (const dockPosition of ["left", "right", "bottom"]) {
      const geometry = geometries[dockPosition];
      assert.equal(geometry.hostDataset.layout, "tablet");
      assert.equal(geometry.hostDataset.dockPosition, dockPosition);
      assert.ok(Number(geometry.hostDataset.logicalColumns) >= 4);
      assert.ok(Number(geometry.hostDataset.logicalRows) >= 3);

      assertVisibleBox(geometry.panel, `${dockPosition} panel`);
      assertVisibleBox(geometry.grid, `${dockPosition} grid`);
      assertVisibleBox(geometry.statusBar, `${dockPosition} status bar`);
      assertVisibleBox(geometry.dockZone, `${dockPosition} dock zone`);
      assertVisibleBox(geometry.dock, `${dockPosition} dock`);
      assertBoxWithin(
        geometry.dock,
        geometry.dockZone,
        2,
        `${dockPosition} dock`,
      );
      assertNear(
        geometry.grid.width,
        geometry.panel.width,
        1,
        `${dockPosition} grid width should match panel width`,
      );
      assertNear(
        geometry.grid.height,
        geometry.panel.height,
        1,
        `${dockPosition} grid height should match panel height`,
      );

      assertNear(
        geometry.hostDataset.panelFrameWidth,
        geometry.panel.width,
        1,
        `${dockPosition} host panel-frame width dataset should match panel box`,
      );
      assertNear(
        geometry.hostDataset.panelFrameHeight,
        geometry.panel.height,
        1,
        `${dockPosition} host panel-frame height dataset should match panel box`,
      );
      assertNear(
        geometry.hostDataset.gridContainerWidth,
        geometry.panel.width,
        1,
        `${dockPosition} host grid-container width dataset should match panel box`,
      );
      assertNear(
        geometry.hostDataset.gridContainerHeight,
        geometry.panel.height,
        1,
        `${dockPosition} host grid-container height dataset should match panel box`,
      );
      assertNear(
        geometry.hostVars.panelFrameWidth,
        geometry.panel.width,
        1,
        `${dockPosition} host panel-frame width var should match panel box`,
      );
      assertNear(
        geometry.hostVars.panelFrameHeight,
        geometry.panel.height,
        1,
        `${dockPosition} host panel-frame height var should match panel box`,
      );
      assertNear(
        geometry.hostVars.gridContainerWidth,
        geometry.panel.width,
        1,
        `${dockPosition} host grid-container width var should match panel box`,
      );
      assertNear(
        geometry.hostVars.gridContainerHeight,
        geometry.panel.height,
        1,
        `${dockPosition} host grid-container height var should match panel box`,
      );
      assertNear(
        geometry.gridVars.panelFrameWidth,
        geometry.panel.width,
        1,
        `${dockPosition} grid panel-frame width var should match panel box`,
      );
      assertNear(
        geometry.gridVars.panelFrameHeight,
        geometry.panel.height,
        1,
        `${dockPosition} grid panel-frame height var should match panel box`,
      );
      assertNear(
        geometry.gridVars.gridContainerWidth,
        geometry.panel.width,
        1,
        `${dockPosition} grid grid-container width var should match panel box`,
      );
      assertNear(
        geometry.gridVars.gridContainerHeight,
        geometry.panel.height,
        1,
        `${dockPosition} grid grid-container height var should match panel box`,
      );
      assertNear(
        geometry.hostVars.panelFrameWidth,
        geometry.gridVars.panelFrameWidth,
        1,
        `${dockPosition} host and grid panel-frame vars should agree`,
      );
      assertNear(
        geometry.hostVars.gridTrackWidth,
        geometry.gridVars.gridTrackWidth,
        1,
        `${dockPosition} host and grid track-width vars should agree`,
      );
      assertNear(
        geometry.gridVars.gridContainerWidth,
        geometry.panel.width,
        1,
        `${dockPosition} grid grid-container width var should match panel box`,
      );
      assertNear(
        geometry.gridVars.gridContainerHeight,
        geometry.panel.height,
        1,
        `${dockPosition} grid grid-container height var should match panel box`,
      );
      assert.ok(
        geometry.gridVars.gridTrackWidth <= geometry.gridVars.gridContainerWidth + 1,
        `${dockPosition} grid tracks should fit within the container width`,
      );
      assert.ok(
        geometry.gridVars.gridTrackHeight <= geometry.gridVars.gridContainerHeight + 1,
        `${dockPosition} grid tracks should fit within the container height`,
      );
      const rowColumnRatio = Math.max(
        geometry.hostVars.gridColumnSize,
        geometry.hostVars.gridRowSize,
      ) / Math.min(
        geometry.hostVars.gridColumnSize,
        geometry.hostVars.gridRowSize,
      );
      assert.ok(
        rowColumnRatio <= 1.051,
        `${dockPosition} grid cells should stay quasi-square, got ratio ${rowColumnRatio}`,
      );
      assert.ok(
        geometry.panel.y >= geometry.statusBar.bottom - 1,
        `${dockPosition} panel should stay below the status bar`,
      );
      assert.ok(
        geometry.dock.y >= geometry.statusBar.bottom - 1,
        `${dockPosition} dock should stay below the status bar`,
      );
    }

    assert.equal(geometries.left.gridStyle.justifyContent, "center");
    assert.equal(geometries.right.gridStyle.justifyContent, "center");
    assert.equal(geometries.bottom.gridStyle.justifyContent, "center");

    assertNear(
      geometries.left.panel.height,
      geometries.right.panel.height,
      1,
      "side docks should preserve the same panel height",
    );
    assert.ok(
      geometries.bottom.panel.height < geometries.left.panel.height,
      "bottom dock should reduce the usable panel height",
    );
    assertNear(
      geometries.left.panel.width,
      geometries.right.panel.width,
      1,
      "side docks should preserve the same panel width",
    );
    assert.ok(
      geometries.bottom.panel.width > geometries.left.panel.width,
      "bottom dock should preserve more usable width than side docks",
    );
    assert.equal(
      geometries.left.hostDataset.logicalColumns,
      geometries.right.hostDataset.logicalColumns,
    );
    assert.equal(
      geometries.left.hostDataset.logicalRows,
      geometries.right.hostDataset.logicalRows,
    );
    assert.ok(
      Number(geometries.bottom.hostDataset.logicalColumns)
        > Number(geometries.left.hostDataset.logicalColumns),
      "bottom dock should unlock more logical columns than side docks when the panel gets wider",
    );
    assert.ok(
      Number(geometries.bottom.hostDataset.logicalRows)
        <= Number(geometries.left.hostDataset.logicalRows),
      "bottom dock should not invent extra logical rows when the panel gets shorter",
    );
  });

  test("portrait tablet side dock keeps cells quasi-square inside the available panel when it is tall", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openMha(page);
    await setDockPosition(page, "left");
    const geometry = await readMhaGeometry(page);

    const rowColumnRatio = Math.max(
      geometry.hostVars.gridColumnSize,
      geometry.hostVars.gridRowSize,
    ) / Math.min(
      geometry.hostVars.gridColumnSize,
      geometry.hostVars.gridRowSize,
    );

    assert.equal(geometry.hostDataset.layout, "tablet");
    assert.equal(geometry.hostDataset.dockPosition, "left");
    assert.equal(geometry.gridStyle.justifyContent, "center");
    assert.equal(geometry.hostDataset.logicalColumns, 4);
    assert.equal(geometry.hostDataset.logicalRows, 6);
    assert.ok(
      rowColumnRatio <= 1.051,
      `portrait tablet side dock should stay quasi-square, got ratio ${rowColumnRatio}`,
    );
    assert.ok(
      geometry.hostVars.gridTrackHeight <= geometry.hostVars.gridContainerHeight + 1,
      `portrait tablet side dock should stay inside the available panel height, track=${geometry.hostVars.gridTrackHeight}, container=${geometry.hostVars.gridContainerHeight}`,
    );
  });
});
