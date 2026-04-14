/** Parse JSONB `payload` cell from Neon (object or JSON string). */
export function parsePayload(row) {
  const p = row?.payload;
  if (p == null) return null;
  if (typeof p === "object") return p;
  if (typeof p === "string") {
    try {
      return JSON.parse(p);
    } catch {
      return null;
    }
  }
  return null;
}
