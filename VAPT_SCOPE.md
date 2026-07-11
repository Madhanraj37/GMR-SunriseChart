# VAPT Scope & Engagement Pack — GMR Sunrise Transformation Maturity Dashboard

> **Purpose of this document.** This is a scoping and rules-of-engagement pack to
> hand to an **independent, accredited penetration-testing provider** (e.g. a
> CREST / OSCP / OSWE-qualified firm, or a reputable paid DAST platform). It gives
> the tester everything they need to scope, price, and execute a Vulnerability
> Assessment & Penetration Test (VAPT) of this application quickly and accurately.
>
> **This document is NOT itself a VAPT report.** The VAPT report is the
> deliverable the independent provider produces under their own name.

| | |
|---|---|
| **Application** | GMR Sunrise — Transformation Maturity Dashboard |
| **Version under test** | 1.0.0 |
| **Application type** | Frontend-only single-page application (SPA) |
| **Hosting** | Azure Static Web Apps (static file hosting + CDN) |
| **Backend / database** | **None** — no server-side code, no API layer, no database |
| **Authentication** | Microsoft Entra ID (OAuth 2.0 Authorization Code + PKCE) |
| **Data source** | One Excel workbook in SharePoint Online, read via Microsoft Graph |
| **Requested engagement** | Grey-box VAPT (authenticated + unauthenticated) |
| **Document owner** | _<your name / team>_ |
| **Date issued** | _<fill in>_ |

---

## 1. Engagement objective

Provide independent assurance that the application is safe to deploy into the
customer's Microsoft 365 / Azure tenant, by identifying and rating security
vulnerabilities in:

1. The deployed web application (client-side / DAST).
2. The authentication and authorization flow (Entra ID + MSAL + PKCE).
3. The application's use of Microsoft Graph / SharePoint (data access boundary).
4. The HTTP security-header and Content-Security-Policy configuration.
5. Third-party / dependency (supply-chain) risk in the shipped bundle.

Deliverable expected from the provider: a formal VAPT report with an executive
summary, a findings register (CVSS v3.1 rated), evidence/PoC per finding,
remediation guidance, and a retest statement after fixes.

---

## 2. Scope

### 2.1 In scope

| Target | Detail |
|--------|--------|
| **Production/staging web app** | `<LIVE URL — fill in>` |
| **Authentication flow** | Microsoft sign-in, token acquisition, session handling, sign-out |
| **Authorization** | Viewer vs Editor behaviour; Entra "assignment required" enforcement |
| **Client-side application logic** | React SPA bundle served from Azure SWA |
| **HTTP response headers** | CSP, HSTS, X-Frame-Options, etc. (see §6) |
| **Client → Microsoft Graph traffic** | Token usage, scope enforcement, data handling in the browser |
| **Dependency / supply chain** | The npm packages bundled into `dist/` |

### 2.2 Out of scope (third-party infrastructure — do NOT test)

The following are **Microsoft-operated services** and must **not** be
attacked — testing them violates Microsoft's terms and is outside the
customer's authority to authorize:

- Microsoft Entra ID (`login.microsoftonline.com`) internals
- Microsoft Graph API (`graph.microsoft.com`) internals
- SharePoint Online (`*.sharepoint.com`) internals
- Azure Static Web Apps platform internals
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)

The tester may assess **how the application uses** these services (e.g. token
storage, scope requests, CSP allow-listing) but not the services themselves.

### 2.3 Explicitly permitted

- Authenticated testing using provider-supplied or customer-supplied test
  accounts (one Viewer account, one Editor account — see §4).
- Automated DAST scanning of the live URL.
- Static analysis of the source bundle / provided source archive.
- Inspection of tokens, storage, and network traffic in the browser.

---

## 3. Application architecture (for the tester)

```
   Browser (React SPA, static files on Azure SWA)
     │
     ├─ 1. OAuth2 Auth-Code + PKCE ──▶ Microsoft Entra ID  (out of scope to attack)
     │  ◀─ ID token + access token ──
     │
     └─ 2. Bearer token ────────────▶ Microsoft Graph → SharePoint (out of scope to attack)
        ◀─ .xlsx workbook contents ──
```

Key facts that shape the threat model:

- **No server the vendor controls.** There is no backend to attack for
  server-side vulns (no SQLi, SSRF, server RCE, IDOR-on-API, etc. — none exist
  because there is no API).
- **All logic runs client-side.** The relevant attack surface is DOM XSS,
  token/session handling, CSP effectiveness, dependency risk, and OAuth/redirect
  configuration.
- **The app is read-only.** It never writes back to SharePoint. The Editor
  "toggle" only changes on-screen state for the current session.
- **Config is build-time.** `VITE_CLIENT_ID` and `VITE_TENANT_ID` are public
  identifiers (visible in any SPA bundle by design) — they are **not** secrets.
  There are no passwords or client secrets in the application.

Technology stack: React 18, Vite 8, Tailwind CSS 3, Framer Motion,
lucide-react, SheetJS (`xlsx` 0.20.3), MSAL (`@azure/msal-browser` 5.x,
`@azure/msal-react` 5.x).

---

## 4. Test accounts & access

To be provided by the customer (the tenant owner), since access is gated by
Entra ID:

