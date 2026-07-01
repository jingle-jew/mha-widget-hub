import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCK_ITEM_TYPES,
  buildDefaultDockItems,
  normalizeDockItems,
  resolveDockItems,
} from "../src/layout/dock-content-registry.js";

test("default dock content keeps the current page/edit/settings structure", () => {
  const items = buildDefaultDockItems({
    pages: [
      { id: "home", name: "Home", icon: "home" },
      { id: "lights", name: "Lights", icon: "lamp" },
    ],
    isEditing: true,
    labels: {
      addPage: "Add page",
      manageDock: "Manage dock",
      settings: "Settings",
    },
  });

  assert.deepEqual(
    items.map(({ action, pageId = "", symbol, className = "", mobileClassName = "" }) => ({
      action,
      pageId,
      symbol,
      className,
      mobileClassName,
    })),
    [
      { action: "page", pageId: "home", symbol: "home", className: "", mobileClassName: "" },
      { action: "page", pageId: "lights", symbol: "lamp", className: "", mobileClassName: "" },
      { action: "settings", pageId: "", symbol: "gear", className: "", mobileClassName: "" },
      { action: "add-page", pageId: "", symbol: "plus", className: "mha-dock-add-page", mobileClassName: "mha-mobile-dock-add-page" },
      { action: "dock-settings", pageId: "", symbol: "edit", className: "mha-dock-edit", mobileClassName: "mha-mobile-dock-edit" },
    ],
  );
});

test("dock content resolution prefers explicit items and otherwise falls back to the theme/default manifest", () => {
  const explicitItems = [{ action: "page", pageId: "custom", symbol: "star", label: "Custom" }];
  assert.deepEqual(resolveDockItems({ items: explicitItems }), [
    {
      type: DOCK_ITEM_TYPES.PAGE,
      action: "page",
      pageId: "custom",
      symbol: "star",
      category: "utility",
      label: "Custom",
      className: "",
      mobileClassName: "",
    },
  ]);

  const fallbackItems = resolveDockItems({
    themeStyle: "unknown",
    contentBuilder: "material-default",
    pages: [{ id: "home", name: "Home", icon: "home" }],
    isEditing: false,
    labels: { settings: "Settings" },
  });

  assert.deepEqual(
    fallbackItems.map(({ action, symbol }) => ({ action, symbol })),
    [
      { action: "page", symbol: "home" },
      { action: "settings", symbol: "gear" },
    ],
  );
});

test("dock content normalizes explicit legacy-shaped items into typed items", () => {
  assert.deepEqual(normalizeDockItems([
    { action: "page", pageId: "home", symbol: "home", label: "Home" },
    { type: "spacer", className: "between" },
    { action: "settings", symbol: "gear", label: "Settings" },
  ]), [
    {
      type: DOCK_ITEM_TYPES.PAGE,
      action: "page",
      pageId: "home",
      symbol: "home",
      category: "utility",
      label: "Home",
      className: "",
      mobileClassName: "",
    },
    {
      type: DOCK_ITEM_TYPES.SPACER,
      className: "between",
      mobileClassName: "",
    },
    {
      type: DOCK_ITEM_TYPES.ACTION,
      action: "settings",
      pageId: "",
      symbol: "gear",
      category: "system",
      label: "Settings",
      className: "",
      mobileClassName: "",
    },
  ]);
});
