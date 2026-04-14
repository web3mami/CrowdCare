import { Link } from "react-router-dom";
import {
  formatCampaignAmt,
  formatCampaignCreatorLine,
  getCampaignFunding,
  hueFromCreatorSub,
} from "../lib/crowdcareApp.js";

/**
 * @param {object[]} campaigns
 * @param {boolean} [deletable] — show Delete (caller must own these campaigns)
 * @param {(campaign: object) => void} [onDelete]
 * @param {boolean} [showCreator] — directory-style creator header + hub link
 * @param {string|null} [viewerSub] — signed-in Google `sub` (for “Your campaign”)
 */
export function CampaignList({
  campaigns,
  deletable,
  onDelete,
  showCreator,
  viewerSub,
}) {
  const showDelete = !!(deletable && typeof onDelete === "function");
  const showCreatorMeta = !!showCreator;

  return (
    <ul className="campaign-list">
      {(campaigns || []).map((c) => {
        const fund = getCampaignFunding(c);
        const hue = hueFromCreatorSub(c.creatorSub);
        const creatorLine = showCreatorMeta
          ? formatCampaignCreatorLine(c)
          : null;
        const isYours =
          showCreatorMeta &&
          !!viewerSub &&
          !!c.creatorSub &&
          c.creatorSub === viewerSub;

        return (
          <li key={c.id} className="campaign-list__item">
            <div className="campaign-list__card-column">
              {showCreatorMeta && creatorLine ? (
                <div
                  className="campaign-list__creator-head"
                  style={{
                    borderLeftColor: `hsl(${hue} 46% 52%)`,
                  }}
                >
                  <div className="campaign-list__creator-head-inner">
                    {isYours ? (
                      <span className="campaign-list__yours-badge">
                        Your campaign
                      </span>
                    ) : null}
                    <span className="campaign-list__creator-title">
                      {creatorLine.displayName}
                    </span>
                    {creatorLine.hubSlug ? (
                      <>
                        <span className="campaign-list__creator-sep" aria-hidden>
                          ·
                        </span>
                        <Link
                          className="campaign-list__hub-link"
                          to={`/app?hub=${encodeURIComponent(creatorLine.hubSlug)}`}
                        >
                          Hub · {creatorLine.hubSlug}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
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
            </div>
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
