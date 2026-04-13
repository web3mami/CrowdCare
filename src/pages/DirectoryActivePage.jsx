import { Link } from "react-router-dom";
import { CampaignList } from "../components/CampaignList.jsx";
import { getActiveCampaignsDirectory } from "../lib/crowdcareApp.js";

export function DirectoryActivePage() {
  const camps = getActiveCampaignsDirectory();

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <h1 className="site-title">Active campaigns</h1>
      <p className="lead lead--compact">
        Still raising (under 100% of goal in this demo). Everyone listed here
        has a campaign stored in this browser.
      </p>
      <div className="content-shell ft-panel campaigns-dir-panel">
        <p id="dir-empty" className="note note--tight" hidden={camps.length > 0}>
          No active campaigns here yet.
        </p>
        <CampaignList campaigns={camps} />
      </div>
    </>
  );
}
