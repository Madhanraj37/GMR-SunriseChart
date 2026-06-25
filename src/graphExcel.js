// ─────────────────────────────────────────────────────────────────────────────
// Microsoft Graph access to the SharePoint Excel file.
//
// - Acquires a delegated access token via MSAL (silent, falls back to popup).
// - Resolves the file from its share URL using the Graph /shares endpoint.
// - Exposes a cheap "has it changed?" check (lastModifiedDateTime) and a
//   full content download (ArrayBuffer) for parsing with SheetJS.
// ─────────────────────────────────────────────────────────────────────────────

import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest, EXCEL_FILE_URL } from "./authConfig.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// Encode a sharing URL into the "u!..." share token Graph expects.
// https://learn.microsoft.com/graph/api/shares-get#encoding-sharing-urls
const encodeShareUrl = (url) => {
  const base64 = btoa(unescape(encodeURIComponent(url)));
  return "u!" + base64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
};

const shareItemPath = () =>
  `${GRAPH_BASE}/shares/${encodeShareUrl(EXCEL_FILE_URL)}/driveItem`;

// Get a valid access token. Tries silent first; if MSAL needs interaction
// (e.g. consent or expired session) it falls back to a popup.
const getAccessToken = async (msalInstance) => {
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) {
    throw new Error("Not signed in.");
  }
  try {
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Session expired / consent needed — re-authenticate via redirect.
      await msalInstance.acquireTokenRedirect(loginRequest);
      return null; // page navigates away; nothing more runs
    }
    throw err;
  }
};

const graphFetch = async (msalInstance, url, init = {}) => {
  const token = await getAccessToken(msalInstance);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Graph request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response;
};

// Cheap metadata check — returns the file's lastModifiedDateTime (string).
export const getFileLastModified = async (msalInstance) => {
  const response = await graphFetch(
    msalInstance,
    `${shareItemPath()}?select=lastModifiedDateTime,id,name`
  );
  const json = await response.json();
  return json.lastModifiedDateTime;
};

// Full download — returns the .xlsx as an ArrayBuffer for SheetJS.
export const downloadFileBuffer = async (msalInstance) => {
  const response = await graphFetch(msalInstance, `${shareItemPath()}/content`);
  return response.arrayBuffer();
};
