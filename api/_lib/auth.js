/**
 * Verify Google Sign-In ID token (GIS credential JWT).
 * Uses google-auth-library (signature + expiry).
 *
 * Audience: `GOOGLE_CLIENT_ID` **or** `VITE_GOOGLE_CLIENT_ID` (Vercel often only sets the latter).
 */
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

/** Web OAuth client ID available to serverless (either name works on Vercel). */
export function getGoogleWebClientIdForServer() {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;
  const expectedAud = getGoogleWebClientIdForServer();
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
