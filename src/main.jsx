import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SessionProvider } from "./context/SessionContext.jsx";
import {
  migratePrivySessionToSignOut,
  repairGoogleUserIfNeeded,
} from "./lib/session.js";
import "./styles.css";

async function boot() {
  migratePrivySessionToSignOut();
  await repairGoogleUserIfNeeded();
  ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  );
}

void boot();
