# Vulnerability Assessment & Penetration Test (VAPT) Report

## GMR Sunrise — Transformation Maturity Dashboard

| | |
|---|---|
| **Application** | GMR Sunrise — Transformation Maturity Dashboard |
| **Version tested** | 1.0.0 |
| **Application type** | Frontend-only single-page application (React SPA) |
| **Hosting (as tested)** | Azure Static Web Apps (static files + CDN) |
| **Live URL tested** | https://victorious-desert-04521ca10.7.azurestaticapps.net/ |
| **Assessment type** | Grey-box — static code/config review + dependency audit + automated dynamic scan (DAST) |
| **DAST tooling** | Snyk API & Web (formerly Probely) |
| **Report classification** | Confidential |
| **Prepared by** | Madhanraj & Naresh |
| **Prepared for** | GMR SSC |
| **Assessment dates** | 11–13 July 2026 |
| **Report version / date** | 1.0 — 13 July 2026 |

---

## 1. Executive summary

A security assessment was performed on the GMR Sunrise Transformation Maturity
Dashboard prior to its deployment into the customer's Microsoft 365 / Azure
environment. The assessment combined a **manual review of the complete
application source code and configuration**, a **software-composition
(dependency) audit**, and an **automated dynamic scan (DAST)** of the deployed
application using the commercial platform **Snyk API & Web**.

The application is a **frontend-only single-page application** with **no
backend server, no application database, and no server-side code**. All logic
executes in the end-user's browser. It is **strictly read-only** — it renders a
single Excel workbook from SharePoint and provides **no facility to edit or
write data** of any kind. It authenticates users against **Microsoft Entra ID**
using the **OAuth 2.0 Authorization Code flow with PKCE**, and reads the
workbook through the **Microsoft Graph API** using **delegated, read-only**
permissions. Because there is no server-side attack surface and no write path,
entire vulnerability classes (SQL injection, server-side request forgery, server
RCE, insecure direct object references, data tampering) are **not applicable**.

**Overall risk rating: LOW.**

No critical, high, or medium-severity vulnerabilities were identified across the
source review, the dependency audit (0 known vulnerabilities), or the automated
dynamic scan. The dynamic scan crawled the application and ran active checks for
injection, cross-site scripting, sensitive-data exposure and open redirects, and
returned **no such findings**. Three **low-severity** and three
**informational** observations were recorded; each is a common, well-understood
trade-off, and each is accompanied by a recommendation.

> **Scope of this rating.** This assessment reflects the application as deployed
> on **Azure Static Web Apps**. If it is later migrated to a different hosting
> platform, the static/code findings remain valid, but the dynamic checks (§8)
> should be re-run against the new URL and the platform-portability item **F-06**
> must be actioned.

### Findings at a glance

| Severity | Count |
|----------|:-----:|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 3 |
| Informational | 3 |
| **Total** | **6** |

---

## 2. Scope

### 2.1 In scope

| Target | Detail |
|--------|--------|
| Deployed web application | https://victorious-desert-04521ca10.7.azurestaticapps.net/ (Azure Static Web Apps) |
| Application source code | Complete React/Vite SPA source (`src/`, 18 files) |
| Hosting / header configuration | `public/staticwebapp.config.json` |
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
- Azure Static Web Apps platform (except its externally-observable TLS/header configuration)
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
   deployed application with **Snyk API & Web** (crawl + active vulnerability
   checks, TLS and HTTP-header inspection).
4. **Manual verification** — authentication flow, client-side storage,
   clickjacking, and security-header enforcement.

### 3.1 Risk rating

Severity is rated using **CVSS v3.x**. Qualitative bands: Critical 9.0–10.0,
High 7.0–8.9, Medium 4.0–6.9, Low 0.1–3.9, Informational 0.0. Low-severity
finding scores below are taken directly from the Snyk platform where it
reported them.

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
| F-01 | Content-Security-Policy permits `'unsafe-inline'` for styles | Low | 3.7 | Open (accepted) |
| F-02 | Access tokens accessible to same-origin JavaScript (`sessionStorage`) | Low | 3.1 | Open (mitigated) |
| F-03 | Weak TLS cipher suites offered by the hosting platform | Low | 4.2 | Open (platform-managed) |
| F-04 | Public configuration values embedded in the JS bundle | Informational | 0.0 | By design |
| F-05 | Third-party resource load (Google Fonts) | Informational | 0.0 | Open (optional) |
| F-06 | Security headers/CSP are hosting-platform-specific (Azure SWA) | Informational | 0.0 | Open (portability) |

---

## 6. Detailed findings

### F-01 — Content-Security-Policy permits `'unsafe-inline'` for styles  **[Static · confirmed by DAST]**

