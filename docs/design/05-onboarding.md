# Influuc — Phase 5: Onboarding Design

> "The system should do the work. The user should provide confirmation." — `onboarding.md`
> North star reaction: **"How does it already know that?"** Minimise typing, maximise demonstrated intelligence, reach a useful Founder Brain fast.

---

## 1. Complete User Journey

> **Connect-first flow (founder decision, 2026-06-22 — canonical; supersedes the Exa-seed and history variants).** The founder connects their accounts (OAuth) immediately after Start. OAuth gives us their **verified** LinkedIn/X identity (handles, profile URLs, website link) and the publish grant in one step. We then ask them to **install the extension**, which uses their own logged-in session to **scrape the rich detail** from those now-known profiles (content the official APIs and unauthenticated Firecrawl can't reach). Firecrawl scrapes the website. **No browsing-history permission.**

```
Landing ─► Connect Accounts (OAuth: LinkedIn + X) ─► Install Extension
   ─► Extension scrapes connected profiles (+ Firecrawl scrapes website)
   ─► Analysis ─► Founder Summary ─► Paywall ─► Stripe Trial ─► Preferences ─► Dashboard
```

| # | Stage | Founder effort | System work | Brain effect |
|---|---|---|---|---|
| 1 | Landing | read, click "Start" + sign in | account/founder rows | — |
| 2 | Connect Accounts | 1-click connect LinkedIn + X (OAuth) | verify identity → store profile URLs/handles + website link; tokens→Vault; **same grant covers publishing** | seeds identity (verified) |
| 3 | Install Extension | install + mint ext token | hand the connected profile URLs to the extension | enables deep capture |
| 4 | Capture | one click "Import my profiles" (or auto on the open tab) | extension scrapes the **own-session** LinkedIn/X profiles + posts → `raw_sources`; **Firecrawl** scrapes the website | rich candidates across layers |
| 5 | Analysis | wait (~30–90s) w/ live progress | Extractor → Reconciler over scraped sources | candidate facts across layers |
| 6 | Founder Summary | confirm/correct cards | render Brain as confirmable cards w/ confidence | corrections snap confidence→high |
| 7 | Paywall | review plan | present value-anchored plan | — |
| 8 | Stripe Trial | enter payment | Stripe trial/subscription | `subscriptions` row |
| 9 | Preferences | pick mode + a few toggles | persist `operating_preferences` | sets autonomy/guardrail thresholds |
| 10 | Dashboard | review first opportunity/draft | run discovery once + generate 1 draft | first leverage moment |

**Why this works:**
- **OAuth first = verified identity, zero guessing.** We *know* the accounts because the founder authenticated them; the same connection is the publish grant, so we never ask twice.
- **Extension scrapes what APIs can't.** LinkedIn's API won't return full profile/posts; the extension reads them from the founder's own session. We already know exactly *which* profiles to scrape (from OAuth), so it's a targeted, own-data action — no history, no guessing.
- **Website via Firecrawl.** The website URL comes from the connected LinkedIn/X profile (or a quick confirm); Firecrawl scrapes it.

**Design tension noted:** the founder connects + installs the extension *before* seeing the Brain summary (Stage 6). Value still precedes payment (Stages 4–6 before 7–8). Fallback if the founder skips the extension: capture from the OAuth/API data + Firecrawl + manual upload — degraded, never blocked (see §5).

---

## 2. Screen-by-Screen Breakdown

### S1 — Landing
- One screen. Headline = the inversion ("Your expertise, operated into authority. ~10 min/week."). One primary CTA. No feature list.
- Auth: magic-link or Google. Account + founder rows created on first auth.

### S2 — Connect Accounts (OAuth — first real step)
- "Connect your accounts so Influuc can understand you and operate for you." Two prominent buttons: **Connect LinkedIn**, **Connect X**.
- X OAuth 2.0 PKCE, LinkedIn OAuth — request **identity + publish** scopes together (`w_member_social`; `tweet.write`/`users.read`/`offline.access`) so we never ask twice. Tokens server-side → Vault.
- On return we store verified handles, profile URLs, and any website link from the profile. Each screen states exactly what's granted.
- At least one connection encouraged; a "skip for now" path exists but is nudged ("Influuc works best with at least one connected account").

### S3 — Install Extension
- "Install Influuc to import your profile detail — it reads only your own LinkedIn/X, only when you click." One-click install (Plasmo); web app mints a short-lived ingest-scoped token and hands the extension the connected profile URLs from Stage 2.
- Plain-language disclosure: own-session only, you'll preview what's sent, no browsing history, uninstall anytime.

### S4 — Capture (extension scrapes the connected profiles)
- The extension uses the founder's **own logged-in session** to scrape their LinkedIn + X profiles and recent posts (the URLs are already known from OAuth) → preview → POST to `/api/ingest/extension` → `raw_sources`.
- In parallel, **Firecrawl** scrapes the website (URL from the LinkedIn/X profile or a quick confirm field).
- Confirmation kicks `brain.bootstrap`. Fallback if the extension is skipped: use OAuth/API data + Firecrawl + manual upload.

### S5 — Analysis (the "intelligence" moment)
- Full-screen progress with **honest live steps**: "Reading your site… Found 3 services… Analysing your LinkedIn… Detecting your writing style…". Each tick is a real job event (via Supabase Realtime).
- Never a fake spinner — real provenance scrolling builds trust.
- Typical 30–90s; if slow, continues in background and emails when ready.

### S6 — Founder Summary (confirmation, not creation)
- The Brain rendered as **confirmable cards**, grouped by layer, ordered by salience:
  - "We believe you **sell** fractional CFO services to seed-stage SaaS founders. ✓ Correct / ✏️ Fix"
  - "Your **strongest expertise**: SaaS pricing & burn management."
  - "Your **audience**: technical founders raising seed/Series A."
  - "Your **positioning**: the operator's CFO, not the spreadsheet CFO."
- Each card shows a subtle confidence cue; low-confidence cards explicitly ask ("We're not sure about your positioning — is this right?").
- Every confirm/fix writes to the Brain instantly (correction = confidence→0.95). **This is the highest-leverage Brain-building interaction in the product.**
- Microcopy keeps effort low: tap to confirm, optional inline edit. No long text fields.

### S7 — Paywall
- Value-anchored plan screen shown *after* the summary, so the founder has already seen the Brain work. Copy frames it as "activate your operator," not "pay for software."

### S8 — Stripe Trial
- Stripe Checkout (or Payment Element). Trial default; `subscriptions` row created.
- Publishing is already authorized (the Stage-2 OAuth grant included publish scopes), so there's no separate connect step here.

### S9 — Operating Preferences
- Single screen, three big choices (Manual / Assisted / Autopilot) with plain-language consequences.
- If Autopilot: a clear consent panel — daily cap, kill-switch location, "you can undo any post," guardrail explanation. Autopilot requires an explicit acknowledgement (liability hygiene, R3).
- A couple of optional toggles: prohibited topics, preferred platforms.

### S10 — Dashboard (first outcome)
- On landing, trigger one discovery run + generate one on-voice draft tied to a real opportunity.
- Show: "Here's an opportunity we found for you, and a post in your voice." with the `match_reason`.
- Founder can approve/publish (or just admire). This is the "Influuc already handled it" promise, delivered on day one.
- The dashboard is intentionally sparse: a short queue of decisions, not a control panel.

---

## 3. State Management
- **Server-authoritative** onboarding state on `founders.onboarding_state` (enum): `landing → connect → extension → capture → analysis → summary → paywall → trial → preferences → done`. The client reflects it; resuming mid-flow always lands on the correct stage (works across devices, survives the async analysis wait).
- **Realtime** (Supabase) streams capture + `brain.bootstrap` progress events into the Capture/Analysis stages.
- Client uses a lightweight state machine (XState-style) mirroring the enum; transitions are gated by server confirmation, never optimistic for irreversible steps (OAuth, payment).
- OAuth (Stage 2 `connect`) is the identity *and* publish grant; the extension (Stage 3–4) receives the connected profile URLs and reports scraped payloads to the web app, advancing `analysis`.
- Resumability: if the founder closes during Capture/Analysis, work continues server-side; a Resend email ("Your Founder Brain is ready") deep-links back to the Summary stage.

---

## 4. Success States
| Stage | Success |
|---|---|
| Connect | ≥1 account connected via OAuth (identity + publish grant) |
| Extension/Capture | extension installed + ≥1 profile scraped (or fallback used); Firecrawl scraped website |
| Analysis | bootstrap produced ≥ N candidate facts across ≥ 4 layers |
| Summary | founder confirmed/corrected the high-salience cards; key layers reach confidence ≥ 0.7 |
| Trial | active trial/subscription |
| Dashboard | ≥1 opportunity surfaced + ≥1 on-voice draft produced |

Overall success metric (from doc): founder reaches a **useful Brain** with minimal typing. Tracked: time-to-summary, % cards confirmed vs edited, typing volume, completion rate.

---

## 5. Failure States (and graceful handling)
| Failure | Handling |
|---|---|
| OAuth declined / not connected | nudge value; allow "skip"; fall back to manual URL entry + 3 light multiple-choice questions (offer/audience/goal) so onboarding still proceeds |
| Extension skipped / not installed | capture from OAuth + API data + Firecrawl + manual upload — degraded (less rich), never blocked |
| Extension scrape fails (not logged in / DOM change) | prompt founder to open their profile + retry; fall back to API/Firecrawl |
| Firecrawl error or timeout (website) | continue with whatever succeeded; mark missing layers low-confidence; never block |
| Bootstrap exceeds ~90s | background it + email when ready; let founder proceed to paywall meanwhile |
| Payment failure | inline Stripe error, retry; never lose Brain progress |
| Wrong account connected | disconnect + reconnect the correct account |

Principle: **no failure is a dead end.** The Brain degrades to lower confidence; the founder is never blocked from progressing.

---

## 6. Empty States
| Surface | Empty state |
|---|---|
| Dashboard before first discovery | "Your operator is warming up — first opportunities arrive within the hour." + what's happening behind the scenes |
| Opportunity feed (none yet) | explain cadence; offer "run discovery now" |
| Brain view (sparse) | show which layers are thin + one-tap ways to enrich (add a story, connect X, install extension) — framed as "make me smarter" |
| Reflections (first week) | preview the weekly ritual + example |

Empty states **build the Brain**: each is an invitation to add the one missing high-value signal, never a dead screen.

---

## 7. Long-term: onboarding disappears
Per the doc's vision: as inference improves, Stages 2–4 collapse. Endgame = founder authenticates, system gathers context, Brain is generated, operator starts, founder just confirms accuracy. The state machine already supports skipping stages the system can fully infer.

---

*Next: Phase 6 — Extension Design (Plasmo).*
