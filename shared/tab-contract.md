# Normalized Tab Contract

All capture clients should normalize browser data before handing it to the web vault.

```ts
export type BrowsingMode = "normal" | "private" | "unknown";

export type CapturedTab = {
  id: string;
  title: string;
  url: string;
  browser: string;
  browsingMode: BrowsingMode;
  capturedAt: string;
};

export type CaptureSession = {
  id: string;
  browser: string;
  capturedAt: string;
  tabs: CapturedTab[];
};
```

Rules:

- `title` may be empty if the browser does not expose it.
- `url` may be empty only when the source does not expose it; the UI should flag incomplete captures rather than invent data.
- `browser` is a stable logical identifier such as `brave`, `chrome`, `firefox`, or `unknown`.
- `browsingMode` is explicit so private and normal sessions are never silently mixed.
- The normalized object is plaintext only inside the trusted client boundary and is encrypted before persistence.
