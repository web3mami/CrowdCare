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

export function newShareSlug() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

export function ensureShareSlug() {
  const u = getUser();
  if (!u) return null;
  if (!u.shareSlug) {
    u.shareSlug = newShareSlug();
    setUser(u);
  }
  return u.shareSlug;
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
