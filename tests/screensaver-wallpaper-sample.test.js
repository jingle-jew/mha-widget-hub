import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { syncScreensaverNowBarWallpaperSample } from "../src/screensaver/screensaver.js";

class FakeStyle {
  setProperty(name, value) {
    this[name] = value;
  }
}

class FakeNode {
  constructor(className = "") {
    this.className = className;
    this.childNodes = [];
    this.dataset = {};
    this.parentNode = null;
    this.style = new FakeStyle();
    this.attributes = {};
    this.rect = { left: 0, top: 0, width: 0, height: 0 };
  }

  get classList() {
    return {
      contains: value => this.className.split(/\s+/u).includes(value),
    };
  }

  append(...nodes) {
    nodes.forEach((node) => {
      node.parentNode = this;
      this.childNodes.push(node);
    });
  }

  prepend(node) {
    node.parentNode = this;
    this.childNodes.unshift(node);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  getRootNode() {
    return this.rootNode || this.parentNode?.getRootNode?.() || this;
  }

  cloneNode(deep = false) {
    const clone = new FakeNode(this.className);
    clone.dataset = { ...this.dataset };
    clone.rect = { ...this.rect };
    if (deep) this.childNodes.forEach(child => clone.append(child.cloneNode(true)));
    return clone;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.childNodes = this.parentNode.childNodes.filter(node => node !== this);
    this.parentNode = null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const className = selector.startsWith(".") ? selector.slice(1) : "";
    const visit = (node) => {
      node.childNodes.forEach((child) => {
        if (selector === "*" || child.classList.contains(className)) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }
}

beforeEach(() => {
  globalThis.document = {
    createElement() {
      return new FakeNode();
    },
  };
  globalThis.getComputedStyle = () => ({
    getPropertyValue(property) {
      return property === "background-image" ? "url(/wallpaper.jpg)" : "";
    },
  });
});

afterEach(() => {
  delete globalThis.document;
  delete globalThis.getComputedStyle;
});

test("each iOS Now Bar tile receives an isolated wallpaper sample", () => {
  const background = new FakeNode("mha-background");
  background.rect = { left: -200, top: -120, width: 1400, height: 980 };
  background.append(new FakeNode("mha-background-wallpaper"));

  const root = new FakeNode("mha-screensaver");
  const activeTile = new FakeNode("mha-screensaver-nowbar-tile");
  activeTile.dataset.active = "true";
  activeTile.rect = { left: 300, top: 700, width: 560, height: 92 };
  const rearTile = new FakeNode("mha-screensaver-nowbar-tile");
  rearTile.dataset.active = "false";
  rearTile.rect = { left: 310, top: 710, width: 540, height: 88 };
  root.append(activeTile, rearTile);

  const shadowRoot = {
    children: [background, root],
    host: { dataset: { themeStyle: "ios" } },
    querySelector: () => background,
  };
  root.rootNode = shadowRoot;

  assert.equal(syncScreensaverNowBarWallpaperSample(root), true);
  assert.equal(activeTile.dataset.wallpaperSampleReady, "true");
  assert.equal(rearTile.dataset.wallpaperSampleReady, "true");

  const sample = activeTile.querySelector(".mha-screensaver-nowbar-wallpaper-sample");
  const clip = activeTile.querySelector(".mha-screensaver-nowbar-wallpaper-clip");
  assert.ok(clip);
  assert.ok(sample);
  assert.equal(sample.parentNode, clip);
  assert.equal(sample.style.left, "-500px");
  assert.equal(sample.style.top, "-820px");
  assert.equal(sample.style["inline-size"], "1400px");
  assert.equal(sample.style["block-size"], "980px");
  assert.equal(sample.style["background-image"], "url(/wallpaper.jpg)");
  assert.ok(sample.querySelector(".mha-background-wallpaper"));
  assert.ok(rearTile.querySelector(".mha-screensaver-nowbar-wallpaper-sample"));
});

test("non-iOS themes remove the wallpaper sample", () => {
  const background = new FakeNode("mha-background");
  background.rect = { left: 0, top: 0, width: 1000, height: 800 };
  const root = new FakeNode("mha-screensaver");
  const tile = new FakeNode("mha-screensaver-nowbar-tile");
  tile.dataset.active = "true";
  tile.dataset.wallpaperSampleReady = "true";
  tile.rect = { left: 200, top: 650, width: 600, height: 100 };
  tile.append(new FakeNode("mha-screensaver-nowbar-wallpaper-sample"));
  root.append(tile);
  root.rootNode = {
    children: [background, root],
    host: { dataset: { themeStyle: "material" } },
    querySelector: () => background,
  };

  assert.equal(syncScreensaverNowBarWallpaperSample(root), false);
  assert.equal(tile.dataset.wallpaperSampleReady, undefined);
  assert.equal(tile.querySelector(".mha-screensaver-nowbar-wallpaper-sample"), null);
});
