import { deriveDemoKeypair } from "./keypair.js";
import {
  backfillCreatorShareSlugs,
  getCreatorPublicMetaFromLatestCampaign,
} from "./crowdcareApp.js";
import { isValidXUsername, normalizeXUsernameInput } from "./xUsername.js";

const STORAGE_KEY = "crowdcare_user";
/** Survives sign-out so the same Google account can restore name / X / hub slug on this device. */
const IDENTITY_STASH_PREFIX = "crowdcare_identity_";

function identityStashKey(sub) {
  return `${IDENTITY_STASH_PREFIX}${encodeURIComponent(String(sub))}`;
}

/**
 * Merge identity into per-sub stash. MUST merge with existing stash: after sign-in,
 * `setUser` often receives an object that only has core fields + shareSlug (no
 * username keys yet). Replacing the whole stash would erase a saved profile.
 */
function mirrorIdentityToStash(u) {
  if (!u?.sub) return;
  try {
    const sub = String(u.sub);
    const existing = readPersistedIdentity(sub) || {};
    const merged = { ...existing };
    if ("username" in u) merged.username = u.username;
    if ("xUsername" in u) merged.xUsername = u.xUsername;
    if ("avatarDataUrl" in u) merged.avatarDataUrl = u.avatarDataUrl;
    if ("shareSlug" in u) merged.shareSlug = u.shareSlug;
    localStorage.setItem(identityStashKey(sub), JSON.stringify(merged));
  } catch (e) {
    console.error("[CrowdCare] mirrorIdentityToStash", e);
  }
}

export function readPersistedIdentity(sub) {
  if (!sub) return null;
  try {
    const raw = localStorage.getItem(identityStashKey(String(sub)));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

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
  if (user?.sub) {
    try {
      mirrorIdentityToStash(user);
    } catch (e) {
      console.error("[CrowdCare] mirrorIdentityToStash", e);
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("[CrowdCare] Could not save session (storage full or blocked).", e);
  }
}

export function signOut() {
  try {
    const u = getUser();
    if (u?.sub) mirrorIdentityToStash(u);
  } catch {
    /* ignore */
  }
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

/**
 * If the saved user record is missing display name or X handle but a local campaign
 * has them, copy into the user blob so Create / gates match what you already published.
 */
export function reconcileUserProfileFromLatestCampaign() {
  const u = getUser();
  if (!u?.sub) return false;
  const meta = getCreatorPublicMetaFromLatestCampaign(u.sub);
  if (!meta) return false;
  let changed = false;
  const dn = String(u.username ?? "").trim();
  const xu = normalizeXUsernameInput(u.xUsername);
  if (!dn && meta.displayName) {
    u.username = meta.displayName.slice(0, 80);
    changed = true;
  }
  const metaX = normalizeXUsernameInput(meta.xUsername);
  if (!isValidXUsername(xu) && isValidXUsername(metaX)) {
    u.xUsername = metaX;
    changed = true;
  }
  if (changed) {
    setUser(u);
    return true;
  }
  return false;
}

/** Prefer a fresh read from localStorage when it matches the signed-in `sub`. */
export function getIdentityUser(sessionUser) {
  if (!sessionUser?.sub) return sessionUser;
  try {
    const stored = getUser();
    if (stored && String(stored.sub) === String(sessionUser.sub)) return stored;
  } catch {
    /* ignore */
  }
  return sessionUser;
}

export function isProfileIdentityComplete(u) {
  if (!u) return false;
  const dn = String(u.username ?? "").trim();
  const xu = normalizeXUsernameInput(u.xUsername);
  return dn.length > 0 && isValidXUsername(xu);
}

/**
 * Clear legacy `profileLocked` from older builds so Profile stays editable.
 */
export function ensureProfileLockMigrated() {
  const u = getUser();
  if (!u?.sub || !u.profileLocked) return false;
  delete u.profileLocked;
  setUser(u);
  return true;
}

/** Drop bogus lock flags that would block saving an incomplete profile. */
export function repairStaleProfileLock() {
  const u = getUser();
  if (!u?.profileLocked) return false;
  if (isProfileIdentityComplete(u)) return false;
  delete u.profileLocked;
  setUser(u);
  return true;
}

export function updateProfile(updates) {
  const u = getUser();
  if (!u) return false;
  updates = updates || {};
  if (updates.username !== undefined) {
    u.username =
      updates.username == null
        ? ""
        : String(updates.username).trim().slice(0, 80);
  }
  if (updates.xUsername !== undefined) {
    u.xUsername =
      updates.xUsername == null
        ? ""
        : String(updates.xUsername).trim().slice(0, 40);
  }
  if (updates.avatarDataUrl !== undefined) {
    if (updates.avatarDataUrl === "") {
      delete u.avatarDataUrl;
    } else {
      u.avatarDataUrl = updates.avatarDataUrl;
    }
  }
  if (updates.profileLocked !== undefined) {
    if (updates.profileLocked) u.profileLocked = true;
    else delete u.profileLocked;
  }
  setUser(u);
  return true;
}
