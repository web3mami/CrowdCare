import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getSolanaConnection } from "./solanaWallet.js";

/** Circle USDC on Solana mainnet (legacy SPL mint). */
export const MAINNET_USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

/**
 * USDC balance at the wallet’s canonical associated token account (human units).
 * @returns {Promise<number>} amount, or 0 if no ATA / empty
 * @returns {Promise<null>} RPC or unexpected failure */
export async function fetchWalletUsdcUi(walletBase58) {
  try {
    const owner = new PublicKey(String(walletBase58).trim());
    const ata = getAssociatedTokenAddressSync(
      MAINNET_USDC_MINT,
      owner,
      false,
      TOKEN_PROGRAM_ID
    );
    const conn = getSolanaConnection();
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
      /could not find account|invalid param|account not found|could not find mint/i.test(
        msg
      )
    ) {
      return 0;
    }
    return null;
  }
}
