/** Enriched GET fields clients may round-trip; dropped before storage (never in DB). */
const STRIP_BEFORE_VALIDATE = new Set(["chainFunding"]);

/** Keys the client may send on `campaign`; server-only fields like `chainFunding` are never stored. */
const ALLOWED_CAMPAIGN_KEYS = new Set([
  "id",
  "title",
  "goalLabel",
  "goalAmount",
  "raisedAmount",
  "goalCurrency",
  "transparencyBeneficiaryPct",
  "transparencyOtherPct",
  "transparencyOtherLabel",
  "transparencyNote",
  "wallet",
  "body",
  "creatorSub",
  "creatorShareSlug",
  "creatorDisplayName",
  "creatorXUsername",
]);

/**
 * @param {object} campaign
 * @returns {{ ok: true, campaign: object } | { ok: false, error: string }}
 */
export function pickAllowedCampaignPayload(campaign) {
  if (!campaign || typeof campaign !== "object") {
    return { ok: false, error: "Invalid campaign payload" };
  }
  /** @type {Record<string, unknown>} */
  const cleaned = { ...campaign };
  for (const k of STRIP_BEFORE_VALIDATE) {
    delete cleaned[k];
  }
  const extra = Object.keys(cleaned).filter((k) => !ALLOWED_CAMPAIGN_KEYS.has(k));
  if (extra.length > 0) {
    return {
      ok: false,
      error: `Unexpected campaign fields: ${extra.slice(0, 8).join(", ")}`,
    };
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of ALLOWED_CAMPAIGN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(cleaned, k)) {
      out[k] = cleaned[k];
    }
  }
  return { ok: true, campaign: out };
}