| | |
|---|---|
| **Severity** | Low |
| **CVSS v3.0** | 3.7 — `AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Component** | `public/staticwebapp.config.json` → `Content-Security-Policy` |
| **Source** | Vendor source review; **independently confirmed by Snyk API & Web DAST (13 Jul 2026)** |

**Description.** The CSP is strict for scripts (`script-src 'self'`,
`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`), but the
`style-src` directive includes `'unsafe-inline'`:

```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

The automated Snyk scan independently flagged the same single issue —
*"unsafe 'unsafe-inline' in the style-src directive"* — confirming this is the
only CSP weakness present.

**Impact.** `'unsafe-inline'` for styles permits injected inline CSS, which
could theoretically be abused for limited UI-redress or CSS-based inference.
**Script injection remains fully blocked** (`script-src 'self'`), so JavaScript
/ XSS execution is not possible via this weakness; the practical risk is low.

**Recommendation.** `'unsafe-inline'` for styles is **required** by this
application's stack — React inline styles (`style={{…}}`) and Framer Motion
animations both set inline styles at runtime, which cannot use nonces/hashes.
It is therefore **accepted as a documented low residual risk**. If the
customer's policy forbids `'unsafe-inline'`, the alternative is a significant
refactor to remove all inline styles and adopt nonce-based styling.

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
vulnerability existing** — none was found (output is auto-escaped by React,
there are no dangerous DOM sinks, and the automated scan reported no XSS).

**Mitigating controls already present.**
- `sessionStorage` (not `localStorage`) → tokens cleared when the tab closes
  (verified in dynamic check D-7).
- Strict CSP `script-src 'self'`.
- No `eval`, `dangerouslySetInnerHTML`, or `innerHTML` anywhere in the source.
- Delegated, read-only Graph scopes → a stolen token cannot write data.

**Recommendation.** No change required; the current design is the recommended
pattern for a backend-less SPA. Maintain the strict CSP and safe-rendering
practices that keep XSS out.

---

### F-03 — Weak TLS cipher suites offered by the hosting platform  **[Dynamic]**

| | |
|---|---|
| **Severity** | Low |
| **CVSS v3.0** | 4.2 — `AV:A/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N` |
| **OWASP** | A02:2021 – Cryptographic Failures |
| **Component** | Azure Static Web Apps TLS termination (**platform-managed**) |
| **Source** | Snyk API & Web DAST (13 Jul 2026) |

**Description.** The HTTPS endpoint offers some legacy cipher suites that do not
provide forward secrecy (`TLS_RSA_WITH_AES_128/256_CBC_SHA(256)`,
`TLS_RSA_WITH_AES_128/256_GCM_SHA*`) and some CBC-mode ciphers (theoretically
exposed to padding-oracle attacks). These cipher suites are part of the **Azure
Static Web Apps TLS configuration, which Microsoft manages** — the application
cannot change the cipher list on `*.azurestaticapps.net`.

**Impact.** Low. Exploitation requires an attacker positioned on the network
path (`AV:A`) able to intercept and downgrade a connection. In practice, modern
browsers negotiate the strong ECDHE/GCM and TLS 1.3 suites the same server also
supports; Qualys SSL Labs rated the endpoint **Grade A** overall (see D-2). The
weakness applies only to legacy clients that negotiate the older suites.

**Recommendation.** This is **platform-managed** and cannot be edited directly on
Azure Static Web Apps. To enforce a stricter, forward-secrecy-only policy, front
the application with **Azure Front Door (Premium)** using a custom TLS security
policy (TLS 1.2+ with ECDHE/GCM suites only). Given the overall Grade A rating
and the low exploitability, it may reasonably be **accepted as a low residual
risk** where Front Door is not warranted.

---

### F-04 — Public configuration values embedded in the JS bundle  **[Static]**

| | |
|---|---|
| **Severity** | Informational |
| **CVSS** | 0.0 |
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

### F-05 — Third-party resource load (Google Fonts)  **[Static]**

| | |
|---|---|
| **Severity** | Informational |
| **CVSS** | 0.0 |
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

### F-06 — Security headers/CSP are hosting-platform-specific (Azure SWA)  **[Static]**

| | |
|---|---|
| **Severity** | Informational (deployment portability) |
| **CVSS** | 0.0 |
| **Component** | `public/staticwebapp.config.json` |

