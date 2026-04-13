import { Link, Navigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { getCampaignsByCreatorSub } from "../lib/crowdcareApp.js";

export function MyCampaignsPage() {
  const { user } = useSession();

  if (!user || !user.publicKey) {
    return <Navigate to="/?signin=1" replace />;
  }

  const mine = getCampaignsByCreatorSub(user.sub);

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <h1 className="site-title">My campaigns</h1>
      <p className="lead lead--compact">
        Campaigns you created in <strong>this browser</strong>.
      </p>
      <p
        id="my-campaigns-empty"
        className="note note--tight"
        hidden={mine.length > 0}
      >
        None yet. <Link to="/create">Create a campaign</Link>.
      </p>
      <CampaignList campaigns={mine} />
    </>
  );
}
