/** Load Google Identity Services (Sign in with Google). */
export function loadGisScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("GIS script failed"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("GIS script failed"));
    document.head.appendChild(s);
  });
}

/**
 * Ask Google for a fresh ID token (One Tap / returning user). Use when sessionStorage
 * token is missing, expired, or the server returned 401 on sync.
 * @param {string} clientId Web client ID (same as VITE_GOOGLE_CLIENT_ID)
 * @returns {Promise<string|null>} credential JWT or null if not obtained
 */
export function requestGoogleCredentialOneTap(clientId) {
  if (!clientId || typeof window === "undefined") {
    return Promise.resolve(null);
  }
  return loadGisScript().then(
    () =>
      new Promise((resolve) => {
        const id = window.google?.accounts?.id;
        if (!id) {
          resolve(null);
          return;
        }
        let settled = false;
        const done = (cred) => {
          if (settled) return;
          settled = true;
          resolve(cred && typeof cred === "string" ? cred : null);
        };

        id.initialize({
          client_id: clientId,
          callback: (response) => {
            done(response?.credential || null);
          },
          auto_select: true,
          cancel_on_tap_outside: true,
        });

        id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            window.setTimeout(() => {
              if (!settled) done(null);
            }, 1500);
          }
        });
      })
  );
}

/** Decode JWT payload from GIS credential (middle segment). */
export function decodeGoogleCredentialJwt(credential) {
  const parts = String(credential).split(".");
  if (parts.length !== 3) throw new Error("Invalid credential");
  const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(b64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}
