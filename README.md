# GMR Sunrise — Transformation Maturity Dashboard

A frontend-only web dashboard that visualizes the **Establish → Enhance → Optimize**
transformation framework across the **People, Process, and Technology** dimensions.

Users sign in with their **Microsoft 365 account**; the app then reads a
**SharePoint Excel workbook** through the **Microsoft Graph API** and renders it
as an interactive maturity chart plus an FMEA-based risk register. There is **no
backend and no database** — the Excel file in SharePoint is the single source of
truth.

## Documentation

| Guide | Purpose |
|-------|---------|
| **[PROJECT_HANDOVER.md](PROJECT_HANDOVER.md)** | Complete handover reference — architecture, user flow, RAG(P) logic, security, operations. **Read first for the full picture.** |
| **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)** | Register the Entra ID app, get the config values, run locally. |
| **[DEPLOY_TO_AZURE.md](DEPLOY_TO_AZURE.md)** | Build and host on Azure Static Web Apps. |

## Quick start (local)

Requires **Node.js 20+**.

```bash
npm install
cp .env.example .env      # then fill in your values (see SETUP_AND_RUN.md)
npm run dev
```

Open http://localhost:5173 and click **Sign in with Microsoft**.

### Environment variables

All configuration comes from a `.env` file (never committed). See
[`.env.example`](.env.example) for the template. Values are **embedded at build
time** by Vite — rebuild after changing them.

| Variable | Meaning |
|----------|---------|
| `VITE_CLIENT_ID` | Entra ID app registration — Application (client) ID |
| `VITE_TENANT_ID` | Entra ID directory (tenant) ID |
| `VITE_EXCEL_FILE_URL` | SharePoint share link to the Excel workbook |
| `VITE_ADMIN_EMAILS` | Comma-separated emails allowed to toggle task status (others are read-only) |

## How access control works

- **Who can sign in:** controlled in Entra ID (Enterprise application →
  *Assignment required = Yes* → assign users/groups). Unassigned users are
  blocked by Microsoft at the login screen.
- **Who can edit:** only emails listed in `VITE_ADMIN_EMAILS` can toggle task
  status in the live view. Everyone else is view-only. Toggles are **not**
  written back to Excel — the workbook remains the source of truth.
- **Data access:** delegated Graph scopes (`User.Read`, `Files.Read.All`,
  `Sites.Read.All`) — the app can only read what the signed-in user can already
  read in SharePoint.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Produce the static production bundle in `dist/` |
| `npm run preview` | Preview the production build locally |

## Excel format

The workbook is parsed flexibly (column names are matched case-insensitively,
with common aliases). The recognized columns are:

| Column | Values / meaning |
|--------|------------------|
| Phase | `Establish` \| `Enhance` \| `Optimize` |
| Dimension | `People` \| `Process` \| `Technology` |
| Header / Topic | Groups initiatives under a card |
| Initiative | A workstream within a topic |
| Task / Action | The leaf item |
| Status | `done` \| `inprogress` \| `todo` (variants tolerated) |
| Start / End dates | Drive the RAG (Red/Amber/Green) health status |
| Assignee / Owner | Optional |

A sheet whose header row looks like an **FMEA register** (a *Failure Mode*
column, or an *RPN* plus *Cause/Recommended Action*) is parsed as the risk
register instead of the task list.

## Project structure

```
src/
├── main.jsx                # React entry + MSAL provider bootstrap
├── AuthGate.jsx            # "Sign in with Microsoft" gate
├── App.jsx                 # SharePoint sync + Excel/FMEA parsing + state
├── authConfig.js           # Entra ID / MSAL config (from env vars)
├── graphExcel.js           # Microsoft Graph: token acquisition + file download
├── constants.js            # Theme tokens + card coordinate map
├── utils.js                # Grouping, stats, RAG + FMEA helpers
├── index.css               # Tailwind directives + global styles
└── components/
    ├── DashboardCanvas.jsx # Main canvas orchestrator + header
    ├── PhaseBackground.jsx # SVG phase curves + dotted diagonals
    ├── Overlays.jsx        # Phase headers, axis labels, GMR badge
    ├── CategoryCard.jsx    # Positioned topic cards
    ├── TooltipModal.jsx    # Hover tooltip with initiative list
    ├── HeaderDetailView.jsx# Drill-down view for a topic
    ├── RiskProfileView.jsx # FMEA risk register view
    ├── RiskTargetIcon.jsx  # Risk register launcher icon
    ├── AccountMenu.jsx     # Signed-in account switcher / sign out
    ├── RagLegend.jsx       # Red/Amber/Green legend
    └── RagIcon.jsx         # RAG status glyph
```

## Key concepts

### Coordinate mapping
Every `(phase, dimension, topic)` triplet maps to a hand-tuned `{x, y}` in
`constants.js → CATEGORY_POSITIONS`. The canvas runs at a fixed `1480 × 650`
virtual size and scales responsively to fit any container. Unknown topics fall
back to `FALLBACK_REGIONS` keyed by `phase::dimension`.

### Status → RAG mapping
- **Task status colors** are defined in `constants.js → STATUS_META`.
- **Initiative/topic health** (RAG) is derived from task due dates in
  `utils.js` (`initiativeRag` / `headerRag`): overdue actions drive amber/red,
  unscheduled initiatives show purple ("yet to start").

### Live sync
`App.jsx` polls SharePoint every 30 seconds using a cheap
`lastModifiedDateTime` check, and only re-downloads + re-parses the workbook
when it has actually changed.

## Tech stack

- **React 18** + **Vite 8**
- **Tailwind CSS 3** for styling
- **Framer Motion** for animation
- **lucide-react** for icons
- **SheetJS (xlsx)** for Excel parsing (loaded on demand)
- **MSAL** (`@azure/msal-browser` / `@azure/msal-react`) for Microsoft sign-in
