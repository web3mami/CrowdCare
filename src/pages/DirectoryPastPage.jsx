import { Link } from "react-router-dom";
import { CampaignList } from "../components/CampaignList.jsx";
import { getPastCampaignsDirectory } from "../lib/crowdcareApp.js";

export function DirectoryPastPage() {
  const camps = getPastCampaignsDirectory();

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <h1 className="site-title">Past campaigns</h1>
      <p className="lead lead--compact">
        Reached goal (100% or raised ≥ target in this demo). Historical view
        for campaigns saved in this browser.
      </p>
      <div className="content-shell ft-panel campaigns-dir-panel">
        <p id="dir-empty" className="note note--tight" hidden={camps.length > 0}>
          No completed campaigns here yet.
        </p>
        <CampaignList campaigns={camps} />
      </div>
    </>
  );
}
