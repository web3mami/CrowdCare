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
        <nav className="top-nav" aria-label="Main">
          <Link className="brand" to="/app">
            <img
              className="brand-mark"
              src="/assets/logo-mark.svg"
              width="36"
              height="36"
              alt=""
              decoding="async"
            />
            <span className="brand-text-stack">
              <span className="brand-text">CrowdCare</span>
              <span className="brand-desc">Solana crowdfunding</span>
            </span>
          </Link>

          <div className="top-nav-rail">
            <div className="top-nav-anchors">
              <NavLink
                to="/campaigns/active"
                className={({ isActive }) =>
                  `top-nav-anchor${isActive ? " is-active" : ""}`
                }
              >
                Active campaigns
              </NavLink>
              <NavLink
                to="/campaigns/past"
                className={({ isActive }) =>
                  `top-nav-anchor${isActive ? " is-active" : ""}`
                }
              >
                Past campaigns
              </NavLink>
              {signedIn ? (
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `top-nav-anchor top-nav-anchor--quiet${isActive ? " is-active" : ""}`
                  }
                >
                  Profile
                </NavLink>
              ) : null}
            </div>
            {signedIn ? (
              <div className="top-nav-cta-row">
                <Link to="/create" className="top-nav-cta top-nav-cta--primary">
                  Create campaign
                </Link>
                <Link to="/my-campaigns" className="top-nav-cta top-nav-cta--secondary">
                  My campaigns
                </Link>
              </div>
            ) : (
              <Link to="/?signin=1" className="top-nav-cta top-nav-cta--secondary">
                Sign in
              </Link>
            )}
          </div>

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
          <div className="app-footer-grid">
            <div className="app-footer-col app-footer-col--brand">
              <span className="app-footer-brand">CrowdCare</span>
              <p className="app-footer-tagline">
                Non-custodial campaigns on Solana. One hub link for everything you
                publish.
              </p>
            </div>
            <div className="app-footer-col">
              <h2 className="app-footer-heading">Discover</h2>
              <ul className="app-footer-links">
                <li>
                  <Link to="/campaigns/active">Active campaigns</Link>
                </li>
                <li>
                  <Link to="/campaigns/past">Past campaigns</Link>
                </li>
                <li>
                  <Link to="/app">App home</Link>
                </li>
              </ul>
            </div>
            <div className="app-footer-col">
              <h2 className="app-footer-heading">Your account</h2>
              <ul className="app-footer-links">
                {signedIn ? (
                  <>
                    <li>
                      <Link to="/create">Create a campaign</Link>
                    </li>
                    <li>
                      <Link to="/my-campaigns">My campaigns</Link>
                    </li>
                    <li>
                      <Link to="/profile">Profile</Link>
                    </li>
                    <li>
                      <a href="#" onClick={onAuthClick}>
                        Sign out
                      </a>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link to="/?signin=1">Sign in</Link>
                  </li>
                )}
              </ul>
            </div>
            <div className="app-footer-col">
              <h2 className="app-footer-heading">Product</h2>
              <ul className="app-footer-links">
                <li>
                  <Link to="/">Welcome</Link>
                </li>
                <li>
                  <a
                    href="https://github.com/web3mami/CrowdCare"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source on GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="app-footer-bottom">
            <p className="app-footer-legal">
              Hub data syncs for sharing across devices that use the service.
              Wallet and profile details stay in your browser unless you
              self-host. Always verify balances on-chain. Not financial advice.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
