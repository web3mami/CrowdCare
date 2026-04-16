import { BUILT_IN_CAMPAIGNS } from "./campaigns.js";
import { isValidXUsername, normalizeXUsernameInput } from "./xUsername.js";

const STORAGE_KEY = "crowdcare_extra";

export function parseGoalFromLabel(goalLabel) {
  if (!goalLabel) return null;
  const m = String(goalLabel)
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return n > 0 ? n : null;
}

export function isValidCampaign(c) {
  if (
    !c ||
    typeof c.id !== "string" ||
    !c.id.trim() ||
    typeof c.title !== "string" ||
    !c.title.trim() ||
    !Array.isArray(c.body) ||
    !c.body.length ||
    typeof c.goalLabel !== "string" ||
    !c.goalLabel.trim() ||
    typeof c.wallet !== "string" ||
    !c.wallet.trim()
  ) {
    return false;
  }
  if (c.goalAmount != null) {
    if (typeof c.goalAmount !== "number" || !(c.goalAmount > 0)) return false;
  }
  if (c.raisedAmount != null) {
    if (typeof c.raisedAmount !== "number" || c.raisedAmount < 0) return false;
  }
  const b = c.transparencyBeneficiaryPct;
  const o = c.transparencyOtherPct;
  if (b != null || o != null) {
    if (typeof b !== "number" || typeof o !== "number") return false;
    if (b < 0 || o < 0 || Math.abs(b + o - 100) > 0.001) return false;
  }
  if (c.creatorDisplayName != null) {
    if (typeof c.creatorDisplayName !== "string") return false;
    const dn = c.creatorDisplayName.trim();
    if (dn.length > 80) return false;
  }
  return true;
}

/** Stable hue for subtle per-creator accents in lists (0–359). */
export function hueFromCreatorSub(sub) {
  if (!sub || typeof sub !== "string") return 210;
  let h = 0;
  for (let i = 0; i < sub.length; i++) {
    h = (h * 31 + sub.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/**
 * @returns {{ displayName: string, hubSlug: string }}
 */
export function formatCampaignCreatorLine(c) {
  if (!c || typeof c !== "object") {
    return { displayName: "Campaign creator", hubSlug: "" };
  }
  const nameRaw =
    c.creatorDisplayName != null ? String(c.creatorDisplayName).trim() : "";
  const slugRaw =
    c.creatorShareSlug != null ? String(c.creatorShareSlug).trim() : "";
  return {
    displayName: nameRaw || "Campaign creator",
    hubSlug: slugRaw,
  };
}

/**
 * Coerce JSON/JSONB quirks (numeric strings) so shared campaigns from the API pass
 * `isValidCampaign` and show in directory/hub lists.
 */
function normalizeCampaignForDisplay(c) {
  if (!c || typeof c !== "object") return c;
  const n = { ...c };

  if (n.id != null && typeof n.id !== "string") {
    n.id = String(n.id);
  }

  function num(x) {
    if (x == null) return x;
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string" && x.trim() !== "") {
      const v = parseFloat(x, 10);
      return Number.isFinite(v) ? v : x;
    }
    return x;
  }

  n.goalAmount = num(n.goalAmount);
  n.raisedAmount = num(n.raisedAmount);
  n.transparencyBeneficiaryPct = num(n.transparencyBeneficiaryPct);
  n.transparencyOtherPct = num(n.transparencyOtherPct);

  if (Array.isArray(n.body)) {
    n.body = n.body
      .map((line) => (typeof line === "string" ? line : String(line ?? "")))
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (typeof n.creatorDisplayName === "string") {
    n.creatorDisplayName = n.creatorDisplayName.trim();
  }
  if (typeof n.creatorXUsername === "string") {
    let x = n.creatorXUsername.trim();
    if (x.startsWith("@")) x = x.slice(1).trim();
    n.creatorXUsername = x;
  }

  return n;
}

export function getExtraCampaigns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const extra = JSON.parse(raw);
    if (!Array.isArray(extra)) return [];
    return extra.filter(isValidCampaign);
  } catch {
    return [];
  }
}

export function getAllCampaigns() {
  const base = BUILT_IN_CAMPAIGNS.slice();
  return base.concat(getExtraCampaigns());
}

export function getCampaignsByCreatorSub(sub) {
  if (!sub) return [];
  return getAllCampaigns().filter((c) => c.creatorSub === sub);
}

/**
 * Display name + X handle from this user’s most recent campaign (local list).
 * Used when creating another campaign so profile fields need not be re-entered.
 * @param {string} sub
 * @returns {{ displayName: string, xUsername: string } | null}
 */
export function getCreatorPublicMetaFromLatestCampaign(sub) {
  if (!sub || typeof sub !== "string") return null;
  const list = getCampaignsByCreatorSub(sub);
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    const dn =
      c.creatorDisplayName != null ? String(c.creatorDisplayName).trim() : "";
    const xu = normalizeXUsernameInput(c.creatorXUsername);
    if (!dn || dn.length > 80) continue;
    if (!isValidXUsername(xu)) continue;
    return { displayName: dn, xUsername: xu };
  }
  return null;
}

