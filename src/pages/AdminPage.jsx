import { useState } from "react";
import { Link } from "react-router-dom";

const ADMIN_LOGIN_NAME = "Mami";

/** HTTP Basic credentials (supports non-ASCII passwords; `btoa` alone cannot). */
function basicAuthHeader(user, pass) {
  const raw = `${user}:${pass}`;
  try {
    return `Basic ${btoa(raw)}`;
  } catch {
    const bytes = new TextEncoder().encode(raw);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return `Basic ${btoa(bin)}`;
  }
}

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [userCount, setUserCount] = useState(null);
  const [recordedAt, setRecordedAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setUserCount(null);
    setRecordedAt("");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/stats", {
        headers: { Authorization: basicAuthHeader(ADMIN_LOGIN_NAME, password) },
      });
      let data = {};
      try {
        data = await r.json();
      } catch {
        /* ignore */
      }
      if (!r.ok) {
        setError(
          typeof data.error === "string" ? data.error : `Request failed (${r.status})`
        );
        return;
      }
      if (typeof data.userCount === "number") {
        setUserCount(data.userCount);
        setRecordedAt(
          typeof data.recordedAt === "string" ? data.recordedAt : ""
        );
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the server. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="layout-backdrop" aria-hidden="true" />
      <div className="admin-page-inner content-shell">
        <p className="admin-page-back">
          <Link to="/">← CrowdCare home</Link>
        </p>
        <h1 className="site-title">Admin</h1>
        <p className="lead lead--compact admin-page-lead">
          Signed-in Google accounts recorded by the server (unique{" "}
          <code>sub</code>). Admin login is <strong>{ADMIN_LOGIN_NAME}</strong>; set{" "}
          <code>ADMIN_PASSWORD</code> on the host.
        </p>

        <form className="admin-page-form" onSubmit={onSubmit}>
          <div className="form-field">
            <p className="admin-page-fixed-user">
              Username: <strong>{ADMIN_LOGIN_NAME}</strong>
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="admin-pass">Password</label>
            <input
              id="admin-pass"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="gate-start-btn" disabled={busy}>
            {busy ? "Loading…" : "Show count"}
          </button>
        </form>

        {error ? (
          <p className="form-error admin-page-error" role="alert">
            {error}
          </p>
        ) : null}

        {userCount != null ? (
          <div className="admin-page-result">
            <p className="admin-page-count-label">Accounts recorded</p>
            <p className="admin-page-count-value">{userCount}</p>
            {recordedAt ? (
              <p className="admin-page-meta">
                As of{" "}
                <time dateTime={recordedAt}>
                  {new Date(recordedAt).toLocaleString()}
                </time>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
