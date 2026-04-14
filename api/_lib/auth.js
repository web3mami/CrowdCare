/**
 * Verify Google Sign-In ID token (GIS credential JWT).
 * Uses google-auth-library (signature + expiry); set GOOGLE_CLIENT_ID to the same
 * Web client ID as VITE_GOOGLE_CLIENT_ID.
 */
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;
  const expectedAud = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!expectedAud) return null;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: expectedAud,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, email: payload.email || "" };
  } catch (e) {
    console.error("[verifyGoogleIdToken]", e?.message || e);
    return null;
  }
}
