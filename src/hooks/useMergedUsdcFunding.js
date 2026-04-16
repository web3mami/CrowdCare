import { useEffect, useMemo, useState } from "react";
import {
  campaignFundingGoalToken,
  getCampaignFunding,
  hasFreshServerChainFunding,
  mergeCampaignFundingWithOnchain,
} from "../lib/crowdcareApp.js";
import { getCachedWalletUsdcUi } from "../lib/usdcBalanceCache.js";
import { isValidSolanaAddress } from "../lib/solanaWallet.js";

/**
 * @param {object|null|undefined} c — campaign payload (optional `chainFunding` from API)
 * @returns {{ funding: object|null, fundingBase: object|null, goalToken: string, onChainUsdcUi: number|null|undefined }}
 */
export function useMergedUsdcFunding(c) {
  const fundingBase = useMemo(
    () => (c && typeof c === "object" ? getCampaignFunding(c) : null),
    [c]
  );

  const goalToken = useMemo(() => {
    if (!c || typeof c !== "object") return "";
    return campaignFundingGoalToken(c);
  }, [c]);

  const [onChainUsdcUi, setOnChainUsdcUi] = useState(
    /** @type {number|null|undefined} */ (undefined)
  );

  useEffect(() => {
    if (!c?.wallet || goalToken !== "USDC" || !isValidSolanaAddress(c.wallet)) {
      setOnChainUsdcUi(null);
      return;
    }

    if (hasFreshServerChainFunding(c)) {
      setOnChainUsdcUi(c.chainFunding.usdcUi);
      return;
    }

    let cancelled = false;
    getCachedWalletUsdcUi(c.wallet).then((ui) => {
      if (!cancelled) setOnChainUsdcUi(ui);
    });
    return () => {
      cancelled = true;
    };
  }, [c?.id, c?.wallet, goalToken, c?.chainFunding?.usdcUi, c?.chainFunding?.syncedAt]);

  const funding = useMemo(() => {
    if (!fundingBase) return null;
    if (goalToken === "USDC") {
      return mergeCampaignFundingWithOnchain(fundingBase, onChainUsdcUi);
    }
    return fundingBase;
  }, [fundingBase, goalToken, onChainUsdcUi]);

  return { funding, fundingBase, goalToken, onChainUsdcUi };
}
