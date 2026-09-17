const TAB_PRI_WEB_ORIGIN = "https://tab-pri.vercel.app";

function browserId() {
  // The extension API does not expose a universal friendly browser name.
  // Keep this generic so the same extension remains Chromium-compatible.
  return "chromium";
}

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  const capturedAt = new Date().toISOString();

  const normalized = tabs
    .filter((tab) => tab.url && !tab.url.startsWith("chrome://"))
    .map((tab) => ({
      id: String(tab.id ?? crypto.randomUUID()),
      title: tab.title || "",
      url: tab.url || "",
      browser: browserId(),
      browsingMode: tab.incognito ? "private" : "normal",
      capturedAt,
    }));

  // Keep transport separate from the vault. The production handoff should
  // open the configured Tab-Pri web app and pass the normalized session to
  // its local capture receiver. No vault password or backend secret belongs
  // in the extension.
  const payload = encodeURIComponent(
    btoa(unescape(encodeURIComponent(JSON.stringify({
      id: crypto.randomUUID(),
      browser: browserId(),
      capturedAt,
      tabs: normalized,
    })))),
  );

  await chrome.tabs.create({
    url: `${TAB_PRI_WEB_ORIGIN}/#capture=${payload}`,
  });
});
