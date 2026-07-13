# GMR Transformation Maturity Dashboard — Setup & Run Guide

This guide explains how to connect the dashboard to **your** Excel file in
SharePoint (via the Microsoft Graph API), where to get the configuration values,
and how to run the project locally.

> **Audience:** IT / developer who will configure and run the project.
> **Time required:** ~30–45 minutes.

---

## 1. How the App Works (overview)

- It is a **frontend-only** web app (React + Vite). **No backend server, no database.**
- Users sign in with their **Microsoft 365 account** (Microsoft Entra ID / Azure AD).
- After sign-in, the app reads an **Excel file from SharePoint** through the
  **Microsoft Graph API** and displays it as a dashboard.
- Every **30 seconds** it checks whether the Excel file changed; it only
  re-downloads when there is an actual update (efficient, near real-time).
- Only **assigned accounts** can sign in. The dashboard is **read-only for every
  user** — there is no in-app editing.

> **Note:** The dashboard only displays data; it never writes back to the Excel
> file. The Excel file is the source of truth; the dashboard reads from it.

---

## 2. Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 20+** | Download from https://nodejs.org (LTS). Check with `node -v`. |
| **Microsoft 365 account** | With access to the SharePoint site holding the Excel file. |
| **Permission to register an Azure AD app** | Or an admin who can do it / grant consent for you. |
| **The Excel file in SharePoint** | Must have the same column structure as the supplied sample (Phase, Dimension, Header/Topic, Initiative, Task, Status, dates, etc.). |

---

## 3. Register the Application in Microsoft Entra ID (Azure AD)

> Do this once, in **your own** Microsoft tenant.

### 3.1 Create the app registration
1. Go to **https://portal.azure.com** → search **"Microsoft Entra ID"**.
2. Left menu → **App registrations** → **+ New registration**.
3. **Name:** `GMR Dashboard` (any name).
4. **Supported account types:** *Accounts in this organizational directory only (Single tenant)*.
5. Leave Redirect URI blank for now → **Register**.
6. On the **Overview** page, copy and keep:
   - **Application (client) ID**  → becomes `VITE_CLIENT_ID`
   - **Directory (tenant) ID**    → becomes `VITE_TENANT_ID`

### 3.2 Add the Single-Page Application platform
1. In the app → **Authentication** → **+ Add a platform** → **Single-page application**.
2. **Redirect URI:** `http://localhost:5173`  → **Configure**.
   - *(You will add your production HTTPS URL later — see the Deploy guide.)*
3. **Do NOT** tick the "Access tokens" or "ID tokens" implicit-flow checkboxes.
   The SPA platform uses the secure Authorization Code + PKCE flow automatically.

### 3.3 Add Graph API permissions (Delegated)
1. In the app → **API permissions** → **+ Add a permission** → **Microsoft Graph**
   → **Delegated permissions**.
2. Add these three:
   - `User.Read`
   - `Files.Read.All`
   - `Sites.Read.All`
3. Click **Grant admin consent for <your org>**.
   All three should show a green **"Granted"** in the Status column.
   *(If the button is greyed out, ask a Global/Cloud Application Administrator to click it.)*

### 3.4 Restrict who can access (only approved people)
1. Go to **Microsoft Entra ID** → **Enterprise applications** → open your app
   (same name, `GMR Dashboard`).
2. **Properties** → set **"Assignment required?" = Yes** → **Save**.
3. **Users and groups** → **+ Add user/group** → select the people (or a group)
   who should access the dashboard → **Assign**.

> Result: only assigned users can sign in. Everyone else is blocked by Microsoft
> at the login screen.

---

## 4. Get the SharePoint Excel Share Link

1. Open the Excel file in **SharePoint** (in a browser).
2. Copy the URL from the address bar (or use **Share → Copy link**). It looks like:
   ```
   https://yourtenant.sharepoint.com/:x:/s/YourSite/IQB....?e=abcdef
   ```
3. This becomes `VITE_EXCEL_FILE_URL`.

> The trailing `?e=...` part may change each time you copy — that is harmless.
> The app identifies the file by the stable token in the path, not the `?e=` value.

---

## 5. Where Each Environment Variable Comes From

| Variable | Where to get it |
|----------|-----------------|
| `VITE_CLIENT_ID` | App registration → **Overview** → "Application (client) ID" |
| `VITE_TENANT_ID` | App registration → **Overview** → "Directory (tenant) ID" |
| `VITE_EXCEL_FILE_URL` | SharePoint → the Excel file's share link (step 4) |

---

## 6. Configure the Project

1. Unzip the project and open the folder in a terminal.
2. Copy the template and fill it in:
   ```bash
   cp .env.example .env
   ```
3. Open **`.env`** and set your values, for example:
   ```
   VITE_CLIENT_ID=11111111-2222-3333-4444-555555555555
   VITE_TENANT_ID=66666666-7777-8888-9999-000000000000
   VITE_EXCEL_FILE_URL=https://yourtenant.sharepoint.com/:x:/s/YourSite/IQB....?e=abcdef
   ```

> `.env` is git-ignored and is **not** committed. Each environment supplies its own.

---

## 7. Install and Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

- The app opens at **http://localhost:5173**.
- Click **"Sign in with Microsoft"** and sign in with an **assigned** account.
- The dashboard loads from your SharePoint Excel (read-only for all users).

---

## 8. Troubleshooting

| Symptom | Cause & Fix |
|---------|-------------|
| Blank screen / console error about `clientId` | A `VITE_` variable is missing or misspelled in `.env`. Restart `npm run dev` after editing `.env`. |
| **AADSTS50011 — redirect URI mismatch** | The URL you opened isn't registered. For local dev it must be exactly `http://localhost:5173`. Add it under App registration → Authentication → Single-page application. |
| **AADSTS50105 — not assigned** | The signed-in user isn't assigned to the app. Add them under Enterprise applications → Users and groups. |
| Login works but **file won't load** (Graph 403) | Admin consent not granted, OR the user has no read access to the Excel file in SharePoint. Re-check step 3.3 and the user's SharePoint permissions. |
| "interaction_in_progress" error | Leftover state from a cancelled login. Clear the browser's Session Storage (F12 → Application → Session Storage) or use a fresh tab. |
| File loads but shows no data | The Excel structure differs from the expected columns. Compare with the supplied sample sheet. |
| Port 5173 already in use | Stop the other process, or change the port — but then update the redirect URI in Azure to match. |

---

## 9. Next Step — Deployment

To make the dashboard available to your team (not just localhost), see
**`DEPLOY_TO_AZURE.md`**. Deployment requires an **HTTPS** URL, which you then
add as an additional redirect URI in the app registration.
