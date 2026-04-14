import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SessionProvider } from "./context/SessionContext.jsx";
import { migratePrivySessionToSignOut } from "./lib/session.js";
import "./styles.css";

migratePrivySessionToSignOut();

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <SessionProvider>
      <App />
    </SessionProvider>
  </BrowserRouter>
);
