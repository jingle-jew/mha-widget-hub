import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import { bindComponentCadence } from "../core/component-cadence.js";
import { discoverOverviewAreas } from "../ha/area-discovery.js";
import { getEntityDomain } from "../ha/entity.js";
import { t } from "../i18n/index.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { createPanelShell } from "../panels/panel-shell.js";
import { setFloatingControlButtonIcon } from "../ui/floating-control-icons.js";
import { createSystemIconButton } from "../system/system-buttons.js";
import { createWidgetShell } from "../widgets/widget-shell.js";
import { normalizeStoredWidgetContract } from "../widgets/widget-storage.js";
import {
  normalizeOverviewPageConfig,
  orderOverviewAreas,
  orderOverviewEntities,
  OVERVIEW_VARIANTS,
  reconcileOverviewPageConfig,
  setOverviewItemHidden,
  updateOverviewAreaConfig,
} from "./overview-page-config.js";
import { createOverviewPageController } from "./overview-page-controller.js";

const STANDARD_WIDGET_TOOL_SELECTOR = [
  ".mha-widget-tools",
  ".mha-widget-move-overlay",
  ".mha-size-badge",
  ".mha-widget-resize-handle",
].join(",");

const ROOM_NON_POSITION_TOOL_SELECTOR = [
  ".mha-tool-button--dimension",
  ".mha-size-badge",
  ".mha-widget-resize-handle",
].join(",");

function getAreaId(area = {}) {
  return String(area?.id || area?.area_id || "").trim();
}

function getEntityId(entity = {}) {
  return String(entity?.entityId || entity?.entity_id || "").trim();
}

export function resolveOverviewRoomGridUnits(layout = "desktop", mobileGridUnits = 4) {
  if (layout !== "mobile") return 6;
  const units = Math.round(Number(mobileGridUnits));
  return Number.isFinite(units) ? Math.max(2, Math.min(12, units)) : 4;
}

export function createOverviewDiscoverySignature(result = {}) {
  return JSON.stringify({
    areas: result.areas || [],
    errors: result.errors || {},
  });
}

function createOverviewWidgetId(prefix = "item", id = "") {
  return `overview-${prefix}-${String(id || "item").replace(/[^a-z0-9_-]+/gi, "-")}`;
}

export function createOverviewEntityWidget(entity = {}, variant = "") {
  const entityId = getEntityId(entity);
  const domain = String(entity?.domain || getEntityDomain(entityId));
  const common = {
    id: createOverviewWidgetId("entity", entityId),
    entityId,
    entity_id: entityId,
    label: entity?.name || entityId,
    title: entity?.name || entityId,
    icon: entity?.icon || "",
    iconCategory: domain,
    overviewEntityId: entityId,
  };

  if (variant === OVERVIEW_VARIANTS.BUTTON) {
    return {
      ...common,
      kind: "button",
      type: "button",
      component: "button-widget",
      category: "lights",
      variant: "simple-button",
      buttonAction: domain === "light" ? "toggle" : undefined,
      w: 2,
      h: 1,
    };
  }
  if (variant === OVERVIEW_VARIANTS.MEDIA_WIDE) {
    return {
      ...common,
      kind: "media",
      type: "media",
      component: "media-widget",
      category: "media",
      variant: "media-wide",
      w: 4,
      h: 2,
    };
  }
  if (variant === OVERVIEW_VARIANTS.MEDIA_COMPACT) {
    return {
      ...common,
      kind: "media",
      type: "media",
      component: "media-widget",
      category: "media",
      variant: "media-compact",
      w: 2,
      h: 2,
    };
  }
  return {
    ...common,
    kind: "toggle",
    type: "toggle",
    component: "toggle-widget",
    category: "lights",
    variant: "toggle-widget",
    w: 4,
    h: 1,
  };
}

