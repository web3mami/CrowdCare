import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  /** Already logged in (localStorage) but need a fresh GIS credential — e.g. online sync. */
  useLayoutEffect(() => {
    if (searchParams.get("signin") !== "1") return;
    if (!user?.publicKey) return;
    sessionStorage.removeItem(BROWSE_KEY);
    const next = safeInternalPath(searchParams.get("next") || "");
    if (next) sessionStorage.setItem(NEXT_KEY, next);
    setGateStarted(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, user?.publicKey, setSearchParams]);

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
        if (prev.xUsername) next.xUsername = prev.xUsername;
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

  if (
    user?.publicKey &&
    searchParams.get("signin") !== "1" &&
    !gateStarted
  ) {
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
              <div className="gate-welcome-card gate-landing-card gate-landing-card--hero">
                <div className="gate-veltra-hero">
                  <div className="gate-veltra-left">
                    <div className="gate-hero-primary-card">
                      <div className="gate-brand-lockup">
                        <p className="gate-brand-name">CrowdCare</p>
                        <p className="gate-brand-tagline">
                          Non-custodial fundraising on Solana.
                        </p>
                      </div>

                      <div className="gate-veltra-badge">
                        <span className="gate-veltra-badge-dot" aria-hidden="true" />
                        <span>On-chain payouts · Your wallet</span>
                      </div>

                      <h1 className="gate-veltra-title">
                        <span className="gate-veltra-title-line">
                          Crowdfunding on Solana
                        </span>
                        <span className="gate-veltra-title-accent">
                          at hub speed
                        </span>
                      </h1>

                      <p className="gate-veltra-lead">
                        One hub link for every campaign you publish. Supporters send
                        USDC or SOL <strong>straight to your wallet</strong>
                        —CrowdCare never holds funds. Confirm every transaction on the
                        chain you trust.
                      </p>

                      <div className="gate-veltra-actions">
                        <button
                          type="button"
                          className="gate-start-btn"
                          id="gate-start-btn"
                          onClick={startGate}
                        >
                          Get started
                        </button>
                        <button
                          type="button"
                          className="gate-hero-outline-btn"
                          id="browse-skip-welcome"
                          onClick={() => goBrowse()}
                        >
                          Browse campaigns
                        </button>
                      </div>

                      <div className="gate-veltra-tags" aria-label="Stack">
                        <span className="gate-veltra-pill">Solana</span>
                        <span className="gate-veltra-pill">USDC</span>
                        <span className="gate-veltra-pill">SOL</span>
                        <span className="gate-veltra-pill">Google sign-in</span>
                        <span className="gate-veltra-pill">Shareable hub</span>
                      </div>
                    </div>
                  </div>

                  <div className="gate-veltra-right" aria-hidden="true">
                    <div className="gate-veltra-float-scene">
                      <div className="gate-veltra-float">
                        <div className="gate-veltra-float-logo-ring">
                          <img
                            className="gate-veltra-float-logo"
                            src="/assets/logo-mark.svg"
                            width="88"
                            height="88"
                            alt=""
                            decoding="async"
                          />
                        </div>
                        <div className="gate-landing-preview gate-landing-preview--veltra">
                          <div className="gate-preview-window">
                            <div className="gate-preview-window-dots">
                              <span />
                              <span />
                              <span />
                            </div>
                            <p className="gate-preview-window-url">
                              crowdcare.app/hub/your-name
                            </p>
                          </div>
                          <div className="gate-preview-card gate-preview-card--veltra">
                            <div className="gate-veltra-card-head">
                              <span className="gate-veltra-card-brand">CrowdCare</span>
                              <span className="gate-veltra-card-tag">Active</span>
                            </div>
                            <p className="gate-preview-title">
                              Raising money for tuition
                            </p>
                            <p className="gate-preview-meta">
                              52% funded · Goal 12,500 USDC on Solana
                            </p>
                            <div
                              className="gate-preview-bar gate-preview-bar--veltra"
                              role="presentation"
                            >
                              <span className="gate-preview-bar-fill gate-preview-bar-fill--veltra" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="gate-veltra-skip">
                  <button
                    type="button"
                    className="bare gate-browse-link"
                    onClick={(e) => {
                      e.preventDefault();
                      goBrowse();
                    }}
                  >
                    See active &amp; past campaigns without signing in
                  </button>
                </p>
              </div>

              <div className="gate-landing-below">
                <section
                  className="gate-land-section"
                  aria-labelledby="gate-how-heading"
                >
                  <p className="gate-land-kicker">How it works</p>
                  <h2 id="gate-how-heading" className="gate-land-title">
                    From sign-in to a live campaign page
                  </h2>
                  <p className="gate-land-sub">
                    CrowdCare gives you a single link for your hub. Each campaign gets
                    its own page, goal, and receive address.
                  </p>
                  <ul className="gate-land-step-list">
                    <li className="gate-land-step">
                      <span className="gate-land-step-num" aria-hidden="true">
                        1
                      </span>
                      <div className="gate-land-step-body">
                        <p className="gate-land-step-title">Sign in with Google</p>
                        <p className="gate-land-step-text">
                          We derive a Solana wallet from your Google account so you
                          don&apos;t manage seed phrases in the app.
                        </p>
                      </div>
                    </li>
                    <li className="gate-land-step">
                      <span className="gate-land-step-num" aria-hidden="true">
                        2
                      </span>
                      <div className="gate-land-step-body">
                        <p className="gate-land-step-title">Create your campaign</p>
                        <p className="gate-land-step-text">
                          Set story, goal, USDC or SOL, and transparency splits. Your
                          hub URL lists everything you publish.
                        </p>
                      </div>
                    </li>
                    <li className="gate-land-step">
                      <span className="gate-land-step-num" aria-hidden="true">
                        3
                      </span>
                      <div className="gate-land-step-body">
                        <p className="gate-land-step-title">Share and receive</p>
                        <p className="gate-land-step-text">
                          Supporters send to the wallet on the page. Progress and
                          activity stay visible; you verify balances on-chain anytime.
                        </p>
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="gate-land-section" aria-labelledby="gate-features-heading">
                  <p className="gate-land-kicker">Features</p>
                  <h2 id="gate-features-heading" className="gate-land-title">
                    Built for clarity and speed
                  </h2>
                  <div className="gate-land-card-grid">
                    <article className="gate-land-card">
                      <h3 className="gate-land-card-title">One hub, many campaigns</h3>
                      <p className="gate-land-card-text">
                        A stable link for your creator presence. Backers bookmark one
                        place to see what you&apos;re running.
                      </p>
                    </article>
                    <article className="gate-land-card">
                      <h3 className="gate-land-card-title">Non-custodial by design</h3>
                      <p className="gate-land-card-text">
                        Funds go to the Solana address on the campaign page—not a pooled
                        account. You stay in control of keys and timing.
                      </p>
                    </article>
                    <article className="gate-land-card">
                      <h3 className="gate-land-card-title">USDC &amp; SOL goals</h3>
                      <p className="gate-land-card-text">
                        Choose the asset that matches your campaign. Progress and
                        optional activity views follow the goal you set.
                      </p>
                    </article>
                    <article className="gate-land-card">
                      <h3 className="gate-land-card-title">Transparency block</h3>
                      <p className="gate-land-card-text">
                        Show how funds break down—beneficiary share, fees, notes—so
                        supporters know what they&apos;re funding.
                      </p>
                    </article>
                  </div>
                </section>

                <section className="gate-land-section" aria-labelledby="gate-usecases-heading">
                  <p className="gate-land-kicker">Use cases</p>
                  <h2 id="gate-usecases-heading" className="gate-land-title">
                    Who CrowdCare is for
                  </h2>
                  <div className="gate-land-card-grid gate-land-card-grid--duo">
                    <article className="gate-land-card gate-land-card--accent">
                      <h3 className="gate-land-card-title">Creators &amp; communities</h3>
                      <p className="gate-land-card-text">
                        Tuition, medical, travel, creative projects—anything where a
                        public goal and a clear receive address help people contribute.
                      </p>
                    </article>
                    <article className="gate-land-card gate-land-card--accent">
                      <h3 className="gate-land-card-title">Builders &amp; small teams</h3>
                      <p className="gate-land-card-text">
                        Ship a grants round, a hackathon prize pool, or a product
                        preorder without wiring a custom checkout first.
                      </p>
                    </article>
                    <article className="gate-land-card gate-land-card--accent">
                      <h3 className="gate-land-card-title">Anyone already on Solana</h3>
                      <p className="gate-land-card-text">
                        If your audience is comfortable with wallets and explorers,
                        CrowdCare keeps the story and the link simple.
                      </p>
                    </article>
                  </div>
                </section>
              </div>

              <footer className="gate-landing-footer">
                <span className="gate-landing-footer-brand">CrowdCare</span>
                <span className="gate-landing-footer-sep" aria-hidden>
                  ·
                </span>
                <span className="gate-landing-footer-meta">
                  Hub campaigns sync for discovery. Profile and wallet data stay in
                  your browser unless you self-host. Not financial advice.
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
