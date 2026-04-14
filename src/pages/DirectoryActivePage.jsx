import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CampaignList } from "../components/CampaignList.jsx";
import { fetchAllCampaignsDirectoryFromApi } from "../lib/crowdcareApi.js";
import {
  getAllCampaigns,
  isCampaignPast,
  mergeDirectoryCampaigns,
} from "../lib/crowdcareApp.js";

export function DirectoryActivePage() {
  const [remote, setRemote] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchAllCampaignsDirectoryFromApi()
      .then((list) => {
        if (!cancelled) setRemote(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const camps = useMemo(() => {
    if (remote === undefined) return null;
    const merged = mergeDirectoryCampaigns(remote, getAllCampaigns());
    return merged.filter((c) => !isCampaignPast(c));
  }, [remote]);

  const loading = camps === null;
  const empty = !loading && camps.length === 0;

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <h1 className="site-title">Active campaigns</h1>
      <p className="lead lead--compact">
        Still raising (under 100% of goal). Includes campaigns synced to CrowdCare
        by any creator, plus any only stored in this browser.
      </p>
      <div className="content-shell ft-panel campaigns-dir-panel">
        <p id="dir-loading" className="note note--tight" hidden={!loading}>
          Loading campaigns…
        </p>
        <p id="dir-empty" className="note note--tight" hidden={!empty || loading}>
          No active campaigns here yet. Creators must save a campaign while online
          for it to appear for everyone.
        </p>
        {loading ? null : <CampaignList campaigns={camps} />}
      </div>
    </>
  );
}
