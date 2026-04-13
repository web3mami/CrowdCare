import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useSession } from "../context/SessionContext.jsx";
import { getUser, setUser, newShareSlug, signOut } from "../lib/session.js";

function pickPrivyEmail(privyUser) {
  if (!privyUser) return "";
  if (privyUser.email?.address) return privyUser.email.address;
  if (privyUser.google?.email) return privyUser.google.email;
  const emailAccount = privyUser.linkedAccounts?.find(
    (a) => a.type === "email"
  );
  if (emailAccount && "address" in emailAccount) {
    return emailAccount.address || "";
  }
  return "";
}

/** Solana address from connectors first, then Privy user (embedded / linked wallet). */
function pickSolanaAddress(privyUser, wallets) {
  const fromConnectors = wallets[0]?.address;
  if (fromConnectors) return fromConnectors;

  const first = privyUser?.wallet;
  if (first?.chainType === "solana" && first.address) return first.address;

  const linked = privyUser?.linkedAccounts?.find(
    (a) => a.type === "wallet" && a.chainType === "solana"
  );
  if (linked && "address" in linked && linked.address) return linked.address;

  return "";
}

/**
 * Keeps CrowdCare’s local session in sync with Privy:
 * Privy = source of truth for login; localStorage keeps profile + campaigns working as before.
 */
export function CrowdCarePrivyBridge() {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { refresh } = useSession();
  const lastSyncedPrivyId = useRef(null);

  useEffect(() => {
    if (!ready || authenticated) return;
    const u = getUser();
    if (u?.authProvider === "privy") {
      signOut();
      lastSyncedPrivyId.current = null;
      refresh();
    }
  }, [ready, authenticated, refresh]);

  useEffect(() => {
    if (!ready || !authenticated || !privyUser) return;

    const addr = pickSolanaAddress(privyUser, wallets);
    if (!addr) {
      if (!walletsReady) return;
      return;
    }

    if (
      lastSyncedPrivyId.current === privyUser.id &&
      getUser()?.publicKey === addr
    ) {
      return;
    }

    const prev = getUser();
    const email = pickPrivyEmail(privyUser);
    const next = {
      sub: privyUser.id,
      email,
      publicKey: addr,
      chain: "solana",
      at: Date.now(),
      authProvider: "privy",
    };

    if (prev && prev.sub === privyUser.id) {
      if (prev.username) next.username = prev.username;
      if (prev.avatarDataUrl) next.avatarDataUrl = prev.avatarDataUrl;
      if (prev.shareSlug) next.shareSlug = prev.shareSlug;
    }
    if (!next.shareSlug) next.shareSlug = newShareSlug();

    setUser(next);
    lastSyncedPrivyId.current = privyUser.id;
    refresh();
  }, [
    ready,
    authenticated,
    privyUser,
    walletsReady,
    wallets,
    refresh,
  ]);

  return null;
}
