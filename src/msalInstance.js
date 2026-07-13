import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "./authConfig.js";

/**
 * Creates and initialises the MSAL instance used across the app.
 *
 * Handles the redirect response returned by Microsoft after login and keeps a
 * single active account set so that silent token acquisition works.
 */
export async function createMsalInstance() {
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

  return msalInstance;
}
