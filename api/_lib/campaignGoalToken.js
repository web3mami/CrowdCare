/**
 * Match client `goalCurrency` / `goalLabel` rules (USDC before "Solana" / SOL substring bugs).
 * @param {string} [goalLabel]
 */
function inferGoalTokenFromLabel(goalLabel) {
  const s = String(goalLabel || "").toUpperCase();
  if (s.includes("USDC")) return "USDC";
  if (/\bSOL\b/.test(s)) return "SOL";
  return "";
}

/** Match client `goalCurrency` / `goalLabel` rules for server-side filtering. */
export function goalTokenFromPayload(c) {
  const gc =
    c?.goalCurrency != null ? String(c.goalCurrency).trim().toUpperCase() : "";
  if (gc === "USDC" || gc === "SOL") return gc;
  const inferred = inferGoalTokenFromLabel(c?.goalLabel);
  if (inferred) return inferred;
  return "USDC";
}
