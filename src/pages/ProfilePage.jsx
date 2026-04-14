import { useEffect, useLayoutEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useExportWallet } from "@privy-io/react-auth/solana";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { getCampaignsByCreatorSub } from "../lib/crowdcareApp.js";
import { demoSecretKeyBase58 } from "../lib/keypair.js";

/**
 * Privy’s useExportWallet must run only when the user is signed in with a
 * publicKey; calling it on the logged-out redirect path can break the page.
 */
export function ProfilePage() {
  const { user, ensureShareSlug, updateProfile } = useSession();

  if (!user || !user.publicKey) {
    return <Navigate to="/?signin=1&next=%2Fprofile" replace />;
  }

  return (
    <ProfileAuthed
      user={user}
      ensureShareSlug={ensureShareSlug}
      updateProfile={updateProfile}
    />
  );
}

function ProfileAuthed({ user, ensureShareSlug, updateProfile }) {
  const { exportWallet } = useExportWallet();
  const isPrivy = user?.authProvider === "privy";

  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [placeholderHidden, setPlaceholderHidden] = useState(false);
  const [pendingAvatarDataUrl, setPendingAvatarDataUrl] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const [exportAck, setExportAck] = useState(false);
  const [exportSecret, setExportSecret] = useState("");
  const [exportShown, setExportShown] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [copyKeyLabel, setCopyKeyLabel] = useState("Copy key");
  const [privyExportBusy, setPrivyExportBusy] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("crowdcare_next");
  }, []);

  useLayoutEffect(() => {
    if (user?.publicKey) {
      ensureShareSlug();
    }
  }, [user, ensureShareSlug]);

  useEffect(() => {
    if (user?.username != null) {
      setUsername(String(user.username).trim());
    }
    if (user?.avatarDataUrl) {
      setPreviewUrl(user.avatarDataUrl);
      setPlaceholderHidden(true);
    } else {
      setPreviewUrl(null);
      setPlaceholderHidden(false);
    }
    setPendingAvatarDataUrl(null);
    setAvatarRemoved(false);
  }, [user?.sub, user?.avatarDataUrl, user?.username]);

  const slug = user.shareSlug || "";
  const hubRel = slug ? `/app?hub=${encodeURIComponent(slug)}` : "/app";
  let hubUrl = hubRel;
  try {
    hubUrl = new URL(hubRel, window.location.href).href;
  } catch {
    /* keep relative */
  }

  const mine = getCampaignsByCreatorSub(user.sub);

  function copyHub() {
    function done() {
      const b = document.getElementById("profile-copy-hub");
      if (!b) return;
      const prev = b.textContent;
      b.textContent = "Copied";
      setTimeout(() => {
        b.textContent = prev;
      }, 2000);
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(hubUrl).then(done).catch(() => {
        window.prompt("Copy this link:", hubUrl);
      });
    } else {
      window.prompt("Copy this link:", hubUrl);
    }
  }

  function onAvatarChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 750 * 1024) {
      setError("Image is too large. Try one under about 750 KB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      if (typeof data !== "string" || data.length > 900000) {
        setError(
          "That image is too large after loading. Try a smaller file."
        );
        return;
      }
      setPendingAvatarDataUrl(data);
      setAvatarRemoved(false);
      setPreviewUrl(data);
      setPlaceholderHidden(true);
      setError("");
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(f);
  }

  function removeAvatar() {
    setPendingAvatarDataUrl(null);
    setAvatarRemoved(true);
    setPreviewUrl(null);
    setPlaceholderHidden(false);
    setError("");
  }

  function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const name = username.trim().slice(0, 40);
    const updates = { username: name };
    if (avatarRemoved) {
      updates.avatarDataUrl = "";
    } else if (pendingAvatarDataUrl) {
      updates.avatarDataUrl = pendingAvatarDataUrl;
    }
    updateProfile(updates);
    setSaved(true);
    setPendingAvatarDataUrl(null);
    setAvatarRemoved(false);
  }

  async function revealLegacyDemoKey() {
    setExportError("");
    if (!exportAck) {
      setExportError("Confirm the box above first.");
      return;
    }
    setExportLoading(true);
    try {
      const b58 = await demoSecretKeyBase58(user.sub);
      setExportSecret(b58);
      setExportShown(true);
    } catch {
      setExportError("Could not derive key. Check the network and try again.");
    } finally {
      setExportLoading(false);
    }
  }

  function hideKey() {
    setExportSecret("");
    setExportShown(false);
    setExportAck(false);
  }

  function copyKey() {
    const t = exportSecret;
    if (!t) return;
    function done() {
      setCopyKeyLabel("Copied");
      setTimeout(() => setCopyKeyLabel("Copy key"), 2000);
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(() => {
        window.prompt("Copy:", t);
      });
    } else {
      window.prompt("Copy:", t);
    }
  }

  async function openPrivyExport() {
    setExportError("");
    setPrivyExportBusy(true);
    try {
      await exportWallet({ address: user.publicKey });
    } catch {
      setExportError("Export was cancelled or failed. Try again.");
    } finally {
      setPrivyExportBusy(false);
    }
  }

  return (
    <>
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>

      <article className="content-shell profile-shell">
        <h1 className="site-title">Profile</h1>
        <p className="lead lead--compact">
          Stored in this browser. Hub link lists your campaigns here only until
          you add a server.
        </p>

        <div className="content-shell ft-panel share-link-panel">
          <p className="ft-kicker">Share</p>
          <p className="ft-panel-title share-link-title">Hub link</p>
          <p className="share-link-explainer share-link-explainer--short">
            One URL for all your campaigns on this device.
          </p>
          <div className="share-link-row">
            <code id="profile-hub-url" className="share-link-url">
              {hubRel}
            </code>
            <button
              type="button"
              className="secondary-btn"
              id="profile-copy-hub"
              onClick={copyHub}
            >
              Copy
            </button>
          </div>
        </div>

        <section className="content-shell ft-panel profile-campaigns-panel">
          <p className="ft-kicker">Campaigns</p>
          <p className="ft-panel-title">Yours</p>
          <p
            id="profile-campaigns-empty"
            className="note note--tight"
            hidden={mine.length > 0}
          >
            None yet. <Link to="/create">Create a campaign</Link>.
          </p>
          <CampaignList campaigns={mine} />
        </section>

        <div
          id="wallet-export-panel"
          className="content-shell ft-panel wallet-export-panel"
        >
          <p className="ft-kicker">Wallet</p>
          <p className="ft-panel-title">Use in Phantom / Solflare</p>

          {isPrivy ? (
            <>
              <p className="wallet-export-lead note--tight">
                Your Solana address is managed by <strong>Privy</strong>. Open
                Privy’s export flow to copy a private key into another wallet.
                The key is shown in Privy’s secure window, not inside this page.
              </p>
              <p
                id="wallet-export-error"
                className="form-error"
                hidden={!exportError}
              >
                {exportError}
              </p>
              <div className="wallet-export-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={privyExportBusy}
                  onClick={openPrivyExport}
                >
                  {privyExportBusy ? "Opening…" : "Export private key (Privy)"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="wallet-export-lead note--tight">
                <strong>Legacy demo key</strong> (old Google-only sign-in): derived
                in-browser from your saved session id. Anyone with the private
                key controls funds.
              </p>
              <ol className="wallet-export-steps">
                <li>Reveal and copy the key below.</li>
                <li>
                  Phantom: Settings → Add / Connect wallet → Import private key.
                  (Solflare: similar.)
                </li>
                <li>Paste the key. Hide it again when done.</li>
              </ol>
              <label className="wallet-export-ack-label">
                <input
                  type="checkbox"
                  id="wallet-export-ack"
                  checked={exportAck}
                  onChange={(e) => setExportAck(e.target.checked)}
                />
                I understand exposing this key can drain the wallet.
              </label>
              <p
                id="wallet-export-error"
                className="form-error"
                hidden={!exportError}
              >
                {exportError}
              </p>
              <div className="wallet-export-actions">
                {!exportShown ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    id="wallet-export-reveal"
                    disabled={exportLoading}
                    onClick={revealLegacyDemoKey}
                  >
                    {exportLoading ? "Loading…" : "Show private key"}
                  </button>
                ) : null}
                {exportShown ? (
                  <>
                    <button
                      type="button"
                      className="secondary-btn"
                      id="wallet-export-copy"
                      onClick={copyKey}
                    >
                      {copyKeyLabel}
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      id="wallet-export-hide"
                      onClick={hideKey}
                    >
                      Hide
                    </button>
                  </>
                ) : null}
              </div>
              <textarea
                id="wallet-export-secret"
                className="wallet-export-secret"
                readOnly
                hidden={!exportShown}
                rows={3}
                autoComplete="off"
                aria-label="Exported private key"
                value={exportSecret}
                onChange={() => {}}
              />
            </>
          )}
        </div>

        <p id="profile-error" className="form-error" hidden={!error}>
          {error}
        </p>
        <p id="profile-saved" className="form-success" hidden={!saved}>
          Saved.
        </p>

        <form id="profile-form" className="profile-form" noValidate onSubmit={onSubmit}>
          <h2 className="section-heading section-heading--inline">Account</h2>
          <div className="profile-avatar-row">
            <div className="profile-avatar-preview-wrap">
              {previewUrl ? (
                <img
                  id="profile-avatar-preview"
                  className="profile-avatar-preview"
                  src={previewUrl}
                  alt=""
                  width="120"
                  height="120"
                />
              ) : null}
              <div
                id="profile-avatar-placeholder"
                className="profile-avatar-placeholder"
                hidden={placeholderHidden}
              >
                No photo
              </div>
            </div>
            <div className="profile-avatar-actions">
              <div className="form-field">
                <label htmlFor="profile-avatar">Photo</label>
                <input
                  id="profile-avatar"
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onAvatarChange}
                />
                <p className="form-hint">Max ~750 KB.</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                id="profile-remove-avatar"
                onClick={removeAvatar}
              >
                Remove photo
              </button>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="profile-username">Display name</label>
            <input
              id="profile-username"
              name="username"
              type="text"
              maxLength={40}
              autoComplete="nickname"
              placeholder="Optional"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="profile-readonly-block">
            <p className="profile-readonly-label">Email</p>
            <p id="profile-email" className="profile-readonly-value">
              {user.email || "—"}
            </p>
          </div>
          <div className="profile-readonly-block">
            <p className="profile-readonly-label">Solana address</p>
            <p
              id="profile-address"
              className="profile-readonly-value mono profile-address-wrap"
            >
              {user.publicKey}
            </p>
          </div>

          <button type="submit">Save</button>
        </form>
      </article>
    </>
  );
}
