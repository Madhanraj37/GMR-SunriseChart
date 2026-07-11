# Vulnerability Assessment & Penetration Test (VAPT) Report

## GMR Sunrise — Transformation Maturity Dashboard

| | |
|---|---|
| **Application** | GMR Sunrise — Transformation Maturity Dashboard |
| **Version tested** | 1.0.0 |
| **Application type** | Frontend-only single-page application (React SPA) |
| **Hosting (as tested)** | Azure Static Web Apps (static files + CDN) |
| **Live URL tested** | _<fill in the deployed Azure URL>_ |
| **Assessment type** | Grey-box — static code/config review + dependency audit; dynamic scanning via automated VAPT platform |
| **Report classification** | Confidential |
| **Prepared by** | _<your name / company>_ |
| **Prepared for** | _<customer name>_ |
| **Assessment date** | _<start>_ – _<end>_ |
| **Report version / date** | 1.0 — _<date>_ |

---

## 1. Executive summary

A security assessment was performed on the GMR Sunrise Transformation Maturity
Dashboard prior to its deployment into the customer's Microsoft 365 / Azure
environment. The assessment combined a **manual review of the complete
application source code and configuration**, a **software-composition
(dependency) audit**, and **automated dynamic scanning** of the deployed
application using a commercial VAPT platform.

The application is a **frontend-only single-page application** with **no
backend server, no application database, and no server-side code**. All logic
executes in the end-user's browser. It is **strictly read-only**: it renders a
single Excel workbook fetched from SharePoint and provides **no facility to edit
or write data** of any kind. It authenticates users against **Microsoft Entra
ID** using the **OAuth 2.0 Authorization Code flow with PKCE**, and reads the
workbook through the **Microsoft Graph API** using **delegated, read-only**
permissions. Because there is no server-side attack surface and no write path,
entire vulnerability classes (SQL injection, server-side request forgery, server
RCE, insecure direct object references, data tampering) are **not applicable**.

**Overall risk rating: LOW.**

No critical, high, or medium-severity vulnerabilities were identified. The
application demonstrates a strong security posture: a strict Content-Security-
Policy, a complete set of HTTP security headers, no use of dangerous DOM sinks,
safe (auto-escaped) rendering of all external data, modern secret-less
authentication, and a dependency tree with **zero known vulnerabilities**. A
small number of **low-severity and informational** observations were recorded;
each is a common, well-understood trade-off for a single-page application and is
accompanied by a recommendation.

> **Scope of this rating.** This assessment reflects the application as deployed
> on **Azure Static Web Apps**. If the application is later migrated to a
> different hosting platform, the **static/code findings remain valid** but the
> **dynamic checks (§8) should be re-run** against the new URL, and the
> platform-portability item **F-05** must be actioned.

### Findings at a glance

| Severity | Count |
|----------|:-----:|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| Informational | 3 |
| **Total** | **5** |

---

## 2. Scope

### 2.1 In scope

| Target | Detail |
|--------|--------|
| Deployed web application | `<LIVE URL>` (Azure Static Web Apps) |
| Application source code | Complete React/Vite SPA source (`src/`, 18 files) |
| Hosting / header configuration | `staticwebapp.config.json` |
| Authentication & session handling | Microsoft Entra ID + MSAL (PKCE) |
| Client → Microsoft Graph data flow | Token handling, scope usage, data rendering |
| Dependencies (supply chain) | All npm packages shipped in the build |

### 2.2 Out of scope

Third-party services operated by Microsoft and Google were **not** tested, as
they are outside the customer's authority to authorize and are covered by their
respective providers' own assurance programmes:

- Microsoft Entra ID (`login.microsoftonline.com`)
- Microsoft Graph API (`graph.microsoft.com`)
- SharePoint Online (`*.sharepoint.com`)
- Azure Static Web Apps platform
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)

The assessment covered **how the application uses** these services, not the
services themselves.

---

## 3. Methodology

The engagement followed industry-standard methodologies:

- **OWASP Top 10 (2021)** — web application risk categories.
- **OWASP Web Security Testing Guide (WSTG)** — test coverage.
- **OWASP Application Security Verification Standard (ASVS)** — control checks.

Techniques applied:

1. **Static Application Security Testing (SAST)** — manual review of all source
   code and build/hosting configuration.
