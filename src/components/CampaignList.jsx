import { Link } from "react-router-dom";
import {
  formatCampaignAmt,
  getCampaignFunding,
} from "../lib/crowdcareApp.js";

export function CampaignList({ campaigns }) {
  return (
    <ul className="campaign-list">
      {(campaigns || []).map((c) => {
        const fund = getCampaignFunding(c);
        return (
          <li key={c.id}>
            <Link to={`/campaign/${encodeURIComponent(c.id)}`}>
              <p className="card-title">{c.title}</p>
              {fund.pct != null && fund.goal ? (
                <div className="campaign-card-funding">
                  <div className="campaign-card-funding-row">
                    <span className="campaign-card-pct">
                      {fund.pct}% funded
                    </span>
                    <span className="campaign-card-amt">
                      {formatCampaignAmt(fund.raised, fund.currency || "")} /{" "}
                      {formatCampaignAmt(fund.goal, fund.currency || "")}
                    </span>
                  </div>
                  <div
                    className="ft-progress-track ft-progress-track--compact"
                    role="presentation"
                  >
                    <div
                      className="ft-progress-fill"
                      style={{ width: `${fund.pct}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <p className="meta">Goal: {c.goalLabel}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
