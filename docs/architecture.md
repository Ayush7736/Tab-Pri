# Tab-Pri Architecture

## Product direction

Tab-Pri is mobile-first. The web app is the primary vault UI; desktop users normally use a browser extension for capture. Android uses a small companion app to capture browser sessions and hand the result to the web app.

The existing Render + Cloudflare D1 encrypted-vault backend remains the storage skeleton. The master password and plaintext vault never go to Render or D1.

## Capture model

```text
Browser
   |
   v
Android Capture Engine / Desktop Extension
   |
   v
Normalized Tab[]
   |
   v
Tab-Pri Web App
   |
   |  encrypt locally with master password
   v
Render API -> Cloudflare D1
```

Android capture is intentionally browser-agnostic. Browser-specific behavior belongs behind adapters/capability detection instead of being hard-coded into the vault UI.

## Normalized tab contract

```js
{
  id: "capture-generated-id",
  title: "Page title",
  url: "https://example.com/",
  browser: "brave",
  browsingMode: "normal", // normal | private | unknown
  capturedAt: "2026-09-17T00:00:00.000Z"
}
```

`browser` and `browsingMode` are metadata stored inside the encrypted vault. They are never sent as plaintext to the backend.

## Android capture layers

1. **Native browser API / integration**, where a browser provides a supported mechanism.
2. **Accessibility adapter**, user-triggered and scoped to the selected browser. It can inspect the active UI and perform gestures when the browser exposes enough information.
3. **Fallback/import adapter**, for browsers that cannot expose their tab list automatically.

Accessibility must not run as an invisible always-on tab collector. Capture is an explicit user action. Android's AccessibilityService requires the user to enable it and can query active-window content when configured to do so. See the Android AccessibilityService documentation for the platform contract.

## Browser adapter interface

Each adapter should implement the same conceptual operations:

```text
canHandle(packageName)
inspectCapabilities()
startCapture(options)
readTabList()
finishCapture()
```

An adapter reports capabilities instead of promising features the browser does not expose. Examples:

- `NORMAL_TABS`
- `PRIVATE_TABS`
- `TAB_TITLES`
- `TAB_URLS`
- `OPEN_TAB_SWITCHER`
- `GESTURE_CONTROL`

## Web/Android boundary

The Android companion must not contain the Render API key and must not know the master password.

After a capture, Android hands normalized tab data to the Tab-Pri web app using a local handoff/deep-link mechanism. The web app then encrypts the complete vault and uses its existing authenticated web backend path to save it.

This keeps backend credentials out of the APK and keeps encryption ownership in the web client.

## Private browsing

Private tabs are captured only after an explicit user action. If persisted into Tab-Pri, they become encrypted saved copies; this does not preserve the browser's ephemeral/private semantics. The UI must make that distinction clear.

AI/vision is not part of the first capture path. It may later be an optional fallback for browser UIs that expose insufficient accessibility information, and should be disabled by default for private captures.

## Compatibility goal

Target adapters:

- Brave Android
- Chrome Android
- Microsoft Edge Android
- Firefox Android
- Opera Android
- Vivaldi Android
- Samsung Internet
- other browsers as capability testing permits

Compatibility is capability-based rather than a hard-coded list. A browser can still use Tab-Pri's vault features even when automatic capture is unavailable.