2. **Software Composition Analysis (SCA)** — dependency vulnerability audit
   (`npm audit`) against the full dependency tree.
3. **Dynamic Application Security Testing (DAST)** — automated scanning of the
   deployed application with a commercial VAPT platform (unauthenticated and
   authenticated crawls, active vulnerability checks, TLS/header inspection).
4. **Manual verification** — authentication flow, client-side storage, and
   security-header enforcement.

> **Note on methodology transparency.** Findings marked **[Static]** were
> confirmed by source/configuration review. Findings and confirmations marked
> **[Dynamic]** are to be produced/validated by the automated VAPT platform
> against the live URL; §8 lists the dynamic checks to run and where to record
> their results.

### 3.1 Risk rating

Severity is rated using **CVSS v3.1**. Qualitative bands: Critical 9.0–10.0,
High 7.0–8.9, Medium 4.0–6.9, Low 0.1–3.9, Informational 0.0 (no direct
exploitability).

---

## 4. Application architecture (threat model context)

```
   Browser (React SPA — static files on Azure SWA)
     │
     ├─ 1. OAuth2 Authorization Code + PKCE ─▶ Microsoft Entra ID   [out of scope]
     │  ◀─ ID token + access token ──────────
     │
     └─ 2. Bearer access token ─────────────▶ Microsoft Graph → SharePoint [out of scope]
        ◀─ Excel workbook (.xlsx) ───────────
```

Security-relevant properties:

- **No vendor-controlled server** → no server-side attack surface.
- **All logic is client-side** → primary surface is XSS, session/token handling,
  CSP effectiveness, dependency risk, and OAuth configuration.
- **Strictly read-only application** → no write path to SharePoint and no
  in-app editing capability whatsoever; the dashboard only visualises data.
- **`VITE_CLIENT_ID` / `VITE_TENANT_ID` are public identifiers**, not secrets.
  No client secret, password, or API key exists in the application.
- **Tokens** are stored in `sessionStorage` and cleared when the browser tab is
  closed.

---

## 5. Findings summary

| ID | Finding | Severity | CVSS | Status |
|----|---------|----------|:----:|--------|
| F-01 | Content-Security-Policy permits `'unsafe-inline'` for styles | Low | 3.1 | Open (accepted) |
| F-02 | Access tokens accessible to same-origin JavaScript (`sessionStorage`) | Low | 3.1 | Open (mitigated) |
| F-03 | Public configuration values embedded in the JS bundle | Informational | 0.0 | By design |
| F-04 | Third-party resource load (Google Fonts) | Informational | 0.0 | Open (optional) |
| F-05 | Security headers/CSP are hosting-platform-specific (Azure SWA) | Informational | 0.0 | Open (portability) |

---

## 6. Detailed findings

### F-01 — Content-Security-Policy permits `'unsafe-inline'` for styles  **[Static]**

| | |
|---|---|
| **Severity** | Low |
| **CVSS v3.1** | 3.1 — `AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N` |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Component** | `staticwebapp.config.json` → `Content-Security-Policy` |

**Description.** The CSP is strict for scripts (`script-src 'self'`,
`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`), but the
`style-src` directive includes `'unsafe-inline'` to support the styling approach
(Tailwind utility classes and Framer Motion inline styles):

