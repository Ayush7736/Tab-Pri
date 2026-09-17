import { normalizeCaptureSession } from "./types.js";

const CHANNEL = "tab-pri-capture";

function dispatchCapture(session) {
  const normalized = normalizeCaptureSession(session);
  window.dispatchEvent(new CustomEvent("tab-pri:capture", { detail: normalized }));
  return normalized;
}

function fromBase64Url(encoded) {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(encoded.length + ((4 - encoded.length % 4) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function consumeDeepLinkCapture(locationLike = window.location) {
  const rawHash = String(locationLike.hash || "");
  if (!rawHash.startsWith("#")) return null;
  const params = new URLSearchParams(rawHash.slice(1));
  const encoded = params.get("capture");
  if (!encoded) return null;
  try {
    return dispatchCapture(JSON.parse(fromBase64Url(encoded)));
  } catch (error) {
    console.warn("Invalid Tab-Pri capture payload", error);
    return null;
  }
}

export function emitCaptureSession(session) {
  return dispatchCapture(session);
}

export { CHANNEL };
