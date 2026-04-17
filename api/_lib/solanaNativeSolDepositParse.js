const LAMPORTS_PER_SOL = 1e9;

function accountKeyBase58(key) {
  if (key == null) return "";
  if (typeof key === "string") return key;
  const p = key.pubkey ?? key;
  if (typeof p === "string") return p;
  return p?.toBase58?.() ?? "";
}

/**
 * Net native SOL credited to `ownerWalletBase58` in this tx (human SOL units).
 * Uses pre/post lamport balances for the owner’s account index.
 * @param {import("@solana/web3.js").ParsedTransactionWithMeta|null} parsedTx
 * @param {string} ownerWalletBase58
 * @returns {number|null}
 */
export function parseNativeSolDepositSol(parsedTx, ownerWalletBase58) {
  if (!parsedTx || parsedTx.meta?.err) return null;
  const owner = String(ownerWalletBase58 || "").trim();
  if (!owner) return null;

  const keys = parsedTx.transaction?.message?.accountKeys;
  if (!Array.isArray(keys)) return null;

  let idx = -1;
  for (let i = 0; i < keys.length; i++) {
    if (accountKeyBase58(keys[i]) === owner) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;

  const pre = parsedTx.meta.preBalances?.[idx];
  const post = parsedTx.meta.postBalances?.[idx];
  if (typeof pre !== "number" || typeof post !== "number") return null;

  const deltaLamports = post - pre;
  const minLamports = (() => {
    const raw = process.env.SOL_LEDGER_MIN_LAMPORTS?.trim();
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  })();

  if (deltaLamports < minLamports) return null;

  return deltaLamports / LAMPORTS_PER_SOL;
}