```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

**Impact.** `'unsafe-inline'` for styles permits injected inline CSS, which
could theoretically be abused for limited UI-redress or CSS-based inference.
**Script injection remains fully blocked**, so the practical risk is low.

**Recommendation.** Accept as a documented trade-off, or (if the customer's
policy prohibits `'unsafe-inline'`) migrate to nonce- or hash-based styles.

---

### F-02 — Access tokens accessible to same-origin JavaScript  **[Static]**

| | |
|---|---|
| **Severity** | Low |
| **CVSS v3.1** | 3.1 — `AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N` |
| **OWASP** | A02:2021 – Cryptographic Failures / A07:2021 – Auth Failures |
| **Component** | `src/authConfig.js` → `cacheLocation: "sessionStorage"` |

**Description.** MSAL caches tokens in `sessionStorage`, which is readable by any
JavaScript executing on the application's origin. There is no more secure
alternative for a pure SPA without a backend (an HttpOnly cookie would require a
server the application deliberately does not have).

**Impact.** A successful XSS attack could read a token and impersonate the user
against Microsoft Graph for the token's lifetime. **This is contingent on an XSS
vulnerability existing**, which the assessment did not find — output is
auto-escaped by React, there are no dangerous DOM sinks, and the strict
`script-src 'self'` CSP blocks injected script execution.

**Mitigating controls already present.**
- `sessionStorage` (not `localStorage`) → tokens cleared when the tab closes.
- Strict CSP `script-src 'self'`.
- No `eval`, `dangerouslySetInnerHTML`, or `innerHTML` anywhere in the source.
- Delegated, read-only Graph scopes → a stolen token cannot write data.

**Recommendation.** No change required; the current design is the recommended
pattern for a backend-less SPA. Maintain the strict CSP and safe-rendering
practices that keep XSS out.

---

### F-03 — Public configuration values embedded in the JS bundle  **[Static]**

| | |
|---|---|
| **Severity** | Informational |
| **CVSS v3.1** | 0.0 |
| **Component** | Build output; `.env.example`, `src/authConfig.js` |

**Description.** `VITE_CLIENT_ID` (Entra application/client ID) and
`VITE_TENANT_ID` (directory/tenant ID) are compiled into the JavaScript bundle
at build time.

**Impact.** **None.** These are **public identifiers** by design and appear in
the client bundle of every SPA. They are not secrets and cannot be used to
authenticate without a valid user credential and the PKCE flow. The assessment
confirmed **no client secret, password, API key, connection string, or token**
is present anywhere in the source or bundle.

**Recommendation.** No change required. (`.env.example` documents this correctly
and `.env` is git-ignored.)

---

### F-04 — Third-party resource load (Google Fonts)  **[Static / Dynamic]**

| | |
|---|---|
| **Severity** | Informational |
| **CVSS v3.1** | 0.0 |
| **Component** | `index.html` (font `<link>`s); CSP `font-src` / `style-src` |

**Description.** The application loads web fonts from Google
(`fonts.googleapis.com`, `fonts.gstatic.com`). These hosts are explicitly
allow-listed in the CSP. This causes end-user browsers to make requests to a
third party (Google) for typography.

**Impact.** A minor **privacy** consideration (Google receives request metadata
such as IP address), not a security vulnerability. No application or programme
data is sent.

**Recommendation.** Acceptable for most organisations. If the customer's data-
privacy policy disallows third-party font hosting, self-host the fonts and
remove the two Google hosts from the CSP.

---

### F-05 — Security headers/CSP are hosting-platform-specific (Azure SWA)  **[Static]**

| | |
|---|---|
| **Severity** | Informational (deployment portability) |
| **CVSS v3.1** | 0.0 |
| **Component** | `staticwebapp.config.json` |

**Description.** The application's entire HTTP-header defence — Content-Security-
Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy, COOP — is delivered through `staticwebapp.config.json`,
which is **only honoured by Azure Static Web Apps**. If the application is
deployed to any other hosting platform, this file is **silently ignored** and
none of these protections apply unless they are re-implemented using the new
platform's own mechanism.

**Impact.** No impact while hosted on Azure Static Web Apps (as tested). If
migrated to another platform without re-implementing the headers, the app would
lose its CSP, HSTS, clickjacking, and MIME-sniffing protections — a significant
security regression.

**Recommendation.** If the customer migrates hosting, re-create the same headers
using the target platform's mechanism, then re-verify (§8, D-1). Equivalents:

| Platform | Header mechanism |
|----------|------------------|
| Azure Static Web Apps (current) | `staticwebapp.config.json` (in place) |
| Vercel | `vercel.json` → `headers` |
| Netlify | `netlify.toml` `[[headers]]` or a `_headers` file |
| AWS S3 + CloudFront | CloudFront **Response Headers Policy** |
| Azure Blob static website | Azure **Front Door** / CDN rules (Blob alone cannot set headers) |
| Cloudflare Pages | `_headers` file / Transform Rules |
| GitHub Pages | **Not supported** — cannot set HTTP headers (CSP only via `<meta>`, no HSTS). Not recommended for this app. |
| nginx / Apache | `add_header` / `Header set` in server config |

Also re-configure the SPA fallback route (deep links → `index.html`) and update
the Entra redirect URI to the new domain after any migration.

---

## 7. Positive security observations

| # | Control | Verified |
|---|---------|----------|
| P-1 | Strictly read-only — no edit/write capability in the UI and no write path to SharePoint | Source review |
| P-2 | No dangerous DOM sinks (`eval`, `dangerouslySetInnerHTML`, `innerHTML`, `document.write`) | Source review — none present |
| P-3 | All external (workbook) data rendered as auto-escaped text by React | Source review |
| P-4 | Zero known dependency vulnerabilities | `npm audit` — 0 across 138 deps |
| P-5 | Strict CSP for scripts (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`) | `staticwebapp.config.json` |
| P-6 | Full HTTP security-header set (HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP) | `staticwebapp.config.json` |
| P-7 | Modern authentication (OAuth2 Auth-Code + PKCE), no client secret | `src/authConfig.js`, `src/main.jsx` |
| P-8 | Least-privilege, delegated, read-only Graph scopes (`User.Read`, `Files.Read.All`, `Sites.Read.All`) | `src/authConfig.js` |
| P-9 | Tokens in `sessionStorage` (cleared on tab close), not `localStorage` | `src/authConfig.js` |
| P-10 | External link uses `rel="noreferrer"` (no reverse-tabnabbing) | `src/components/DashboardCanvas.jsx` |
| P-11 | HTTPS enforced (HSTS + `upgrade-insecure-requests`) | `staticwebapp.config.json` |

