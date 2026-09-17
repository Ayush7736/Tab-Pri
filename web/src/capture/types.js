export const BROWSING_MODES = Object.freeze({
  NORMAL: "normal",
  PRIVATE: "private",
  UNKNOWN: "unknown",
});

export function normalizeCapturedTab(input = {}) {
  return {
    id: String(input.id || crypto.randomUUID()),
    title: String(input.title || ""),
    url: String(input.url || ""),
    browser: String(input.browser || "unknown"),
    browsingMode: Object.values(BROWSING_MODES).includes(input.browsingMode)
      ? input.browsingMode
      : BROWSING_MODES.UNKNOWN,
    capturedAt: String(input.capturedAt || new Date().toISOString()),
  };
}

export function normalizeCaptureSession(input = {}) {
  const tabs = Array.isArray(input.tabs)
    ? input.tabs.map(normalizeCapturedTab)
    : [];

  return {
    id: String(input.id || crypto.randomUUID()),
    browser: String(input.browser || tabs[0]?.browser || "unknown"),
    capturedAt: String(input.capturedAt || new Date().toISOString()),
    tabs,
  };
}
