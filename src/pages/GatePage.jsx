import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useLoginWithOAuth, usePrivy } from "@privy-io/react-auth";
import { useSession } from "../context/SessionContext.jsx";
import { safeInternalPath } from "../lib/safeRedirectPath.js";

const BROWSE_KEY = "crowdcare_browse_only";
const NEXT_KEY = "crowdcare_next";

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || "";

/**
 * `/`: welcome with “Start CrowdCare”, then X sign-in via Privy (embedded Solana after login).
 * Gate step is not persisted—each visit lands on Start CrowdCare first.
 */
export function GatePage() {
  const { ready, authenticated, login } = usePrivy();
  const { initOAuth, loading: oauthLoading } = useLoginWithOAuth();
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [gateStarted, setGateStarted] = useState(false);

  const [browseOnly] = useState(
    () =>
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(BROWSE_KEY) === "1"
  );

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      const gate = document.getElementById("gate");
      const d = document.createElement("div");
      d.className = "banner-warn";
      d.style.marginBottom = "1rem";
      d.innerHTML =
        "<strong>You opened this as a file on your PC.</strong> Run <code>npm run dev</code> then open the URL Vite prints.";
      if (gate) gate.insertBefore(d, gate.firstChild);
      else document.body.insertBefore(d, document.body.firstChild);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("signin") !== "1") return;
    // Signed-in users leave via <Navigate> on the same tick; running this would race after `next` was cleared from the URL.
    if (user?.publicKey) return;
    sessionStorage.removeItem(BROWSE_KEY);
    setGateStarted(false);
    const next = safeInternalPath(searchParams.get("next") || "");
    if (next) sessionStorage.setItem(NEXT_KEY, next);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, user?.publicKey]);

  function startGate() {
    setGateStarted(true);
  }

  function backToWelcome() {
    setGateStarted(false);
  }

  function goBrowse() {
    sessionStorage.setItem(BROWSE_KEY, "1");
    navigate("/app", { replace: true });
  }

  // Same bar as Layout/Profile: need a Solana address. Else /profile sends you
  // to /?signin=1 and this redirect would immediately send you back to /app.
  if (user?.publicKey || browseOnly) {
    if (browseOnly) {
      return <Navigate to="/app" replace />;
    }
    // Read `next` from the URL here (sync). sessionStorage is filled in useEffect only after paint — too late if we only read storage.
    const nextFromQuery = safeInternalPath(searchParams.get("next") || "");
    const stored = sessionStorage.getItem(NEXT_KEY);
    const to = nextFromQuery || safeInternalPath(stored || "");
    if (to) {
      sessionStorage.removeItem(NEXT_KEY);
      return <Navigate to={to} replace />;
    }
    sessionStorage.removeItem(NEXT_KEY);
    return <Navigate to="/app" replace />;
  }

  const missingPrivy =
    !privyAppId || privyAppId.startsWith("set-VITE_PRIVY_APP_ID");
  const waitingForWallet = ready && authenticated && !user?.publicKey;

  async function continueWithX() {
    try {
      await initOAuth({ provider: "twitter" });
    } catch (err) {
      console.error("[CrowdCare] X login (OAuth) failed:", err);
      try {
        login({ loginMethods: ["twitter"] });
      } catch (e2) {
        console.error("[CrowdCare] X login (modal) failed:", e2);
      }
    }
  }

  return (
    <>
      <div className="layout-backdrop" aria-hidden="true" />
      <div className="layout-content">
        <div id="gate" className="gate-screen">
          {!gateStarted ? (
            <div className="gate-welcome gate-welcome--pop-in">
              <img
                className="gate-welcome-logo"
                src="/assets/logo-mark.svg"
                width="64"
                height="64"
                alt=""
                decoding="async"
              />
              <p className="gate-welcome-name">CrowdCare</p>
              <p className="gate-welcome-tagline">
                Crowdfunding on <strong>Solana</strong>
              </p>
              <button
                type="button"
                className="gate-start-btn"
                id="gate-start-btn"
                onClick={startGate}
              >
                Start CrowdCare
              </button>
              <p className="gate-welcome-skip">
                <button
                  type="button"
                  className="bare"
                  id="browse-skip-welcome"
                  onClick={(e) => {
                    e.preventDefault();
                    goBrowse();
                  }}
                >
                  Browse only
                </button>
              </p>
            </div>
          ) : (
            <div
              className="gate-auth-modal content-shell gate-signin-first"
              role="main"
              aria-labelledby="gate-connect-heading"
            >
              <div className="gate-auth-modal-head">
                <button
                  type="button"
                  className="gate-auth-back bare"
                  id="gate-auth-back"
                  onClick={backToWelcome}
                >
                  ← Back
                </button>
              </div>
              <img
                className="gate-welcome-logo"
                src="/assets/logo-mark.svg"
                width="64"
                height="64"
                alt=""
                decoding="async"
              />
              <p className="gate-welcome-name">CrowdCare</p>

              <h1 id="gate-connect-heading" className="gate-connect-title">
                Sign in with X
              </h1>

              <div
                id="gate-client-setup"
                className="banner-warn gate-modal-banner"
                hidden={!missingPrivy}
              >
                <strong>Setup:</strong> add <code>VITE_PRIVY_APP_ID</code> to{" "}
                <code>.env</code> (see <code>PRIVY-SETUP.md</code>).
              </div>

              {waitingForWallet ? (
                <p className="lead lead--compact">Finishing sign-in…</p>
              ) : (
                <div className="gate-google-row gate-google-row--modal">
                  <button
                    type="button"
                    className="ft-create-cta gate-signin-primary"
                    style={{ width: "100%", maxWidth: 320 }}
                    disabled={!ready || missingPrivy || oauthLoading}
                    onClick={() => void continueWithX()}
                  >
                    {oauthLoading ? "Redirecting…" : "Continue with X"}
                  </button>
                </div>
              )}

              <p className="gate-welcome-skip gate-skip-centered">
                <button
                  type="button"
                  className="bare"
                  id="browse-skip-auth"
                  onClick={(e) => {
                    e.preventDefault();
                    goBrowse();
                  }}
                >
                  Browse only
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
