import { useLayoutEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { getCampaignsByShareSlug } from "../lib/crowdcareApp.js";

const BROWSE_KEY = "crowdcare_browse_only";

export function AppHomePage() {
  const { user, ensureShareSlug } = useSession();
  const [searchParams] = useSearchParams();
  const hubSlug = searchParams.get("hub");

  const browseOnly =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(BROWSE_KEY) === "1";

  useLayoutEffect(() => {
    if (user?.publicKey) {
      ensureShareSlug();
    }
  }, [user?.publicKey, ensureShareSlug]);

  if (hubSlug && hubSlug.trim()) {
    const hubCampaigns = getCampaignsByShareSlug(hubSlug.trim());
    const empty = hubCampaigns.length === 0;
    return (
      <div id="hub-view" className="hub-view">
        <p className="back">
          <Link to="/app">← Home</Link>
        </p>
        <div className="content-shell ft-panel hub-panel">
          <p className="ft-kicker">Creator hub</p>
          <h1 className="site-title hub-title">
            {empty ? "This hub is empty" : "Campaigns on this hub"}
          </h1>
          <p className="lead hub-lead">Saved in this browser only.</p>
          <CampaignList campaigns={hubCampaigns} />
          <p id="hub-empty" className="note note--tight" hidden={!empty}>
            Nothing here—wrong device or empty hub.
          </p>
        </div>
      </div>
    );
  }

  if (!user && !browseOnly) {
    return <Navigate to="/" replace />;
  }

  const u = user;
  if (u && u.publicKey) {
    const slug = u.shareSlug;
    const hubRel = `/app?hub=${encodeURIComponent(slug)}`;
    return (
      <div className="signed-in-home" id="signed-in-home">
        <div className="signed-in-hero">
          <div className="signed-in-hero-panel">
            <img
              className="signed-in-hero-mark"
              src="/assets/logo-mark.svg"
              width="56"
              height="56"
              alt=""
              decoding="async"
            />
            <h1 className="signed-in-hero-title">CrowdCare</h1>
            <p className="signed-in-hero-lead">
              Crowdfunding on <strong>Solana</strong>. Tap below to start.
            </p>
            <div className="signed-in-hero-ctas">
              <Link to="/create" className="ft-create-cta">
                Create a campaign
              </Link>
              <Link
                to="/my-campaigns"
                className="ft-create-cta ft-create-cta--secondary"
              >
                My Campaigns
              </Link>
            </div>
            <p className="signed-in-hero-sub">
              <Link to="/profile">Profile</Link>
              <span className="signed-in-dot">·</span>
              <span id="signed-in-hub-hint" className="signed-in-hub-hint">
                Hub{" "}
                <Link className="mono-link mono-link--wrap" to={hubRel}>
                  {hubRel}
                </Link>
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-home" id="browse-home">
      <div className="signed-in-hero browse-hero">
        <div className="signed-in-hero-panel">
          <h1 className="signed-in-hero-title">CrowdCare</h1>
          <p className="signed-in-hero-lead">
            <strong>Sign in</strong> to create campaigns and get your hub link.
          </p>
          <Link
            to="/?signin=1"
            className="ft-create-cta ft-create-cta--secondary"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
