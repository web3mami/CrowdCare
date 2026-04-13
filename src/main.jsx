import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SessionProvider } from "./context/SessionContext.jsx";
import { CrowdCarePrivyBridge } from "./privy/CrowdCarePrivyBridge.jsx";
import { CrowdCarePrivyProvider } from "./privy/CrowdCarePrivyProvider.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CrowdCarePrivyProvider>
        <SessionProvider>
          <CrowdCarePrivyBridge />
          <App />
        </SessionProvider>
      </CrowdCarePrivyProvider>
    </BrowserRouter>
  </React.StrictMode>
);
