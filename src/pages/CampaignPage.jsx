import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMergedUsdcFunding } from "../hooks/useMergedUsdcFunding.js";
import {
  fetchCampaignActivityFromApi,
  fetchCampaignByIdFromApi,
} from "../lib/crowdcareApi.js";
import { transactionExplorerUrl } from "../lib/solanaWallet.js";
import {
  campaignTransparencySplit,
  findCampaignById,
  formatCampaignAmt,
  normalizeCampaignForDisplay,
} from "../lib/crowdcareApp.js";
import { xProfileUrlFromHandle } from "../lib/xUsername.js";

/** X (Twitter) logomark for creator line — path aligned with common brand SVG. */
function XLogoMark({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
      />
    </svg>
  );
}

export function CampaignPage() {
  const { id } = useParams();
  const decoded = id ? decodeURIComponent(id) : "";
  const local = decoded ? findCampaignById(decoded) : null;

  const [remote, setRemote] = useState(() => {
    if (!decoded) return null;
    return findCampaignById(decoded) ? null : undefined;
  });

  useEffect(() => {
    if (!decoded) {
      setRemote(null);
      return;
    }
    if (findCampaignById(decoded)) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setRemote(undefined);
    fetchCampaignByIdFromApi(decoded)
      .then((c) => {
        if (!cancelled) setRemote(c || false);
      })
      .catch(() => {
        if (!cancelled) setRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decoded]);

  const cRaw =
    local || (remote && typeof remote === "object" ? remote : null);
  const c = cRaw ? normalizeCampaignForDisplay(cRaw) : null;
  const loading = !local && remote === undefined;

  const { funding, goalToken: cur } = useMergedUsdcFunding(c);

  useEffect(() => {
    if (c?.title) {
      document.title = c.title + " — CrowdCare";
    }
    return () => {
      document.title = "CrowdCare";
    };
  }, [c?.title]);

  const [copyLabel, setCopyLabel] = useState("Copy address");
  /** USDC activity panel: hidden when not USDC; otherwise loading → done with rows / messages. */
  const [activityPanel, setActivityPanel] = useState(() => ({
    phase: /** @type {"hidden"|"loading"|"done"} */ ("loading"),
    rows: /** @type {{ signature: string, amountUi: string, blockTime: string|null, fromAddress: string|null }[]} */ (
      []
    ),
    databaseConfigured: false,
    loadError: false,
  }));

  useEffect(() => {
    if (!c?.id || cur !== "USDC") {
      setActivityPanel({
        phase: "hidden",
        rows: [],
        databaseConfigured: false,
        loadError: false,
      });
      return;
    }
    let cancelled = false;
    setActivityPanel((p) => ({
      ...p,
      phase: "loading",
      loadError: false,
    }));
    fetchCampaignActivityFromApi(String(c.id), 30)
      .then(({ activity, databaseConfigured }) => {
        if (!cancelled) {
          setActivityPanel({
            phase: "done",
            rows: activity,
            databaseConfigured,
            loadError: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityPanel({
            phase: "done",
            rows: [],
            databaseConfigured: false,
            loadError: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [c?.id, cur]);

  if (loading) {
    return (
      <>
        <p className="back">
          <Link to="/app">← Home</Link>
        </p>
        <p className="lead">Loading campaign…</p>
      </>
    );
  }

  if (!c) {
    return (
      <>
        <p className="back">
          <Link to="/app">← Home</Link>
        </p>
        <p>Campaign not found.</p>
      </>
    );
  }

  const showProgress = funding && funding.pct != null && funding.goal;

  const { ben, oth } = campaignTransparencySplit(c);

  const xProfileUrl = c.creatorXUsername
    ? xProfileUrlFromHandle(c.creatorXUsername)
    : null;

  function copyWallet() {
    const text = c.wallet.trim();
    function done() {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy address"), 2000);
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        window.prompt("Copy this address:", text);
      });
    } else {
      window.prompt("Copy this address:", text);
    }
  }

  return (
    <>
      <p className="back">
        <Link to="/app">← All campaigns</Link>
      </p>

      <article id="campaign-article" className="content-shell ft-campaign-hero">
        <h1 id="campaign-title">{c.title}</h1>
        {c.creatorDisplayName || xProfileUrl ? (
          <div className="campaign-creator-bar" id="campaign-creator-meta">
            {c.creatorDisplayName ? (
              <p className="campaign-creator-line">
                <span className="campaign-creator-label">Organizer</span>{" "}
                <span className="campaign-creator-name">{c.creatorDisplayName}</span>
              </p>
            ) : null}
            {c.creatorXUsername && xProfileUrl ? (
              <p className="campaign-creator-line campaign-creator-line--x">
                <a
                  className="campaign-x-link campaign-x-link--row"
                  href={xProfileUrl}
                  aria-label={`View @${String(c.creatorXUsername).replace(
                    /^@/,
                    ""
                  )} on X`}
                >
                  <span className="campaign-x-brand" aria-hidden="true">
                    <XLogoMark className="campaign-x-icon" />
                  </span>
                  <span className="campaign-x-handle">
                    @
                    {String(c.creatorXUsername).replace(/^@/, "")}
                  </span>
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
        <div id="campaign-story">
          {c.body.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
        <p className="goal" id="campaign-goal">
          <strong>Goal:</strong> {c.goalLabel}
        </p>
      </article>

      <article className="content-shell ft-send-panel ft-send-panel--hero-adjacent">
        <p className="ft-kicker">Receive address</p>
        <p>
          <strong>Send on Solana to:</strong>
        </p>
        <div className="address-row">
          <p className="address" id="wallet-address">
            {c.wallet}
          </p>
          <button
            type="button"
            id="copy-btn"
            aria-label="Copy Solana address"
            onClick={copyWallet}
          >
            {copyLabel}
          </button>
        </div>
        <p className="note note--tight" id="campaign-note">
          Use Phantom/Solflare. Double-check token + network before sending.
        </p>
      </article>

      <section
        id="campaign-progress"
        className="content-shell ft-panel ft-progress-panel"
        hidden={!showProgress}
      >
        <div className="ft-panel-head">
          <span className="ft-kicker">Funding</span>
          <span className="ft-panel-title">Progress to goal</span>
        </div>
        <div className="ft-progress-stats">
          <span className="ft-stat">
            <span className="ft-stat-label">Raised</span>
            <span className="ft-stat-value" id="progress-raised">
              {showProgress ? formatCampaignAmt(funding.raised, cur) : "—"}
            </span>
          </span>
          <span className="ft-stat ft-stat--right">
            <span className="ft-stat-label">Target</span>
            <span
              className="ft-stat-value ft-stat-value--muted"
              id="progress-goal"
            >
              {showProgress ? formatCampaignAmt(funding.goal, cur) : "—"}
            </span>
          </span>
        </div>
        <div
          id="progress-track"
          className="ft-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={showProgress ? funding.pct : 0}
          aria-label="Percent of goal funded"
        >
          <div
            id="progress-fill"
            className="ft-progress-fill"
            data-has-progress={
              showProgress && funding.pct > 0 ? "true" : undefined
            }
            style={{
              width: showProgress ? `${funding.pct}%` : "0%",
            }}
          />
        </div>
        <p className="ft-progress-caption">
          <span id="progress-pct">{showProgress ? funding.pct : 0}</span>% of
          goal — for USDC, the bar uses the higher of saved progress and this
          wallet’s USDC balance (mainnet, standard deposit address). Confirm
          on a block explorer if needed.
        </p>
      </section>

      {cur === "USDC" ? (
        <p className="content-shell ft-progress-hint">
          <strong>Activity</strong> (indexed USDC deposits) lives in the next
          card — scroll down past Funding.
        </p>
      ) : null}

      {cur === "USDC" && c?.id ? (
        <section
          id="campaign-activity"
          className="content-shell ft-panel ft-activity-panel"
        >
          <div className="ft-panel-head">
            <span className="ft-kicker">Activity</span>
            <span className="ft-panel-title">Recent USDC inflows (indexed)</span>
          </div>
          <p className="ft-activity-lead">
            CrowdCare records transfers detected on mainnet for this campaign
            wallet. Rows appear after the scheduled sync runs (about every 15
            minutes on the host).
          </p>
          {activityPanel.phase === "loading" ||
          activityPanel.phase === "hidden" ? (
            <p className="ft-activity-empty">Loading activity…</p>
          ) : activityPanel.loadError ? (
            <p className="ft-activity-empty">
              Could not load activity. Try again in a moment.
            </p>
          ) : !activityPanel.databaseConfigured ? (
            <p className="ft-activity-empty">
              Activity is not available until the site has a database: set{" "}
              <strong>DATABASE_URL</strong> on the host (see project{" "}
              <code className="ft-mono-inline">DEPLOY.md</code>). Fundraising
              progress can still use on-chain balance; this list is separate.
            </p>
          ) : activityPanel.rows.length === 0 ? (
                       <p className="ft-activity-empty">
              No indexed deposits yet. After someone sends USDC, allow up to
              ~15 minutes for the sync job to add rows (or check the wallet on
              Solscan). If nothing ever appears, confirm{" "}
              <strong>CRON_SECRET</strong> is set on the host so{" "}
              <code className="ft-mono-inline">/api/campaigns?syncLedger=1</code> can
              run — see <code className="ft-mono-inline">DEPLOY.md</code>.
            </p>
          ) : (
            <ul className="ft-activity-list">
              {activityPanel.rows.map((row) => (
                <li key={row.signature} className="ft-activity-item">
                  <span className="ft-activity-amt">+{row.amountUi} USDC</span>
                  <a
                    className="ft-activity-tx"
                    href={transactionExplorerUrl(row.signature)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction
                  </a>
                  {row.blockTime ? (
                    <span className="ft-activity-time">
                      {new Date(row.blockTime).toLocaleString()}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section
        id="campaign-transparency"
        className="content-shell ft-panel ft-transparency-panel"
      >
        <div className="ft-panel-head">
          <span className="ft-kicker">Transparency</span>
          <span className="ft-panel-title">Where funds are intended to go</span>
        </div>
        <p className="ft-transparency-lead">
          Creator’s <strong>intended</strong> split (cause vs fees/other)—not
          enforced by this site. All sends go to the <strong>same address</strong>{" "}
          below. CrowdCare doesn’t custody funds here.
        </p>
        <div className="ft-allocation-visual" aria-hidden="true">
          <div className="ft-allocation-stack">
            <div
              id="trans-bar-primary"
              className="ft-allocation-seg ft-allocation-seg--primary"
              style={{ width: `${ben}%` }}
            />
            <div
              id="trans-bar-other"
              className="ft-allocation-seg ft-allocation-seg--other"
              style={{ width: `${oth}%` }}
            />
          </div>
        </div>
        <ul className="ft-allocation-list">
          <li>
                       <span className="ft-allocation-pct" id="trans-pct-primary">
              {ben}
            </span>
            <span className="ft-allocation-desc">
              Share meant for the stated cause (paid to the campaign wallet on
              Solana)
            </span>
          </li>
          <li>
            <span className="ft-allocation-pct" id="trans-pct-other">
              {oth}
            </span>
            <span className="ft-allocation-desc" id="trans-label-other">
              {c.transparencyOtherLabel || "Other (fees & reserves)"}
            </span>
          </li>
        </ul>
        <p
          id="transparency-note"
          className="ft-transparency-note"
          hidden={!c.transparencyNote?.trim()}
        >
          {c.transparencyNote?.trim()}
        </p>
      </section>
    </>
  );
}
