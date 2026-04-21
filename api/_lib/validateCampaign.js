/** Mirrors client `isValidCampaign` for API writes (no shared import from /src in serverless). */
export function validateCampaignPayload(c) {
  if (
    !c ||
    typeof c !== "object" ||
    typeof c.id !== "string" ||
    !c.id.trim() ||
    typeof c.title !== "string" ||
    !c.title.trim() ||
    !Array.isArray(c.body) ||
    !c.body.length ||
    typeof c.goalLabel !== "string" ||
    !c.goalLabel.trim() ||
    typeof c.wallet !== "string" ||
    !c.wallet.trim() ||
    typeof c.creatorSub !== "string" ||
    !c.creatorSub.trim() ||
    typeof c.creatorShareSlug !== "string" ||
    !c.creatorShareSlug.trim()
  ) {
    return { ok: false, error: "Invalid campaign payload" };
  }
  if (c.goalAmount != null) {
    if (typeof c.goalAmount !== "number" || !(c.goalAmount > 0))
      return { ok: false, error: "Invalid goal" };
  }
  if (c.raisedAmount != null) {
    if (typeof c.raisedAmount !== "number" || c.raisedAmount < 0)
      return { ok: false, error: "Invalid raised amount" };
  }
  const b = c.transparencyBeneficiaryPct;
  const o = c.transparencyOtherPct;
  if (b != null || o != null) {
    if (typeof b !== "number" || typeof o !== "number")
      return { ok: false, error: "Invalid transparency" };
    if (b < 0 || o < 0 || Math.abs(b + o - 100) > 0.001)
      return { ok: false, error: "Transparency must total 100%" };
  }
  if (
    typeof c.creatorDisplayName !== "string" ||
    !c.creatorDisplayName.trim() ||
    c.creatorDisplayName.trim().length > 80
  ) {
    return { ok: false, error: "Public display name is required" };
  }
  const xu =
    typeof c.creatorXUsername === "string" ? c.creatorXUsername.trim() : "";
  if (!xu || xu.length > 20 || !/^[A-Za-z0-9_]+$/.test(xu)) {
    return { ok: false, error: "Valid X username is required" };
  }
  if (c.creatorAvatarDataUrl != null) {
    if (typeof c.creatorAvatarDataUrl !== "string") {
      return { ok: false, error: "Invalid creator avatar" };
    }
    const s = c.creatorAvatarDataUrl;
    if (s.length > 220_000) {
      return { ok: false, error: "Creator avatar is too large" };
    }
    if (!/^data:image\/(jpeg|png|webp|gif);base64,/i.test(s)) {
      return { ok: false, error: "Invalid creator avatar format" };
    }
  }
  return { ok: true };
}