export function getCampaignsByShareSlug(slug) {
  if (!slug || typeof slug !== "string") return [];
  return getAllCampaigns().filter((c) => c.creatorShareSlug === slug);
}

/**
 * Older saves omitted `creatorShareSlug` (or user had no slug yet). Hub links filter by slug,
 * so attach the current hub id to this creator's campaigns in localStorage.
 * @returns {boolean} whether extra campaigns storage was updated
 */
export function backfillCreatorShareSlugs(sub, shareSlug) {
  if (!sub || !shareSlug || typeof shareSlug !== "string") return false;
  const extra = getExtraCampaigns();
  let changed = false;
  const next = extra.map((c) => {
    if (c.creatorSub !== sub) return c;
    if (c.creatorShareSlug) return c;
    changed = true;
    return { ...c, creatorShareSlug: shareSlug };
  });
  if (!changed) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return true;
}

/**
 * Merge server-fetched hub campaigns with local lists (offline / legacy).
 * @param {object[]} remote
 * @param {object[]} local
 * @param {{ viewingOwnHub: boolean }} opts
 */
/**
 * Merge server directory listing with local-only campaigns (remote wins on id clash).
 * @param {object[]} remote
 * @param {object[]} local
 */
export function mergeDirectoryCampaigns(remote, local) {
  const r = Array.isArray(remote) ? remote : [];
  const l = Array.isArray(local) ? local : [];
  const map = new Map();
  for (const c of r) {
    const x = normalizeCampaignForDisplay(c);
    if (x && typeof x.id === "string") map.set(x.id, x);
  }
  for (const c of l) {
    if (c && typeof c.id === "string" && !map.has(c.id)) map.set(c.id, c);
  }
  return Array.from(map.values()).filter(isValidCampaign);
}

export function mergeHubLists(remote, local, opts) {
  const { viewingOwnHub } = opts;
  const r = Array.isArray(remote) ? remote : [];
  const l = Array.isArray(local) ? local : [];
  if (!viewingOwnHub) {
    if (r.length) {
      return r
        .map(normalizeCampaignForDisplay)
        .filter((c) => c && typeof c.id === "string");
    }
    return l;
  }
  const map = new Map();
  for (const c of r) {
    const x = normalizeCampaignForDisplay(c);
    if (x && typeof x.id === "string") map.set(x.id, x);
  }
  for (const c of l) {
    if (c && typeof c.id === "string" && !map.has(c.id)) map.set(c.id, c);
  }
  return Array.from(map.values());
}

