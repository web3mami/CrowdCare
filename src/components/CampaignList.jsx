import { Link } from "react-router-dom";
import {
  formatCampaignAmt,
  getCampaignFunding,
} from "../lib/crowdcareApp.js";

/**
 * @param {object[]} campaigns
 * @param {boolean} [deletable] — show Delete (caller must own these campaigns)
 * @param {(campaign: object) => void} [onDelete]
 */
export function CampaignList({ campaigns, deletable, onDelete }) {
  const showDelete = !!(deletable && typeof onDelete === "function");

  return (
    <ul className="campaign-list">
      {(campaigns || []).map((c) => {
        const fund = getCampaignFunding(c);
        return (
          <li key={c.id} className="campaign-list__item">
            <Link
              className="campaign-list__link"
              to={`/campaign/${encodeURIComponent(c.id)}`}
            >
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
            {showDelete ? (
              <button
                type="button"
                className="secondary-btn campaign-list__delete"
                aria-label={`Delete campaign ${c.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(c);
                }}
              >
                Delete
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
