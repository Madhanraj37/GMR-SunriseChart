# Project Handover — GMR Sunrise Transformation Maturity Dashboard

> **Audience:** the receiving IT / operations team.
> This is the authoritative reference for understanding, deploying, operating and
> maintaining the application. Step-by-step setup and deployment live in the two
> linked guides; this document explains *what the system is, how it behaves, and
> what you are responsible for*.

| | |
|---|---|
| **Application** | GMR Sunrise — Transformation Maturity Dashboard |
| **Type** | Frontend-only web application (single-page app) |
| **Hosting target** | Azure Static Web Apps |
| **Authentication** | Microsoft 365 sign-in (Microsoft Entra ID) |
| **Data source** | A single Excel workbook in SharePoint Online |
| **Backend / database** | **None** — no server-side code, no database |
| **Handover date** | _<fill in>_ |
| **Version** | 1.0.0 |

**Companion documents**
- **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)** — one-time Microsoft/Azure configuration and how to run locally.
- **[DEPLOY_TO_AZURE.md](DEPLOY_TO_AZURE.md)** — how to build and host on Azure Static Web Apps.
- **[README.md](README.md)** — developer quick reference.

---

## 1. Solution overview

The dashboard presents an organisation's transformation programme as a visual
**maturity chart**. Work is organised along two axes:

- **Phases (the journey):** Establish → Enhance → Optimize
- **Dimensions (the pillars):** People, Process, Technology

Each **topic** (e.g. *Performance Management*, *CoE Transition*) is drawn as a
card in its phase/dimension region. Cards roll up the health of their
**initiatives**, which in turn roll up their individual **actions/tasks**. A
separate **Risk Register** view presents an FMEA-based risk profile.

The application is **read-oriented**: the SharePoint Excel workbook is the single
source of truth. Programme leads maintain the Excel file; the dashboard simply
visualises it and refreshes automatically.

---

## 2. Architecture & data flow

The app is a static bundle of HTML/CSS/JavaScript served from Azure Static Web
Apps. All logic runs in the end user's browser. It talks **only** to Microsoft
services (and Google Fonts for typography) — there is no intermediary server that
sees the data.

```
   ┌────────────────┐     1. Sign in  (OAuth2 Authorization Code + PKCE)   ┌───────────────────────┐
   │                │ ───────────────────────────────────────────────────▶ │  Microsoft Entra ID    │
   │  End user's    │ ◀─────────────────────────────────────────────────── │  (Azure AD login)      │
   │  web browser   │     2. ID token + access token                        └───────────────────────┘
   │                │
   │  React SPA,    │     3. Read the workbook (bearer access token)        ┌───────────────────────┐
   │  static files  │ ───────────────────────────────────────────────────▶ │  Microsoft Graph API   │
   │  on Azure SWA  │ ◀─────────────────────────────────────────────────── │  → SharePoint Online   │
   │                │     4. Excel file contents (.xlsx)                     └───────────────────────┘
   └────────────────┘
      • No application server, no database, no third-party analytics.
      • Access/ID tokens are held in the browser's sessionStorage (cleared when the tab closes).
      • Data is parsed in memory and rendered; it is not persisted by the app anywhere.
```

**Technology stack**

| Layer | Technology |
|-------|------------|
| UI framework | React 18 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| Icons | lucide-react |
| Excel parsing | SheetJS (`xlsx`) — loaded on demand |
| Authentication | MSAL (`@azure/msal-browser`, `@azure/msal-react`) |

---

## 3. End-user experience (user flow)

1. **Landing / sign-in.** An unauthenticated visitor sees a *"Sign in with
   Microsoft"* screen — nothing else is accessible.
2. **Authentication.** Clicking sign-in redirects to the Microsoft login page.
   - Only users **assigned to the app in Entra ID** can sign in. Everyone else is
     blocked by Microsoft at the login step (they never reach the app).
3. **Dashboard loads.** After sign-in the app reads the SharePoint workbook via
   Graph and renders the maturity chart.
4. **Exploring the chart:**
   - **Hover** a topic card → a tooltip lists its initiatives and their status.
   - **Click** a topic card → a **drill-down view** with its initiatives, actions,
     dates and progress notes.
   - **Risk Register** button (bottom-left) → the FMEA risk profile view.