| Account | Role | Purpose |
|---------|------|---------|
| `<viewer@customer>` | Viewer (assigned, not in admin list) | Baseline authenticated testing |
| `<editor@customer>` | Editor (email in `VITE_ADMIN_EMAILS`) | Privilege / authorization testing |
| `<unassigned@customer>` | Not assigned to the app | Verify Entra blocks unassigned users |

> The tester should confirm that an **unassigned** account is rejected by
> Microsoft *before* the app loads (assignment-required enforcement).

---

## 5. Suggested test checklist (OWASP-aligned)

The provider will use their own methodology; this is the expected coverage for
a static SPA, mapped to OWASP Top 10 (2021) and OWASP WSTG / ASVS.

| Area | What to check |
|------|---------------|
| **A01 Broken Access Control** | Viewer cannot reach Editor-only UI actions; no client-side authz relied on for data protection; Entra assignment-required enforced |
| **A02 Cryptographic Failures** | HTTPS/HSTS enforced; token storage (`sessionStorage`) exposure; no sensitive data cached to disk |
| **A03 Injection / XSS** | DOM-based XSS via workbook content, URL params, hash; confirm React output-encoding holds; test the Excel-parsing path with a hostile workbook |
| **A04 Insecure Design** | Read-only model verified; client-side Editor gate cannot cause data modification |
| **A05 Security Misconfiguration** | CSP bypass attempts; header correctness (see §6); Azure SWA route/rewrite config; cache-control on `index.html` |
| **A06 Vulnerable Components** | Bundle dependency audit; SheetJS version; MSAL version; known CVEs |
| **A07 Auth Failures** | OAuth flow tampering, redirect-URI manipulation, token replay, session fixation, sign-out completeness, `state`/PKCE handling |
| **A08 Integrity Failures** | Sub-resource / supply-chain integrity of the bundle; CDN-sourced assets |
| **A10 SSRF** | N/A (no server) — confirm the share-URL encoding path can't be abused to reach unintended Graph resources |
| **Clickjacking** | `X-Frame-Options: DENY` / `frame-ancestors 'none'` enforced |
| **Tabnabbing** | External links use `rel="noreferrer"`/`noopener` |
| **Sensitive data in bundle** | Confirm no secrets/tokens/PII embedded in JS |

---

## 6. Current security controls to verify

The application ships with the following controls (configured in
`staticwebapp.config.json`). The tester should **verify these are effective**,
not assume them:

- **Content-Security-Policy** — `default-src 'self'`; `script-src 'self'`;
  `object-src 'none'`; `frame-ancestors 'none'`; `base-uri 'self'`;
  `connect-src` restricted to Microsoft Graph / login / SharePoint;
  `style-src 'self' 'unsafe-inline'` (note the `'unsafe-inline'` for styles —
  a known minor weakness to flag/assess).
- **Strict-Transport-Security** — `max-age=31536000; includeSubDomains`.
- **X-Frame-Options: DENY** and **X-Content-Type-Options: nosniff**.
- **Referrer-Policy: strict-origin-when-cross-origin**.
- **Permissions-Policy** — camera/mic/geolocation/etc. disabled.
- **Cross-Origin-Opener-Policy: same-origin-allow-popups** (needed for MSAL).
- Tokens held in **`sessionStorage`** (cleared on tab close).
- Delegated, **read-only** Graph scopes: `User.Read`, `Files.Read.All`,
  `Sites.Read.All`.

---

## 7. Rules of engagement

| Item | Value |
|------|-------|
| **Test window** | _<agree dates>_ |
| **Testing type** | Grey-box (authenticated + unauthenticated), non-destructive |
| **Environment** | Staging URL preferred; if production, agree a low-traffic window |
| **Rate limiting / DoS** | **No** denial-of-service or load/stress testing |
| **Data** | Use only non-production / synthetic data in the test workbook |
| **Third-party services** | Do **not** attack Microsoft/Google endpoints (see §2.2) |
| **Emergency contact** | _<name / phone / email>_ |
| **Authorization** | Written authorization to be issued by the tenant owner before testing begins |

> **Important:** Only the **customer (tenant owner)** can authorize testing
> against their Azure/M365 tenant and must issue the tester a written
> authorization ("get-out-of-jail" letter). The vendor cannot authorize testing
> of infrastructure it does not own.

---

## 8. What to ask providers for (procurement checklist)

When comparing paid VAPT providers/platforms, confirm they deliver:

- [ ] Accreditation (CREST, or testers with OSCP/OSWE/equivalent)
- [ ] Methodology aligned to OWASP WSTG / OWASP ASVS
- [ ] CVSS v3.1 severity ratings on every finding
- [ ] Evidence / proof-of-concept per finding
- [ ] Remediation guidance per finding
- [ ] **A free retest** after remediation, and a clean re-issued report
- [ ] A signed, letterheaded report suitable for the customer's audit file

---

## 9. Source & supporting evidence provided to the tester

- This scope pack.
- `PROJECT_HANDOVER.md` — full architecture, data flow, and security posture.
- `SECURITY_PRE_ASSESSMENT.md` — the vendor's internal pre-assessment (below).
- Source archive (excludes `.env`, `dist/`, `node_modules/`).
- Live URL + test accounts (from the customer).
