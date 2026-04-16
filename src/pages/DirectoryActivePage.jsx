import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { fetchCampaignsDirectoryFromApi } from "../lib/crowdcareApi.js";
import { useUsdcByWalletMap } from "../hooks/useUsdcByWalletMap.js";
import {
  directoryNeedsClientUsdcFetch,
  getAllCampaigns,
  getOnChainUsdcUiForCampaign,
  isCampaignPastWithOnchain,
  mergeDirectoryCampaigns,
} from "../lib/crowdcareApp.js";

export function DirectoryActivePage() {
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

  const mergedFull = useMemo(() => {
    if (remote === undefined) return null;
    return mergeDirectoryCampaigns(remote, getAllCampaigns());
  }, [remote]);

  const { usdcByWallet, loadingUsdc } = useUsdcByWalletMap(mergedFull || []);
  const waitForChain =
    !!mergedFull &&
    directoryNeedsClientUsdcFetch(mergedFull) &&
    loadingUsdc;

  const camps = useMemo(() => {
    if (mergedFull === null) return null;
    if (waitForChain) return null;
    return mergedFull.filter(
      (c) =>
        !isCampaignPastWithOnchain(
          c,
          getOnChainUsdcUiForCampaign(c, usdcByWallet)
        )
    );
  }, [mergedFull, usdcByWallet, waitForChain]);

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
          No active campaigns here yet. Creators must save a campaign while online
          for it to appear for everyone.
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
