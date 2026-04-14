import { deriveDemoKeypair } from "./keypair.js";
import { backfillCreatorShareSlugs } from "./crowdcareApp.js";

const STORAGE_KEY = "crowdcare_user";

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Old builds used Privy; clear so users re-sign-in with Google (GIS). */
export function migratePrivySessionToSignOut() {
  try {
    const u = getUser();
    if (u?.authProvider === "privy") signOut();
  } catch {
    /* ignore */
  }
}

/** Re-derive wallet if Google session exists but `publicKey` is missing (partial save / old bug). */
export async function repairGoogleUserIfNeeded() {
  const u = getUser();
  if (!u?.sub || u.authProvider !== "google") return false;
  if (typeof u.publicKey === "string" && u.publicKey.length >= 32) return false;
  try {
    const kp = await deriveDemoKeypair(u.sub);
    u.publicKey = kp.publicKey.toBase58();
    if (!u.shareSlug) u.shareSlug = newShareSlug();
    u.chain = u.chain || "solana";
    setUser(u);
    return true;
  } catch {
    return false;
  }
}

export function newShareSlug() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

/** Ensures `shareSlug` exists; returns whether local storage was updated. */
export function ensureShareSlug() {
  const u = getUser();
  if (!u) return false;
  let changed = false;
  if (!u.shareSlug) {
    u.shareSlug = newShareSlug();
    setUser(u);
    changed = true;
  }
  if (u.sub && u.shareSlug && backfillCreatorShareSlugs(u.sub, u.shareSlug)) {
    changed = true;
  }
  return changed;
}

export function updateProfile(updates) {
  const u = getUser();
  if (!u) return false;
  updates = updates || {};
  if (updates.username !== undefined) {
    u.username = updates.username;
  }
  if (updates.avatarDataUrl !== undefined) {
    if (updates.avatarDataUrl === "") {
      delete u.avatarDataUrl;
    } else {
      u.avatarDataUrl = updates.avatarDataUrl;
    }
  }
  setUser(u);
  return true;
}
