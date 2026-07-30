import { normalizeStatusBarMode } from "../core/status-bar-mode.js";

const STATUS_TIME_FORMATTER = new Intl.DateTimeFormat("fr-CA", {
  hour: "2-digit",
  minute: "2-digit",
});
const STATUS_DATE_FORMATTER = new Intl.DateTimeFormat("fr-CA", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export function createStatusBar({
  statusBarMode = "top-bar",
  pages = [],
  activePageId = "",
} = {}) {
  const el = document.createElement("header");
  el.className = "mha-status-bar";
  el.dataset.statusBarMode = normalizeStatusBarMode(statusBarMode);

  el.innerHTML = `
    <div class="mha-status-brand">
      <span class="mha-dot"></span>
      <span class="mha-status-context" data-status-context></span>
    </div>
    <div class="mha-status-meta">
      <span data-status-date>—</span>
      <strong data-status-time>—</strong>
    </div>
  `;

  updateStatusContext(el, {
    activePage: pages.find(page => page?.id === activePageId) || pages[0] || null,
  });

  return el;
}

export function resolveStatusContextLabel(activePage = null, detail = "") {
  const pageLabel = String(activePage?.name || activePage?.label || "").trim();
  const detailLabel = String(detail || "").trim();
  return [pageLabel, detailLabel].filter(Boolean).join(" › ");
}

export function updateStatusContext(root, {
  activePage = null,
  detail = "",
} = {}) {
  const context = root?.querySelector?.("[data-status-context]");
  if (!context) return false;

  const nextContext = resolveStatusContextLabel(activePage, detail);
  if (context.textContent !== nextContext) context.textContent = nextContext;
  context.hidden = !nextContext;
  return true;
}

export function updateStatusTime(root, now = new Date()) {
  const time = root.querySelector("[data-status-time]");
  const date = root.querySelector("[data-status-date]");
  if (!time || !date) return;

  const nextTime = STATUS_TIME_FORMATTER.format(now);
  const nextDate = STATUS_DATE_FORMATTER.format(now);
  if (time.textContent !== nextTime) time.textContent = nextTime;
  if (date.textContent !== nextDate) date.textContent = nextDate;
}
