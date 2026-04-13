import { PrivyProvider } from "@privy-io/react-auth";
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from "@solana/kit";

const appId = import.meta.env.VITE_PRIVY_APP_ID || "";

/**
 * Privy: X (Twitter) login only. Embedded Solana wallets are created after login
 * for campaign addresses—no external wallet connect in the modal.
 * Enable Twitter/X in the Privy dashboard.
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
        },
        loginMethods: ["twitter"],
        loginMethodsAndOrder: {
          primary: ["twitter"],
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
