import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { createScreensaver } from "../src/screensaver/screensaver.js";
import { installDeterministicI18n } from "../tools/i18n-deterministic.mjs";

installDeterministicI18n(beforeEach);

function installDom() {
  class FakeNode {
    constructor(tagName = "") {
      this.tagName = tagName.toUpperCase();
      this.childNodes = [];
      this.dataset = {};
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.className = "";
      this.attributes = {};
      this.textContent = "";
      this.innerHTML = "";
      this.parentNode = null;
      this.listeners = new Map();
    }

    append(...children) {
      children.forEach((child) => {
        if (!child) return;
        child.parentNode = this;
        this.childNodes.push(child);
      });
    }

    prepend(...children) {
      children.reverse().forEach((child) => {
        if (!child) return;
        child.parentNode = this;
        this.childNodes.unshift(child);
      });
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    }

    querySelector(selector) {
      return queryTree(this, selector, true);
    }

    querySelectorAll(selector) {
      return queryTree(this, selector, false);
    }
  }

  function matchesSelector(node, selector) {
    if (!selector.startsWith(".")) return false;
    const className = selector.slice(1);
    return String(node.className || "")
      .split(/\s+/u)
      .filter(Boolean)
      .includes(className);
  }

  function queryTree(root, selector, firstOnly) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.childNodes) {
        if (matchesSelector(child, selector)) {
          matches.push(child);
          if (firstOnly) return true;
        }
        if (visit(child) && firstOnly) return true;
      }
      return false;
    };

    visit(root);
    return firstOnly ? (matches[0] || null) : matches;
  }

  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement(tag) {
      return new FakeNode(tag);
    },
  };
}

beforeEach(() => {
  installDom();
});

afterEach(() => {
  delete globalThis.Node;
  delete globalThis.document;
});

test("screensaver now bar renders dynamic tile text without i18n keys", () => {
  const screensaver = createScreensaver({
    isVisible: true,
    showNowBar: true,
    nowBarTiles: [
      { key: "media", title: "Ocean Drive", subtitle: "Duke Dumont" },
    ],
  });

  const title = screensaver.querySelector(".mha-screensaver-nowbar-title");
  const subtitle = screensaver.querySelector(".mha-screensaver-nowbar-subtitle");

  assert.ok(title);
  assert.ok(subtitle);
  assert.equal(title.textContent, "Ocean Drive");
  assert.equal(subtitle.textContent, "Duke Dumont");
});
