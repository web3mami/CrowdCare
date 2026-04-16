import { useEffect, useMemo, useState } from "react";
import {
  campaignFundingGoalToken,
  hasFreshServerChainFunding,
} from "../lib/crowdcareApp.js";
import { getCachedWalletUsdcUi } from "../lib/usdcBalanceCache.js";
import { isValidSolanaAddress } from "../lib/solanaWallet.js";

/**
 * Fetch USDC UI balances for USDC-goal wallets that lack a fresh server `chainFunding` snapshot.
 * @param {object[]|null|undefined} campaigns
 * @returns {{ usdcByWallet: Map<string, number|null>, loadingUsdc: boolean }}
 */
export function useUsdcByWalletMap(campaigns) {
  const walletKey = useMemo(() => {
    if (!Array.isArray(campaigns) || campaigns.length === 0) return "";
    const byWallet = new Map();
    for (const c of campaigns) {
      if (!c || typeof c !== "object") continue;
      if (campaignFundingGoalToken(c) !== "USDC") continue;
      const w = c.wallet != null ? String(c.wallet).trim() : "";
      if (!w || !isValidSolanaAddress(w)) continue;
      if (!byWallet.has(w)) byWallet.set(w, []);
      byWallet.get(w).push(c);
    }
    const need = new Set();
    for (const [w, arr] of byWallet) {
      if (arr.some((camp) => !hasFreshServerChainFunding(camp))) need.add(w);
    }
    return [...need].sort().join("|");
  }, [campaigns]);

  const [usdcByWallet, setUsdcByWallet] = useState(
    () => new Map()
  );
  const [loadingUsdc, setLoadingUsdc] = useState(true);

  useEffect(() => {
    if (!walletKey) {
      setUsdcByWallet(new Map());
      setLoadingUsdc(false);
      return;
    }

    const wallets = walletKey.split("|").filter(Boolean);
    let cancelled = false;
    setLoadingUsdc(true);

    Promise.all(
      wallets.map((w) =>
        getCachedWalletUsdcUi(w).then((v) => /** @type {const} */ ([w, v]))
      )
    ).then((entries) => {
      if (cancelled) return;
      setUsdcByWallet(new Map(entries));
      setLoadingUsdc(false);
    });

    return () => {
      cancelled = true;
    };
  }, [walletKey]);

  return { usdcByWallet, loadingUsdc };
}
