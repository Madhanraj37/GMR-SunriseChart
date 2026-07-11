# Internal Security Pre-Assessment — GMR Sunrise Transformation Maturity Dashboard

> **What this is.** A vendor-authored, source-code-based security review carried
> out *before* the independent VAPT, so the third-party test finds fewer issues
> and completes faster. It documents the security posture and the controls
> already in place.
>
> **What this is NOT.** It is **not** the independent VAPT report and does not
> satisfy a "3rd-party VAPT" requirement on its own. It is supporting evidence to
> give the accredited tester (see `VAPT_SCOPE.md`).

| | |
|---|---|
| **Application** | GMR Sunrise — Transformation Maturity Dashboard v1.0.0 |
| **Assessment type** | Static source review + dependency audit (SAST-style) |
| **Assessed by** | _<your name / team>_ |
| **Date** | _<fill in>_ |
| **Method** | Manual source review of `src/` + `staticwebapp.config.json`; `npm audit` |

---

## 1. Executive summary

The application is a frontend-only React SPA with no backend, no database, and
no server-side code. Its attack surface is therefore limited to client-side
concerns: cross-site scripting, token/session handling, OAuth configuration,
HTTP security headers, and dependency risk.

The pre-assessment found **no high or critical issues** in the source. Security
controls are appropriate for the architecture and, in several areas (CSP,
dependency hygiene, safe rendering), notably strong. A small number of
**informational / low** observations are listed in §4 for the independent
tester's attention — none is a confirmed vulnerability, and all are typical
trade-offs for a SPA of this type.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| Informational | 3 |

> These are self-assessed ratings from a source review. Final ratings are for
> the independent tester to confirm.

---

## 2. Scope of this review

- All application source under `src/` (18 files).
- Authentication/config: `authConfig.js`, `main.jsx`, `AuthGate.jsx`.
- Data access: `graphExcel.js`.
- Security headers / hosting: `staticwebapp.config.json`.
- Dependency tree: `package.json` + `npm audit`.

Not covered (requires the live deployment — for the independent VAPT):
runtime CSP enforcement, live OAuth redirect handling, TLS configuration, and
behaviour against a deliberately hostile workbook.

---

## 3. Controls verified (strengths)

| # | Control | Evidence |
|---|---------|----------|
| S1 | **No dangerous DOM sinks** | No `eval`, `dangerouslySetInnerHTML`, `innerHTML`, or `document.write` anywhere in `src/`. All spreadsheet content is rendered as escaped text by React. |
| S2 | **Clean dependency tree** | `npm audit` reports **0 vulnerabilities** across 138 dependencies. |
| S3 | **Strong Content-Security-Policy** | `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`; `connect-src` restricted to required Microsoft hosts. |
| S4 | **Modern auth, no secret** | OAuth 2.0 Authorization Code + PKCE via MSAL; no client secret exists (correct for a SPA). |
| S5 | **Least-privilege data access** | Delegated, read-only Graph scopes only: `User.Read`, `Files.Read.All`, `Sites.Read.All`. App cannot write and cannot exceed the signed-in user's own permissions. |
| S6 | **Transport security** | HSTS (`max-age=31536000; includeSubDomains`) + `upgrade-insecure-requests` in CSP. |
| S7 | **Clickjacking protection** | `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`. |
| S8 | **No tabnabbing** | The single external link (`DashboardCanvas.jsx`) uses `rel="noreferrer"`. |
| S9 | **Reduced token lifetime exposure** | Tokens in `sessionStorage`, cleared when the tab closes (not persisted to `localStorage`). |
| S10 | **Hardened Permissions-Policy** | Camera, microphone, geolocation, USB, payment, etc. all disabled. |

---

## 4. Observations for the independent tester

None of the below is a confirmed vulnerability; they are the trade-offs a
competent tester will examine, documented here proactively.

### 4.1 (Low) `style-src 'unsafe-inline'` in the CSP
`staticwebapp.config.json` allows `'unsafe-inline'` for **styles** (required by
Tailwind's inline style usage and Framer Motion). Script injection is fully
blocked (`script-src 'self'`), so the residual risk is limited to CSS-based
exfiltration/UI-redress, which is low. *Recommendation:* accept as a documented
trade-off, or migrate to nonce/hash-based styles if the customer's policy
forbids `'unsafe-inline'`.

### 4.2 (Low) Access tokens reachable by same-origin JavaScript
Tokens are held in `sessionStorage`, which is readable by any script running on
the origin. This is the standard SPA model and is mitigated by the strict CSP
(S3) and the absence of dangerous sinks (S1) — a successful XSS would be
required to abuse it, and the CSP makes that hard. *Recommendation:* keep CSP
strict; the tester should attempt DOM XSS via workbook content to confirm the
mitigation holds.

### 4.3 (Informational) Client-side Editor allow-list
`VITE_ADMIN_EMAILS` gates the Editor "toggle" purely in the browser. This is
**not** a security boundary — but it does not need to be, because the app
performs **no write operations**; the toggle only affects on-screen state for
the session. *Recommendation:* no change; ensure the tester confirms no write
path exists.

### 4.4 (Informational) Public configuration values in the bundle
`VITE_CLIENT_ID` and `VITE_TENANT_ID` are embedded in the JS bundle. These are
public identifiers by design (true of every SPA) and are not secrets. Confirmed
there are no passwords, client secrets, or API keys in the source.
*Recommendation:* no change.

### 4.5 (Informational) SheetJS sourced from vendor CDN tarball
`xlsx` is pinned to `https://cdn.sheetjs.com/xlsx-0.20.3/...` in `package.json`
(SheetJS is not published to the public npm registry). It is fetched at
**install/build** time and bundled into `dist/` — it is **not** loaded from a
CDN at runtime. *Recommendation:* keep the version pinned; verify the tarball
integrity via the committed `package-lock.json` in CI.

---

## 5. Remediation status before VAPT

| Observation | Action taken | Residual |
|-------------|--------------|----------|
| 4.1 style-src unsafe-inline | Documented as accepted trade-off | Low, accepted |
| 4.2 token storage | CSP kept strict; sessionStorage (not localStorage) | Low, mitigated |
| 4.3 client-side editor gate | Confirmed no write operations exist | None (by design) |
| 4.4 public config in bundle | Confirmed no secrets present | None |
| 4.5 CDN tarball | Version pinned; lockfile committed | Informational |

No code changes were required to reach a state ready for independent testing.

---

## 6. Recommendation

The application is in a **strong, VAPT-ready state**. Proceed with the
independent third-party engagement per `VAPT_SCOPE.md`. Expected outcome: a
small number of low/informational findings, most of which are documented above.
