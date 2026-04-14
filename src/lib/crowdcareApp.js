import { BUILT_IN_CAMPAIGNS } from "./campaigns.js";

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

export function formatCampaignAmt(n, currency) {
  const s = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return currency ? s + " " + currency : s;
}

/** Goal reached or progress at 100% — “past” for directory views. */
export function isCampaignPast(c) {
  const f = getCampaignFunding(c);
  if (!f.goal || !(f.goal > 0)) return false;
  if (f.pct != null && f.pct >= 100) return true;
  if (typeof c.raisedAmount === "number" && c.raisedAmount >= f.goal) return true;
  return false;
}

export function getActiveCampaignsDirectory() {
  return getAllCampaigns().filter((c) => !isCampaignPast(c));
}

export function getPastCampaignsDirectory() {
  return getAllCampaigns().filter((c) => isCampaignPast(c));
}
