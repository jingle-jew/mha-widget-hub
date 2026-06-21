import assert from "node:assert/strict";
import { test } from "@playwright/test";

const DEV_URL = "http://127.0.0.1:4173/dev.html";

async function getMhaGeometry(page) {
  await page.goto(DEV_URL);
  await page.locator("mha-widget-hub").waitFor({ state: "attached" });

  return page.locator("mha-widget-hub").evaluate((host) => {
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

    const root = host.shadowRoot;
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
      grid: toBox(root?.querySelector(".mha-grid")),
      dockZone: toBox(root?.querySelector(".mha-dock-zone")),
      dock: toBox(root?.querySelector(".mha-dock")),
    };
  });
}

function assertVisibleBox(box, name) {
  assert.ok(box, `${name} should exist`);
  assert.ok(box.width > 0, `${name} should have width`);
  assert.ok(box.height > 0, `${name} should have height`);
}

function assertInsideViewport(box, viewport, name) {
  assertVisibleBox(box, name);
  assert.ok(box.x >= 0, `${name} should not start before viewport left`);
  assert.ok(box.y >= 0, `${name} should not start before viewport top`);
  assert.ok(box.right <= viewport.width + 1, `${name} should not overflow viewport right`);
  assert.ok(box.bottom <= viewport.height + 1, `${name} should not overflow viewport bottom`);
}

test.describe("layout geometry smoke", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("main surfaces render inside the desktop viewport", async ({ page }) => {
    const geometry = await getMhaGeometry(page);

    assertInsideViewport(geometry.host, geometry.viewport, "host");
    assertInsideViewport(geometry.shell, geometry.viewport, "shell");
    assertInsideViewport(geometry.workspace, geometry.viewport, "workspace");
    assertInsideViewport(geometry.grid, geometry.viewport, "grid");
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
    assertInsideViewport(geometry.grid, geometry.viewport, "mobile grid");
    assertInsideViewport(geometry.dock, geometry.viewport, "mobile dock");
  });

  test("mobile document does not create horizontal overflow", async ({ page }) => {
    const geometry = await getMhaGeometry(page);

    assert.ok(
      geometry.document.width <= geometry.viewport.width + 1,
      `document width ${geometry.document.width} should fit viewport ${geometry.viewport.width}`,
    );
  });
});
