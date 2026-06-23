# Influuc — Phase 6: Browser Extension Design (Plasmo)

> Role (per founder decision, 2026-06-22 — **connect-first flow**): the extension is a **core onboarding step**. After the founder connects LinkedIn + X via OAuth (which gives us their verified profile URLs), they install the extension, and it uses their **own logged-in session** to **scrape the rich profile detail + posts** from those known accounts — content the official APIs and unauthenticated Firecrawl cannot reach. It continues to serve **ongoing own-session capture** afterward. Publishing stays on official APIs; the website is scraped by Firecrawl.
> Governing principle (`available-infrastructure.md`): *"User trust is more important than data collection."*
>
> ✅ **No sensitive permissions, no guessing.** The extension uses `activeTab`/`scripting` (+ optional `tabs`), never `history`. It scrapes only the specific profiles the founder authenticated via OAuth — targeted, own-data, explicit. This keeps store-review and trust risk low while getting data the API can't.
>
> ⚠️ **Dependency note:** because the extension is now on the onboarding critical path, it must ship before onboarding GA, and the **fallback** (OAuth/API data + Firecrawl + manual upload) must exist so a founder who declines the extension is degraded, never blocked (R4).

---

## 1. Extension Architecture

**Manifest V3, Plasmo, TypeScript.** Lives in `apps/extension`.

```
┌──────────────────────────────────────────────────────────────┐
│  POPUP (React)        OPTIONS PAGE         CONTENT SCRIPTS      │
│  - auth status        - manage capture     - linkedin.com/*     │
│  - "Import profile"     scopes, privacy     - x.com / twitter   │
│  - "Add to Brain"     - disconnect         (read DOM on action) │
│  - capture preview                                              │
└───────────────┬───────────────────────────────┬────────────────┘
                │ messages                        │ extracted, sanitised payload
                ▼                                  ▼
        ┌───────────────── BACKGROUND SERVICE WORKER ─────────────┐
        │  - holds short-lived Influuc token (mints via web app)   │
        │  - schedules nothing autonomously; acts only on user msg │
        │  - POSTs payloads to Influuc ingestion API (auth'd)      │
        │  - no platform secrets, no service-role keys             │
        └───────────────────────────┬─────────────────────────────┘
                                     │ HTTPS (Bearer = Influuc ext token)
                                     ▼
                    Influuc Web API  /api/ingest/extension
                    → validate schema → rate-limit → raw_sources → bootstrap/learning
```

### 1.1 Onboarding capture — scrape the OAuth-connected profiles
The accounts are already **identified and verified via OAuth** (Phase 5 Stage 2), so the extension knows exactly which profile URLs to read — no discovery, no history, no guessing.
1. After install, the web app hands the extension the connected LinkedIn/X profile URLs (+ a short-lived ingest token).
2. On "Import my profiles" (or automatically when the founder is on their own profile tab), the content script scrapes the **own-session** profile + recent posts.
3. Local **preview** of exactly what will be sent → founder confirms.
4. POST to `/api/ingest/extension` → `raw_sources` → `brain.bootstrap`. (Website is scraped separately by Firecrawl.)
5. **Fallback** if the founder skips/uninstalls: server uses OAuth/API fields + Firecrawl + manual upload. Degraded, never blocked.

### 1.2 Ongoing capture model — explicit, own-session, preview-then-send
1. Founder navigates to **their own** LinkedIn/X profile (already authenticated as themselves).
2. Clicks an Influuc action (popup or injected button): "Import my profile to Brain" / "Add this to my Brain."
3. Content script extracts **only the relevant DOM** (their profile text, their own posts) → sanitises → shows a **local preview** of exactly what will be sent.
4. Founder confirms → background worker POSTs to the authenticated ingestion endpoint.
5. Server normalises, validates, dedupes (`content_hash`), stores in `raw_sources`, triggers extraction.

No background polling. No silent collection. No capture of other users' private data. Every send is a deliberate, previewed action.

### 1.2 What it captures (scoped)
| Surface | Captured | Not captured |
|---|---|---|
| Own LinkedIn profile | headline, about, experience, own posts (public) | connections' private data, DMs, others' private posts |
| Own X profile | bio, own tweets/threads | DMs, protected accounts' content |
| Opportunity signals (opt-in) | public posts the founder explicitly marks as a signal | passive feed scraping |

---

