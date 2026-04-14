/** GIS credential JWT — used to authorize POST /api/campaigns (same aud as Web client ID). */
const ID_TOKEN_KEY = "crowdcare_google_id_token";

export function setGoogleIdToken(token) {
  if (typeof sessionStorage === "undefined") return;
  if (token && typeof token === "string") {
    sessionStorage.setItem(ID_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ID_TOKEN_KEY);
  }
}

export function getGoogleIdToken() {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(ID_TOKEN_KEY) || "";
}

export function clearGoogleIdToken() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ID_TOKEN_KEY);
}

export async function fetchHubCampaignsFromApi(slug) {
  const r = await fetch(`/api/hub/${encodeURIComponent(slug)}`);
  if (!r.ok) throw new Error(`hub ${r.status}`);
  const data = await r.json();
  return Array.isArray(data.campaigns) ? data.campaigns : [];
}

export async function fetchCampaignByIdFromApi(id) {
  const r = await fetch(`/api/campaign/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`campaign ${r.status}`);
  const data = await r.json();
  return data.campaign && typeof data.campaign === "object" ? data.campaign : null;
}

/**
 * Upsert campaign on the server (requires recent Google sign-in for a valid ID token).
 * @returns {{ ok: boolean, error?: string, status?: number }}
 */
export async function syncCampaignToApi(campaign) {
  const token = getGoogleIdToken();
  if (!token) {
    return { ok: false, error: "no_id_token" };
  }
  const r = await fetch("/api/campaigns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ campaign }),
  });
  if (r.ok) return { ok: true };
  let msg = `HTTP ${r.status}`;
  try {
    const j = await r.json();
    if (j?.error) msg = j.error;
  } catch {
    /* ignore */
  }
  return { ok: false, error: msg, status: r.status };
}
