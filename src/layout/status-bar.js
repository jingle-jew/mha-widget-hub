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
  layoutMode = "auto",
  layout = "mobile",
  logicalColumns = 1,
  gridUnits = 2,
  statusBarMode = "top-bar",
} = {}) {
  const el = document.createElement("header");
  el.className = "mha-status-bar";
  el.dataset.statusBarMode = normalizeStatusBarMode(statusBarMode);

  const label = layoutMode === "auto" ? `auto → ${layout}` : layout;
  el.innerHTML = `
    <div class="mha-status-brand">
      <span class="mha-dot"></span>
      <strong>MHA</strong>
      <span>Grid foundation</span>
    </div>
    <div class="mha-status-meta">
      <span>${label}</span>
      <span>${logicalColumns} cols · ${gridUnits} units</span>
      <span data-status-date>—</span>
      <strong data-status-time>—</strong>
    </div>
  `;

  return el;
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