5. **Account controls (top-right):** switch between signed-in accounts, add
   another account, or sign out. A **refresh** button forces an immediate reload,
   and a link opens the source Excel file.
6. **Automatic refresh.** Every **30 seconds** the app performs a cheap
   "has the file changed?" check and only re-downloads when the workbook was
   actually modified — so edits in SharePoint appear within about half a minute.

### User roles

| Role | Who | Can do |
|------|-----|--------|
| **Viewer** | Any assigned user | View all dashboards and drill-downs (read-only) |
| **Editor** | Emails listed in `VITE_ADMIN_EMAILS` | Additionally toggle a task's done/not-done state **in the live view** |

> **Important:** Editor toggles change only what is shown on screen for that
> session. They are **not written back** to the Excel file. The workbook remains
> the single source of truth; to make a change permanent, edit the Excel file.

---

## 4. Status logic — RAG(P) and risk levels

The dashboard derives colour-coded health indicators from the data. There are
four health colours: **R**ed, **A**mber, **G**reen, and **P**urple.

### 4.1 Task status (from the Excel *Status* column)

| Status | Meaning | Colour |
|--------|---------|--------|
| `done` | Completed | Green |
| `inprogress` | Underway | Orange |
| `todo` | Not started | Red |

Common spelling variants (e.g. *"In Progress"*, *"completed"*, *"WIP"*) are
recognised automatically.

### 4.2 Initiative health (rolled up from its actions, using dates)

An action is **delayed** when its end/due date has passed and it is not `done`.

| Condition | Health | Label |
|-----------|--------|-------|
| Every action has no dates, **or** every action's start date is still in the future | **Purple** | Yet to Start |
| 0 delayed actions | **Green** | On Track |
| Exactly 1 delayed action | **Amber** | Needs Attention |
| 2 or more delayed actions | **Red** | At Risk |

### 4.3 Topic health (rolled up from its initiatives)

Applied in order:

1. Any initiative is **Red** → topic is **Red**.
2. **≥ 2** amber initiatives **and** they are **≥ 50%** of the topic's initiatives → **Red**.
3. **≥ 2** amber initiatives (but under 50%) → **Amber**.
4. All initiatives **Purple** → **Purple**.
5. Otherwise (including a single lone amber) → **Green**.

> Rationale: a single amber initiative does not turn a whole topic amber — it
> takes a genuine cluster of delays to escalate a topic.

### 4.4 Overall progress percentage

Progress circles show `done ÷ total actions`, coloured:

| Percentage | Colour |
|------------|--------|
| Below 30% | Red |
| 30% – 70% | Orange |
| 70% and above | Green |

### 4.5 Risk level (Risk Register / FMEA)

Each risk's level is taken from the sheet's explicit *Risk* column when present
(High / Medium / Low, and synonyms such as *critical*, *moderate*, *minor*). When
that column is blank, it is derived from the **RPN** (Risk Priority Number):

| RPN | Level | Colour |
|-----|-------|--------|
| 100 and above | High | Red |
| 40 – 99 | Medium | Amber |
| Below 40 | Low | Green |

---

## 5. Configuration

All configuration is supplied through four environment variables (see
[.env.example](.env.example)). They are **embedded into the build** by Vite when
you run `npm run build` — they are **not** read at runtime, so any change requires
a rebuild and redeploy.

| Variable | Purpose | Source |
|----------|---------|--------|
| `VITE_CLIENT_ID` | Identifies the app to Microsoft | Entra app registration → Overview |
| `VITE_TENANT_ID` | Your Microsoft 365 directory | Entra app registration → Overview |
| `VITE_EXCEL_FILE_URL` | Which SharePoint file to read | SharePoint → the file's *Share* link |
| `VITE_ADMIN_EMAILS` | Comma-separated editor emails | Your choice |

> `VITE_CLIENT_ID` and `VITE_TENANT_ID` are **public identifiers**, not secrets —
> they are visible in the browser bundle of any single-page app by design. There
> are no passwords or client secrets anywhere in this application.

---

## 6. Security & data privacy

Security was reviewed and hardened as part of this handover. Summary of the
posture:

