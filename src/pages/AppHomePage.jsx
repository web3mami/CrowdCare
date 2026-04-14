import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { fetchHubCampaignsFromApi } from "../lib/crowdcareApi.js";
import {
  getCampaignsByCreatorSub,
  getCampaignsByShareSlug,
  mergeHubLists,
} from "../lib/crowdcareApp.js";

const BROWSE_KEY = "crowdcare_browse_only";

function HubSlugView({ slug, user }) {
  const [remote, setRemote] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchHubCampaignsFromApi(slug)
      .then((list) => {
        if (!cancelled) setRemote(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const viewingOwnHub =
    !!user?.sub &&
    typeof user.shareSlug === "string" &&
    user.shareSlug === slug;
  const local = viewingOwnHub
    ? getCampaignsByCreatorSub(user.sub)
    : getCampaignsByShareSlug(slug);

  const hubCampaigns = useMemo(() => {
    if (remote === undefined) return null;
    return mergeHubLists(remote, local, { viewingOwnHub });
  }, [remote, local, viewingOwnHub]);

  const loading = hubCampaigns === null;
  const empty = !loading && hubCampaigns.length === 0;

  return (
    <div id="hub-view" className="hub-view">
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <div className="content-shell ft-panel hub-panel">
        <p className="ft-kicker">Creator hub</p>
        <h1 className="site-title hub-title">
          {loading
            ? "Loading hub…"
            : empty
              ? "This hub is empty"
              : "Campaigns on this hub"}
        </h1>
        <p className="lead hub-lead">
          Published campaigns load from CrowdCare for everyone. This browser also
          keeps a copy when you&apos;re the creator.
        </p>
        {loading ? null : <CampaignList campaigns={hubCampaigns} />}
        <p id="hub-empty" className="note note--tight" hidden={!empty || loading}>
          {viewingOwnHub ? (
            <>
              Nothing synced yet. Create a campaign (you must be online once so
              it can save), or{" "}
              <Link to="/?signin=1">sign in again</Link> if saves keep failing.
            </>
          ) : (
            <>
              No public campaigns for this hub yet, or the creator hasn&apos;t
              synced from the app. Ask them to open CrowdCare and create or
              re-save after signing in.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

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
    return <HubSlugView slug={hubSlug.trim()} user={user} />;
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
