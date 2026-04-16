const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Net USDC credited to the owner wallet’s token accounts in this tx (human units).
 * @param {import("@solana/web3.js").ParsedTransactionWithMeta|null} parsedTx
 * @param {string} ownerWalletBase58
 * @returns {number|null}
 */
export function parseUsdcDepositUi(parsedTx, ownerWalletBase58) {
  if (!parsedTx || parsedTx.meta?.err) return null;
  const owner = String(ownerWalletBase58 || "").trim();
  if (!owner) return null;
  const meta = parsedTx.meta;
  const pre = meta.preTokenBalances || [];
  const post = meta.postTokenBalances || [];
  const preAmtByIdx = new Map();
  for (const b of pre) {
    if (b.mint === USDC_MINT && b.owner === owner) {
      const ui = parseFloat(b.uiTokenAmount?.uiAmountString ?? "0");
      preAmtByIdx.set(b.accountIndex, ui);
    }
  }
  let delta = 0;
  for (const b of post) {
    if (b.mint === USDC_MINT && b.owner === owner) {
      const postUi = parseFloat(b.uiTokenAmount?.uiAmountString ?? "0");
      const preUi = preAmtByIdx.get(b.accountIndex) ?? 0;
      delta += postUi - preUi;
    }
  }
  if (delta > 1e-9) return delta;
  return null;
}