### 6.1 Authentication
- Sign-in uses **Microsoft Entra ID** with the modern **OAuth 2.0 Authorization
  Code flow + PKCE** — the recommended pattern for single-page apps.
- **No client secret** exists in the app (a SPA cannot hold one securely; PKCE
  removes the need).
- Tokens are stored in **`sessionStorage`** and are cleared when the browser tab
  is closed.

### 6.2 Authorization (who can access)
- **Who can sign in** is controlled in Entra ID: set the Enterprise Application's
  *"Assignment required"* to **Yes** and assign the permitted users/groups.
  Unassigned users are rejected by Microsoft before the app loads.
- **Who can edit** the live view is the `VITE_ADMIN_EMAILS` allow-list. Because
  edits are never written back (§3), this is a UI convenience, not a data-security
  boundary — the underlying data cannot be altered from the app regardless.

### 6.3 Data access (least privilege)
- The app requests **delegated, read-only** Microsoft Graph permissions:
  `User.Read`, `Files.Read.All`, `Sites.Read.All`.
- "Delegated" means the app can only ever read what **the signed-in user is
  already allowed to read** in SharePoint. It cannot access anything on the user's
  behalf that they could not access themselves, and it cannot write.

### 6.4 HTTP security headers
Applied to every response via [staticwebapp.config.json](staticwebapp.config.json):

| Header | Protects against |
|--------|------------------|
| `Content-Security-Policy` | Cross-site scripting / data exfiltration — restricts connections to this app, the required Microsoft endpoints, and Google Fonts only |
| `Strict-Transport-Security` | Downgrade / man-in-the-middle (forces HTTPS) |
| `X-Frame-Options: DENY` | Clickjacking (the app cannot be embedded in an iframe) |
| `X-Content-Type-Options: nosniff` | MIME-type confusion attacks |
| `Referrer-Policy` | Leaking URLs to third parties |
| `Permissions-Policy` | Unwanted access to camera, microphone, geolocation, etc. (all disabled) |
| `Cross-Origin-Opener-Policy` | Cross-window (Spectre-style) attacks |

> **One post-deployment check:** the Content-Security-Policy is scoped to the
> standard Microsoft hosts. Some tenants serve the SharePoint download from a
> different host. After your first deploy, sign in and confirm data loads; if it
> does not, the browser Console (F12) will name the blocked host to add to
> `connect-src` in `staticwebapp.config.json`. You can grade the headers at
> <https://securityheaders.com>.

### 6.5 Application security
- No use of `eval`, `dangerouslySetInnerHTML`, or similar unsafe patterns.
- All spreadsheet content is rendered as escaped text by React, so a malicious
  workbook cannot inject executable code.
- Dependencies report **0 known vulnerabilities** (`npm audit`).

### 6.6 Data privacy / where data flows
- Programme data flows **only** between the user's browser and Microsoft
  (Entra ID + Graph/SharePoint). No third-party server sees it.
- The app stores **no** programme data — it is fetched into memory, rendered, and
  discarded on refresh. There is no database and no server-side logging.
- The only third-party resource is **Google Fonts** (typography). If your policy
  disallows this, the fonts can be self-hosted on request.

---

## 7. Prerequisites, setup & deployment

Detailed, screenshot-friendly steps are in **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)**
and **[DEPLOY_TO_AZURE.md](DEPLOY_TO_AZURE.md)**. In summary:

**Prerequisites**
- **Node.js 20 or later** (build tooling).
- A user who can **register an app in Microsoft Entra ID** and **grant admin
  consent** (this usually requires a Global or Application Administrator).
- The Excel file hosted in **SharePoint Online**, structured per §8 of
  SETUP_AND_RUN.md.

**One-time Microsoft setup** (~30–45 min) → SETUP_AND_RUN.md §3–5:
register the Entra app, grant the Graph permissions, restrict access to chosen
users, and copy the SharePoint share link.

**Build & deploy** → DEPLOY_TO_AZURE.md:
create an Azure Static Web App, `npm install`, fill `.env`, `npm run build`,
deploy the `dist/` output, and register the production URL as a redirect URI in
the Entra app.

---

## 8. Operations & maintenance runbook

