/*
 * MHA Screensaver.
 *
 * Lockscreen-style screensaver with a static clock selected from settings.
 * Clock variant editing will later move to a dedicated lockscreen-style editor.
 */

import { ICONS } from "../components/icons.js";
import { t } from "../i18n/index.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { CLOCK_WIDGET_VARIANTS, createClockWidgetContent, normalizeClockWidgetVariant, updateClockWidget } from "../widgets/clock-widget.js";
import { createWeatherIcon } from "../widgets/weather-icons.js";

export const CLOCK_VARIANTS = ["none", ...CLOCK_WIDGET_VARIANTS];

const NOWBAR_ACTIVE_CHANGE_EVENT = "mha-nowbar-active-change";
const NOWBAR_WALLPAPER_CLIP_CLASS = "mha-screensaver-nowbar-wallpaper-clip";
const NOWBAR_WALLPAPER_SAMPLE_CLASS = "mha-screensaver-nowbar-wallpaper-sample";
const BACKGROUND_SAMPLE_PROPERTIES = Object.freeze([
  "background-color",
  "background-image",
  "background-position",
  "background-repeat",
  "background-size",
]);

export function normalizeClockVariant(value = "digital") {
  return CLOCK_VARIANTS.includes(value) ? value : "digital";
}

function updateDigitalClock(root, now = new Date()) {
  const time = root?.querySelector?.(".mha-screensaver-time");
  const hour = root?.querySelector?.(".mha-screensaver-time-hour");
  const separator = root?.querySelector?.(".mha-screensaver-time-separator");
  const minute = root?.querySelector?.(".mha-screensaver-time-minute");
  const date = root?.querySelector?.(".mha-screensaver-date");

  const [hourText, minuteText] = now
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    .split(":");

  if (hour && separator && minute) {
    hour.textContent = hourText;
    separator.textContent = ":";
    separator.dataset.tick = String(now.getSeconds() % 2);
    minute.textContent = minuteText;
  } else if (time) {
    time.textContent = `${hourText}:${minuteText}`;
  }

  if (date) {
    date.textContent = now.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
}

function updateAnalogClockHands(root, now = new Date()) {
  const hour = root?.querySelector?.(".mha-screensaver-analog-hour");
  const minute = root?.querySelector?.(".mha-screensaver-analog-minute");
  const second = root?.querySelector?.(".mha-screensaver-analog-second");

  if (!hour || !minute || !second) return;

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  hour.style.setProperty("--mha-clock-rotation", `${(hours * 30) + (minutes * .5)}deg`);
  minute.style.setProperty("--mha-clock-rotation", `${minutes * 6 + seconds * .1}deg`);
  second.style.setProperty("--mha-clock-rotation", `${seconds * 6}deg`);
}

function updateClockContent(root, variant = "digital", now = new Date()) {
  const normalized = normalizeClockVariant(variant);

  if (normalized === "none") return;

  const clock = root?.querySelector?.(".mha-clock-widget") || root;
  updateClockWidget(clock, normalizeClockWidgetVariant(normalized), now);
}

/* Legacy screensaver digital/analog builders are kept below for compatibility,
 * but current screensaver rendering uses the shared ClockWidget variants.
 */
function createDigitalClock(now = new Date()) {
  const wrap = document.createElement("div");
  wrap.className = "mha-screensaver-clock mha-screensaver-clock--digital";

  const time = document.createElement("div");
  time.className = "mha-screensaver-time";

  const hour = document.createElement("span");
  hour.className = "mha-screensaver-time-hour";

  const separator = document.createElement("span");
  separator.className = "mha-screensaver-time-separator";
  separator.textContent = ":";

  const minute = document.createElement("span");
  minute.className = "mha-screensaver-time-minute";

  const date = document.createElement("div");
  date.className = "mha-screensaver-date";

  time.append(hour, separator, minute);
  wrap.append(time, date);
  updateDigitalClock(wrap, now);
  return wrap;
}

function createAnalogClock(now = new Date()) {
  const wrap = document.createElement("div");
  wrap.className = "mha-screensaver-clock mha-screensaver-clock--analog";

  const face = document.createElement("div");
  face.className = "mha-screensaver-analog-face";

  const hour = document.createElement("span");
  hour.className = "mha-screensaver-analog-hand mha-screensaver-analog-hour";

  const minute = document.createElement("span");
  minute.className = "mha-screensaver-analog-hand mha-screensaver-analog-minute";

  const second = document.createElement("span");
  second.className = "mha-screensaver-analog-hand mha-screensaver-analog-second";

  const dot = document.createElement("span");
  dot.className = "mha-screensaver-analog-dot";

  face.append(hour, minute, second, dot);
  wrap.append(face);
  updateAnalogClockHands(wrap, now);
  return wrap;
}

function createClockContent(variant = "digital", {
  hass,
  entityVisibilityConfig,
  weatherEntityId = "",
} = {}) {
  const normalized = normalizeClockVariant(variant);

  if (normalized === "none") {
    const empty = document.createElement("div");
    empty.className = "mha-screensaver-clock mha-screensaver-clock--none";
    empty.setAttribute("aria-label", t("settings.clockVariants.none", "No clock"));
    return empty;
  }

  return createClockWidgetContent({
    variant: normalizeClockWidgetVariant(normalized),
    className: "mha-screensaver-clock",
    screensaver: true,
    widget: {
      kind: "clock",
      type: "clock",
      variant: normalizeClockWidgetVariant(normalized),
      entityId: String(weatherEntityId || ""),
    },
    hass,
    entityVisibilityConfig,
  });
}

function createClock(variant = "digital", context = {}) {
  const normalized = normalizeClockVariant(variant);
  const region = document.createElement("section");
  region.className = "mha-screensaver-clock-region";
  region.dataset.clockVariant = normalized;
  region.dataset.clockHidden = String(normalized === "none");
  region.dataset.weatherEntityId = normalized === "digital-weather"
    ? String(context.weatherEntityId || "")
    : "";
  region.tabIndex = -1;
  region.setAttribute("role", "presentation");
  region.setAttribute("aria-label", t("settings.screensaverClock", "Screensaver clock"));

  const stage = document.createElement("div");
  stage.className = "mha-screensaver-clock-stage";

  const layer = document.createElement("div");
  layer.className = "mha-screensaver-clock-layer mha-screensaver-clock-layer--current";
  layer.dataset.clockVariant = normalized;
  layer.dataset.clockHidden = String(normalized === "none");
  layer.append(createClockContent(normalized, context));

  stage.append(layer);
  region.append(stage);
  return region;
}

export const NOWBAR_FALLBACK_ITEMS = Object.freeze([
  {
    key: "now",
    title: "Now bar",
    titleKey: "settings.nowBarPreview.now.title",
    subtitle: "Ready for media and active states",
    subtitleKey: "settings.nowBarPreview.now.subtitle",
  },
  {
    key: "weather",
    title: "Home",
    titleKey: "settings.nowBarPreview.weather.title",
    subtitle: "Modes and shortcuts ready",
    subtitleKey: "settings.nowBarPreview.weather.subtitle",
  },
  {
    key: "calendar",
    title: "Calendar",
    titleKey: "settings.nowBarPreview.calendar.title",
    subtitle: "No upcoming events",
    subtitleKey: "settings.nowBarPreview.calendar.subtitle",
  },
  {
    key: "media",
    title: "Ambiance",
    titleKey: "settings.nowBarPreview.media.title",
    subtitle: "Lighting and climate synced",
    subtitleKey: "settings.nowBarPreview.media.subtitle",
  },
]);

const NOWBAR_FALLBACK_VISUALS = Object.freeze({
  now: Object.freeze({ type: "icon", icon: "bulb", category: "lighting" }),
  weather: Object.freeze({ type: "weather", condition: "unknown" }),
  calendar: Object.freeze({ type: "icon", icon: "calendar", category: "utility" }),
  media: Object.freeze({ type: "icon", icon: "music", category: "media_player" }),
});

const NOWBAR_STACK_POSITIONS = Object.freeze([
  { y: 0, scale: 1, z: 4 },
  { y: 10, scale: .96, z: 3 },
  { y: 20, scale: .92, z: 2 },
  { y: 30, scale: .88, z: 1 },
]);

const NOWBAR_SNAP_DURATION = 720;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function translateOptional(key, fallback = "") {
  return typeof key === "string" && key.trim()
    ? t(key, fallback)
    : String(fallback || "");
}

function normalizeNowBarVisual(visual = {}, key = "now") {
  const fallback = NOWBAR_FALLBACK_VISUALS[key] || NOWBAR_FALLBACK_VISUALS.now;
  if (!visual || typeof visual !== "object") return { ...fallback };

  if (visual.type === "artwork" && String(visual.artworkUrl || "").trim()) {
    return { type: "artwork", artworkUrl: String(visual.artworkUrl).trim() };
  }
  if (visual.type === "date" && String(visual.day || "").trim() && String(visual.month || "").trim()) {
    return {
      type: "date",
      day: String(visual.day).trim(),
      month: String(visual.month).trim(),
    };
  }
  if (visual.type === "weather") {
    return { type: "weather", condition: String(visual.condition || "unknown").trim() || "unknown" };
  }
  if (visual.type === "icon" && String(visual.icon || "").trim()) {
    return {
      type: "icon",
      icon: String(visual.icon).trim(),
      category: String(visual.category || fallback.category || "system").trim(),
    };
  }
  return { ...fallback };
}

function createNowBarVisual(visual = {}) {
  const className = `mha-screensaver-nowbar-visual mha-screensaver-nowbar-visual--${visual.type}`;
  let content = null;

  if (visual.type === "artwork") {
    const image = document.createElement("img");
    image.className = "mha-screensaver-nowbar-artwork";
    image.src = visual.artworkUrl;
    image.alt = "";
    image.decoding = "async";
    content = image;
  } else if (visual.type === "date") {
    const date = document.createElement("span");
    date.className = "mha-screensaver-nowbar-date";
    const day = document.createElement("span");
    day.className = "mha-screensaver-nowbar-date-day";
    day.textContent = visual.day;
    const month = document.createElement("span");
    month.className = "mha-screensaver-nowbar-date-month";
    month.textContent = visual.month;
    date.append(day, month);
    content = date;
  } else if (visual.type === "weather") {
    content = createWeatherIcon(visual.condition, {
      className: "mha-screensaver-nowbar-weather-glyph",
    });
  } else {
    content = createIconSymbol({
      name: visual.icon,
      className: "mha-screensaver-nowbar-glyph",
    });
  }

  return createIcon({
    name: visual.icon || visual.type,
    category: visual.category || (visual.type === "weather" ? "climate" : ""),
    className,
    children: content,
  });
}

function createNowBarTile(item, index) {
  const tile = document.createElement("article");
  tile.className = "mha-screensaver-nowbar-tile";
  tile.dataset.nowbarItem = String(index);
  tile.dataset.nowbarKey = item.key;

  const visual = createNowBarVisual(item.visual);

  const content = document.createElement("div");
  content.className = "mha-screensaver-nowbar-content";

  const title = document.createElement("div");
  title.className = "mha-screensaver-nowbar-title";
  title.textContent = translateOptional(item.titleKey, item.title);

  const subtitle = document.createElement("div");
  subtitle.className = "mha-screensaver-nowbar-subtitle";
  subtitle.textContent = translateOptional(item.subtitleKey, item.subtitle);

  content.append(title, subtitle);
  tile.append(visual, content);
  return tile;
}

function getScreensaverBackground(root) {
  const treeRoot = root?.getRootNode?.();
  if (!treeRoot || treeRoot === root) return null;

  const directBackground = [...(treeRoot.children || [])]
    .find(node => node?.classList?.contains?.("mha-background"));
  return directBackground || treeRoot.querySelector?.(".mha-background") || null;
}

function removeNowBarWallpaperSamples(root) {
  const tiles = root?.querySelectorAll?.(".mha-screensaver-nowbar-tile") || [];
  [...tiles].forEach((tile) => {
    tile.querySelector?.(`.${NOWBAR_WALLPAPER_CLIP_CLASS}`)?.remove?.();
    tile.querySelector?.(`.${NOWBAR_WALLPAPER_SAMPLE_CLASS}`)?.remove?.();
    delete tile.dataset.wallpaperSampleReady;
  });
}

function createNowBarWallpaperSample(background) {
  const clip = document.createElement("div");
  clip.className = NOWBAR_WALLPAPER_CLIP_CLASS;
  clip.setAttribute("aria-hidden", "true");

  const sample = document.createElement("div");
  sample.className = NOWBAR_WALLPAPER_SAMPLE_CLASS;

  [...(background?.childNodes || [])].forEach((child) => {
    if (typeof child?.cloneNode === "function") sample.append(child.cloneNode(true));
  });

  const computedStyle = globalThis.getComputedStyle?.(background);
  if (computedStyle?.getPropertyValue) {
    BACKGROUND_SAMPLE_PROPERTIES.forEach((property) => {
      sample.style.setProperty(property, computedStyle.getPropertyValue(property));
    });
  }

  [sample, ...(sample.querySelectorAll?.("*") || [])].forEach((node) => {
    node.style?.setProperty?.("animation", "none");
    node.style?.setProperty?.("transition", "none");
    node.style?.setProperty?.("pointer-events", "none");
  });

  clip.append(sample);
  return { clip, sample };
}

export function syncScreensaverNowBarWallpaperSample(root) {
  const treeRoot = root?.getRootNode?.();
  const host = treeRoot?.host;
  const background = getScreensaverBackground(root);
  const tiles = [...(root?.querySelectorAll?.(".mha-screensaver-nowbar-tile") || [])];

  removeNowBarWallpaperSamples(root);
  if (host?.dataset?.themeStyle !== "ios" || !background || !tiles.length) return false;

  const backgroundRect = background.getBoundingClientRect?.();
  if (!backgroundRect?.width || !backgroundRect?.height) return false;

  let synced = false;
  tiles.forEach((tile) => {
    const tileRect = tile.getBoundingClientRect?.();
    if (!tileRect?.width || !tileRect?.height) return;

    const { clip, sample } = createNowBarWallpaperSample(background);
    sample.style.setProperty("left", `${backgroundRect.left - tileRect.left}px`);
    sample.style.setProperty("top", `${backgroundRect.top - tileRect.top}px`);
    sample.style.setProperty("inline-size", `${backgroundRect.width}px`);
    sample.style.setProperty("block-size", `${backgroundRect.height}px`);
    tile.prepend(clip);
    tile.dataset.wallpaperSampleReady = "true";
    synced = true;
  });
  return synced;
}

function normalizeNowBarTile(item = {}) {
  const fallback = NOWBAR_FALLBACK_ITEMS.find(entry => entry.key === item.key) || NOWBAR_FALLBACK_ITEMS[0];
  return {
    key: item.key || fallback.key,
    title: item.title || t(fallback.titleKey, fallback.title),
    subtitle: item.subtitle || t(fallback.subtitleKey, fallback.subtitle),
    visual: normalizeNowBarVisual(item.visual, item.key || fallback.key),
  };
}

function getNowBarFallbackTiles(enabledItems = {}) {
  return NOWBAR_FALLBACK_ITEMS
    .filter(item => enabledItems[item.key] !== false)
    .map(normalizeNowBarTile);
}

function getNowBarSignature(items = []) {
  return JSON.stringify(items.map(item => ({
    key: item.key,
    title: item.title,
    subtitle: item.subtitle,
    visual: item.visual,
  })));
}

function createNowBar({ items: enabledItems = {}, tiles = null } = {}) {
  const visibleItems = (Array.isArray(tiles) ? tiles : getNowBarFallbackTiles(enabledItems))
    .map(normalizeNowBarTile);
  if (!visibleItems.length) return null;

  const now = document.createElement("section");
  now.className = "mha-screensaver-nowbar";
  now.dataset.nowbarSignature = getNowBarSignature(visibleItems);
  now.setAttribute("aria-label", t("settings.nowBar", "Now Bar"));

  const stack = document.createElement("div");
  stack.className = "mha-screensaver-nowbar-stack";
  stack.setAttribute("role", "list");

  const tileNodes = visibleItems.map((item, index) => {
    const tile = createNowBarTile(item, index);
    tile.setAttribute("role", "listitem");
    stack.append(tile);
    return tile;
  });

  let activeIndex = 0;
  let pointerId = null;
  let dragStartY = 0;
  let dragDeltaY = 0;
  let isDragging = false;
  let dragMode = "";
  let isSnapping = false;
  let snapFrame = 0;
  let lastPointerType = "";
  let suppressClickCycle = false;
  let suppressClickTimer = 0;

  const getRelativePosition = (index) => (
    (index - activeIndex + tileNodes.length) % tileNodes.length
  );

  const getCardHeight = () => (
    tileNodes[0]?.getBoundingClientRect?.().height || 88
  );

  const setTileTransform = (tile, position) => {
    tile.style.setProperty("--mha-nowbar-y", `${position.y}px`);
    tile.style.setProperty("--mha-nowbar-scale", String(position.scale));
    tile.style.zIndex = String(position.z);
  };

  const interpolatePosition = (from, to, progress) => ({
    y: lerp(from.y, to.y, progress),
    scale: lerp(from.scale, to.scale, progress),
    z: progress > .55 ? to.z : from.z,
  });

  const getLiftThenBackPosition = (from, to, progress) => {
    const height = getCardHeight();
    const liftY = -height * 1.35;
    const retreatY = -height * 1.08;

    if (progress < .34) {
      const phase = progress / .34;

      return {
        y: lerp(from.y, liftY, phase),
        scale: lerp(from.scale, 1.03, phase),
        z: 5,
      };
    }

    if (progress < .68) {
      const phase = (progress - .34) / .34;

      return {
        y: lerp(liftY, retreatY, phase),
        scale: lerp(1.03, .84, phase),
        z: phase > .72 ? to.z : 5,
      };
    }

    const phase = (progress - .68) / .32;

    return {
      y: lerp(retreatY, to.y, phase),
      scale: lerp(.84, to.scale, phase),
      z: to.z,
    };
  };

  const getBackThenSettleFrontPosition = (from, to, progress) => {
    const height = getCardHeight();
    const retreatY = -height * 1.08;
    const liftY = -height * 1.35;

    if (progress < .34) {
      const phase = progress / .34;

      return {
        y: lerp(from.y, retreatY, phase),
        scale: lerp(from.scale, .84, phase),
        z: from.z,
      };
    }

    if (progress < .68) {
      const phase = (progress - .34) / .34;

      return {
        y: lerp(retreatY, liftY, phase),
        scale: lerp(.84, 1.03, phase),
        z: phase > .28 ? 5 : from.z,
      };
    }

    const phase = (progress - .68) / .32;

    return {
      y: lerp(liftY, to.y, phase),
      scale: lerp(1.03, to.scale, phase),
      z: 5,
    };
  };

  const getDraggedPosition = (relativePosition, direction, progress) => {
    const current = NOWBAR_STACK_POSITIONS[relativePosition];

    if (direction > 0) {
      if (relativePosition === 0) {
        const back = NOWBAR_STACK_POSITIONS[NOWBAR_STACK_POSITIONS.length - 1];

        // Three-phase path: lift out of the stack, recede, then settle behind.
        // No opacity is used, so the card remains spatially present throughout.
        return getLiftThenBackPosition(current, back, progress);
      }

      return interpolatePosition(
        current,
        NOWBAR_STACK_POSITIONS[relativePosition - 1],
        progress,
      );
    }

    if (relativePosition === NOWBAR_STACK_POSITIONS.length - 1) {
      // Reverse path: the rear card rises from behind, advances, then lands front.
      return getBackThenSettleFrontPosition(current, NOWBAR_STACK_POSITIONS[0], progress);
    }

    return interpolatePosition(
      current,
      NOWBAR_STACK_POSITIONS[relativePosition + 1],
      progress,
    );
  };

  const renderStack = (progress = 0, direction = 1) => {
    tileNodes.forEach((tile, index) => {
      const relativePosition = Math.min(
        getRelativePosition(index),
        NOWBAR_STACK_POSITIONS.length - 1,
      );
      const position = progress > 0
        ? getDraggedPosition(relativePosition, direction, progress)
        : NOWBAR_STACK_POSITIONS[relativePosition];

      tile.dataset.stackPosition = String(relativePosition);
      tile.dataset.active = String(relativePosition === 0);
      setTileTransform(tile, position);
    });

    if (progress === 0) {
      now.dataset.activeIndex = String(activeIndex);
      if (typeof globalThis.CustomEvent === "function") {
        now.dispatchEvent?.(new CustomEvent(NOWBAR_ACTIVE_CHANGE_EVENT, { bubbles: true }));
      }
    }
  };

  const stopNowBarEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const snapStack = (direction) => {
    if (isSnapping) return;

    isSnapping = true;
    now.classList.add("is-nowbar-snapping");
    const startedAt = performance.now();

    const tick = (nowTime) => {
      const linearProgress = clamp((nowTime - startedAt) / NOWBAR_SNAP_DURATION, 0, 1);
      const easedProgress = 1 - Math.pow(1 - linearProgress, 3);

      renderStack(easedProgress, direction);

      if (linearProgress < 1) {
        snapFrame = requestAnimationFrame(tick);
        return;
      }

      // The visual cycle finishes before the logical index rotates, so tiles
      // never disappear or get replaced mid-motion.
      activeIndex = (activeIndex + direction + tileNodes.length) % tileNodes.length;
      isSnapping = false;
      snapFrame = 0;
      now.classList.remove("is-nowbar-snapping");
      renderStack();
    };

    cancelAnimationFrame(snapFrame);
    snapFrame = requestAnimationFrame(tick);
  };

  const finishDrag = () => {
    if (!isDragging) return;

    const cardHeight = getCardHeight();
    const threshold = Math.max(28, cardHeight * .28);
    const direction = dragDeltaY < 0 ? 1 : -1;
    const shouldCommit = Math.abs(dragDeltaY) >= threshold;
    const movedEnoughToCancelClick = Math.abs(dragDeltaY) > 6;

    now.classList.remove("is-nowbar-dragging");

    // Snap after a meaningful gesture; otherwise animate back to the same stack state.
    if (shouldCommit) {
      snapStack(direction);
    } else {
      renderStack();
    }

    isDragging = false;
    dragMode = "";
    pointerId = null;
    if (movedEnoughToCancelClick || shouldCommit) {
      suppressClickCycle = true;
      window.clearTimeout(suppressClickTimer);
      suppressClickTimer = window.setTimeout(() => {
        suppressClickCycle = false;
      }, 360);
    }
    dragDeltaY = 0;
    window.removeEventListener("mousemove", updateMouseDrag, { capture: true });
  };

  const finishWindowDrag = (event) => {
    if (!isDragging) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    finishDrag();
  };

  const updateMouseDrag = (event) => {
    if (!isDragging || dragMode !== "mouse") return;

    stopNowBarEvent(event);
    dragDeltaY = event.clientY - dragStartY;

    const direction = dragDeltaY < 0 ? 1 : -1;
    const progress = clamp(Math.abs(dragDeltaY) / (getCardHeight() * 1.05), 0, 1);
    renderStack(progress, direction);
  };

  now.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    stopNowBarEvent(event);
    if (isSnapping) return;

    pointerId = event.pointerId;
    dragMode = "pointer";
    lastPointerType = event.pointerType || "";
    dragStartY = event.clientY;
    dragDeltaY = 0;
    isDragging = true;
    now.classList.add("is-nowbar-dragging");
    now.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointerup", finishWindowDrag, { capture: true, once: true });
    window.addEventListener("pointercancel", finishWindowDrag, { capture: true, once: true });
    window.addEventListener("mouseup", finishWindowDrag, { capture: true, once: true });
  });

  now.addEventListener("pointermove", (event) => {
    if (!isDragging || dragMode !== "pointer" || event.pointerId !== pointerId) return;

    stopNowBarEvent(event);
    dragDeltaY = event.clientY - dragStartY;

    const direction = dragDeltaY < 0 ? 1 : -1;
    const progress = clamp(Math.abs(dragDeltaY) / (getCardHeight() * 1.05), 0, 1);
    renderStack(progress, direction);
  });

  now.addEventListener("pointerup", (event) => {
    if (dragMode !== "pointer" || event.pointerId !== pointerId) return;
    stopNowBarEvent(event);
    finishDrag();
  });

  now.addEventListener("pointercancel", (event) => {
    if (dragMode !== "pointer" || event.pointerId !== pointerId) return;
    stopNowBarEvent(event);
    finishDrag();
  });

  now.addEventListener("lostpointercapture", finishWindowDrag);

  now.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;

    stopNowBarEvent(event);
    if (isDragging) return;
    if (isSnapping) return;

    dragMode = "mouse";
    lastPointerType = "mouse";
    dragStartY = event.clientY;
    dragDeltaY = 0;
    isDragging = true;
    now.classList.add("is-nowbar-dragging");
    window.addEventListener("mousemove", updateMouseDrag, { capture: true });
    window.addEventListener("mouseup", finishWindowDrag, { capture: true, once: true });
  });

  now.addEventListener("wheel", (event) => {
    stopNowBarEvent(event);
    if (isDragging || isSnapping || Math.abs(event.deltaY) < 8) return;

    snapStack(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  now.addEventListener("click", (event) => {
    stopNowBarEvent(event);

    const canClickCycle = lastPointerType === "mouse"
      && window.matchMedia?.("(pointer: fine)")?.matches;

    if (!canClickCycle || isDragging || isSnapping || suppressClickCycle) {
      suppressClickCycle = false;
      return;
    }

    snapStack(1);
  });

  ["touchstart", "touchmove", "touchend"].forEach((type) => {
    now.addEventListener(type, (event) => event.stopPropagation(), { passive: false });
  });

  now.append(stack);
  renderStack();
  return now;
}

export function createScreensaver({
  isVisible = false,
  showNowBar = true,
  nowBarItems = {},
  nowBarTiles = null,
  clockVariant = "digital",
  hass,
  entityVisibilityConfig,
  weatherEntityId = "",
  onOpenScreensaverSettings,
  onWake,
} = {}) {
  const root = document.createElement("div");
  root.className = "mha-screensaver";
  root.dataset.visible = String(Boolean(isVisible));
  root.dataset.clockVariant = normalizeClockVariant(clockVariant);
  root.dataset.nowbarEnabled = String(Boolean(showNowBar));
  root.setAttribute("aria-hidden", String(!isVisible));

  let wakePointerStartX = 0;
  let wakePointerStartY = 0;

  root.addEventListener("pointerdown", (event) => {
    wakePointerStartX = event.clientX;
    wakePointerStartY = event.clientY;
  });

  root.addEventListener("pointerup", (event) => {
    const dx = event.clientX - wakePointerStartX;
    const dy = event.clientY - wakePointerStartY;
    const isTap = Math.hypot(dx, dy) < 12;

    if (isTap) {
      onWake?.();
    }
  });

  const shade = document.createElement("div");
  shade.className = "mha-screensaver-shade";

  const clockRegion = createClock(clockVariant, {
    hass,
    entityVisibilityConfig,
    weatherEntityId,
  });

  root.append(shade, clockRegion);

  const edit = document.createElement("button");
  edit.className = "mha-edit-button mha-main-edit-button mha-screensaver-edit-button";
  edit.type = "button";
  edit.innerHTML = ICONS.edit;
  edit.setAttribute("aria-label", t("settings.configureScreensaver", "Configure screensaver"));
  ["pointerdown", "pointerup", "click", "touchstart", "touchend"].forEach((type) => {
    edit.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type === "click") onOpenScreensaverSettings?.();
    });
  });
  root.append(edit);

  const spacer = document.createElement("div");
  spacer.className = "mha-screensaver-spacer";
  root.append(spacer);

  if (showNowBar) {
    const nowBar = createNowBar({ items: nowBarItems, tiles: nowBarTiles });
    if (nowBar) root.append(nowBar);
  }

  return root;
}

