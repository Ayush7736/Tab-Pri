import { normalizeCaptureSession } from "./types.js";

const CHANNEL = "tab-pri-capture";

function dispatchCapture(session) {
  const normalized = normalizeCaptureSession(session);
  window.dispatchEvent(
    new CustomEvent("tab-pri:capture", {
      detail: normalized,
    }),
  );
  return normalized;
}

/**
 * Accept a session sent by an Android companion or another trusted local
 * integration through a deep-link handoff.
 *
 * Example:
 *   https://tab-pri.example/#capture=<base64url(json)>
 *
 * This function does not persist anything. The caller must present the
 * captured session to the user and only then merge/encrypt it.
 */
export function consumeDeepLinkCapture(locationLike = window.location) {
  const hash = String(locationLike.hash || "");
  const match = hash.match(/(?:^|&)capture=([^&]+)/);
  if (!match) return null;

  try {
    const encoded = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded.padEnd(encoded.length + ((4 - encoded.length % 4) % 4), "=");
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json);
    return dispatchCapture(parsed);
  } catch {
    return null;
  }
}

/** Used by tests and trusted local integrations. */
export function emitCaptureSession(session) {
  return dispatchCapture(session);
}

export { CHANNEL };