export function buildOverviewDeviceWidgets(area = null, config = {}, summaryWidgets = []) {
  if (!area) {
    return (Array.isArray(summaryWidgets) ? summaryWidgets : [])
      .map(widget => normalizeStoredWidgetContract(widget));
  }

  const areaId = getAreaId(area);
  const normalized = reconcileOverviewPageConfig(config, [area]);
  const areaConfig = normalized.areas[areaId] || {};
  const entities = orderOverviewEntities(area, normalized);
  const entitiesById = new Map(entities.map(entity => [getEntityId(entity), entity]));
  const removedEntityIds = new Set([
    ...(areaConfig.hiddenEntityIds || []),
    ...(areaConfig.removedEntityIds || []),
  ]);
  const storedWidgets = areaConfig.deviceWidgetsConfigured
    ? (areaConfig.deviceWidgets || [])
    : [];
  const resolved = [];
  const representedEntityIds = new Set();

  storedWidgets.forEach((storedWidget) => {
    const entityId = String(storedWidget?.overviewEntityId || "").trim();
    if (entityId) {
      const entity = entitiesById.get(entityId);
      if (!entity || removedEntityIds.has(entityId)) return;
      representedEntityIds.add(entityId);
      const base = createOverviewEntityWidget(
        entity,
        areaConfig.variants?.[entityId],
      );
      resolved.push(normalizeStoredWidgetContract({
        ...base,
        ...storedWidget,
        id: base.id,
        entityId,
        entity_id: entityId,
        overviewEntityId: entityId,
      }));
      return;
    }
    resolved.push(normalizeStoredWidgetContract(storedWidget));
  });

  entities.forEach((entity) => {
    const entityId = getEntityId(entity);
    if (!entityId || representedEntityIds.has(entityId) || removedEntityIds.has(entityId)) return;
    resolved.push(normalizeStoredWidgetContract(createOverviewEntityWidget(
      entity,
      areaConfig.variants?.[entityId],
    )));
  });

  return resolved;
}

export function persistOverviewAreaDeviceWidgets(config = {}, area = {}, widgets = []) {
  const areaId = getAreaId(area);
  if (!areaId) return normalizeOverviewPageConfig(config);
  const discoveredEntityIds = new Set(
    (area?.entities || []).map(getEntityId).filter(Boolean),
  );
  const normalizedWidgets = (Array.isArray(widgets) ? widgets : [])
    .map(widget => normalizeStoredWidgetContract(widget));
  const retainedEntityIds = new Set(
    normalizedWidgets
      .map(widget => String(widget?.overviewEntityId || "").trim())
      .filter(Boolean),
  );

  return updateOverviewAreaConfig(config, areaId, current => ({
    ...current,
    hiddenEntityIds: [...discoveredEntityIds].filter(id => !retainedEntityIds.has(id)),
    removedEntityIds: [...discoveredEntityIds].filter(id => !retainedEntityIds.has(id)),
    deviceWidgets: normalizedWidgets,
    deviceWidgetsConfigured: true,
  }));
}

function stripStandardWidgetTools(shell) {
  shell.querySelectorAll?.(STANDARD_WIDGET_TOOL_SELECTOR).forEach(node => node.remove());
  return shell;
}

function appendRoomVisibilityButton(shell, { hidden = false, onToggleHidden } = {}) {
  shell.dataset.overviewHidden = String(hidden);
  shell.querySelectorAll?.(ROOM_NON_POSITION_TOOL_SELECTOR).forEach(node => node.remove());
  const tools = shell.querySelector?.(".mha-widget-tools");
  if (!tools) return shell;
  const label = hidden
    ? t("overview.showItem", "Show")
    : t("overview.hideItem", "Hide");
  tools.prepend(createSystemIconButton({
    icon: hidden ? "show" : "hide",
    label,
    size: "sm",
    className: "mha-overview-room-visibility-button",
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleHidden?.();
    },
  }));
  return shell;
}

function createRoomWidget(area, { selected = false, hidden = false } = {}) {
  const areaId = getAreaId(area);
  return {
    id: createOverviewWidgetId("area", areaId),
    kind: "button",
    type: "button",
    component: "button-widget",
    category: "lights",
    variant: "simple-button",
    w: 2,
    h: 2,
    label: area?.name || areaId,
    title: area?.name || areaId,
    icon: area?.icon || "home",
    iconCategory: "home",
    overviewAreaId: areaId,
    active: selected,
    state: hidden
      ? t("overview.hidden", "Hidden")
      : selected
        ? t("overview.selected", "Selected")
        : t("overview.room", "Room"),
  };
}

