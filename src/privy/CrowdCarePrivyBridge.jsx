import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useCreateWallet, useWallets } from "@privy-io/react-auth/solana";
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
  const s = String(chain ?? "").toLowerCase();
  return (
    s === "solana" ||
    s === "solana:mainnet" ||
    s === "solana:devnet" ||
    s === "solana:testnet" ||
    s === "sol"
  );
}

function isPrivyEmbeddedWallet(a) {
  const t = String(a?.walletClientType ?? "").toLowerCase();
  return t === "privy" || t === "privy-v2" || t.startsWith("privy");
}

/** Base58 pubkey shape; excludes 0x (EVM). */
function looksLikeSolanaPubkey(addr) {
  if (!addr || typeof addr !== "string") return false;
  if (addr.startsWith("0x")) return false;
  if (addr.length < 32 || addr.length > 52) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr);
}

/**
 * Solana address: connector accounts first, then linked embedded wallets.
 * Privy sometimes omits chainType on fresh embedded wallets; SDK filters require
 * chainType === "solana" exactly, which would hide the account from useWallets().
 */
function pickSolanaAddress(privyUser, wallets) {
  const fromConnectors = wallets?.[0]?.address;
  if (fromConnectors && looksLikeSolanaPubkey(fromConnectors)) {
    return fromConnectors;
  }

  const linked =
    privyUser?.linkedAccounts?.filter((a) => a.type === "wallet") ?? [];

  const isSolanaLinked = (a) =>
    isSolanaChain(a.chainType ?? a.chain) ||
    (isPrivyEmbeddedWallet(a) && looksLikeSolanaPubkey(a.address));

  const candidates = linked.filter(isSolanaLinked);
  if (candidates.length) {
    const embedded = candidates.find(isPrivyEmbeddedWallet);
    if (embedded?.address && looksLikeSolanaPubkey(embedded.address)) {
      return embedded.address;
    }
    const any = candidates[0];
    if (any?.address && looksLikeSolanaPubkey(any.address)) return any.address;
  }

  const first = privyUser?.wallet;
  if (
    first?.address &&
    looksLikeSolanaPubkey(first.address) &&
    (isSolanaChain(first.chainType ?? first.chain) ||
      isPrivyEmbeddedWallet(first))
  ) {
    return first.address;
  }

  return "";
}

/**
 * Keeps CrowdCare’s local session in sync with Privy:
 * Privy = source of truth for login; localStorage keeps profile + campaigns working as before.
 */
export function CrowdCarePrivyBridge() {
  const { ready, authenticated, user: privyUser, refreshUser } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet: createSolanaEmbedded } = useCreateWallet();
  const { refresh } = useSession();
  const lastSyncedPrivyId = useRef(null);
  const createSolanaAttemptedFor = useRef(null);

  const privyUserRef = useRef(privyUser);
  const walletsRef = useRef(wallets);
  const authenticatedRef = useRef(authenticated);
  privyUserRef.current = privyUser;
  walletsRef.current = wallets;
  authenticatedRef.current = authenticated;

  // Debounce: during OAuth return, Privy can briefly report unauthenticated.
  // Clearing localStorage immediately was wiping session and breaking the flow.
  useEffect(() => {
    if (!ready || authenticated) return;
    const t = window.setTimeout(() => {
      if (authenticatedRef.current) return;
      const u = getUser();
      if (u?.authProvider === "privy") {
        signOut();
        lastSyncedPrivyId.current = null;
        refresh();
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [ready, authenticated, refresh]);

  useEffect(() => {
    if (!authenticated) {
      createSolanaAttemptedFor.current = null;
    }
  }, [authenticated]);

  /**
   * X OAuth often completes before embedded Solana exists on the user object.
   * createOnLogin does not always run in time — explicitly create Solana embedded once per user.
   */
  useEffect(() => {
    if (!ready || !authenticated || !privyUser?.id) return;
    if (pickSolanaAddress(privyUser, wallets)) return;
    if (createSolanaAttemptedFor.current === privyUser.id) return;
    createSolanaAttemptedFor.current = privyUser.id;

    void (async () => {
      try {
        await createSolanaEmbedded();
      } catch (err) {
        console.warn(
          "[CrowdCare] createSolanaEmbedded (may already exist):",
          err
        );
      }
      try {
        await refreshUser();
      } catch (err2) {
        console.warn("[CrowdCare] refreshUser after Solana create:", err2);
      }
    })();
  }, [ready, authenticated, privyUser, wallets, createSolanaEmbedded, refreshUser]);

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
