import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from "@solana/kit";

const appId = import.meta.env.VITE_PRIVY_APP_ID || "";

/**
 * Privy wraps the app so login (X, email, Solana wallet) and embedded Solana
 * wallets work. Configure the same login methods in the Privy dashboard.
 */
export function CrowdCarePrivyProvider({ children }) {
  if (!appId) {
    console.warn(
      "[CrowdCare] Set VITE_PRIVY_APP_ID in .env — see PRIVY-SETUP.md"
    );
  }

  return (
    <PrivyProvider
      appId={appId || "set-VITE_PRIVY_APP_ID-in-env"}
      config={{
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc("https://api.mainnet-beta.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                "wss://api.mainnet-beta.solana.com"
              ),
            },
          },
        },
               appearance: {
          theme: "dark",
          walletChainType: "solana-only",
          /** Wallet / Solana options above other methods in the Privy modal */
          showWalletLoginFirst: true,
        },
        /** Subset of methods also enabled in the Privy dashboard */
        loginMethods: ["wallet", "twitter", "email"],
        /**
         * First screen of the Privy modal: Solana wallets, then X, email.
         */
        loginMethodsAndOrder: {
          primary: [
            "detected_solana_wallets",
            "twitter",
            "email",
          ],
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
        embeddedWallets: {
          solana: { createOnLogin: "all-users" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
