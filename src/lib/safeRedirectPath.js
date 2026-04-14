/** Same-origin path only; blocks open redirects and odd schemes. */
export function safeInternalPath(raw) {
  if (raw == null || typeof raw !== "string") return "";
  let p;
  try {
    p = decodeURIComponent(raw.trim());
  } catch {
    return "";
  }
  if (!p.startsWith("/") || p.startsWith("//")) return "";
  if (p.includes("\\") || /[\0\r\n]/.test(p)) return "";
  if (/^javascript:/i.test(p)) return "";
  if (p.length > 256) return "";
  return p;
}
