import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";

import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import { createMsalInstance } from "./msalInstance.js";
import "./fonts.js";
import "./index.css";

const msalInstance = await createMsalInstance();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <AuthGate>
        <App />
      </AuthGate>
    </MsalProvider>
  </React.StrictMode>
);
