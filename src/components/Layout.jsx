import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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
            <span className="brand-text">CrowdCare</span>
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
                if (e.target.closest?.(".nav-drawer-list a")) closeDrawer();
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
              <ul className="nav-drawer-list">
                <li hidden={!signedIn}>
                  <Link to="/profile">Profile</Link>
                </li>
                <li>
                  <Link to="/campaigns/active">Active campaigns</Link>
                </li>
                <li>
                  <Link to="/campaigns/past">Past campaigns</Link>
                </li>
                <li hidden={!signedIn}>
                  <Link to="/create">Create a campaign</Link>
                </li>
                <li hidden={!signedIn}>
                  <Link to="/my-campaigns">My campaigns</Link>
                </li>
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
              <p className="nav-drawer-note">
                Campaign lists use data stored in <strong>this browser</strong>.
                With a server, you could show every creator on the site.
              </p>
            </div>
          </div>
        ) : null}

        <Outlet />
      </div>
    </>
  );
}
