import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { goalTokenFromPayload } from "./campaignGoalToken.js";

const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

const TTL_MS = 90_000;
/** @type {Map<string, { at: number, value: number|null }>} */
const cache = new Map();
/** @type {Map<string, Promise<number|null>>} */
const pending = new Map();

export function getSolanaRpcUrlForServer() {
  const u = process.env.SOLANA_RPC_URL?.trim();
  if (u) return u;
  return "https://api.mainnet-beta.solana.com";
}

function isPlausibleAddress(s) {
  try {
    new PublicKey(String(s).trim());
    return true;
  } catch {
    return false;
  }
}

async function fetchUsdcUiUncached(walletBase58) {
  const owner = new PublicKey(String(walletBase58).trim());
  const ata = getAssociatedTokenAddressSync(
    USDC_MINT,
    owner,
    false,
    TOKEN_PROGRAM_ID
  );
  const conn = new Connection(getSolanaRpcUrlForServer(), "confirmed");
  try {
    const bal = await conn.getTokenAccountBalance(ata);
    const u = bal?.value?.uiAmount;
    if (typeof u === "number" && !Number.isNaN(u)) return Math.max(0, u);
    const s = bal?.value?.uiAmountString;
    if (s != null && String(s).trim() !== "") {
      const p = parseFloat(s);
      if (!Number.isNaN(p)) return Math.max(0, p);
    }
    return 0;
  } catch (e) {
    const msg = String(e?.message || e || "");
    if (
      /could not find account|invalid param|not found|could not find mint/i.test(
        msg
      )
    ) {
      return 0;
    }
    return null;
  }
}

export async function fetchUsdcUiServerCached(walletBase58) {
  const key = String(walletBase58 || "").trim();
  if (!key) return null;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return hit.value;
  }
  let p = pending.get(key);
  if (!p) {
    p = fetchUsdcUiUncached(key).then((value) => {
      pending.delete(key);
      cache.set(key, { at: Date.now(), value });
      return value;
    });
    pending.set(key, p);
  }
  return p;
}

/**
 * Attach `chainFunding: { usdcUi, syncedAt }` to each USDC-goal campaign (read-only for clients).
 * @param {object[]} campaigns
 */
export async function attachChainFundingToCampaigns(campaigns) {
  const list = Array.isArray(campaigns) ? campaigns : [];
  const wallets = new Set();
  for (const c of list) {
    if (!c || typeof c !== "object") continue;
    if (goalTokenFromPayload(c) !== "USDC") continue;
    const w = c.wallet != null ? String(c.wallet).trim() : "";
    if (w && isPlausibleAddress(w)) wallets.add(w);
  }
  const map = new Map();
  await Promise.all(
    [...wallets].map(async (w) => {
      map.set(w, await fetchUsdcUiServerCached(w));
    })
  );
  const syncedAt = new Date().toISOString();
  return list.map((c) => {
    if (!c || typeof c !== "object") return c;
    if (goalTokenFromPayload(c) !== "USDC") return c;
    const w = c.wallet != null ? String(c.wallet).trim() : "";
    if (!w || !map.has(w)) return c;
    const usdcUi = map.get(w);
    if (usdcUi == null) return c;
    return { ...c, chainFunding: { usdcUi, syncedAt } };
  });
}
