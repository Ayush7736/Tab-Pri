const TAB_PRI_WEB_ORIGIN = "http://localhost:5173";

function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function browserId() {
  return "chromium";
}

chrome.action.onClicked.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    const capturedAt = new Date().toISOString();
    const normalized = tabs
      .filter((tab) => tab.url && !/^(chrome|edge|about|brave):/i.test(tab.url))
      .map((tab) => ({
        id: String(tab.id ?? crypto.randomUUID()),
        title: tab.title || tab.url,
        url: tab.url,
        browser: browserId(),
        browsingMode: tab.incognito ? "private" : "normal",
        capturedAt,
      }));

    const session = { id: crypto.randomUUID(), browser: browserId(), capturedAt, tabs: normalized };
    const payload = toBase64Url(JSON.stringify(session));
    await chrome.tabs.create({ url: `${TAB_PRI_WEB_ORIGIN}/#capture=${payload}` });
  } catch (error) {
    console.error("Tab-Pri capture failed", error);
  }
});
