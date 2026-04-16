import { fetchWalletUsdcUi } from "./onchainUsdcBalance.js";

const TTL_MS = 45_000;
/** @type {Map<string, { at: number, value: number|null }>} */
const settled = new Map();
/** @type {Map<string, Promise<number|null>>} */
const pending = new Map();

/**
 * Deduped USDC balance fetch per wallet (browser RPC). TTL avoids hammering the proxy.
 * @param {string} walletBase58
 * @returns {Promise<number|null>}
 */
export function getCachedWalletUsdcUi(walletBase58) {
  const key = String(walletBase58 || "").trim();
  if (!key) return Promise.resolve(null);
  const now = Date.now();
  const s = settled.get(key);
  if (s && now - s.at < TTL_MS) {
    return Promise.resolve(s.value);
  }
  let p = pending.get(key);
  if (!p) {
    p = fetchWalletUsdcUi(key)
      .then((value) => {
        pending.delete(key);
        settled.set(key, { at: Date.now(), value });
        return value;
      })
      .catch(() => {
        pending.delete(key);
        settled.set(key, { at: Date.now(), value: null });
        return null;
      });
    pending.set(key, p);
  }
  return p;
}
