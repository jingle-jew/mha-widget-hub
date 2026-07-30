import assert from "node:assert/strict";
import test from "node:test";

import {
  createStatusBar,
  resolveStatusContextLabel,
  updateStatusContext,
} from "../src/layout/status-bar.js";

test("status bar renders the active context without development metadata", () => {
  const previousDocument = globalThis.document;
  const context = { textContent: "", hidden: true };
  const element = {
    className: "",
    dataset: {},
    innerHTML: "",
    querySelector(selector) {
      return selector === "[data-status-context]" ? context : null;
    },
  };
  globalThis.document = {
    createElement() {
      return element;
    },
  };

  try {
    const statusBar = createStatusBar({
      pages: [
        { id: "home", name: "Maison" },
        { id: "weather", name: "Météo" },
      ],
      activePageId: "weather",
      layoutMode: "auto",
      layout: "desktop",
      logicalColumns: 8,
      gridUnits: 16,
    });

    assert.equal(context.textContent, "Météo");
    assert.match(statusBar.innerHTML, /data-status-date/);
    assert.match(statusBar.innerHTML, /data-status-time/);
    assert.doesNotMatch(statusBar.innerHTML, /Grid foundation|cols|units|auto →/);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("status bar context uses the active page and optional nested detail", () => {
  assert.equal(resolveStatusContextLabel({ name: "Aperçu" }), "Aperçu");
  assert.equal(
    resolveStatusContextLabel({ name: "Aperçu" }, "Salon"),
    "Aperçu › Salon",
  );
  assert.equal(resolveStatusContextLabel(null, "Salon"), "Salon");
});

test("status bar context is synchronized as text and hidden when empty", () => {
  const context = { textContent: "", hidden: true };
  const root = {
    querySelector(selector) {
      return selector === "[data-status-context]" ? context : null;
    },
  };

  assert.equal(updateStatusContext(root, {
    activePage: { name: "Aperçu" },
    detail: "Cuisine",
  }), true);
  assert.equal(context.textContent, "Aperçu › Cuisine");
  assert.equal(context.hidden, false);

  updateStatusContext(root);
  assert.equal(context.textContent, "");
  assert.equal(context.hidden, true);
});
