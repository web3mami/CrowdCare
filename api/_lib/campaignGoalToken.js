/** Match client `goalCurrency` / `goalLabel` rules for server-side filtering. */
export function goalTokenFromPayload(c) {
  const gc =
    c?.goalCurrency != null ? String(c.goalCurrency).trim().toUpperCase() : "";
  if (gc === "USDC" || gc === "SOL") return gc;
  const gl = String(c?.goalLabel || "").toUpperCase();
  return gl.indexOf("SOL") >= 0 ? "SOL" : "USDC";
}
