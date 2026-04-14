import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CampaignList } from "../components/CampaignList.jsx";
import { fetchAllCampaignsDirectoryFromApi } from "../lib/crowdcareApi.js";
import {
  getAllCampaigns,
  isCampaignPast,
  mergeDirectoryCampaigns,
} from "../lib/crowdcareApp.js";

export function DirectoryPastPage() {
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
    return merged.filter((c) => isCampaignPast(c));
  }, [remote]);

  const loading = camps === null;
  const empty = !loading && camps.length === 0;

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <h1 className="site-title">Past campaigns</h1>
      <p className="lead lead--compact">
        Reached goal (100% or raised ≥ target). Includes completed campaigns from
        CrowdCare and this browser.
      </p>
      <div className="content-shell ft-panel campaigns-dir-panel">
        <p id="dir-loading" className="note note--tight" hidden={!loading}>
          Loading campaigns…
        </p>
        <p id="dir-empty" className="note note--tight" hidden={!empty || loading}>
          No completed campaigns here yet.
        </p>
        {loading ? null : <CampaignList campaigns={camps} />}
      </div>
    </>
  );
}