export function findCampaignById(id) {
  if (!id) return null;
  const all = getAllCampaigns();
  for (let i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

export function idTaken(id) {
  return findCampaignById(id) !== null;
}

export function addExtraCampaign(campaign) {
  if (!isValidCampaign(campaign)) return false;
  const dn =
    campaign.creatorDisplayName != null
      ? String(campaign.creatorDisplayName).trim()
      : "";
   if (!dn || dn.length > 80) return false;
  const xu =
    campaign.creatorXUsername != null
      ? String(campaign.creatorXUsername).trim()
      : "";
  if (!xu || xu.length > 20 || !/^[A-Za-z0-9_]+$/.test(xu)) return false;
  if (idTaken(campaign.id)) return false;
  const extra = getExtraCampaigns();
  extra.push(campaign);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
  return true;
}

/**
 * Remove a user-created campaign from localStorage (not built-in samples).
 * @returns {boolean} whether a row was removed
 */
export function deleteExtraCampaignById(id) {
  if (!id || typeof id !== "string") return false;
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  let extra;
  try {
    extra = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!Array.isArray(extra)) return false;
  const next = extra.filter((c) => !c || c.id !== id);
  if (next.length === extra.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return true;
}

/**
 * @returns {{ goal: number|null, raised: number, pct: number|null, currency: string }}
 */
export function getCampaignFunding(c) {
  if (!c) {
    return { goal: null, raised: 0, pct: null, currency: "" };
  }
  const goal =
    typeof c.goalAmount === "number" && c.goalAmount > 0
      ? c.goalAmount
      : parseGoalFromLabel(c.goalLabel);
  const raised =
    typeof c.raisedAmount === "number" && c.raisedAmount >= 0
      ? c.raisedAmount
      : 0;
  const currency =
    typeof c.goalCurrency === "string" && c.goalCurrency.trim()
      ? c.goalCurrency.trim().toUpperCase()
      : "";
  let pct = null;
  if (goal && goal > 0) {
    pct = Math.min(100, Math.round((raised / goal) * 1000) / 10);
  }
  return { goal: goal || null, raised, pct, currency };
}

/** Goal token for progress: `goalCurrency` or inferred from `goalLabel` (SOL vs USDC). */
export function campaignFundingGoalToken(c) {
  if (!c || typeof c !== "object") return "";
  const f = getCampaignFunding(c);
  if (f.currency) return f.currency;
  return String(c.goalLabel || "").toUpperCase().indexOf("SOL") >= 0
    ? "SOL"
    : "USDC";
}

/** Merged funding snapshot (USDC merges on-chain when provided). */
export function deriveMergedFunding(c, onChainUsdcUi) {
  const base = getCampaignFunding(c);
  if (campaignFundingGoalToken(c) === "USDC") {
    return mergeCampaignFundingWithOnchain(base, onChainUsdcUi);
  }
  return base;
}

/** Past directory rule from an already-merged funding object. */
export function isCampaignPastFromFunding(funding) {
  if (!funding || !funding.goal || !(funding.goal > 0)) return false;
  if (funding.pct != null && funding.pct >= 100) return true;
  if (typeof funding.raised === "number" && funding.raised >= funding.goal) {
    return true;
  }
  return false;
}

/**
 * @param {object} c
 * @param {number|null|undefined} onChainUsdcUi — USDC balance for `c.wallet` when goal is USDC
 */
export function isCampaignPastWithOnchain(c, onChainUsdcUi) {
  return isCampaignPastFromFunding(deriveMergedFunding(c, onChainUsdcUi));
}

/** Client trusts server `chainFunding` snapshots newer than this (ms). */
export const CHAIN_FUNDING_TRUST_MS = 120_000;

export function hasFreshServerChainFunding(c) {
  const cf = c?.chainFunding;
  if (!cf || typeof cf.usdcUi !== "number" || Number.isNaN(cf.usdcUi)) {
    return false;
  }
  if (typeof cf.syncedAt !== "string") return false;
  const age = Date.now() - Date.parse(cf.syncedAt);
  return !Number.isNaN(age) && age >= 0 && age < CHAIN_FUNDING_TRUST_MS;
}

/**
 * USDC UI for merged / past filters: fresh server snapshot, else value from `usdcByWallet` map.
 * @param {object} c
 * @param {Map<string, number|null>|undefined} usdcByWallet
 */
export function getOnChainUsdcUiForCampaign(c, usdcByWallet) {
  if (campaignFundingGoalToken(c) !== "USDC") return null;
  if (hasFreshServerChainFunding(c)) return c.chainFunding.usdcUi;
  const w = c.wallet != null ? String(c.wallet).trim() : "";
  if (!w || !(usdcByWallet instanceof Map)) return null;
  return usdcByWallet.has(w) ? usdcByWallet.get(w) : null;
}

/** True if any USDC campaign may need a browser RPC balance (no fresh server snapshot). */
export function directoryNeedsClientUsdcFetch(campaigns) {
  if (!Array.isArray(campaigns)) return false;
  for (const c of campaigns) {
    if (campaignFundingGoalToken(c) !== "USDC") continue;
    const w = c.wallet != null ? String(c.wallet).trim() : "";
    if (!w) continue;
    if (hasFreshServerChainFunding(c)) continue;
    return true;
  }
  return false;
}

/**
 * Use the higher of saved `raisedAmount` and an on-chain balance (e.g. USDC in the campaign wallet).
 * @param {{ goal: number|null, raised: number, pct: number|null, currency: string }} funding
 * @param {number|null|undefined} onChainRaisedUi
 */
export function mergeCampaignFundingWithOnchain(funding, onChainRaisedUi) {
  if (
    onChainRaisedUi == null ||
    typeof onChainRaisedUi !== "number" ||
    Number.isNaN(onChainRaisedUi)
  ) {
    return funding;
  }
  const raised = Math.max(funding.raised, Math.max(0, onChainRaisedUi));
  let pct = funding.pct;
  if (funding.goal && funding.goal > 0) {
    pct = Math.min(100, Math.round((raised / funding.goal) * 1000) / 10);
  }
  return { ...funding, raised, pct };
}

export function formatCampaignAmt(n, currency) {
  const s = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return currency ? s + " " + currency : s;
}

/** Goal reached or progress at 100% — “past” for directory views (stored raised only; use `isCampaignPastWithOnchain` when USDC chain data exists). */
export function isCampaignPast(c) {
  return isCampaignPastWithOnchain(c, null);
}

export function getActiveCampaignsDirectory() {
  return getAllCampaigns().filter((c) => !isCampaignPast(c));
}

export function getPastCampaignsDirectory() {
  return getAllCampaigns().filter((c) => isCampaignPast(c));
}
