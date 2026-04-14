import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCampaignByIdFromApi } from "../lib/crowdcareApi.js";
import {
  findCampaignById,
  formatCampaignAmt,
  getCampaignFunding,
} from "../lib/crowdcareApp.js";

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

  const c =
    local || (remote && typeof remote === "object" ? remote : null);
  const loading = !local && remote === undefined;

  useEffect(() => {
    if (c?.title) {
      document.title = c.title + " — CrowdCare";
    }
    return () => {
      document.title = "CrowdCare";
    };
  }, [c?.title]);

  const [copyLabel, setCopyLabel] = useState("Copy address");

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

  const funding = getCampaignFunding(c);
  const showProgress = funding.pct != null && funding.goal;
  const cur =
    funding.currency ||
    (c.goalLabel.toUpperCase().indexOf("SOL") >= 0 ? "SOL" : "USDC");

  const ben = c.transparencyBeneficiaryPct;
  const oth = c.transparencyOtherPct;
  const showTrans =
    typeof ben === "number" && typeof oth === "number";

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
        {c.creatorDisplayName || c.creatorXUsername ? (
          <div className="campaign-creator-bar" id="campaign-creator-meta">
            {c.creatorDisplayName ? (
              <p className="campaign-creator-line">
                <span className="campaign-creator-label">Organizer</span>{" "}
                <span className="campaign-creator-name">{c.creatorDisplayName}</span>
              </p>
            ) : null}
            {c.creatorXUsername ? (
              <p className="campaign-creator-line campaign-creator-line--x">
                <a
                  className="campaign-x-link campaign-x-link--row"
                  href={`https://x.com/${encodeURIComponent(
                    String(c.creatorXUsername).replace(/^@/, "")
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="campaign-x-brand" aria-hidden="true">
                    <XLogoMark className="campaign-x-icon" />
                  </span>
                  <span className="campaign-x-handle">
                    @
                    {String(c.creatorXUsername).replace(/^@/, "")}
                  </span>
                  <span className="visually-hidden">
                    (opens profile on X)
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
            style={{
              width: showProgress ? `${funding.pct}%` : "0%",
            }}
          />
        </div>
        <p className="ft-progress-caption">
          <span id="progress-pct">{showProgress ? funding.pct : 0}</span>% of
          goal — verify real totals on-chain.
        </p>
      </section>

      <section
        id="campaign-transparency"
        className="content-shell ft-panel ft-transparency-panel"
        hidden={!showTrans}
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
              style={{ width: showTrans ? `${ben}%` : "0%" }}
            />
            <div
              id="trans-bar-other"
              className="ft-allocation-seg ft-allocation-seg--other"
              style={{ width: showTrans ? `${oth}%` : "0%" }}
            />
          </div>
        </div>
        <ul className="ft-allocation-list">
          <li>
            <span className="ft-allocation-pct" id="trans-pct-primary">
              {showTrans ? ben : "—"}
            </span>
            <span className="ft-allocation-desc">
              Share meant for the stated cause (paid to the campaign wallet on
              Solana)
            </span>
          </li>
          <li>
            <span className="ft-allocation-pct" id="trans-pct-other">
              {showTrans ? oth : "—"}
            </span>
            <span className="ft-allocation-desc" id="trans-label-other">
              {showTrans
                ? c.transparencyOtherLabel || "Other (fees & reserves)"
                : "—"}
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

      <article className="content-shell ft-send-panel">
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
    </>
  );
}
