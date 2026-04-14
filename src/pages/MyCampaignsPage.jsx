import { useCallback, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { deleteCampaignFromApi } from "../lib/crowdcareApi.js";
import {
  deleteExtraCampaignById,
  getCampaignsByCreatorSub,
} from "../lib/crowdcareApp.js";

export function MyCampaignsPage() {
  const { user } = useSession();
  const [campaignListTick, setCampaignListTick] = useState(0);

  const mine = useMemo(
    () => (user?.sub ? getCampaignsByCreatorSub(user.sub) : []),
    [user?.sub, campaignListTick]
  );

  const handleDeleteCampaign = useCallback(
    (c) => {
      if (!user?.sub || c.creatorSub !== user.sub) return;
      if (
        !window.confirm(
          `Delete “${c.title}”? It will be removed here and from your online hub (when signed in).`
        )
      ) {
        return;
      }
      deleteExtraCampaignById(c.id);
      setCampaignListTick((t) => t + 1);
      void deleteCampaignFromApi(c.id).then((r) => {
        if (!r.ok) console.warn("[CrowdCare] Server delete:", r.error);
      });
    },
    [user?.sub]
  );

  if (!user || !user.publicKey) {
    return <Navigate to="/?signin=1" replace />;
  }

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <h1 className="site-title">My campaigns</h1>
      <p className="lead lead--compact">
        Campaigns you created — stored here and synced online when you save.
      </p>
      <p
        id="my-campaigns-empty"
        className="note note--tight"
        hidden={mine.length > 0}
      >
        None yet. <Link to="/create">Create a campaign</Link>.
      </p>
      <CampaignList
        campaigns={mine}
        deletable
        onDelete={handleDeleteCampaign}
      />
    </>
  );
}
