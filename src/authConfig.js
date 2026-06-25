// ─────────────────────────────────────────────────────────────────────────────
// Azure AD (Microsoft Entra ID) + SharePoint configuration
//
// Fill in the three values marked  ⬇️ FILL  below, then save. Everything else
// is already wired up.
// ─────────────────────────────────────────────────────────────────────────────

// From: App registration → Overview → "Application (client) ID"
export const CLIENT_ID = "a90bc847-e837-4a9f-85ce-25d8e040ecd6";

// ⬇️ FILL — From: App registration → Overview → "Directory (tenant) ID"
//    (You have this; paste the GUID here, e.g. "1234abcd-....")
export const TENANT_ID = "7c51239d-08e0-4f24-92b0-68ca7dccba54";

// The SharePoint Excel file link (the share URL you copied from the browser).
// The app resolves the file from this link via the Graph /shares endpoint —
// no Site/Drive/Item IDs needed.
export const EXCEL_FILE_URL =
  "https://gobalharts.sharepoint.com/:x:/s/HARTSConsulting/IQDIhclhQ1VFSYdufCg5F17FAUFW_7fJ1t4VnZfNmLpFHYE?e=HEPSEB";

// ⬇️ FILL — Emails allowed to toggle task completion (everyone else is read-only).
//    Use lowercase. The other assigned users can VIEW but not edit.
export const ADMIN_EMAILS = [
  "madhanraj.c@globalharts.com",
  // "jeya.bharathi@globalharts.com",
];

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

export const isAdminEmail = (email) =>
  !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());
