# GMR Sunrise Chart — Cloud Hosting Model Options

**Prepared for:** GMR SSC — IT Department
**Prepared by:** HARTS (Global Harts)
**Document date:** July 2026
**Application:** GMR Sunrise Chart

---

## Why This Document Exists

GMR IT has multiple vendor options for hosting this application and has not yet selected one. This document lays out the **three hosting models** that apply to this app, vendor-neutral, so IT can evaluate any vendor (Azure, AWS, GCP, or others) against the same criteria. The final choice of vendor and model is entirely GMR IT's decision — this document exists to make that decision fully informed.

**App profile driving all three models below:** a static single-page application (SPA), ~1.3MB total build output, no backend server, no database. Authentication and data (Microsoft Entra ID + SharePoint via Microsoft Graph) are handled entirely by Microsoft 365, outside this app's own infrastructure. Expected load: ~30 users.

---

## Model 1: All-in-One Static Web Hosting Service

**Examples:** Azure Static Web Apps, Netlify, Vercel, AWS Amplify Hosting, GCP Firebase Hosting

A single managed product that bundles storage, CDN, HTTPS, SPA routing, and custom headers together — you upload the built app and the rest is pre-wired.

| Aspect | Detail |
|---|---|
| Configuration required | None beyond uploading the `dist/` build output (~1.3MB) and, optionally, connecting a GitHub repo for automatic deploys |
| Machine specs (RAM/CPU/OS) | **Not applicable** — see explanation below |
| Storage/capacity to pre-select | Not applicable — fully managed |
| SLA | Varies by vendor — typically **not included on the free/entry tier**, and typically **included once you move to a paid tier**. The exact tier names and which paid tier includes the SLA differ by vendor (e.g. Azure Static Web Apps' free tier has no SLA, its Standard tier does; other vendors — Netlify, Vercel, AWS Amplify, Firebase Hosting — each have their own tier names and SLA policy, so this should be confirmed per vendor being evaluated). |
| Ongoing maintenance | None — fully managed by the vendor |
| Best fit | Lowest setup effort — a single resource to manage, ideal if minimizing configuration/maintenance is the priority |

**Why RAM/CPU/OS don't apply:** this is a fully managed ("serverless"/PaaS) service. The vendor never exposes an underlying machine to the customer at all — there is no server for GMR IT to provision, size, or patch. The vendor runs the app on its own shared infrastructure behind the scenes, and bills for the service, not for a machine. Asking "how much RAM does it have" doesn't have an answer here, the same way asking "what engine oil grade" doesn't apply to an electric car — the component simply isn't part of this architecture.

---

## Model 2: Object Storage + CDN (Assembled Manually)

**Examples:** AWS S3 + CloudFront, Azure Blob Storage + Azure CDN/Front Door, GCP Cloud Storage + Cloud CDN

The same end result as Model 1, but built from separate primitives instead of one bundled product — more configuration, but more control and typically the lowest cost.

| Aspect | Detail |
|---|---|
| Configuration required | Storage bucket/container settings (static website hosting mode, index/error document), CDN settings (HTTPS, compression, SPA fallback rewrite rule), custom response headers replicated manually (CSP, HSTS, X-Frame-Options, etc.), cache-control policy per path, DNS/custom domain |
| Machine specs (RAM/CPU/OS) | **Not applicable** — see explanation below |
| Storage/capacity to pre-select | Not applicable — fully elastic; you pay only for actual bytes stored and transferred, no capacity to reserve or plan for in advance |
| SLA | Yes — both object storage and CDN typically carry their own published vendor SLA individually, even without paying a premium tier |
| Ongoing maintenance | Low — one-time setup of bucket + CDN rules; no day-to-day upkeep once configured correctly |
| Best fit | SLA-backed with the least amount of paid infrastructure; trade-off is more manual setup work upfront (headers, rewrite rules, cache policy must be configured by hand rather than provided out of the box) |

**Why RAM/CPU/OS don't apply:** object storage and CDN are also fully managed services, just assembled from two separate managed products instead of one bundled product. Neither the storage layer nor the CDN layer runs on a machine that GMR IT provisions or sees — both scale and are maintained entirely by the vendor. There is still no server here to size; the only configuration involved is settings (cache rules, headers, redundancy tier), not hardware specs.

---

## Model 3: Traditional Virtual Machine (VM / IaaS)

**Examples:** Azure VM, AWS EC2, GCP Compute Engine, or an on-premises server

Renting (or provisioning) a full virtual machine and installing your own web server software on it — the traditional server-hosting approach.

| Aspect | Detail |
|---|---|
| CPU | 1 vCPU |
| RAM | 2 GB |
| Storage | 20 GB disk (standard minimum disk allocation; the app itself is only 1.3MB) |
| OS | Ubuntu 22.04 LTS (Linux) — or Windows Server 2019+ if GMR IT standardizes on Windows |
| Web server software | Nginx or Apache (Linux) / IIS (Windows) — to serve the static files over HTTPS |
| Network | Public IP with port 443 (HTTPS) open; TLS certificate installed |
| Bandwidth | Negligible — well within any provider's smallest allowance for 30 users |
| SLA | Yes, on the VM itself — but OS patching, security updates, and web server maintenance become GMR's/the vendor-support-contract's ongoing responsibility |
| Ongoing maintenance | Required — OS patches, security updates, and web server configuration must be maintained over time, unlike Models 1 and 2 |
| Best fit | Only relevant if organizational policy specifically requires traditional server-based hosting (e.g., compliance or existing infrastructure standards). For this app's actual workload, it adds ongoing maintenance responsibility with no functional benefit over Models 1 or 2. |

**Why RAM/CPU/OS apply here, unlike the other two models:** a VM is the one model where the vendor hands GMR IT a raw machine and steps back — the vendor's responsibility ends at the hardware/hypervisor layer. Everything above that (the OS, patching, the web server software, security updates) is GMR's own responsibility to configure and maintain, which is exactly why this is the only model where specifying RAM/CPU/OS is meaningful.

---

## Side-by-Side Comparison

| Aspect | Model 1: Static Hosting Service | Model 2: Object Storage + CDN | Model 3: Traditional VM |
|---|---|---|---|
| Configuration needed | Minimal (upload only) | Moderate (bucket + CDN + headers + cache rules) | Full (OS, web server, patching, TLS) |
| RAM / CPU / OS to specify | Not applicable — no machine exposed to GMR IT | Not applicable — no machine exposed to GMR IT | 1 vCPU / 2GB RAM / 20GB disk / Linux or Windows |
| Storage size / user-capacity to pre-select | Not applicable | Not applicable | Fixed disk size chosen upfront |
| SLA | Varies by vendor — typically none on free tier, included on a paid tier (confirm per vendor) | Yes (per-component) | Yes (VM uptime), but patching is a separate responsibility |
| Ongoing maintenance | None | Low (one-time setup) | Ongoing (OS + web server upkeep) |
| Best fit | Fastest to deploy, least effort | SLA included with minimal paid infrastructure, more setup effort | Only if policy mandates VM-based hosting |

---

## Note on Choice of Model and Vendor

All three models are technically capable of hosting this application reliably at its current scale (~30 users, 1.3MB static site). The choice between them is a trade-off between **setup effort, ongoing maintenance, and cost** — not a functional limitation of any option. GMR IT should select whichever model and vendor best fits existing infrastructure standards, compliance requirements, and team expertise.
