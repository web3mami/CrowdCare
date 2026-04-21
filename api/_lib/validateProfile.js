/** Mirrors client profile rules for API writes (no import from /src). */

const SHARE_SLUG_RE = /^[a-z0-9]{10}$/;

export function validateProfilePayload(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid profile payload" };
  }
  const username =
    typeof body.username === "string"
      ? body.username.trim().slice(0, 80)
      : "";
  if (!username) {
    return { ok: false, error: "Public display name is required" };
  }
  const xRaw =
    typeof body.xUsername === "string" ? body.xUsername.trim() : "";
  const xu = xRaw.startsWith("@") ? xRaw.slice(1) : xRaw;
  const xNorm = xu.slice(0, 40);
  if (!xNorm || xNorm.length > 20 || !/^[A-Za-z0-9_]+$/.test(xNorm)) {
    return { ok: false, error: "Valid X username is required" };
  }
  const shareSlug =
    typeof body.shareSlug === "string" ? body.shareSlug.trim() : "";
  if (!SHARE_SLUG_RE.test(shareSlug)) {
    return { ok: false, error: "Invalid share slug" };
  }
  const profileLocked = !!body.profileLocked;
  return {
    ok: true,
    profile: {
      display_name: username,
      x_username: xNorm,
      share_slug: shareSlug,
      profile_locked: profileLocked,
    },
  };
}
