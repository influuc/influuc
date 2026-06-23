# Influuc — Phase 4: Opportunity Engine Design

> "Influuc starts with opportunities… The goal is not content. The goal is leverage." — `vision.md`
> The engine continuously finds situations where the founder's expertise creates leverage, *before competitors*.

---

## 1. Discovery Architecture

Discovery is a scheduled, tier-aware, fan-in pipeline. Sources feed a normaliser → classifier → matcher → scorer → prioritiser → surface.

```
SCHEDULE (per-founder cadence, tier-throttled)
        │
        ▼
 ┌───────────────── SOURCES ─────────────────┐
 │ Exa        : semantic web/news search       │  ← queries built from Brain (expertise+goals)
 │ X API      : search/trends (tier-dependent) │  ← R2: volume scales with plan
 │ Firecrawl  : watch specific sites/blogs     │
 │ RSS/news   : industry feeds                  │
 │ Extension  : signals from founder's own feed │  ← R1: LinkedIn/X context the API won't give
 └───────────────────┬────────────────────────┘
                     ▼
            NORMALISE → raw signal {title, text, url, signal_at, source}
                     ▼
            DEDUPE (dedupe_hash; cross-source collapse)
                     ▼
   Opportunity Classifier (cheap LLM) → typed opportunity + initial relevance
                     ▼
   Opportunity Matcher (Brain retrieval) → match vs expertise/goals/positioning
                     ▼
   Scorer → relevance × urgency × goal-alignment × confidence → priority_score
                     ▼
   Prioritiser → per-founder ranked queue (respect quotas, diversity, recency)
                     ▼
   Surface → top N to founder feed  +  (optional) auto-trigger content generation
```

### 1.1 Query generation from the Brain
Discovery is **not** generic news scraping. Search queries are *composed from the Founder Brain*: expertise areas, audience pains, goals, and positioning contrasts become Exa/X queries. A fractional-CFO-for-SaaS founder gets "SaaS burn multiple benchmarks 2026", "Rule of 40 debates", not generic finance news. This is why Brain quality gates Opportunity quality (per `founder-brain.md`).

### 1.2 Tier awareness (R2)
A `discovery_config` (feature-flag/table) maps each platform plan → calls/window + which source types are enabled. The scheduler reads it. If X is on free tier, discovery leans on Exa/Firecrawl/RSS and the extension; on a paid tier, live X search/trends activate. The engine degrades gracefully, never hard-fails on quota.

---

## 2. Opportunity Types
Fixed taxonomy (`opp_type`), from `product.md`:

| Type | Trigger signal | Typical response | Time sensitivity |
|---|---|---|---|
| `industry_trend` | rising topic in the founder's domain | thought-leadership post | medium |
| `market_shift` | structural change (pricing, regulation, funding) | analysis/opinion post | medium |
| `breaking_news` | time-critical event | fast reactive post | **high** |
| `emerging_conversation` | a debate gaining traction | join with a contrarian take | high |
| `podcast` | relevant show seeking guests / topic match | outreach suggestion | low |
| `partnership` | complementary company/person | intro/collab suggestion | low |
| `collaboration` | co-creation moment (event, launch) | joint content | low–medium |
| `thought_leadership` | gap where founder's belief is differentiated | original framework post | low |

Note: content is only *one* response. `podcast`/`partnership`/`collaboration` produce **action recommendations** (outreach drafts, intro suggestions), not posts — honouring "the goal is leverage, not content."

---

## 3. Scoring System

Each opportunity gets three sub-scores then a composite, all 0–1.

```
relevance_score = match_quality(opportunity, Brain)      // semantic + expertise overlap
urgency_score   = f(time_to_expiry, signal_velocity, type_base_urgency)
goal_alignment  = overlap(opportunity, active goal-layer facts)

priority_score  = w_r·relevance + w_u·urgency + w_g·goal_alignment
                  × brain_confidence_factor          // discount if matched on shaky facts
                  × novelty_factor                    // penalise near-duplicates of recent posts
```

