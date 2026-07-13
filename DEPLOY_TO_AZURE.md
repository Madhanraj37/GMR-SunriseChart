# GMR Transformation Maturity Dashboard — Deploy to Azure

This guide explains how to host the dashboard on **Azure Static Web Apps** — the
recommended Azure service for this kind of frontend-only app. It is **free** for
this use case and provides an **HTTPS** URL (required for Microsoft login).

> **Prerequisite:** Complete **`SETUP_AND_RUN.md`** first. The app must run
> correctly on `http://localhost:5173` before you deploy.

---

## 1. Why Azure Static Web Apps?

| Property | Benefit |
|----------|---------|
| Free tier | No cost for a small internal dashboard |
| Automatic **HTTPS** | Required — Microsoft login refuses plain `http://` (except localhost) |
| Global CDN | Fast load for all users |
| No server to manage | Matches the app's frontend-only design |

---

## 2. CRITICAL: Environment Variables Are Baked in at BUILD Time

Vite embeds `VITE_*` variables into the compiled files when you run
`npm run build`. They are **not** read at runtime. This means:

> The `VITE_` values must be present **during the build** — either in a local
> `.env` file (Method A) or as build-step environment variables in CI (Method B).

Azure Static Web Apps "Application settings" in the portal are for backend/API
functions and are **NOT** available to the static frontend build — so do **not**
rely on them for the `VITE_` variables.

---

## 3. Build the Project

From the project folder, with your `.env` filled in (see SETUP_AND_RUN.md):

```bash
npm install
npm run build
```

This produces a **`dist/`** folder containing the final static site.

---

## 4. Deploy — Method A (Recommended: build locally, deploy with SWA CLI)

Simplest and most reliable: you build locally (so the env values are baked in),
then upload the `dist` folder.

### 4.1 Install the Azure Static Web Apps CLI
```bash
npm install -g @azure/static-web-apps-cli
```

### 4.2 Create the Static Web App in Azure (one time)
1. Go to **https://portal.azure.com** → search **"Static Web Apps"** → **+ Create**.
2. Subscription / Resource group: choose or create.
3. **Name:** `gmr-dashboard`.
4. **Plan type:** **Free**.
5. **Deployment source:** choose **"Other"** (we deploy manually, not from GitHub).
6. **Region:** nearest to your users → **Review + create** → **Create**.
7. After it deploys, open the resource and copy its URL, e.g.
   `https://gmr-dashboard-xxxx.azurestaticapps.net`.
8. **Manage deployment token** → copy the **deployment token** (needed below).

### 4.3 Deploy the build
```bash
swa deploy ./dist --deployment-token <PASTE_DEPLOYMENT_TOKEN> --env production
```

Your site is now live at the `https://....azurestaticapps.net` URL.

> To redeploy after any change (code **or** `.env`): run `npm run build` again,
> then re-run the `swa deploy` command.

---

## 5. Deploy — Method B (GitHub CI/CD, automatic on every push)

Use this if the customer prefers automated deployments from a Git repository.

1. Push the project to a **GitHub repository**.
2. Azure Portal → **Static Web Apps** → **+ Create** → **Deployment source: GitHub**
   → authorize and pick the repo/branch.
3. **Build presets:** choose **Custom / Vite**, with:
   - **App location:** `/`
   - **Output location:** `dist`
4. Azure adds a workflow file under `.github/workflows/`. **Edit it** to pass the
   `VITE_` variables into the build step. Under the build/deploy job, add an `env:`
   block referencing **GitHub repository secrets** you create
   (Settings → Secrets and variables → Actions):

   ```yaml
   # in .github/workflows/azure-static-web-apps-*.yml
   # add this env: block to the "Build And Deploy" step
         env:
           VITE_CLIENT_ID: ${{ secrets.VITE_CLIENT_ID }}
           VITE_TENANT_ID: ${{ secrets.VITE_TENANT_ID }}
           VITE_EXCEL_FILE_URL: ${{ secrets.VITE_EXCEL_FILE_URL }}
   ```
5. Every push to the chosen branch now builds and deploys automatically.

---

## 6. Routing + Security Headers (already included)

The project ships a **`staticwebapp.config.json`** in the root (Azure copies it
into the deployment automatically). You do **not** need to create it. It does two
things:

1. **SPA routing fallback** — page refreshes and the Microsoft login redirect
   always return `index.html` (deep links don't 404).
2. **Security headers** applied to every response:
   - `Content-Security-Policy` — restricts network/scripts/styles to this app
     plus the Microsoft endpoints it must reach (Entra login, Graph, SharePoint)
     and Google Fonts.
   - `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
     `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
     `Cross-Origin-Opener-Policy`.

> **Verify after your first deploy (important).** The Content-Security-Policy is
> scoped to the standard Microsoft hosts, but tenants occasionally serve the
> SharePoint file download from a different host. After deploying, sign in and
> confirm the dashboard loads its data. If it does not, open the browser
> DevTools **Console** (F12) and look for a `Content-Security-Policy` violation
> naming a blocked host — add that host to the `connect-src` list in
> `staticwebapp.config.json`, rebuild, and redeploy. You can check the header
> grade at https://securityheaders.com after deploying.

---

## 7. Register the Production URL in Azure AD (REQUIRED)

Microsoft login will only work for URLs registered as redirect URIs.

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → your app.
2. **Authentication** → under **Single-page application**, **Add URI**:
   ```
   https://gmr-dashboard-xxxx.azurestaticapps.net
   ```
   *(Use your real Static Web App URL. No trailing slash.)*
3. **Save**.

> Keep `http://localhost:5173` as well, so local development still works.
> If you later add a **custom domain**, add that HTTPS URL here too.

---

## 8. Confirm Access for Your Users

Access is still controlled by the app's user assignment (from setup step 3.4):

1. **Microsoft Entra ID** → **Enterprise applications** → your app →
   **Users and groups**.
2. Ensure everyone who should use the dashboard is **assigned**.
3. Unassigned users are blocked at login automatically.

---

## 9. Test the Deployment

1. Open the `https://....azurestaticapps.net` URL in a browser.
2. Click **Sign in with Microsoft** → sign in as an assigned user.
3. Confirm the dashboard loads from SharePoint and auto-refreshes.

---

## 10. Troubleshooting

| Symptom | Cause & Fix |
|---------|-------------|
| **AADSTS50011 — redirect URI mismatch** | The deployed HTTPS URL isn't registered. Add it under App registration → Authentication → Single-page application (step 7). Must match exactly, no trailing slash. |
| Blank page after deploy, config errors in console | The `VITE_` variables weren't present at **build** time. Rebuild with `.env` (Method A) or add the build `env:` block (Method B), then redeploy. |
| **AADSTS50105 — not assigned** | User not assigned to the app. Add them in Enterprise applications → Users and groups. |
| File won't load (Graph 403) | Admin consent missing, or the user lacks SharePoint read access to the Excel file. |
| Login redirect loops or 404 on refresh | Add `staticwebapp.config.json` (step 6) and redeploy. |
| Changed `.env` but site still shows old values | `VITE_` vars are baked at build time — you must `npm run build` and redeploy. |

---

## 11. Summary Checklist

- [ ] App runs locally per SETUP_AND_RUN.md
- [ ] `.env` filled with correct values
- [ ] `npm run build` succeeds (creates `dist/`)
- [ ] Static Web App created in Azure (Free plan)
- [ ] `dist` deployed (Method A) or GitHub CI configured (Method B)
- [ ] Production HTTPS URL added as a redirect URI in the app registration
- [ ] Required users assigned in Enterprise applications
- [ ] Verified sign-in + dashboard load on the live URL
