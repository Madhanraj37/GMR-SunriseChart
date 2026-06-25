import React from "react";
import {
  useMsal,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import { loginRequest } from "./authConfig.js";

// Shows a "Sign in with Microsoft" screen until the user authenticates.
// Only accounts assigned to the app in Entra ID can sign in successfully;
// everyone else is blocked by Azure at the login step.
export default function AuthGate({ children }) {
  const { instance } = useMsal();
  const [error, setError] = React.useState("");

  const handleLogin = async () => {
    setError("");
    try {
      // Redirect flow (not popup) — avoids the block_nested_popups error that
      // happens when the redirect URI is the app's own root URL.
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      // AADSTS50105 = user is not assigned to the app.
      const msg = e?.errorMessage || e?.message || "Sign-in failed.";
      if (/AADSTS50105/.test(msg)) {
        setError("Your account is not authorized to access this dashboard.");
      } else if (!/user_cancelled|interaction_in_progress/.test(msg)) {
        setError(msg);
      }
    }
  };

  return (
    <>
      <UnauthenticatedTemplate>
        <div
          className="min-h-screen w-full flex items-center justify-center px-4"
          style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center">
            <img
              src="/harts-logo.svg"
              alt="HARTS"
              className="mx-auto h-16 w-auto object-contain"
            />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              GMR Transformation Maturity Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with your Microsoft account to continue.
            </p>

            <button
              type="button"
              onClick={handleLogin}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign in with Microsoft
            </button>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
    </>
  );
}