**Description.** The application's entire HTTP-header defence — Content-Security-
Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy, COOP — is delivered through `staticwebapp.config.json`,
which is **only honoured by Azure Static Web Apps**. If the application is
deployed to any other hosting platform, this file is **silently ignored** and
none of these protections apply unless re-implemented using the new platform's
own mechanism.

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
| GitHub Pages | **Not supported** — cannot set HTTP headers. Not recommended for this app. |
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
| P-5 | No injection / XSS / open-redirect / sensitive-data findings in the dynamic scan | Snyk API & Web DAST |
| P-6 | Strict CSP for scripts (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`) | `staticwebapp.config.json` |
| P-7 | Full HTTP security-header set — securityheaders.com **A+** | `staticwebapp.config.json` + D-1 |
| P-8 | Valid TLS, TLS 1.3 supported — Qualys SSL Labs **Grade A** | D-2 |
| P-9 | Modern authentication (OAuth2 Auth-Code + PKCE), no client secret | `src/authConfig.js`, `src/main.jsx` |
| P-10 | Least-privilege, delegated, read-only Graph scopes | `src/authConfig.js` |
| P-11 | Tokens in `sessionStorage` (cleared on tab close), not `localStorage` | D-7 |
| P-12 | Unassigned users blocked by Entra before the app loads | D-6 |

---

## 8. Dynamic assessment results

Performed against the live URL. D-1/D-2/D-5/D-6/D-7 verified manually and via
free scanners; D-3/D-4/D-8/D-9 by the Snyk API & Web automated scan.

| # | Check | Expected result | Result |
|---|-------|-----------------|--------|
| D-1 | Security-header scan (securityheaders.com) | A/A+; all headers present | **PASS — A+**, all 6 headers present (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). 11 Jul 2026. |
| D-2 | TLS/SSL configuration scan (Qualys SSL Labs) | TLS 1.2+; valid cert | **PASS — Grade A**, TLS 1.3, valid cert, CAA present. 11 Jul 2026. (See F-03 for legacy cipher note.) |
| D-3 | Automated crawl + active XSS/injection scan (Snyk) | No script-executing findings | **PASS — no XSS/injection findings.** 13 Jul 2026. |
| D-4 | CSP effectiveness / bypass (Snyk) | Inline/external script blocked | **PASS with note — CSP present; `script-src 'self'` effective. Only `style-src 'unsafe-inline'` flagged → finding F-01.** 13 Jul 2026. |
| D-5 | Clickjacking (framing) test | Page refuses to frame (`DENY`) | **PASS — site refused to load in an iframe; blocked per `X-Frame-Options: DENY`.** 11 Jul 2026. |
| D-6 | Authentication: unassigned account | Blocked by Entra before app loads | **PASS — unassigned user rejected by Entra (AADSTS50105) before the app loaded.** 11 Jul 2026. |
| D-7 | Session handling: sign-out / token expiry | Tokens cleared; no reuse after sign-out | **PASS — after sign-out, returned to sign-in screen and all MSAL tokens cleared from `sessionStorage`.** 11 Jul 2026. |
| D-8 | Sensitive-data-in-response scan (Snyk) | No secrets/tokens/PII in served assets | **PASS — no information-disclosure findings.** 13 Jul 2026. |
| D-9 | OAuth redirect-URI / open-redirect (Snyk) | No open redirect; state/PKCE enforced | **PASS — no open-redirect findings.** 13 Jul 2026. |

> The Snyk automated scan (13 Jul 2026, unauthenticated, "Normal" profile,
> "Complete" scope) crawled the application and reported **0 Critical / 0 High /
> 0 Medium and 2 Low** findings — the CSP item (F-01) and the platform cipher
> item (F-03), both detailed above. The full Snyk export is attached as
> **Appendix B**.

---

## 9. Conclusion

The GMR Sunrise Transformation Maturity Dashboard presents a **LOW overall
security risk** and is considered **suitable for deployment** into the customer's
environment. No critical, high, or medium-severity vulnerabilities were
identified by source review, dependency audit, or the automated dynamic scan.
The residual low/informational items are documented, understood trade-offs
appropriate to a strictly read-only, backend-less single-page application, each
with a clear recommendation.

Recommended actions:
1. **F-01** (CSP `style-src 'unsafe-inline'`) — accepted low; required by the
   stack. No action needed unless policy forbids it.
2. **F-03** (platform cipher suites) — Azure-managed; accept, or front with Azure
   Front Door for a stricter TLS policy if required.
3. Perform the one post-deployment CSP verification (confirm the SharePoint
   download host is allow-listed — see the handover document).
4. **F-05** (Google Fonts) — optional; self-host fonts if policy requires.
5. **F-06** — if hosting ever moves off Azure Static Web Apps, re-implement the
   security headers and re-run §8 against the new URL.

---

## 10. Appendices

- **Appendix A** — Tooling: manual source review; `npm audit` (SCA);
  **Snyk API & Web** (DAST).
- **Appendix B** — Snyk API & Web scan report (PDF export attached).
- **Appendix C** — Evidence screenshots (D-1 to D-9).
- **Appendix D** — References: OWASP Top 10 (2021), OWASP WSTG, OWASP ASVS,
  CVSS v3.x specification.

---

*This report reflects the security posture of version 1.0.0 at the assessment
dates. Any subsequent code, dependency, or configuration change should be
re-assessed.*
