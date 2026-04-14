import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SessionProvider } from "./context/SessionContext.jsx";
import {
  migratePrivySessionToSignOut,
  repairGoogleUserIfNeeded,
} from "./lib/session.js";
import "./styles.css";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error != null) {
      const msg = String(
        this.state.error?.message || this.state.error || "Unknown error"
      );
      return (
        <div className="layout-content" style={{ padding: "2rem", maxWidth: 560 }}>
          <h1 className="site-title">CrowdCare hit an error</h1>
          <p className="lead lead--compact">{msg}</p>
          <button
            type="button"
            className="gate-start-btn"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

async function boot() {
  try {
    migratePrivySessionToSignOut();
  } catch (e) {
    console.error("[CrowdCare boot]", e);
  }
  try {
    await repairGoogleUserIfNeeded();
  } catch (e) {
    console.error("[CrowdCare boot]", e);
  }

  const el = document.getElementById("root");
  if (!el) {
    console.error("[CrowdCare] #root missing");
    return;
  }

  ReactDOM.createRoot(el).render(
    <BrowserRouter>
      <AppErrorBoundary>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

void boot();
