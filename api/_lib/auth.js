/**
 * Verify Google Sign-In ID token (GIS credential JWT).
 * Uses tokeninfo; set GOOGLE_CLIENT_ID to the same Web client ID as VITE_GOOGLE_CLIENT_ID.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;
  const expectedAud = process.env.GOOGLE_CLIENT_ID;
  if (!expectedAud) return null;

  const r = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!r.ok) return null;
  const data = await r.json();
  if (data.aud !== expectedAud) return null;
  if (data.exp) {
    const expMs = Number(data.exp) * 1000;
    if (Number.isFinite(expMs) && expMs < Date.now() - 30_000) return null;
  }
  if (!data.sub || typeof data.sub !== "string") return null;
  return { sub: data.sub, email: data.email || "" };
}
