# Tab-Pri Android Capture Companion

This directory is reserved for the Android companion that captures browser sessions and hands normalized tabs to the Tab-Pri web app.

## Design rules

- Kotlin + Android AccessibilityService for the first prototype.
- User-triggered capture only.
- Browser-agnostic adapter/capability architecture.
- No master password in the Android app.
- No Render API key in the Android app.
- No automatic upload of captured plaintext tabs by the companion.
- Private-tab capture requires explicit user action.
- Accessibility/vision should not silently monitor the screen.

## First prototype

The first prototype should do only four things:

1. Detect the foreground browser package.
2. Report its package name and basic accessibility capabilities.
3. Open/inspect the browser's tab-switcher UI when the user requests capture.
4. Extract visible tab title/URL information into the shared normalized tab model.

Do not add AI vision until the accessibility prototype has been tested against real browser builds.

## Planned adapters

- `BraveAdapter`
- `ChromeAdapter`
- `EdgeAdapter`
- `FirefoxAdapter`
- `OperaAdapter`
- `VivaldiAdapter`
- `SamsungInternetAdapter`
- `GenericAccessibilityAdapter`

Adapters should be selected from package identity plus runtime capability checks. Unsupported browsers should fall back gracefully instead of breaking the vault.
