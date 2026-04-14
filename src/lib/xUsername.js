/** Strip leading @ and whitespace. */
export function normalizeXUsernameInput(raw) {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (s.startsWith("@")) s = s.slice(1).trim();
  return s;
}

/** X handle: 1–20 chars, ASCII letters, digits, underscore. */
export function isValidXUsername(s) {
  if (!s || typeof s !== "string") return false;
  return /^[A-Za-z0-9_]{1,20}$/.test(s);
}

/** Canonical public profile URL on X for a handle, or null if invalid. */
export function xProfileUrlFromHandle(raw) {
  const h = normalizeXUsernameInput(raw);
  if (!isValidXUsername(h)) return null;
  return `https://x.com/${encodeURIComponent(h)}`;
}
