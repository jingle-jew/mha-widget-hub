import test from "node:test";
import assert from "node:assert/strict";

import { detectDesktopEnvironment } from "../src/core/device-environment.js";

test("detectDesktopEnvironment identifies desktop operating systems", () => {
  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      maxTouchPoints: 0,
    },
  }), true);

  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      maxTouchPoints: 0,
    },
  }), true);
});

test("detectDesktopEnvironment rejects touch-first mobile and tablet environments", () => {
  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "iPad",
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      maxTouchPoints: 5,
    },
  }), false);

  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      maxTouchPoints: 5,
    },
  }), false);

  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "Linux armv8l",
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel Tablet)",
      maxTouchPoints: 10,
    },
  }), false);
});

test("detectDesktopEnvironment falls back to pointer and hover capabilities when platform is inconclusive", () => {
  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "",
      userAgent: "",
      maxTouchPoints: 0,
    },
    matchMediaFn(query) {
      return {
        matches: query === "(any-hover: hover)" || query === "(any-pointer: fine)",
      };
    },
  }), true);

  assert.equal(detectDesktopEnvironment({
    navigatorRef: {
      platform: "",
      userAgent: "",
      maxTouchPoints: 0,
    },
    matchMediaFn(query) {
      return {
        matches: query === "(any-pointer: coarse)",
      };
    },
  }), false);
});
