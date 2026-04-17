import { useLayoutEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { useSession } from "../context/SessionContext.jsx";
import {
  formatCampaignSyncError,
  hasFreshGoogleIdTokenForSync,
  setGoogleIdToken,
  syncCampaignToApi,
} from "../lib/crowdcareApi.js";
import { requestGoogleCredentialOneTap } from "../lib/googleGis.js";
import {
  addExtraCampaign,
  findCampaignById,
  getCreatorPublicMetaFromLatestCampaign,
  idTaken,
} from "../lib/crowdcareApp.js";
import { getUser } from "../lib/session.js";
import {
  isValidXUsername,
  normalizeXUsernameInput,
} from "../lib/xUsername.js";

const googleWebClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function parseStory(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugifyTitle(title) {
  let s = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > 36) s = s.slice(0, 36).replace(/-+$/g, "");
  return s || "campaign";
}

function randomSlugSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function makeUniqueCampaignId(title) {
  const base = slugifyTitle(title);
  let slug = base;
  let n = 0;
  while (idTaken(slug) && n < 40) {
    slug = base + "-" + randomSlugSuffix();
    n++;
  }
  if (idTaken(slug)) {
    slug = "campaign-" + Date.now().toString(36) + "-" + randomSlugSuffix();
  }
  return slug;
}

function isValidSolanaAddress(s) {
  try {
    new PublicKey(s.trim());
    return true;
  } catch {
    return false;
  }
}

export function CreatePage() {
  const { user, ensureShareSlug } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  /** Set when local save succeeded but POST /api/campaigns failed — use Retry before creating another. */
  const [pendingSyncSlug, setPendingSyncSlug] = useState(null);

  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [goalAmt, setGoalAmt] = useState("");
  const [story, setStory] = useState("");
  const [raisedRaw, setRaisedRaw] = useState("");
  const [transBen, setTransBen] = useState("97");
  const [transOth, setTransOth] = useState("3");
  const [transOtherLabel, setTransOtherLabel] = useState(
    "Est. network fees & conversion"
  );
  const [transNote, setTransNote] = useState("");
  const [wallet, setWallet] = useState("");

  useLayoutEffect(() => {
    if (user?.publicKey) {
      ensureShareSlug();
      setWallet(user.publicKey);
    }
  }, [user?.publicKey, ensureShareSlug]);

  if (!user || !user.publicKey) {
    return <Navigate to="/?signin=1" replace />;
  }

  const reusePub =
    user?.sub != null ? getCreatorPublicMetaFromLatestCampaign(user.sub) : null;
  const publicDisplayName =
    user.username != null ? String(user.username).trim() : "";
  const publicX = normalizeXUsernameInput(user.xUsername);
  const effectiveDisplayName = (publicDisplayName || reusePub?.displayName || "")
    .trim()
    .slice(0, 80);
  const effectiveX = normalizeXUsernameInput(
    isValidXUsername(publicX) ? publicX : reusePub?.xUsername ?? ""
  );
  if (!effectiveDisplayName || !isValidXUsername(effectiveX)) {
    return (
      <>
        <p className="back">
          <Link to="/app">← Home</Link>
        </p>
        <div className="page-intro">
          <p className="ft-kicker">Create</p>
          <h1 className="site-title">Create a campaign</h1>
        </div>
        <p className="note note--tight banner-warn">
          Add your <strong>public display name</strong> and{" "}
          <strong>X (Twitter) username</strong> on Profile once (or finish your
          first campaign with them). Later campaigns reuse the same identity
          automatically.
        </p>
        <p className="lead lead--compact">
          <Link className="gate-start-btn" to="/profile">
            Open Profile
          </Link>
        </p>
      </>
    );
  }

  /** Proactively refresh GIS token, then POST; on 401 retry One Tap once. */
  async function syncCampaignAfterSave(saved) {
    if (!hasFreshGoogleIdTokenForSync() && googleWebClientId) {
      const cred = await requestGoogleCredentialOneTap(googleWebClientId);
      if (cred) setGoogleIdToken(cred);
    }
    let sync = await syncCampaignToApi(saved);
    if (
      !sync.ok &&
      googleWebClientId &&
      (sync.status === 401 ||
        sync.error === "no_id_token" ||
        sync.error === "id_token_expired")
    ) {
      const cred = await requestGoogleCredentialOneTap(googleWebClientId);
      if (cred) {
        setGoogleIdToken(cred);
        sync = await syncCampaignToApi(saved);
      }
    }
    return sync;
  }

  async function retryPendingSync() {
    if (!pendingSyncSlug) return;
    setError("");
    const saved = findCampaignById(pendingSyncSlug);
    if (!saved) {
      setError("Campaign not found in this browser. You can create a new one.");
      setPendingSyncSlug(null);
      return;
    }
    const sync = await syncCampaignAfterSave(saved);
    if (!sync.ok) {
      setError(formatCampaignSyncError(sync));
      return;
    }
    setPendingSyncSlug(null);
    navigate(`/campaign/${encodeURIComponent(pendingSyncSlug)}`);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const slug = makeUniqueCampaignId(title.trim());
    const goal = parseFloat(goalAmt, 10);
    const raised =
      raisedRaw.trim() === "" ? 0 : parseFloat(raisedRaw, 10);
    const b = parseFloat(transBen, 10);
    const o = parseFloat(transOth, 10);
    const body = parseStory(story);

    if (!body.length) {
      setError("Describe what the money will be used for.");
      return;
    }
    if (!(goal > 0) || Number.isNaN(goal)) {
      setError("Enter a valid funding target amount.");
      return;
    }
    if (Number.isNaN(raised) || raised < 0) {
      setError("Raised amount must be zero or a positive number.");
      return;
    }
    if (raised > goal * 1.0001) {
      setError("Raised amount cannot exceed the funding target.");
      return;
    }
    if (Number.isNaN(b) || Number.isNaN(o)) {
      setError("Enter valid percentages for transparency.");
      return;
    }
    if (Math.abs(b + o - 100) > 0.001) {
      setError("Transparency percentages must add up to 100.");
      return;
    }
    if (!isValidSolanaAddress(wallet)) {
      setError(
        "That doesn’t look like a valid Solana address (public key)."
      );
      return;
    }

    ensureShareSlug();
    const fresh = getUser();
    const hubSlug = fresh?.shareSlug;
    if (!hubSlug) {
      setError("Could not resolve your hub link. Open Profile, then try again.");
      return;
    }

    const goalLabel =
      goal.toLocaleString("en-US", { maximumFractionDigits: 2 }) +
      " " +
      currency +
      " on Solana";

    const fromCampaign = getCreatorPublicMetaFromLatestCampaign(user.sub);
    let creatorDisplayName = String(fresh?.username ?? "")
      .trim()
      .slice(0, 80);
    if (!creatorDisplayName && fromCampaign?.displayName) {
      creatorDisplayName = fromCampaign.displayName.slice(0, 80);
    }
    let creatorXUsername = normalizeXUsernameInput(fresh?.xUsername);
    if (!isValidXUsername(creatorXUsername) && fromCampaign?.xUsername) {
      creatorXUsername = normalizeXUsernameInput(fromCampaign.xUsername);
    }
    if (!creatorDisplayName) {
      setError("Set a display name on Profile before creating a campaign.");
      return;
    }
    if (!isValidXUsername(creatorXUsername)) {
      setError("Set a valid X username on Profile before creating a campaign.");
      return;
    }

    const ok = addExtraCampaign({
      id: slug,
      title: title.trim(),
      goalLabel,
      goalAmount: goal,
      raisedAmount: raised,
      goalCurrency: currency,
      transparencyBeneficiaryPct: b,
      transparencyOtherPct: o,
      transparencyOtherLabel: transOtherLabel.trim() || "Est. network fees & conversion",
      transparencyNote: transNote.trim() || "",
      wallet: wallet.trim(),
      body,
      creatorSub: user.sub,
      creatorShareSlug: hubSlug,
      creatorDisplayName,
      creatorXUsername,
    });

    if (!ok) {
      setError("Could not save. Try again.");
      return;
    }

    const saved = findCampaignById(slug);
    if (saved) {
      const sync = await syncCampaignAfterSave(saved);
      if (!sync.ok) {
        console.warn("[CrowdCare] Server sync failed:", sync.error, sync.status);
        setPendingSyncSlug(slug);
        setError(formatCampaignSyncError(sync));
        return;
      }
    }
    setPendingSyncSlug(null);
    navigate(`/campaign/${encodeURIComponent(slug)}`);
  }

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>
      <div className="page-intro">
        <p className="ft-kicker">Create</p>
        <h1 className="site-title">Create a campaign</h1>
        <p className="lead lead--compact">
          Public page: story, goal, wallet. Pick <strong>USDC</strong> or{" "}
          <strong>SOL</strong>. We create the campaign URL when you save.
        </p>
      </div>
      <p id="form-error" className="form-error" hidden={!error}>
        {error}
      </p>
      {pendingSyncSlug ? (
        <p className="form-field">
          <button
            type="button"
            className="ft-submit-campaign"
            onClick={() => void retryPendingSync()}
          >
            Retry online sync
          </button>
        </p>
      ) : null}
      <form
        id="campaign-form"
        className="create-campaign-form content-shell"
        noValidate
        onSubmit={onSubmit}
      >
        <div className="form-field">
          <label htmlFor="title">Campaign title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="Short headline people see when you share the link"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <fieldset className="form-fieldset token-choice-fieldset">
          <legend className="form-legend">Receive donations in</legend>
          <p className="form-hint form-hint--fieldset">
            Asset donors send on Solana.
          </p>
          <div className="token-choice-grid">
            <label className="token-option">
              <input
                type="radio"
                name="goal-currency"
                value="USDC"
                checked={currency === "USDC"}
                onChange={() => setCurrency("USDC")}
              />
              <span className="token-option-body">
                <span className="token-option-name">USDC</span>
                <span className="token-option-desc">Stable USD token</span>
              </span>
            </label>
            <label className="token-option">
              <input
                type="radio"
                name="goal-currency"
                value="SOL"
                checked={currency === "SOL"}
                onChange={() => setCurrency("SOL")}
              />
              <span className="token-option-body">
                <span className="token-option-name">SOL</span>
                <span className="token-option-desc">Native SOL (volatile)</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className="form-field">
          <label htmlFor="goal-amount">Funding target (amount)</label>
          <input
            id="goal-amount"
            name="goal-amount"
            type="number"
            required
            min={1}
            step="any"
            placeholder="e.g. 3000"
            autoComplete="off"
            value={goalAmt}
            onChange={(e) => setGoalAmt(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="story">What will the money be used for?</label>
          <textarea
            id="story"
            name="story"
            required
            placeholder="What donors are funding. One paragraph per line."
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
          <p className="form-hint">Each line = a paragraph on the public page.</p>
        </div>

        <div className="form-field">
          <label htmlFor="raised-amount">Raised so far (optional)</label>
          <input
            id="raised-amount"
            name="raised-amount"
            type="number"
            min={0}
            step="any"
            placeholder="0 (manual until on-chain sync)"
            autoComplete="off"
            value={raisedRaw}
            onChange={(e) => setRaisedRaw(e.target.value)}
          />
        </div>

        <fieldset className="form-fieldset">
          <legend className="form-legend">Transparency (%)</legend>
          <p className="form-hint form-hint--fieldset">
            Shown on your page: how you intend to split “cause” vs “other”
            (fees, etc.). Not enforced on-chain here—one wallet still receives
            everything. Must total <strong>100%</strong>.
          </p>
          <div className="form-field form-field-row">
            <div>
              <label htmlFor="trans-ben">Primary (cause / this wallet)</label>
              <input
                id="trans-ben"
                name="trans-ben"
                type="number"
                min={0}
                max={100}
                value={transBen}
                onChange={(e) => setTransBen(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="trans-oth">Other (see label)</label>
              <input
                id="trans-oth"
                name="trans-oth"
                type="number"
                min={0}
                max={100}
                value={transOth}
                onChange={(e) => setTransOth(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="trans-other-label">“Other” label</label>
            <input
              id="trans-other-label"
              name="trans-other-label"
              type="text"
              maxLength={120}
              value={transOtherLabel}
              onChange={(e) => setTransOtherLabel(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="trans-note">Note (optional)</label>
            <textarea
              id="trans-note"
              name="trans-note"
              maxLength={800}
              placeholder="Optional context for donors."
              value={transNote}
              onChange={(e) => setTransNote(e.target.value)}
            />
          </div>
        </fieldset>

        <div className="form-field">
          <label htmlFor="wallet">Solana wallet address (receives funds)</label>
          <input
            id="wallet"
            name="wallet"
            type="text"
            required
            autoComplete="off"
            placeholder="Base58 public key"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />
          <p className="form-hint">Must be a valid Solana address.</p>
        </div>

        <button
          type="submit"
          className="ft-submit-campaign"
          disabled={!!pendingSyncSlug}
          title={
            pendingSyncSlug
              ? "Finish online sync with the button above first"
              : undefined
          }
        >
          Save and open campaign page
        </button>
      </form>
    </>
  );
}