| Task | How |
|------|-----|
| **Update the dashboard data** | Edit the SharePoint Excel workbook. The dashboard reflects changes within ~30 seconds automatically — no redeploy needed. |
| **Grant / revoke access for a person** | Entra ID → Enterprise applications → this app → **Users and groups**. |
| **Change who can edit (Editors)** | Update `VITE_ADMIN_EMAILS`, then **rebuild and redeploy** (values are baked in at build time). |
| **Point at a different Excel file** | Update `VITE_EXCEL_FILE_URL`, rebuild, redeploy. |
| **Deploy a new version / config change** | `npm run build` then redeploy `dist/` (DEPLOY_TO_AZURE.md). |
| **Add a custom domain** | Configure it in Azure SWA, then add the new HTTPS URL as a redirect URI in the Entra app. |
| **Rotate configuration** | All config is environment variables; there are no secrets to rotate. |

---

## 9. Known limitations & assumptions

- **Read-only by design.** Task toggles are not written back to Excel; the
  workbook is the source of truth.
- **Config is build-time.** Changing any `VITE_*` value requires a rebuild and
  redeploy; the running site does not read live settings.
- **Excel structure.** The workbook must use the recognised columns (Phase,
  Dimension, Header/Topic, Initiative, Task, Status, dates). An FMEA/risk sheet is
  auto-detected within the same workbook.
- **Single source file.** One workbook is configured at a time.
- **Modern browser** required (current Edge, Chrome, Firefox, or Safari).
- **Editor allow-list is client-side** — appropriate here only because no write
  operations exist.

---

## 10. Dependencies & licensing

Open-source libraries (React, Vite, Tailwind CSS, Framer Motion, lucide-react,
MSAL, SheetJS). All are widely used and permissively licensed (MIT / Apache-2.0
and, for SheetJS, Apache-2.0). A full, pinned dependency list is in
`package-lock.json`. `npm audit` reports **0 known vulnerabilities** at handover.

---

## 11. Troubleshooting

The two guides contain full troubleshooting tables. Most common issues:

| Symptom | Likely cause |
|---------|--------------|
| Blank page after deploy | `VITE_*` variables were missing at build time — rebuild with them set (DEPLOY_TO_AZURE.md §2). |
| "Your account is not authorized" | User is not assigned to the app in Entra ID. |
| Signed in but no data / Graph 403 | Admin consent not granted, or the user lacks SharePoint access to the file. |
| Redirect URI mismatch (AADSTS50011) | The deployed URL is not registered as a redirect URI in the Entra app. |
| Data never loads after deploy | Possible CSP host mismatch — see §6.4. |

---

## 12. Support, source code & business continuity

**Source code delivery.** The application is delivered as a source archive (zip)
containing everything required to build and deploy. It deliberately excludes
credentials (`.env`), build output (`dist/`) and dependencies (`node_modules/`) —
run `npm install` to restore dependencies. We recommend placing the source in the
customer's own version control (Azure DevOps / GitHub) as the master copy.

**Business continuity / backup.**
- The application is **stateless** — it can be rebuilt from the source archive at
  any time; nothing is stored inside the app.
- Programme data lives in the customer's **SharePoint**, covered by their existing
  Microsoft 365 backup and retention policies.
- The only cloud resources are the **Entra app registration** and the **Azure
  Static Web App**, both re-creatable from the setup and deploy guides.

**Support & contacts** — _to be completed by the delivering party:_

| Item | Detail |
|------|--------|
| Delivered by | _<company / team>_ |
| Primary contact | _<name / email>_ |
| Support window | _<e.g. 30 days from handover>_ |
| Escalation path | _<phone / ticketing>_ |

---

## 13. Handover acceptance checklist

- [ ] Node.js 20+ available in the build environment
- [ ] Entra app registered in the customer tenant; Graph permissions granted (admin consent)
- [ ] Access restricted to intended users/groups (*Assignment required = Yes*)
- [ ] `.env` created from `.env.example` with the customer's four values
- [ ] `npm install` and `npm run build` succeed
- [ ] Deployed to Azure Static Web Apps over HTTPS
- [ ] Production URL registered as a redirect URI in the Entra app
- [ ] Signed in as a test user and confirmed the dashboard loads live SharePoint data
- [ ] Security headers verified (e.g. <https://securityheaders.com>)
- [ ] Editor vs viewer behaviour confirmed for the intended accounts