export function orderOverviewRoomWidgetsForVisibility(
  widgets = [],
  positions = {},
  { areaId = "", hidden = false, hiddenAreaIds = [] } = {},
) {
  const targetAreaId = String(areaId || "").trim();
  const hiddenIds = new Set((Array.isArray(hiddenAreaIds) ? hiddenAreaIds : [])
    .map(id => String(id || "").trim())
    .filter(Boolean));
  const ordered = (Array.isArray(widgets) ? widgets : [])
    .map((widget, index) => ({ widget, index, position: positions?.[widget?.id] }))
    .sort((a, b) => {
      const aY = Number(a.position?.y);
      const bY = Number(b.position?.y);
      const aX = Number(a.position?.x);
      const bX = Number(b.position?.x);
      const aPositioned = Number.isInteger(aY) && Number.isInteger(aX);
      const bPositioned = Number.isInteger(bY) && Number.isInteger(bX);
      if (aPositioned && bPositioned) return aY - bY || aX - bX || a.index - b.index;
      if (aPositioned !== bPositioned) return aPositioned ? -1 : 1;
      return a.index - b.index;
    })
    .map(item => item.widget);
  const visibleWidgets = ordered.filter(widget => !hiddenIds.has(String(widget?.overviewAreaId || "")));
  const hiddenWidgets = ordered.filter(widget => hiddenIds.has(String(widget?.overviewAreaId || "")));

  if (!hidden || !targetAreaId) return [...visibleWidgets, ...hiddenWidgets];
  const target = hiddenWidgets.find(widget => String(widget?.overviewAreaId || "") === targetAreaId);
  return [
    ...visibleWidgets,
    ...hiddenWidgets.filter(widget => widget !== target),
    ...(target ? [target] : []),
  ];
}

function createSpecializedShell(widget, {
  units = 4,
  layout = "desktop",
  hass,
  visibilityConfig,
  isEditing = false,
  updateWidgetConfig,
} = {}) {
  const shell = createWidgetShell(widget, {
    activeGridUnits: units,
    activeGridRows: 100,
    layout,
    isEditing,
    hass,
    entityVisibilityConfig: visibilityConfig,
    interactive: !isEditing,
    onUpdateWidgetConfig: (_widgetId, config) => updateWidgetConfig?.(config),
  });
  stripStandardWidgetTools(shell);
  shell.classList.add("mha-overview-widget");
  return shell;
}

