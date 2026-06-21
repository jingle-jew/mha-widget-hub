import assert from "node:assert/strict";
import { test } from "@playwright/test";

test("dev page exposes the MHA host", async ({ page }) => {
  await page.goto("/dev.html");
  const host = page.locator("mha-widget-hub");
  const box = await host.boundingBox();

  assert.ok(box);
  assert.ok(box.width > 0);
  assert.ok(box.height > 0);
});
