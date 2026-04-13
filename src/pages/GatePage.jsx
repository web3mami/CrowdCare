import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { useSession } from "../context/SessionContext.jsx";

const BROWSE_KEY = "crowdcare_browse_only";
const GATE_START_KEY = "crowdcare_gate_started";

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || "";

/**
 * Landing route `/`: sign-in is the first screen (no extra “Start” step before login).
 * After session or browse-only, `/app` and the rest of the app are available.
 */
export function GatePage() {
  const { ready, authenticated, login } = usePrivy();
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    if (searchParams.get("signin") === "1") {
      sessionStorage.removeItem(BROWSE_KEY);
      sessionStorage.removeItem(GATE_START_KEY);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function goBrowse() {
    sessionStorage.setItem(BROWSE_KEY, "1");
    navigate("/app", { replace: true });
  }

  if (user || browseOnly) {
    return <Navigate to="/app" replace />;
  }

  const missingPrivy =
    !privyAppId || privyAppId.startsWith("set-VITE_PRIVY_APP_ID");
  const waitingForWallet = ready && authenticated && !user?.publicKey;

  return (
    <>
      <div className="layout-backdrop" aria-hidden="true" />
      <div className="layout-content">
        <div id="gate" className="gate-screen">
          <div
            className="gate-auth-modal content-shell gate-signin-first"
            role="main"
            aria-labelledby="gate-connect-heading"
          >
            <img
              className="gate-welcome-logo"
              src="/assets/logo-mark.svg"
              width="64"
              height="64"
              alt=""
              decoding="async"
            />
            <p className="gate-welcome-name">CrowdCare</p>
            <p className="gate-welcome-tagline gate-signin-tagline">
              Crowdfunding on <strong>Solana</strong>
            </p>

            <h1 id="gate-connect-heading" className="gate-connect-title">
              Sign in
            </h1>
            <p className="gate-connect-lead">
              Sign in with a <strong>Solana wallet</strong>, <strong>X</strong>, or{" "}
              <strong>email</strong> — powered by <strong>Privy</strong>. You get a
              Solana address from your wallet or an embedded wallet after login.
            </p>

            <div
              id="gate-client-setup"
              className="banner-warn gate-modal-banner"
              hidden={!missingPrivy}
            >
              <strong>Setup:</strong> add <code>VITE_PRIVY_APP_ID</code> to{" "}
              <code>.env</code> (see <code>PRIVY-SETUP.md</code>).
            </div>

            <div className="banner-warn gate-modal-banner">
              <strong>Demo</strong> — campaigns stay in this browser until you
              add a backend.
            </div>

            {waitingForWallet ? (
              <p className="lead lead--compact">Finishing sign-in…</p>
            ) : (
              <>
                <p className="gate-connect-label">Continue</p>
                <div className="gate-google-row gate-google-row--modal">
                  <button
                    type="button"
                    className="ft-create-cta gate-signin-primary"
                    style={{ width: "100%", maxWidth: 320 }}
                    disabled={!ready || missingPrivy}
                    onClick={() => login()}
                  >
                    Log in with Privy
                  </button>
                </div>
              </>
            )}

            <p className="gate-welcome-skip gate-skip-centered">
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
        </div>
      </div>
    </>
  );
}