export function updateScreensaverState(root, { isVisible = false } = {}) {
  if (!root) return false;
  root.dataset.visible = String(Boolean(isVisible));
  root.setAttribute("aria-hidden", String(!isVisible));
  return true;
}

export function updateScreensaverClockVariant(root, variant = "digital", {
  hass,
  entityVisibilityConfig,
  weatherEntityId = "",
} = {}) {
  const normalized = normalizeClockVariant(variant);
  if (!root) return false;

  const existing = root.querySelector?.(".mha-screensaver-clock-region");
  if (root.dataset.clockVariant === normalized && existing) {
    if (normalized === "digital-weather") {
      const normalizedWeatherEntityId = String(weatherEntityId || "");
      existing.dataset.weatherEntityId = normalizedWeatherEntityId;
      existing.querySelector?.(".mha-clock-widget")?.__mhaUpdateFromHass?.(
        hass,
        {
          kind: "clock",
          type: "clock",
          variant: normalized,
          entityId: normalizedWeatherEntityId,
        },
        entityVisibilityConfig,
      );
    }
    return false;
  }

  const next = createClock(normalized, {
    hass,
    entityVisibilityConfig,
    weatherEntityId,
  });
  if (existing) {
    existing.replaceWith(next);
  } else {
    const shade = root.querySelector?.(".mha-screensaver-shade");
    if (shade?.after) shade.after(next);
    else root.prepend(next);
  }
  root.dataset.clockVariant = normalized;
  return true;
}