- **Weights `w_*` are per-founder**, tuned by the Learning Engine from acceptance/dismissal + performance signals (§Phase 3.7).
- **`brain_confidence_factor`** ensures we don't loudly recommend acting on a guessed belief.
- **`novelty_factor`** prevents the founder repeating themselves (checks recent `content_items`/`publications`).

### 3.1 Urgency & timing (the "be early" metric)
`urgency_score` rewards opportunities discovered *early in their lifecycle* (high signal velocity, far from saturation). The success metric from `product.md` — "participates before competitors" — is operationalised as: median lead time between `signal_at` and surfacing. Tracked in analytics.

---

## 4. Prioritisation Logic
The surfaced feed is not just "top by score":

1. **Score threshold**: below `MIN_SURFACE` → discarded (not shown; logged for learning).
2. **Daily quota**: cap surfaced opportunities/day (respect the ≤10-min/week promise — never overwhelm).
3. **Diversity**: avoid surfacing five of the same type/topic; mix reactive (urgent) with evergreen (thought-leadership).
4. **Decay & expiry**: time-critical opportunities lose priority fast; expired ones auto-`expired`.
5. **Mode interaction**: in **autopilot**, high-confidence + high-priority + low-risk-type opportunities can skip surfacing and go straight to generation→guardrail→publish; everything else surfaces for approval.

---

## 5. Founder Matching Logic
The Matcher answers "is *this* opportunity right for *this* founder?" using the Brain:

```
match(opportunity, founder):
   layers = retrieve(['expertise','goal','positioning','belief'], founder)
   - expertise overlap      : does the founder credibly know this? (semantic + structured)
   - angle availability      : does a belief/story give a NON-generic take?
   - goal service            : does acting on this advance an active goal?
   - positioning consistency : does it fit the founder's category/narrative?
   - credibility guard       : reject if it would force the founder outside their expertise
   → match_score + match_reason (+ linked brain_fact_ids for explainability)
```

Key principle: **a generic match is a non-match.** If the only thing the founder could say is what anyone could say, the opportunity scores low. Authority requires a differentiated angle, which requires a belief/story/expertise fact to anchor it. This is the explicit guard against becoming "another AI-generated account" (`founder-brain.md`).

Explainability: every surfaced opportunity carries its `match_reason` + the Brain facts it matched, so the founder sees *why* it was chosen (trust + correction signal).

---

## 6. Output Workflows
By type, the engine emits one of three outcomes:

| Outcome | Types | Flow |
|---|---|---|
| **Content** | trend, shift, breaking, conversation, thought_leadership | `opportunity.accepted` → `content.generation.requested` → Content Engine → Guardrail → Publishing |
| **Action recommendation** | podcast, partnership, collaboration | surface with a drafted outreach message + suggested next step; founder acts (or assisted-send via email) |
| **Discard (logged)** | below threshold | written to learning store; never shown |

### 6.1 Autopilot path (v1, guarded)
```
opportunity (priority ≥ AUTO_PRI, confidence ≥ AUTO_CONF, type ∈ low-risk set)
   → auto-accept → generate → guardrail(pass_autopilot) → schedule → publish
   → notify founder AFTER ("Influuc published X about Y") with one-click undo window
```
Guardrails (Phase 1 §6.2) and per-day caps apply. Breaking-news autopilot is **opt-in within opt-in** (extra config) given factual-risk; default routes breaking news to approval even in autopilot mode.

### 6.2 Feedback capture
Accept / dismiss / edit / publish-and-perform all emit `learning_signals`, closing the loop: the engine's per-founder weights improve weekly.

---

## 7. Reliability & cost
- Discovery runs are **idempotent** (dedupe_hash) and **resumable**; a failed source doesn't fail the run.
- **Cost ceiling**: classification uses a cheap model; only matched, above-threshold signals reach the mid-tier matcher; generation (expensive) only after acceptance. This funnel keeps per-founder AI spend bounded (R6).
- All runs, sources, and scores are logged for analytics (lead-time, acceptance rate, surfaced-vs-acted).

---

*Next: Phase 5 — Onboarding Design.*
