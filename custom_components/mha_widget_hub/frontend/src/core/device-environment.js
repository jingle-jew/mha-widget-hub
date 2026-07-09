const DESKTOP_PLATFORM_RE = /(Win|Linux|X11|CrOS|Mac)/i;
const MOBILE_USER_AGENT_RE = /(Android|iPhone|iPad|iPod)/i;

export function detectDesktopEnvironment({
  navigatorRef = globalThis.navigator,
  matchMediaFn = (query) => globalThis.matchMedia?.(query),
} = {}) {
  const nav = navigatorRef || {};
  const platform = String(nav.userAgentData?.platform || nav.platform || "");
  const userAgent = String(nav.userAgent || "");
  const maxTouchPoints = Math.max(0, Number(nav.maxTouchPoints) || 0);
  const uaSaysMobile = nav.userAgentData?.mobile === true;
  const iPadDesktopClass = /Mac/i.test(platform) && maxTouchPoints > 1;

  if (uaSaysMobile) return false;
  if (MOBILE_USER_AGENT_RE.test(userAgent) || iPadDesktopClass) return false;
  if (DESKTOP_PLATFORM_RE.test(platform)) return true;

  const anyHover = matchMediaFn?.("(any-hover: hover)")?.matches === true;
  const anyFinePointer = matchMediaFn?.("(any-pointer: fine)")?.matches === true;
  const anyCoarsePointer = matchMediaFn?.("(any-pointer: coarse)")?.matches === true;

  if (anyHover && anyFinePointer && !anyCoarsePointer) return true;
  return false;
}