---

## 8. Dynamic checks to complete with the VAPT platform

Run the following against the **live URL** using your commercial VAPT platform
and record the outcomes here.

| # | Dynamic check | Expected result | Tool result |
|---|---------------|-----------------|-------------|
| D-1 | Security-header scan (e.g. securityheaders.com / scanner) | A/A+; all headers from P-6 present | _<paste>_ |
| D-2 | TLS/SSL configuration scan | TLS 1.2+; no weak ciphers; valid cert | _<paste>_ |
| D-3 | Automated crawl + active XSS/injection scan (authenticated) | No script-executing findings | _<paste>_ |
| D-4 | CSP effectiveness / bypass attempt | Inline/external script blocked | _<paste>_ |
| D-5 | Clickjacking (framing) test | Page refuses to frame (`DENY`) | _<paste>_ |
| D-6 | Authentication test: unassigned account | Blocked by Entra before app loads | _<paste>_ |
| D-7 | Session handling: sign-out completeness, token expiry | Tokens cleared; no reuse after sign-out | _<paste>_ |
| D-8 | Sensitive-data-in-response scan | No secrets/tokens/PII in served assets | _<paste>_ |
| D-9 | OAuth redirect-URI / state handling | No open-redirect; state/PKCE enforced | _<paste>_ |

> Attach the platform's raw report as **Appendix B**. If any dynamic check
> produces a finding, add it to §5/§6 with a CVSS rating and update the counts.

---

## 9. Conclusion

Based on the static assessment completed and pending confirmation of the dynamic
checks in §8, the GMR Sunrise Transformation Maturity Dashboard presents a **LOW
overall security risk** and is considered **suitable for deployment** into the
customer's environment. No critical, high, or medium-severity vulnerabilities
were identified. The residual low/informational items are documented, understood
trade-offs appropriate to a strictly read-only, backend-less single-page
application, each with a clear recommendation.

Recommended actions before/at go-live:
1. Complete the §8 dynamic checks with the VAPT platform and attach the output.
2. Perform the one post-deployment CSP verification (confirm the SharePoint
   download host is allow-listed — see the handover document).
3. Optionally address F-01 / F-04 if required by the customer's policies.
4. If hosting is ever moved off Azure Static Web Apps, action **F-05**
   (re-implement the security headers) and re-run §8 against the new URL.

---

## 10. Appendices

- **Appendix A** — Tooling: manual source review; `npm audit` (SCA);
  `<commercial VAPT platform name/version>` (DAST).
- **Appendix B** — Raw automated scan report (attach export).
- **Appendix C** — References: OWASP Top 10 (2021), OWASP WSTG, OWASP ASVS,
  CVSS v3.1 specification.

---

*This report reflects the security posture of version 1.0.0 at the assessment
date. Any subsequent code, dependency, or configuration change should be
re-assessed. Ratings for statically-confirmed findings are the assessor's;
dynamic findings are subject to the VAPT platform's output.*