export function updateScreensaverNowBar(root, { showNowBar = true, nowBarItems = {}, nowBarTiles = null } = {}) {
  if (!root) return false;

  const existing = root.querySelector?.(".mha-screensaver-nowbar");
  root.dataset.nowbarEnabled = String(Boolean(showNowBar));

  if (!showNowBar) {
    if (!existing) return false;
    existing.remove();
    return true;
  }

  const next = createNowBar({ items: nowBarItems, tiles: nowBarTiles });
  if (!next) {
    if (!existing) return false;
    existing.remove();
    return true;
  }

  if (existing?.dataset.nowbarSignature === next.dataset.nowbarSignature) {
    return false;
  }

  if (existing) {
    existing.replaceWith(next);
    return true;
  }

  const spacer = root.querySelector?.(".mha-screensaver-spacer");
  if (spacer?.after) spacer.after(next);
  else root.append(next);
  return true;
}

export function updateScreensaverClock(root, variant = "digital") {
  const normalized = normalizeClockVariant(variant);
  const region = root?.querySelector?.(".mha-screensaver-clock-region");
  if (!region) return;

  const layer = region.querySelector(".mha-screensaver-clock-layer--current");
  if (!layer) return;

  updateClockContent(layer, layer.dataset.clockVariant || normalized);
}
