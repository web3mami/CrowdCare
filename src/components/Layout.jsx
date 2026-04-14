import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";

export function Layout() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = !!(user && user.publicKey);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    document.body.classList.toggle("nav-drawer-open", drawerOpen);
    return () => document.body.classList.remove("nav-drawer-open");
  }, [drawerOpen]);

  useEffect(() => {
    const on =
      location.pathname === "/campaigns/active" ||
      location.pathname === "/campaigns/past";
    document.body.classList.toggle("campaigns-directory-page", on);
    return () => document.body.classList.remove("campaigns-directory-page");
  }, [location.pathname]);

  useEffect(() => {
    const on = location.pathname === "/profile";
    document.body.classList.toggle("profile-page", on);
    return () => document.body.classList.remove("profile-page");
  }, [location.pathname]);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function onAuthClick(e) {
    e.preventDefault();
    void signOut();
    closeDrawer();
    navigate("/");
  }

  return (
    <>
      <div className="layout-backdrop" aria-hidden="true" />
      <div className="layout-content">
        <nav className="top-nav">
          <Link className="brand" to="/app">
            <img
              className="brand-mark"
              src="/assets/logo-mark.svg"
              width="32"
              height="32"
              alt=""
              decoding="async"
            />
            <span className="brand-text-stack">
              <span className="brand-text">CrowdCare</span>
              <span className="brand-desc">Solana crowdfunding</span>
            </span>
          </Link>
          <button
            type="button"
            className="nav-menu-toggle"
            ref={toggleRef}
            aria-expanded={drawerOpen}
            aria-controls={drawerOpen ? "nav-drawer-panel" : undefined}
            aria-label="Open menu"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <span className="nav-menu-bars" aria-hidden="true" />
          </button>
        </nav>

        {/* Only mount while open so the fixed backdrop cannot intercept clicks when the menu is closed. */}
        {drawerOpen ? (
          <div id="nav-drawer" className="nav-drawer">
            <div
              className="nav-drawer-backdrop"
              id="nav-drawer-backdrop"
              onClick={closeDrawer}
              role="presentation"
            />
            <div
              className="nav-drawer-panel content-shell"
              id="nav-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="nav-drawer-title"
              onClick={(e) => {
                if (e.target.closest?.(".nav-drawer-body a")) closeDrawer();
              }}
            >
              <div className="nav-drawer-header">
                <span id="nav-drawer-title" className="nav-drawer-title">
                  Menu
                </span>
                <button
                  type="button"
                  className="nav-drawer-close"
                  id="nav-drawer-close"
                  aria-label="Close menu"
                  onClick={() => {
                    closeDrawer();
                    toggleRef.current?.focus();
                  }}
                >
                  ×
                </button>
              </div>
              <div className="nav-drawer-body">
                <p className="nav-drawer-group-label">Explore</p>
                <ul className="nav-drawer-list">
                  <li>
                    <NavLink
                      to="/campaigns/active"
                      className={({ isActive }) => (isActive ? "is-active" : "")}
                    >
                      Active campaigns
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/campaigns/past"
                      className={({ isActive }) => (isActive ? "is-active" : "")}
                    >
                      Past campaigns
                    </NavLink>
                  </li>
                </ul>
                {signedIn ? (
                  <>
                    <p className="nav-drawer-group-label">Your space</p>
                    <ul className="nav-drawer-list">
                      <li>
                        <NavLink
                          to="/profile"
                          className={({ isActive }) =>
                            isActive ? "is-active" : ""
                          }
                        >
                          Profile
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/create"
                          className={({ isActive }) =>
                            isActive ? "is-active" : ""
                          }
                        >
                          Create a campaign
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/my-campaigns"
                          className={({ isActive }) =>
                            isActive ? "is-active" : ""
                          }
                        >
                          My campaigns
                        </NavLink>
                      </li>
                    </ul>
                  </>
                ) : null}
                <ul className="nav-drawer-list nav-drawer-list--auth">
                  <li>
                    {signedIn ? (
                      <a href="#" id="drawer-auth" onClick={onAuthClick}>
                        Sign out
                      </a>
                    ) : (
                      <Link to="/?signin=1" id="drawer-auth">
                        Sign in
                      </Link>
                    )}
                  </li>
                </ul>
              </div>
              <p className="nav-drawer-note">
                Campaign lists use data stored in <strong>this browser</strong>.
                With a server, you could show every creator on the site.
              </p>
            </div>
          </div>
        ) : null}

        <Outlet />
        <footer className="app-footer">
          <span className="app-footer-brand">CrowdCare</span>
          <span className="app-footer-sep" aria-hidden>
            ·
          </span>
          <span className="app-footer-meta">
            Demo — shared hubs use online storage; verify anything on-chain yourself.
          </span>
        </footer>
      </div>
    </>
  );
}
