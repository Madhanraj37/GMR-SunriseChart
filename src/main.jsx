import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import { msalConfig } from "./authConfig.js";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

await msalInstance.initialize();

// Process the auth response (#code=...) after redirecting back from Microsoft.
await msalInstance.handleRedirectPromise();

// Set the active account after a successful login so silent token calls work.
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
  msalInstance.setActiveAccount(accounts[0]);
}

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <AuthGate>
        <App />
      </AuthGate>
    </MsalProvider>
  </React.StrictMode>
);
