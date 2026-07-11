// ─────────────────────────────────────────────────────────────────────────────
// Azure AD (Microsoft Entra ID) + SharePoint configuration
//
// Fill in the three values marked  ⬇️ FILL  below, then save. Everything else
// is already wired up.
// ─────────────────────────────────────────────────────────────────────────────

// All values come from environment variables (see .env locally, and the build
// environment in CI / Azure). Vite only exposes vars prefixed with VITE_, and
// they are embedded at build time — see DEPLOY_TO_AZURE.md.

// From: App registration → Overview → "Application (client) ID"
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

// From: App registration → Overview → "Directory (tenant) ID"
export const TENANT_ID = import.meta.env.VITE_TENANT_ID;

// The SharePoint Excel file link (share URL copied from the browser). The app
// resolves the file from this link via the Graph /shares endpoint — no
// Site/Drive/Item IDs needed.
export const EXCEL_FILE_URL = import.meta.env.VITE_EXCEL_FILE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Below this line you normally don't need to change anything.
// ─────────────────────────────────────────────────────────────────────────────

// MSAL configuration for the browser (SPA, authorization-code + PKCE, no secret).
export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin, // matches http://localhost:5173 in dev
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Delegated Graph scopes we request at sign-in (must match the API permissions
// granted on the app registration).
export const loginRequest = {
  scopes: ["User.Read", "Files.Read.All", "Sites.Read.All"],
};
