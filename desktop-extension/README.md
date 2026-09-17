# Tab-Pri Desktop Extension

Desktop is intentionally extension-first. Chromium-compatible browsers can expose their current tab set through the standard extension tab APIs.

## Planned flow

1. User clicks **Capture session**.
2. Extension reads tabs from the current browser profile.
3. Extension normalizes each tab to the shared `CapturedTab` contract.
4. Extension hands the session to the Tab-Pri web app.
5. The web app presents a confirmation and encrypts the vault locally.

The extension must not contain the master password or Render API key.

Private/incognito tabs are treated as a separate browsing mode and require the extension's appropriate incognito permission plus explicit user action.