function createEditButton({ editing = false, disabled = false, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mha-pill mha-overview-edit-button";
  button.dataset.tone = editing ? "accent" : "default";
  button.disabled = disabled;
  button.textContent = editing ? t("common.close", "Close") : t("common.edit", "Edit");
  button.onclick = onClick;
  return button;
}

function createHeaderAddButton({ onClick } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mha-add-widget-button mha-overview-header-add-button";
  button.dataset.dragDelete = "false";
  const label = t("settings.addWidget", "Add widget");
  button.setAttribute("aria-label", label);
  setFloatingControlButtonIcon(button, { name: "plus", label });
  button.onclick = (event) => {
    if (button.dataset.dragDelete === "true") return;
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };
  return button;
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "mha-overview-empty";
  empty.textContent = message;
  return empty;
}

function createSection({ title, body, footer, headerAction = null, className = "" }) {
  const section = document.createElement("section");
  section.className = ["mha-overview-section", className].filter(Boolean).join(" ");
  const header = document.createElement("header");
  header.className = "mha-overview-section-header";
  const heading = document.createElement("h2");
  heading.textContent = title;
  header.append(heading);
  if (headerAction) header.append(headerAction);
  const content = document.createElement("div");
  content.className = "mha-overview-section-body";
  content.append(body);
  const sectionFooter = document.createElement("footer");
  sectionFooter.className = "mha-overview-section-footer";
  if (footer) sectionFooter.append(footer);
  section.append(header, content, sectionFooter);
  return section;
}

function replaceChildrenWithDestroy(root, ...children) {
  [...(root?.childNodes || [])].forEach(node => destroyDomSubtree(node));
  root.replaceChildren(...children);
}

export function syncOverviewSheetPortal({
  surfaceRoot,
  currentSheet = null,
  nextSheet = null,
  destroy = destroyDomSubtree,
} = {}) {
  if (currentSheet && currentSheet !== nextSheet) {
    destroy(currentSheet);
    currentSheet.remove?.();
  }

  if (!nextSheet) return null;
  if (!surfaceRoot || typeof surfaceRoot.append !== "function") {
    destroy(nextSheet);
    nextSheet.remove?.();
    return null;
  }

  if (nextSheet.parentNode !== surfaceRoot) surfaceRoot.append(nextSheet);
  return nextSheet;
}

export function createOverviewPage(page = {}, {
  hass,
  visibilityConfig,
  layout = "desktop",
  mobileGridUnits = 4,
  surfaceRoot = null,
  onConfigChange = () => {},
  onSummaryWidgetsChange = () => false,
  onEditingChange = () => false,
  createEditableWidgetElement = null,
  getEditableWidgetPositions = () => ({}),
  getWidgetPositions = () => ({}),
  repackEditableWidgets = () => false,
  onOpenWidgetManager = () => {},
  onSheetOpenChange = () => {},
  onContextChange = () => {},
} = {}) {
  const mobile = layout === "mobile";
  const roomGridUnits = resolveOverviewRoomGridUnits(layout, mobileGridUnits);
  const root = document.createElement("section");
  root.className = "mha-overview-page";
  root.dataset.widgetComponent = "overview-page";
  root.dataset.mobile = String(mobile);
  root.setAttribute("aria-label", t("overview.ariaLabel", "Overview page"));

  let currentPage = page;
  let currentHass = hass;
  let currentVisibilityConfig = visibilityConfig;
  let currentConfig = normalizeOverviewPageConfig(page?.config);
  let discoveredAreas = [];
  let discoveryErrors = {};
  let discoveryPending = true;
  let discoverySignature = "";
  let activeMobileSheet = null;
  let destroyed = false;

  const controller = createOverviewPageController({
    config: currentConfig,
    mobile,
    onStateChange: (_state, reason) => render(reason),
  });

  function getOrderedAreas({ includeHidden = false } = {}) {
    const ordered = orderOverviewAreas(discoveredAreas, currentConfig);
    if (includeHidden) return ordered;
    const hidden = new Set(currentConfig.hiddenRoomIds);
    return ordered.filter(area => !hidden.has(getAreaId(area)));
  }

  function getArea(areaId = controller.selectedAreaId) {
    return discoveredAreas.find(area => getAreaId(area) === areaId) || null;
  }

  function persistConfig(nextConfig) {
    const normalized = reconcileOverviewPageConfig(nextConfig, discoveredAreas);
    currentConfig = normalized;
    controller.updateConfig(normalized);
    onConfigChange(normalized);
    return normalized;
  }

  function getDeviceWidgets(area = getArea()) {
    return buildOverviewDeviceWidgets(area, currentConfig, currentPage?.widgets || []);
  }

  function persistDeviceWidgets(widgets = [], area = getArea()) {
    const normalizedWidgets = (Array.isArray(widgets) ? widgets : [])
      .map(widget => normalizeStoredWidgetContract(widget));
    if (!area) {
      currentPage = { ...currentPage, widgets: normalizedWidgets };
      onSummaryWidgetsChange(normalizedWidgets);
      render("summary-widgets-changed");
      return true;
    }
    persistConfig(persistOverviewAreaDeviceWidgets(currentConfig, area, normalizedWidgets));
    render("area-widgets-changed");
    return true;
  }

  function setRoomEditing(editing) {
    const nextEditing = Boolean(editing);
    if (nextEditing === (controller.editingSection === "rooms")) return true;
    if (nextEditing) {
      const widgets = getOrderedAreas({ includeHidden: true })
        .map(area => createRoomWidget(area, {
          selected: controller.selectedAreaId === getAreaId(area),
          hidden: currentConfig.hiddenRoomIds.includes(getAreaId(area)),
        }))
        .map(widget => normalizeStoredWidgetContract(widget));
      const accepted = onEditingChange({
        editing: true,
        section: "rooms",
        scope: "overview-rooms",
        contextId: "rooms",
        units: roomGridUnits,
        rows: 100,
        allowAdd: false,
        allowRemove: false,
        widgets,
        persistWidgets: () => true,
      });
      if (accepted === false) return false;
      return controller.setEditingSection("rooms");
    }
    onEditingChange({ editing: false });
    return controller.setEditingSection("");
  }

  function setDeviceEditing(editing) {
    const nextEditing = Boolean(editing);
    if (nextEditing === (controller.editingSection === "devices")) return true;
    const area = getArea();
    if (nextEditing) {
      const contextId = area ? `area:${getAreaId(area)}` : "summary";
      const accepted = onEditingChange({
        editing: true,
        section: "devices",
        scope: "overview-devices",
        contextId,
        units: 4,
        rows: 100,
        allowAdd: true,
        allowRemove: true,
        widgets: getDeviceWidgets(area),
        persistWidgets: widgets => persistDeviceWidgets(widgets, area),
      });
      if (accepted === false) return false;
      return controller.setEditingSection("devices");
    }
    onEditingChange({ editing: false });
    return controller.setEditingSection("");
  }

  function createRoomGrid({ mobileGrid = false } = {}) {
    const grid = document.createElement("div");
    grid.className = "mha-overview-room-grid";
    grid.dataset.mobileGrid = String(mobileGrid);
    const gridUnits = mobileGrid ? roomGridUnits : 6;
    grid.style.setProperty("--mha-overview-room-columns", String(gridUnits));
    grid.style.setProperty("--mha-overview-room-gap-count", String(gridUnits - 1));
    grid.setAttribute("role", "list");
    const editing = controller.editingSection === "rooms";
    const areas = getOrderedAreas({ includeHidden: editing });
    const hiddenIds = new Set(currentConfig.hiddenRoomIds);
    const positions = editing
      ? (getEditableWidgetPositions() || {})
      : (getWidgetPositions({
        section: "rooms",
        scope: "overview-rooms",
        contextId: "rooms",
        units: gridUnits,
        rows: 100,
      }) || {});
    if (editing) grid.classList.add("mha-grid");

    areas.forEach((area) => {
      const areaId = getAreaId(area);
      const hidden = hiddenIds.has(areaId);
      const selected = controller.selectedAreaId === areaId;
      const widget = normalizeStoredWidgetContract(createRoomWidget(area, { selected, hidden }));
      const shell = editing && typeof createEditableWidgetElement === "function"
        ? createEditableWidgetElement(widget, {
          units: gridUnits,
          rows: 100,
          layout,
          position: positions?.[widget.id],
        })
        : createSpecializedShell(widget, {
          units: gridUnits,
          layout,
          hass: currentHass,
          visibilityConfig: currentVisibilityConfig,
        });
      shell.dataset.areaId = areaId;
      shell.dataset.overviewSelected = String(selected);
      shell.setAttribute("role", "listitem");
      const position = positions?.[widget.id];
      if (position && !editing) {
        shell.style.gridColumn = `${position.x} / span ${Math.min(gridUnits, Number(widget.w) || 1)}`;
        shell.style.gridRow = `${position.y} / span ${Math.max(1, Number(widget.h) || 1)}`;
      }
      const content = shell.querySelector(".mha-simple-button-widget");
      content?.__mhaDestroy?.();
      content?.removeAttribute?.("data-widget-component");
      if (content) {
        content.dataset.active = String(selected);
        content.dataset.state = selected ? "on" : "off";
        content.dataset.actionable = String(!editing && !hidden);
        content.setAttribute("aria-pressed", String(selected));
        content.setAttribute("aria-disabled", String(editing || hidden));
        content.tabIndex = editing || hidden ? -1 : 0;
        const state = content.querySelector(".mha-simple-button-state");
        if (state) state.textContent = hidden
          ? t("overview.hidden", "Hidden")
          : selected
            ? t("overview.selected", "Selected")
            : t("overview.room", "Room");
        const activate = (event) => {
          if (editing || hidden) return;
          event.preventDefault();
          if (controller.editingSection === "devices") setDeviceEditing(false);
          controller.selectArea(areaId);
        };
        content.addEventListener("click", activate);
        content.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") activate(event);
        });
      }

      if (editing) {
        appendRoomVisibilityButton(shell, {
          hidden,
          onToggleHidden: () => {
            const nextHiddenRoomIds = setOverviewItemHidden(
              currentConfig.hiddenRoomIds,
              areaId,
              !hidden,
            );
            persistConfig({
              ...currentConfig,
              hiddenRoomIds: nextHiddenRoomIds,
            });
            const roomWidgets = getOrderedAreas({ includeHidden: true })
              .map(room => createRoomWidget(room, {
                selected: controller.selectedAreaId === getAreaId(room),
                hidden: nextHiddenRoomIds.includes(getAreaId(room)),
              }))
              .map(widget => normalizeStoredWidgetContract(widget));
            repackEditableWidgets(orderOverviewRoomWidgetsForVisibility(
              roomWidgets,
              getEditableWidgetPositions() || {},
              {
                areaId,
                hidden: !hidden,
                hiddenAreaIds: nextHiddenRoomIds,
              },
            ));
            if (!hidden && controller.selectedAreaId === areaId) controller.clearSelection("selected-room-hidden");
            else render("room-visibility-changed");
          },
        });
      }
      grid.append(shell);
    });

    if (!areas.length) {
      grid.append(createEmptyState(
        discoveryPending
          ? t("overview.loading", "Loading Home Assistant rooms…")
          : Object.keys(discoveryErrors).length
            ? t("overview.discoveryUnavailable", "Home Assistant rooms are temporarily unavailable.")
            : t("overview.noRooms", "No authorized compatible rooms are available."),
      ));
    }
    return grid;
  }

  function createDeviceGrid(area) {
    const grid = document.createElement("div");
    grid.className = "mha-overview-device-grid";
    grid.setAttribute("role", "list");
    const editing = controller.editingSection === "devices";
    const widgets = getDeviceWidgets(area);
    const contextId = area ? `area:${getAreaId(area)}` : "summary";
    const positions = editing
      ? (getEditableWidgetPositions() || {})
      : (getWidgetPositions({
        section: "devices",
        scope: "overview-devices",
        contextId,
        units: 4,
        rows: 100,
      }) || {});
    if (editing) grid.classList.add("mha-grid");

    widgets.forEach((widget) => {
      const shell = editing && typeof createEditableWidgetElement === "function"
        ? createEditableWidgetElement(widget, {
          units: 4,
          rows: 100,
          layout,
          position: positions?.[widget.id],
        })
        : createSpecializedShell(widget, {
          units: 4,
          layout,
          hass: currentHass,
          visibilityConfig: currentVisibilityConfig,
        });
      shell.classList.add("mha-overview-widget");
      if (widget.overviewEntityId) shell.dataset.entityId = widget.overviewEntityId;
      const position = positions?.[widget.id];
      if (position && !editing) {
        shell.style.gridColumn = `${position.x} / span ${Math.min(4, Number(widget.w) || 1)}`;
        shell.style.gridRow = `${position.y} / span ${Math.max(1, Number(widget.h) || 1)}`;
      }
      shell.setAttribute("role", "listitem");
      grid.append(shell);
    });

    if (!widgets.length) {
      grid.append(createEmptyState(
        area
          ? t("overview.noVisibleDevices", "No visible compatible devices are available in this room.")
          : editing
            ? t("overview.emptySummaryEditing", "Add widgets to build your summary.")
            : t("overview.emptySummary", "No summary widgets yet."),
      ));
    }
    return grid;
  }

  function createDesktopLayout() {
    const layoutRoot = document.createElement("div");
    layoutRoot.className = "mha-overview-layout";
    const rooms = createSection({
      title: t("overview.rooms", "Rooms"),
      body: createRoomGrid(),
      footer: createEditButton({
        editing: controller.editingSection === "rooms",
        disabled: controller.editingSection === "devices",
        onClick: () => setRoomEditing(controller.editingSection !== "rooms"),
      }),
      className: "mha-overview-section--rooms",
    });
    const selectedArea = getArea();
    const devices = createSection({
      title: t("overview.devices", "Devices"),
      body: createDeviceGrid(selectedArea),
      headerAction: controller.editingSection === "devices"
        ? createHeaderAddButton({ onClick: onOpenWidgetManager })
        : null,
      footer: createEditButton({
        editing: controller.editingSection === "devices",
        disabled: controller.editingSection === "rooms",
        onClick: () => setDeviceEditing(controller.editingSection !== "devices"),
      }),
      className: "mha-overview-section--devices",
    });
    layoutRoot.append(rooms, devices);
    return layoutRoot;
  }

  function createMobileSheet(area) {
    const body = document.createElement("div");
    body.className = "mha-overview-sheet-body";
    body.append(createDeviceGrid(area));
    body.addEventListener("scroll", () => controller.activity(), { passive: true });
    const footer = document.createElement("footer");
    footer.className = "mha-overview-sheet-footer";
    footer.append(createEditButton({
      editing: controller.editingSection === "devices",
      disabled: !area,
      onClick: () => setDeviceEditing(controller.editingSection !== "devices"),
    }));
    const close = () => {
      const areaId = controller.selectedAreaId;
      if (controller.editingSection === "devices") setDeviceEditing(false);
      controller.closeSheet();
      requestAnimationFrame(() => {
        root.querySelector?.(`[data-area-id="${areaId}"] .mha-simple-button-widget`)?.focus?.({ preventScroll: true });
      });
    };
    const panel = applyPanelSurfaceContract(createPanelShell({
      open: true,
      rootClassName: "mha-overview-sheet mha-page-creator",
      scrimClassName: "mha-overview-sheet-scrim mha-page-creator-scrim",
      sheetClassName: "mha-overview-sheet-surface mha-page-creator-sheet",
      headerClassName: "mha-overview-sheet-header mha-page-creator-header",
      closeClassName: "mha-overview-sheet-close mha-page-creator-close",
      title: area?.name || t("overview.devices", "Devices"),
      ariaLabel: t("overview.roomDevices", "Room devices"),
      closeLabel: t("common.close", "Close"),
      onClose: close,
      children: [body, footer],
    }), {
      surfaceRole: PANEL_SURFACE_ROLES.POPUP,
      mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
    });
    panel.dataset.mobileLayout = "true";
    panel.hidden = false;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    const onActivity = () => controller.activity();
    panel.addEventListener("keydown", onKeyDown);
    panel.addEventListener("pointerdown", onActivity, { passive: true });
    panel.addEventListener("wheel", onActivity, { passive: true });
    panel.__mhaDestroy = () => {
      panel.removeEventListener("keydown", onKeyDown);
      panel.removeEventListener("pointerdown", onActivity);
      panel.removeEventListener("wheel", onActivity);
    };
    requestAnimationFrame(() => {
      const surface = panel.querySelector(".mha-overview-sheet-surface");
      if (surface) surface.tabIndex = -1;
      surface?.focus?.({ preventScroll: true });
    });
    return panel;
  }

  function createMobileLayout() {
    const mobileRoot = document.createElement("div");
    mobileRoot.className = "mha-overview-mobile";
    const grid = createRoomGrid({ mobileGrid: true });
    const footer = document.createElement("footer");
    footer.className = "mha-overview-mobile-footer";
    footer.append(createEditButton({
      editing: controller.editingSection === "rooms",
      onClick: () => setRoomEditing(controller.editingSection !== "rooms"),
    }));
    mobileRoot.append(grid, footer);
    return mobileRoot;
  }

  function resolveSheetSurfaceRoot() {
    if (surfaceRoot && typeof surfaceRoot.append === "function") return surfaceRoot;
    const rootNode = root.getRootNode?.();
    return rootNode?.host && typeof rootNode.append === "function" ? rootNode : null;
  }

  function syncHostSheetState() {
    const host = root.getRootNode?.()?.host;
    if (!host?.dataset) return;
    host.dataset.overviewSheetOpen = String(Boolean(mobile && controller.sheetOpen));
    onSheetOpenChange(Boolean(mobile && controller.sheetOpen));
  }

  function render(reason = "render") {
    if (destroyed) return;
    const roomScroll = root.querySelector?.(".mha-overview-section--rooms .mha-overview-section-body")?.scrollTop || 0;
    const deviceScroll = root.querySelector?.(".mha-overview-section--devices .mha-overview-section-body")?.scrollTop || 0;
    const sheetScroll = activeMobileSheet?.querySelector?.(".mha-overview-sheet-body")?.scrollTop || 0;
    replaceChildrenWithDestroy(root, mobile ? createMobileLayout() : createDesktopLayout());
    const nextMobileSheet = mobile && controller.sheetOpen && controller.selectedAreaId
      ? createMobileSheet(getArea())
      : null;
    activeMobileSheet = syncOverviewSheetPortal({
      surfaceRoot: resolveSheetSurfaceRoot(),
      currentSheet: activeMobileSheet,
      nextSheet: nextMobileSheet,
    });
    root.dataset.selectedAreaId = controller.selectedAreaId;
    root.dataset.editingSection = controller.editingSection;
    root.dataset.discoveryPending = String(discoveryPending);
    root.dataset.discoveryError = String(Object.keys(discoveryErrors).length > 0);
    const selectedArea = getArea();
    onContextChange({
      pageId: String(currentPage?.id || ""),
      contextId: selectedArea ? `area:${getAreaId(selectedArea)}` : "",
      label: String(selectedArea?.name || "").trim(),
    });
    syncHostSheetState();
    if (!mobile) {
      const roomsBody = root.querySelector?.(".mha-overview-section--rooms .mha-overview-section-body");
      const devicesBody = root.querySelector?.(".mha-overview-section--devices .mha-overview-section-body");
      if (roomsBody) roomsBody.scrollTop = roomScroll;
      if (devicesBody) devicesBody.scrollTop = reason === "area-selected" ? 0 : deviceScroll;
    } else {
      const body = activeMobileSheet?.querySelector?.(".mha-overview-sheet-body");
      if (body) body.scrollTop = reason === "area-selected" ? 0 : sheetScroll;
    }
  }

  async function refreshDiscovery({ force = false } = {}) {
    if (destroyed) return false;
    discoveryPending = discoveredAreas.length === 0;
    if (discoveryPending) render("discovery-loading");
    const result = await discoverOverviewAreas({
      hass: currentHass,
      visibilityConfig: currentVisibilityConfig,
      force,
    });
    if (destroyed) return false;
    const nextDiscoverySignature = createOverviewDiscoverySignature(result);
    const discoveryChanged = nextDiscoverySignature !== discoverySignature;
    discoveredAreas = result.areas || [];
    discoveryErrors = result.errors || {};
    discoverySignature = nextDiscoverySignature;
    discoveryPending = false;
    const reconciled = reconcileOverviewPageConfig(currentConfig, discoveredAreas);
    if (JSON.stringify(reconciled) !== JSON.stringify(currentConfig)) {
      currentConfig = reconciled;
      controller.updateConfig(reconciled);
      onConfigChange(reconciled);
    }
    if (controller.selectedAreaId && !getArea()) controller.clearSelection("selected-room-removed");
    else if (discoveryChanged) render("discovery-complete");
    return true;
  }

  const unbindDiscoveryCadence = bindComponentCadence(root, "minute", () => {
    void refreshDiscovery();
  }, { scope: "dashboard" });

  const activity = () => controller.activity();
  root.addEventListener("pointerdown", activity, { passive: true });
  root.addEventListener("keydown", activity);
  root.addEventListener("wheel", activity, { passive: true });
  root.addEventListener("scroll", activity, { passive: true, capture: true });

  root.__mhaUpdateFromHass = (nextHass) => {
    currentHass = nextHass;
  };
  root.__mhaUpdatePage = (nextPage = currentPage, options = {}) => {
    currentPage = nextPage;
    currentVisibilityConfig = options.visibilityConfig ?? currentVisibilityConfig;
    currentConfig = reconcileOverviewPageConfig(nextPage?.config, discoveredAreas);
    controller.updateConfig(currentConfig);
    render("page-config-updated");
  };
  root.__mhaRefreshDiscovery = (options = {}) => refreshDiscovery(options);
  root.__mhaController = controller;
  root.__mhaDestroy = () => {
    destroyed = true;
    if (controller.editingSection) {
      onEditingChange({ editing: false, destroyed: true });
    }
    unbindDiscoveryCadence();
    activeMobileSheet = syncOverviewSheetPortal({
      surfaceRoot: resolveSheetSurfaceRoot(),
      currentSheet: activeMobileSheet,
    });
    controller.destroy();
    root.removeEventListener("pointerdown", activity);
    root.removeEventListener("keydown", activity);
    root.removeEventListener("wheel", activity);
    root.removeEventListener("scroll", activity, true);
    const host = root.getRootNode?.()?.host;
    if (host?.dataset) host.dataset.overviewSheetOpen = "false";
    onSheetOpenChange(false);
    delete root.__mhaUpdateFromHass;
    delete root.__mhaUpdatePage;
    delete root.__mhaRefreshDiscovery;
    delete root.__mhaController;
  };

  render("initial");
  refreshDiscovery();
  return root;
}
