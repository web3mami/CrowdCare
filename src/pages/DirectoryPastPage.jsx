import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { fetchCampaignsDirectoryFromApi } from "../lib/crowdcareApi.js";
import {
  getAllCampaigns,
  isCampaignPast,
  mergeDirectoryCampaigns,
} from "../lib/crowdcareApp.js";

export function DirectoryPastPage() {
  const { user } = useSession();
  const [remote, setRemote] = useState(undefined);
  const [databaseConfigured, setDatabaseConfigured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCampaignsDirectoryFromApi()
      .then(({ campaigns, databaseConfigured: dbOk }) => {
        if (!cancelled) {
          setRemote(Array.isArray(campaigns) ? campaigns : []);
          setDatabaseConfigured(dbOk !== false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemote([]);
          setDatabaseConfigured(true);
        }
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
        {!loading && !databaseConfigured ? (
          <p className="note note--tight banner-warn">
            The live server is not connected to a database, so only campaigns stored
            in this browser appear here. The site owner must set{" "}
            <code>DATABASE_URL</code> on the host.
          </p>
        ) : null}
        <p id="dir-loading" className="note note--tight" hidden={!loading}>
          Loading campaigns…
        </p>
        <p id="dir-empty" className="note note--tight" hidden={!empty || loading}>
          No completed campaigns here yet.
        </p>
        {loading ? null : (
          <CampaignList
            campaigns={camps}
            showCreator
            viewerSub={user?.sub ?? null}
          />
        )}
      </div>
    </>
  );
}
