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

function isSolanaChain(chain) {
  return String(chain ?? "").toLowerCase() === "solana";
}

/** Solana address: external connectors first, then embedded / linked wallets on the Privy user. */
function pickSolanaAddress(privyUser, wallets) {
  const fromConnectors = wallets?.[0]?.address;
  if (fromConnectors) return fromConnectors;

  const linked = privyUser?.linkedAccounts?.filter((a) => a.type === "wallet");
  if (linked?.length) {
    const solana = linked.filter((a) => isSolanaChain(a.chainType));
    const embedded = solana.find(
      (a) =>
        a.walletClientType === "privy" ||
        a.walletClientType === "privy-v2"
    );
    if (embedded && "address" in embedded && embedded.address) {
      return embedded.address;
    }
    const any = solana[0];
    if (any && "address" in any && any.address) return any.address;
  }

  const first = privyUser?.wallet;
  if (first?.address && isSolanaChain(first.chainType)) return first.address;

  return "";
}

/**
 * Keeps CrowdCare’s local session in sync with Privy:
 * Privy = source of truth for login; localStorage keeps profile + campaigns working as before.
 */
export function CrowdCarePrivyBridge() {
  const { ready, authenticated, user: privyUser, refreshUser } = usePrivy();
  const { wallets } = useWallets();
  const { refresh } = useSession();
  const lastSyncedPrivyId = useRef(null);

  const privyUserRef = useRef(privyUser);
  const walletsRef = useRef(wallets);
  privyUserRef.current = privyUser;
  walletsRef.current = wallets;

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
    if (!addr) return;

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
  }, [ready, authenticated, privyUser, wallets, refresh]);

  useEffect(() => {
    if (!ready || !authenticated || !privyUser?.id) return;
    if (pickSolanaAddress(privyUserRef.current, walletsRef.current)) return;

    let ticks = 0;
    const maxTicks = 20;
    const id = setInterval(() => {
      if (pickSolanaAddress(privyUserRef.current, walletsRef.current)) {
        clearInterval(id);
        return;
      }
      if (ticks >= maxTicks) {
        clearInterval(id);
        console.warn(
          "[CrowdCare] No Solana wallet on Privy user after sign-in. Check Privy dashboard: embedded Solana + create on login."
        );
        return;
      }
      ticks += 1;
      void refreshUser().catch((err) =>
        console.warn("[CrowdCare] refreshUser (wallet pending):", err)
      );
    }, 1500);

    return () => clearInterval(id);
  }, [ready, authenticated, privyUser?.id, refreshUser]);

  return null;
}