## 2. Permission Requirements (least privilege)
```jsonc
// manifest (via Plasmo)
{
  "permissions": ["storage", "activeTab", "scripting"],
  "optional_permissions": ["tabs"],   // convenience for "capture my active profile tab"
  "host_permissions": [
    "https://*.linkedin.com/*",
    "https://x.com/*", "https://twitter.com/*",
    "https://app.influuc.com/*"
  ]
}
```
- **No `history` permission** — discovery is server-side (OAuth + Exa + Firecrawl). This is the key change that keeps the extension low-risk.
- **`activeTab` + `scripting`** over broad `tabs`: capture content runs only on the tab the founder acted in. `tabs` is optional, only to read the URL of the founder's already-open profile tab.
- **No `<all_urls>`**, no `webRequest`, no cookies permission, no history, no bookmarks.
- Host perms limited to the two platforms + the Influuc app origin.
- Justification strings prepared for each permission for store review — all are now low-sensitivity.

---

## 3. Browser Store Compliance Review
Chrome Web Store (and Edge) policy checklist:

| Requirement | Influuc posture |
|---|---|
| **Single purpose** | "Help founders enrich their Influuc Founder Brain by importing their own LinkedIn/X profile content." Narrow, stated. |
| **Minimum permissions** | storage/activeTab/scripting + optional `tabs`; no broad host perms; **no sensitive permissions** |
| **Limited Use / data policy** | data used solely to provide the user-facing feature; not sold; not used for ads; disclosed |
| **User data transparency** | privacy policy linked in store + options page; disclosure of every capture |
| **No remote code** | MV3 — all code bundled; no `eval`/remote scripts |
| **Affiliation clarity** | clearly "by Influuc"; not impersonating LinkedIn/X |
| **Scraping concern** | mitigated: own-session, explicit-action, user-owned data, preview-before-send (not automated harvesting) |

**Honest risk (R4) — ToS on extraction:** LinkedIn/X ToS restrict automated extraction. Mitigations (own data, explicit action, no automation, no bulk) lower but don't eliminate risk:
- Frame strictly as user-initiated handling of the user's *own* data.
- Provide a **non-extension fallback** (manual URL entry / paste / LinkedIn data-export upload) so the product never *depends* on the extension surviving review.
- Keep the API-write (publishing) path entirely ToS-compliant and independent.
- Decouple ingestion so the same payload works from extension *or* manual upload.

---

## 4. Security Considerations
- **No long-lived secrets in the extension.** It exchanges a Supabase session for a short-lived, narrowly-scoped Influuc *extension token* (TTL ~15 min, refreshable) minted by the web app. Token is `ingest`-scoped only.
- **No platform OAuth tokens, no Supabase service key** ever in the extension.
- **Server trusts nothing**: every payload is schema-validated (zod), size-capped, rate-limited per founder, and sanitised (strip scripts/HTML) before storage.
- **Origin checks** + message authentication between content script ↔ background ↔ web app (`externally_connectable` restricted to the Influuc origin).
- **CSP** locked down; no inline/remote script.
- **Tamper resistance**: server treats extension input as untrusted user input (same threat model as a form post).

---

## 5. Data Collection Strategy
- **No history, no passive collection.** The extension never reads browsing history and never runs in the background; it acts only on explicit capture clicks.
- **Collect the minimum that improves the Brain.** Profile + own posts cover expertise/story/writing_style/positioning — the layers hardest to infer from a website alone.
- **Provenance preserved**: captured content lands in `raw_sources(kind, captured_by='extension')` with the source URL, feeding `fact_provenance`.
- **Retention**: bulky raw payloads pruned after extraction (configurable); distilled facts + evidence snippets persist.
- **No third-party data**: never store other users' private information.

---

## 6. User Trust Considerations
Trust > data (the doc is explicit). Concretely:
- **No sensitive permissions** — no `history`; the install prompt is unalarming.
- **Preview every send** — the founder sees the exact payload before it leaves the browser.
- **Per-capture consent** — nothing is automatic; no background sync.
- **Plain-language disclosure** in the popup and options page: what, why, where it goes, how to delete.
- **One-click disconnect + data delete** from the options page and the web app.
- **Visible, not lurking**: the extension only acts when invoked; clear "Influuc captured X" confirmations.
- **Open about limits**: the extension reads only the founder's own profiles.

---

## 7. Decoupling (resilience)
The ingestion API accepts the identical normalised payload from multiple sources: the **extension** (onboarding + ongoing own-session capture — the primary, richest source), **OAuth/platform API** (verified identity + basic profile fields), **Firecrawl** (website), and **manual paste/upload** (fallback). The extension is the primary onboarding capture path, but if a founder declines it the Brain still gets fed from OAuth/API + Firecrawl + manual upload — degraded, never broken (directly addresses R1/R4).

---

*Next: Phase 7 — Implementation Plan (+ Testing, CI/CD, Security).*
