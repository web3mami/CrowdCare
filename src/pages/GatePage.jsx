import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { safeInternalPath } from "../lib/safeRedirectPath.js";
import {
  decodeGoogleCredentialJwt,
  loadGisScript,
} from "../lib/googleGis.js";
import { deriveDemoKeypair } from "../lib/keypair.js";
import { setGoogleIdToken } from "../lib/crowdcareApi.js";
import { getUser, newShareSlug, setUser } from "../lib/session.js";

const BROWSE_KEY = "crowdcare_browse_only";
const NEXT_KEY = "crowdcare_next";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/**
 * `/`: welcome, then Sign in with Google (GIS) — no third-party auth modal.
 * Solana address is derived locally from Google `sub` (see keypair.js).
 */
export function GatePage() {
  const { user, refresh } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [gateStarted, setGateStarted] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [gisError, setGisError] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);

  const buttonHostRef = useRef(null);
  const credentialHandlerRef = useRef(() => {});
  const gisInitializedRef = useRef(false);

  /** Must not use a one-time useState snapshot — sign-in clears BROWSE_KEY in an effect, and stale `true` bounced users away from the gate. */
  const signingInIntent =
    searchParams.get("signin") === "1" && !user?.publicKey;
  const browseOnly =
    typeof sessionStorage !== "undefined" &&
    !signingInIntent &&
    sessionStorage.getItem(BROWSE_KEY) === "1";

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
    if (user?.publicKey) return;
    sessionStorage.removeItem(BROWSE_KEY);
    setGateStarted(false);
    const next = safeInternalPath(searchParams.get("next") || "");
    if (next) sessionStorage.setItem(NEXT_KEY, next);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, user?.publicKey]);

  credentialHandlerRef.current = async (response) => {
    if (!response?.credential) return;
    setGisError("");
    setSignInBusy(true);
    try {
      const payload = decodeGoogleCredentialJwt(response.credential);
      const sub = payload.sub;
      if (!sub) throw new Error("No subject in credential");
      const email = payload.email || "";
      const kp = await deriveDemoKeypair(sub);
      const publicKey = kp.publicKey.toBase58();

      const prev = getUser();
      const next = {
        sub,
        email,
        publicKey,
        chain: "solana",
        at: Date.now(),
        authProvider: "google",
      };
      if (prev && prev.sub === sub) {
        if (prev.username) next.username = prev.username;
        if (prev.avatarDataUrl) next.avatarDataUrl = prev.avatarDataUrl;
        if (prev.shareSlug) next.shareSlug = prev.shareSlug;
      }
      if (!next.shareSlug) next.shareSlug = newShareSlug();

      setUser(next);
      setGoogleIdToken(response.credential);
      refresh();
      sessionStorage.removeItem(BROWSE_KEY);
      const storedNext = safeInternalPath(
        sessionStorage.getItem(NEXT_KEY) || ""
      );
      if (storedNext) sessionStorage.removeItem(NEXT_KEY);
      navigate(storedNext || "/app", { replace: true });
    } catch (err) {
      console.error("[CrowdCare] Google sign-in failed:", err);
      setGisError("Sign-in failed. Check console and Google Cloud OAuth settings.");
    } finally {
      setSignInBusy(false);
    }
  };

  useEffect(() => {
    if (!gateStarted || !googleClientId) return;
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled) return;
        setGisReady(true);
        setGisError("");
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setGisError("Could not load Google Sign-In.");
      });
    return () => {
      cancelled = true;
    };
  }, [gateStarted]);

  const initGoogleButton = useCallback(() => {
    if (!gisReady || !googleClientId || !buttonHostRef.current) return;
    const id = window.google?.accounts?.id;
    if (!id) return;

    if (!gisInitializedRef.current) {
      id.initialize({
        client_id: googleClientId,
        callback: (r) => void credentialHandlerRef.current(r),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      gisInitializedRef.current = true;
    }

    buttonHostRef.current.innerHTML = "";
    id.renderButton(buttonHostRef.current, {
      theme: "filled_black",
      size: "large",
      width: 320,
      text: "continue_with",
      shape: "rectangular",
      locale: "en",
    });
  }, [gisReady, googleClientId]);

  useEffect(() => {
    if (!gateStarted || !gisReady) return;
    initGoogleButton();
  }, [gateStarted, gisReady, initGoogleButton]);

  function startGate() {
    setGateStarted(true);
  }

  function backToWelcome() {
    setGateStarted(false);
    setGisReady(false);
    setGisError("");
  }

  function goBrowse() {
    sessionStorage.setItem(BROWSE_KEY, "1");
    navigate("/app", { replace: true });
  }

  if (user?.publicKey) {
    sessionStorage.removeItem(BROWSE_KEY);
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

  if (browseOnly) {
    return <Navigate to="/app" replace />;
  }

  const missingClient =
    !googleClientId || googleClientId.includes("YOUR_");

  return (
    <>
      <div className="layout-backdrop" aria-hidden="true" />
      <div className="layout-content">
        <div id="gate" className="gate-screen">
          {!gateStarted ? (
            <div className="gate-welcome-outer gate-welcome--pop-in">
              <div className="gate-welcome-card gate-landing-card">
                <p className="gate-welcome-kicker">Solana · transparent funding</p>

                <div className="gate-landing-hero">
                  <div className="gate-landing-hero-main">
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
                    <p className="gate-value-prop">
                      One <strong>hub link</strong> lists every campaign you run. Supporters
                      send funds to <strong>your Solana address</strong>—this app never
                      holds money. This build is a <strong>browser demo</strong>; add a
                      server when you are ready to go live.
                    </p>
                  </div>
                  <div className="gate-landing-preview" aria-hidden="true">
                    <div className="gate-preview-window">
                      <div className="gate-preview-window-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <p className="gate-preview-window-url">crowdcare.app/hub/your-name</p>
                    </div>
                    <div className="gate-preview-card">
                      <span className="gate-preview-badge">Active</span>
                      <p className="gate-preview-title">Neighborhood storm relief</p>
                      <p className="gate-preview-meta">Goal 85 SOL · on-chain totals not verified here</p>
                      <div
                        className="gate-preview-bar"
                        role="presentation"
                      >
                        <span className="gate-preview-bar-fill" />
                      </div>
                    </div>
                  </div>
                </div>

                <ul className="gate-trust-list">
                  <li>Donations use the wallet address shown on each campaign page.</li>
                  <li>
                    We do not custody or reconcile on-chain activity—always verify yourself.
                  </li>
                </ul>

                <div className="gate-steps" aria-label="How CrowdCare works">
                  <div className="gate-step">
                    <span className="gate-step-num" aria-hidden="true">
                      1
                    </span>
                    <div className="gate-step-body">
                      <p className="gate-step-title">Sign in</p>
                      <p className="gate-step-text">
                        Google verifies you; a demo wallet is derived in this browser only.
                      </p>
                    </div>
                  </div>
                  <div className="gate-step">
                    <span className="gate-step-num" aria-hidden="true">
                      2
                    </span>
                    <div className="gate-step-body">
                      <p className="gate-step-title">Create &amp; share</p>
                      <p className="gate-step-text">
                        Publish campaigns and share one hub link with your community.
                      </p>
                    </div>
                  </div>
                  <div className="gate-step">
                    <span className="gate-step-num" aria-hidden="true">
                      3
                    </span>
                    <div className="gate-step-body">
                      <p className="gate-step-title">Receive on Solana</p>
                      <p className="gate-step-text">
                        Supporters send to your public address—same as any Solana wallet.
                      </p>
                    </div>
                  </div>
                </div>

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
                    className="bare gate-browse-link"
                    id="browse-skip-welcome"
                    onClick={(e) => {
                      e.preventDefault();
                      goBrowse();
                    }}
                  >
                    See active &amp; past campaigns without signing in
                  </button>
                </p>
              </div>
              <footer className="gate-landing-footer">
                <span className="gate-landing-footer-brand">CrowdCare</span>
                <span className="gate-landing-footer-sep" aria-hidden>
                  ·
                </span>
                <span className="gate-landing-footer-meta">
                  Demo — hub campaigns sync online for sharing; profile &amp; wallet
                  stay in this browser. Not financial advice.
                </span>
              </footer>
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
                width="48"
                height="48"
                alt=""
                decoding="async"
              />
              <p className="gate-welcome-name">CrowdCare</p>

              <h1 id="gate-connect-heading" className="gate-connect-title">
                Sign in with Google
              </h1>

              <div
                id="gate-client-setup"
                className="banner-warn gate-modal-banner"
                hidden={!missingClient}
              >
                <strong>Setup:</strong> add{" "}
                <code>VITE_GOOGLE_CLIENT_ID</code> to <code>.env</code> (see{" "}
                <code>GOOGLE-SETUP.md</code>). Use a Web application OAuth client
                ID from Google Cloud Console.
              </div>

              {gisError ? (
                <p className="form-error" role="alert">
                  {gisError}
                </p>
              ) : null}

              {signInBusy ? (
                <p className="lead lead--compact">Signing you in…</p>
              ) : (
                <div className="gate-google-row gate-google-row--modal">
                  {!missingClient && gisReady ? (
                    <div
                      ref={buttonHostRef}
                      className="gate-gis-button-host"
                      id="gate-gis-button-host"
                    />
                  ) : !missingClient ? (
                    <p className="lead lead--compact">Loading Google…</p>
                  ) : null}
                </div>
              )}

              <p className="gate-welcome-skip gate-skip-centered">
                <button
                  type="button"
                  className="bare gate-browse-link"
                  id="browse-skip-auth"
                  onClick={(e) => {
                    e.preventDefault();
                    goBrowse();
                  }}
                >
                  See campaigns without signing in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
