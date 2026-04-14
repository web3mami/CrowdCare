import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Link, Navigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { CampaignList } from "../components/CampaignList.jsx";
import { deleteCampaignFromApi } from "../lib/crowdcareApi.js";
import {
  deleteExtraCampaignById,
  getCampaignsByCreatorSub,
} from "../lib/crowdcareApp.js";
import { demoSecretKeyBase58 } from "../lib/keypair.js";
import {
  SOL_TRANSFER_FEE_BUFFER_LAMPORTS,
  fetchWalletBalanceLamports,
  getSolanaRpcUrl,
  isValidSolanaAddress,
  lamportsToSolDisplay,
  transactionExplorerUrl,
  transferSolFromDemoWallet,
} from "../lib/solanaWallet.js";

export function ProfilePage() {
  const { user, ensureShareSlug, updateProfile } = useSession();

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

  const [balanceLamports, setBalanceLamports] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmountSol, setWithdrawAmountSol] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSig, setWithdrawSig] = useState("");
  const [campaignListTick, setCampaignListTick] = useState(0);

  const mine = useMemo(
    () => (user?.sub ? getCampaignsByCreatorSub(user.sub) : []),
    [user?.sub, campaignListTick]
  );

  const handleDeleteCampaign = useCallback(
    (c) => {
      if (!user?.sub || c.creatorSub !== user.sub) return;
      if (
        !window.confirm(
          `Delete “${c.title}”? It will be removed here and from your online hub (when signed in).`
        )
      ) {
        return;
      }
      deleteExtraCampaignById(c.id);
      setCampaignListTick((t) => t + 1);
      void deleteCampaignFromApi(c.id).then((r) => {
        if (!r.ok) console.warn("[CrowdCare] Server delete:", r.error);
      });
    },
    [user?.sub]
  );

  useEffect(() => {
    sessionStorage.removeItem("crowdcare_next");
  }, []);

  useLayoutEffect(() => {
    if (user?.publicKey) {
      ensureShareSlug();
    }
  }, [user?.publicKey, ensureShareSlug]);

  const loadBalance = useCallback(async () => {
    if (!user?.publicKey) return;
    setBalanceError("");
    setBalanceLoading(true);
    try {
      const lamports = await fetchWalletBalanceLamports(user.publicKey);
      setBalanceLamports(lamports);
    } catch {
      setBalanceError("Could not load balance. Check your network or RPC URL.");
      setBalanceLamports(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [user?.publicKey]);

  useEffect(() => {
    if (!user?.publicKey) return;
    void loadBalance();
  }, [user?.publicKey, loadBalance]);

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

  if (!user || !user.publicKey) {
    return <Navigate to="/?signin=1&next=%2Fprofile" replace />;
  }

  const slug = user.shareSlug || "";
  const hubRel = slug ? `/app?hub=${encodeURIComponent(slug)}` : "/app";
  let hubUrl = hubRel;
  try {
    hubUrl = new URL(hubRel, window.location.href).href;
  } catch {
    /* keep relative */
  }

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
    if (!name) {
      setError(
        "Display name is required. It is shown next to your campaigns in shared lists."
      );
      return;
    }
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

  async function revealDemoKey() {
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

  function parseWithdrawLamports() {
    const t = String(withdrawAmountSol).trim().replace(/,/g, "");
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    const lamports = Math.floor(n * LAMPORTS_PER_SOL);
    return lamports > 0 ? lamports : null;
  }

  function setMaxWithdraw() {
    if (balanceLamports == null) return;
    const spendable = Math.max(0, balanceLamports - SOL_TRANSFER_FEE_BUFFER_LAMPORTS);
    if (spendable <= 0) {
      setWithdrawAmountSol("0");
      return;
    }
    const sol = spendable / LAMPORTS_PER_SOL;
    setWithdrawAmountSol(
      sol < 0.000001 ? String(sol) : sol.toFixed(9).replace(/\.?0+$/, "")
    );
  }

  async function submitWithdraw(e) {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSig("");
    const to = withdrawTo.trim();
    if (!isValidSolanaAddress(to)) {
      setWithdrawError("Enter a valid Solana address.");
      return;
    }
    if (to === user.publicKey) {
      setWithdrawError("Recipient must be a different address.");
      return;
    }
    const lamports = parseWithdrawLamports();
    if (lamports == null) {
      setWithdrawError("Enter an amount greater than zero.");
      return;
    }
    if (balanceLamports == null) {
      setWithdrawError("Balance not loaded yet.");
      return;
    }
    if (lamports + SOL_TRANSFER_FEE_BUFFER_LAMPORTS > balanceLamports) {
      setWithdrawError(
        "Not enough SOL for this amount plus network fees. Try Max or a smaller amount."
      );
      return;
    }
    setWithdrawBusy(true);
    try {
      const sig = await transferSolFromDemoWallet(user.sub, to, lamports);
      setWithdrawSig(sig);
      setWithdrawTo("");
      setWithdrawAmountSol("");
      await loadBalance();
    } catch (err) {
      console.error("[CrowdCare] Withdraw failed:", err);
      setWithdrawError(
        err?.message?.includes("insufficient")
          ? "Insufficient funds (fees or amount)."
          : "Transfer failed. Check the address, amount, and console."
      );
    } finally {
      setWithdrawBusy(false);
    }
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

  const rpcHost = (() => {
    try {
      return new URL(getSolanaRpcUrl()).host;
    } catch {
      return "RPC";
    }
  })();

  return (
    <div className="profile-page-wrap">
      <p className="back">
        <Link to="/app">← Home</Link>
      </p>

      <div className="profile-layout">
        <header className="profile-layout-head">
          <h1 className="site-title">Profile</h1>
          <p className="lead lead--compact profile-layout-lead">
            Stored in this browser. Hub link lists your campaigns here only until
            you add a server.
          </p>
        </header>

        <section className="content-shell ft-panel profile-wallet-panel">
          <p className="ft-kicker">On-chain</p>
          <p className="ft-panel-title">Balance</p>
          <div className="profile-wallet-top">
            <div className="profile-balance-block">
              <p className="profile-balance-label">Available SOL</p>
              <p className="profile-balance-amount" aria-live="polite">
                {balanceLoading && balanceLamports === null
                  ? "…"
                  : balanceLamports != null
                    ? lamportsToSolDisplay(balanceLamports)
                    : "—"}
                {balanceLamports != null ? (
                  <span className="profile-balance-unit"> SOL</span>
                ) : null}
              </p>
              <p className="profile-balance-meta">
                Via <span className="mono">{rpcHost}</span>
                {balanceLamports != null
                  ? ` · ~${lamportsToSolDisplay(SOL_TRANSFER_FEE_BUFFER_LAMPORTS)} SOL reserved for fees when withdrawing`
                  : null}
              </p>
            </div>
            <div className="profile-wallet-actions">
              <button
                type="button"
                className="secondary-btn"
                id="profile-refresh-balance"
                disabled={balanceLoading}
                onClick={() => void loadBalance()}
              >
                {balanceLoading ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                className="profile-withdraw-toggle"
                id="profile-withdraw-toggle"
                onClick={() => {
                  setWithdrawOpen((o) => !o);
                  setWithdrawError("");
                  setWithdrawSig("");
                }}
              >
                {withdrawOpen ? "Close withdraw" : "Withdraw"}
              </button>
            </div>
          </div>
          <p
            id="profile-balance-error"
            className="form-error profile-balance-error"
            hidden={!balanceError}
          >
            {balanceError}
          </p>

          <div className="profile-withdraw-panel" hidden={!withdrawOpen}>
            <p className="profile-withdraw-lead note--tight">
              Send SOL from this CrowdCare-derived address to any wallet. The
              transaction is signed in this browser only.
            </p>
            <form
              id="profile-withdraw-form"
              className="profile-withdraw-form"
              onSubmit={submitWithdraw}
            >
              <div className="form-field">
                <label htmlFor="profile-withdraw-to">Recipient address</label>
                <input
                  id="profile-withdraw-to"
                  name="withdrawTo"
                  type="text"
                  autoComplete="off"
                  placeholder="Solana public key"
                  value={withdrawTo}
                  onChange={(e) => setWithdrawTo(e.target.value)}
                />
              </div>
              <div className="form-field profile-withdraw-amount-row">
                <label htmlFor="profile-withdraw-amount">Amount (SOL)</label>
                <div className="profile-withdraw-amount-inner">
                  <input
                    id="profile-withdraw-amount"
                    name="withdrawAmount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={withdrawAmountSol}
                    onChange={(e) => setWithdrawAmountSol(e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-btn profile-withdraw-max"
                    id="profile-withdraw-max"
                    disabled={
                      balanceLoading ||
                      balanceLamports == null ||
                      balanceLamports <= SOL_TRANSFER_FEE_BUFFER_LAMPORTS
                    }
                    onClick={setMaxWithdraw}
                  >
                    Max
                  </button>
                </div>
              </div>
              <p
                id="profile-withdraw-error"
                className="form-error"
                hidden={!withdrawError}
              >
                {withdrawError}
              </p>
              {withdrawSig ? (
                <p className="form-success profile-withdraw-success">
                  Sent.{" "}
                  <a
                    href={transactionExplorerUrl(withdrawSig)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction
                  </a>
                </p>
              ) : null}
              <button
                type="submit"
                className="profile-withdraw-submit"
                disabled={withdrawBusy || balanceLoading}
              >
                {withdrawBusy ? "Sending…" : "Send SOL"}
              </button>
            </form>
          </div>
        </section>

        <div className="profile-layout-columns">
          <div className="profile-layout-col">
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
              <CampaignList
                campaigns={mine}
                deletable
                onDelete={handleDeleteCampaign}
              />
            </section>
          </div>

          <div className="profile-layout-col">
            <div
              id="wallet-export-panel"
              className="content-shell ft-panel wallet-export-panel"
            >
              <p className="ft-kicker">Export</p>
              <p className="ft-panel-title">Use in Phantom / Solflare</p>

              <p className="wallet-export-lead note--tight">
                Your Solana address is <strong>derived in this browser</strong>{" "}
                from your Google account id (demo-style seed). Anyone with the
                private key controls funds.
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
                    onClick={revealDemoKey}
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
            </div>

            <div className="content-shell ft-panel profile-account-panel">
              <p id="profile-error" className="form-error" hidden={!error}>
                {error}
              </p>
              <p id="profile-saved" className="form-success" hidden={!saved}>
                Saved.
              </p>

              <form
                id="profile-form"
                className="profile-form"
                noValidate
                onSubmit={onSubmit}
              >
                <h2 className="section-heading section-heading--inline">
                  Account
                </h2>
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
                    required
                    maxLength={40}
                    autoComplete="nickname"
                    placeholder="How your name appears on campaigns"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <p className="form-hint">
                    Required to publish campaigns — shown in Active / Past lists and on
                    your hub.
                  </p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
