# Influuc — Phase 3: Founder Brain Design

> "Everything else can be rebuilt. The Founder Brain cannot." — `founder-brain.md`
> The Brain is a **structured, versioned, confidence-scored representation of understanding** — not a chatbot, vector store, or note dump.

---

## 1. Founder Brain Architecture

The Brain is a **layered knowledge graph of atomic facts**, each with provenance, confidence, salience, temporal validity, and an embedding for semantic recall. It is read by every engine and written by ingestion, reflection, correction, and learning.

```
                    ┌──────────────────────────────────────────┐
   INPUTS           │              FOUNDER BRAIN                  │      OUTPUTS
   ───────          │                                            │      ───────
   website ───►     │   9 LAYERS (founder-brain.md)              │  ──► Opportunity match
   linkedin ──►     │   identity · expertise · offer · audience  │  ──► Content strategy
   x ────────►  ┌─► │   positioning · belief · story ·           │  ──► Voice/style
   reflection ─►│   │   writing_style · goal                     │  ──► Positioning
   correction ─►│   │                                            │  ──► Strategy decisions
   performance ►│   │   each layer = set of brain_facts:         │
                │   │   {content, structured, confidence,        │
   EXTRACTOR ───┘   │    salience, provenance[], versions[],     │
   RECONCILER ─────►│    embedding, valid_from/to}               │
                    └──────────────────────────────────────────┘
                         ▲ Update Model        │ Retrieval Model
                         │ (write path)        ▼ (read path)
                    learning + reconciliation   prompt assembly
```

### Why facts, not documents
A document ("LinkedIn About text") answers nothing directly. A *fact* ("Founder sells fractional-CFO services to seed-stage SaaS", confidence 0.82, sourced from website+LinkedIn) is queryable, scoreable, correctable, and improvable. Facts are the unit the Opportunity/Content/Learning engines reason over.

---

## 2. Knowledge Model

### 2.1 The nine layers (fixed taxonomy from `founder-brain.md`)
| Layer | Answers | Example fact `structured` |
|---|---|---|
| identity | Who/where/role | `{name, company, role, industry, geo}` |
| expertise | What they know better than most | `{area:'B2B SaaS pricing', depth:'deep', adjacency:['GTM']}` |
| offer | What they sell | `{type:'consulting', offer:'fractional CFO', icp:'seed SaaS', price_band:'$$'}` |
| audience | Who benefits | `{icp, pains:[], goals:[], objections:[], sophistication}` |
| positioning | Why them vs alternatives | `{category, narrative, differentiation, contrast_to}` |
| belief | Convictions / contrarian views | `{claim, stance:'contrarian', strength}` |
| story | Wins/failures/turning points | `{type:'failure', summary, lesson, reusable:true}` |
| writing_style | How they communicate | `{tone, rhythm, sentence_len, emoji:false, persuasion}` |
| goal | Where they're going | `{goal:'fundraising', horizon:'6mo', priority:1}` |

### 2.2 Fact anatomy
```
brain_fact {
  content      : human-readable assertion (the canonical truth)
  structured   : typed JSON for machine reasoning (optional)
  confidence   : 0..1  — how sure we are it's TRUE
  salience     : 0..1  — how CENTRAL it is to the founder (retrieval weight)
  status       : candidate | active | superseded | rejected
  provenance[] : evidence snippets + source + weight
  versions[]   : full history, never destroyed
  embedding    : for semantic retrieval
  valid_from / valid_to : temporal validity (beliefs/goals change)
}
```

### 2.3 Layer summaries
Each layer keeps a denormalised natural-language `summary` (in `brain_layers`) rolled up from its active high-confidence facts. This is the cheap, cacheable artifact injected into most prompts; full-fact retrieval is used only when depth is needed.

---

## 3. Memory Model

Three memory tiers, mirroring how understanding actually accumulates:

| Tier | What | Storage | Lifecycle |
|---|---|---|---|
| **Working** | Current active beliefs/goals/positioning | `brain_facts` where `status=active`, `valid_to is null` | mutable via reconciliation |
| **Episodic** | Specific experiences/stories/events with time anchors | `story`-layer facts + `raw_sources` | retained; salience may decay |
| **Archival** | Superseded facts + all versions + raw provenance | `brain_fact_versions`, `fact_provenance`, `raw_sources` | append-only, never deleted |

**Temporal validity:** when a belief/goal changes, the old fact is `superseded` (sets `valid_to`), a new `active` fact is created, and both link to the same `key`. The Brain therefore knows not just *what* the founder believes but *what they used to believe and when it changed* — essential for authentic positioning over time.

**Decay:** salience (not confidence) decays for episodic facts not reinforced over time, so retrieval favours what's currently central without forgetting history.

---

## 4. Retrieval Model

The Brain's read path. Goal: assemble the *right* slice of understanding for a given task, annotated with confidence so the model treats tentative facts cautiously.

### 4.1 Retrieval is hybrid (structured-first, semantic-second)
```
retrieve(task, founder_id) ->
  1. STRUCTURED: pull layer summaries always needed for the task
       (e.g. content writing always needs: writing_style + positioning + offer)
  2. SEMANTIC:  embed the task/opportunity, ANN-search brain_facts
       within relevant layers, top-k by cosine
  3. RANK:      score = α·similarity + β·salience + γ·confidence + δ·recency
  4. FILTER:    drop facts below confidence floor for the task
                (publishing tasks use a higher floor than ideation)
  5. ASSEMBLE:  inject as structured context with confidence labels:
                "[confidence 0.9] You sell X.  [confidence 0.4, tentative] You may believe Y."
```

### 4.2 Task → required layers (retrieval policy)
| Task | Always | Semantic over |
|---|---|---|
| Opportunity match | expertise, goal, positioning | belief, story |
| Content strategy | offer, audience, positioning, goal | belief, story, expertise |
| Content writing | writing_style, positioning | story, belief, offer |
| Guardrail brand-fit | positioning, belief, writing_style | — |
| Onboarding summary | identity, offer, audience, positioning | expertise |

### 4.3 Confidence-aware prompting
Low-confidence facts are passed as *hypotheses* ("we believe…, unconfirmed") so generated content never asserts shaky facts as truth — directly supports the guardrail factuality check and avoids the "generic confident AI" failure mode.

---

## 5. Update Model

The Brain's write path. Four trigger sources, one reconciliation pipeline.

```
SOURCE                         PIPELINE
website/social/reflection ──►  EXTRACT ──► candidate facts (+ provenance, initial confidence)
correction (founder edit) ──►  ───────────────────────────────────────────────┐
performance (learning) ─────►  ───────────────────────────────────────────────┤
                                                                                ▼
                               RECONCILE: for each candidate vs existing facts:
                                 - NEW           → insert as candidate/active
                                 - REINFORCES    → raise confidence, add provenance
                                 - CONTRADICTS    → conflict resolution (below)
                                 - DUPLICATE      → merge, keep highest-salience phrasing
                               → write brain_fact_versions for every change
                               → recompute layer summary + layer confidence
                               → emit brain.updated → re-score open opportunities
```

### 5.1 Conflict resolution
When a candidate contradicts an active fact:
| Situation | Resolution |
|---|---|
| New source is a **founder correction** | correction wins immediately, confidence→high, old fact superseded |
| New source is automated, **higher-weight** evidence | supersede if Δconfidence above threshold; else lower old fact's confidence |
| Genuine **change over time** (belief/goal) | temporal supersede (old gets `valid_to`), both retained |
| Ambiguous | keep both as competing `candidate`s; surface to founder at next light-touch confirmation |

### 5.2 Founder corrections are sacred
A correction is the highest-value signal (the founder is ground truth). It: sets confidence to near-1.0, supersedes conflicts, and is logged as a `learning_signal(kind=edit)` so the Learning Engine can adjust *how* extraction behaves for that founder.

---

## 6. Confidence Scoring Model

Confidence = P(fact is true). Computed, not guessed.

```
confidence(fact) = clamp( base(source_kind)
                          + Σ provenance corroboration
                          + founder confirmation bonus
                          − staleness penalty
                          − contradiction penalty , 0, 1)
```

| Component | Effect |
|---|---|
| `base(source_kind)` | correction 0.95 · reflection 0.8 · website-explicit 0.7 · linkedin 0.65 · x 0.55 · inferred 0.4 |
| corroboration | +up to 0.2 when ≥2 independent sources agree (provenance weights) |
| founder confirmation | snaps to ≥0.9 |
| staleness | −decay for time-sensitive layers (goal, positioning, belief) past a half-life |
| contradiction | − when an unresolved competing fact exists |

**Layer confidence** = salience-weighted mean of its active facts → drives onboarding ("we're 80% sure about your offer, but only 40% on your positioning — confirm?") and gates autopilot (low-confidence layers raise the approval bar).

**Why this matters:** the guardrail pipeline and retrieval floors both read confidence. A weak Brain *automatically* routes more to founder approval rather than autopiloting on guesses — confidence is the system's humility mechanism.

---

## 7. Learning Model

How the Brain compounds (the vision's "dramatically more intelligent after 12 months").

### 7.1 Signals → learning
| Signal (`learning_signals.kind`) | What it teaches |
|---|---|
| `edit` (founder changed a draft) | voice/positioning correction → update writing_style + relevant facts; adjust generation params |
| `performance` (post metrics) | which angles/topics/formats resonate → raise salience of winning expertise/beliefs |
| `acceptance` / `dismissal` (opportunities) | which opportunity types matter → tune Opportunity matching weights per founder |
| `engagement` (audience response) | refine audience-layer understanding |
| `reflection` (weekly input) | net-new stories/lessons/beliefs → episodic memory |

### 7.2 Per-founder learning loop
```
weekly  learning.aggregate(founder):
   1. pull unprocessed learning_signals
   2. derive adjustments:
        - salience deltas (reinforce what worked, decay what didn't)
        - confidence deltas (corroborated vs contradicted)
        - generation-param deltas (e.g. voice temperature, preferred formats)
        - opportunity-weight deltas (type preferences)
   3. apply via Update Model (versioned)
   4. persist a per-founder "learning profile" (weights) used by engines
   5. mark signals processed; emit brain.updated
```

### 7.3 The compounding guarantee
Every interaction is a signal; every signal updates the Brain or the per-founder weights; both are versioned. The result: opportunity matching, content voice, and guardrail thresholds all personalise over time — the moat deepens with use, exactly as the vision requires. New founders benefit only from *aggregate, anonymised* heuristics (cold-start priors); a founder's specific facts never leak across tenants (RLS + no cross-tenant training).

---

## 8. Cold-start (day-one quality — risk R5)
Onboarding must produce a Brain good enough to trigger "how does it already know that?". Bootstrap order:
1. Firecrawl the website → identity/offer/audience/positioning candidates.
2. Extension import of LinkedIn + X (own session) → expertise/story/writing_style candidates.
3. Reconcile → produce layer summaries with honest confidence.
4. Present summary (Phase 5 Stage 4); every confirmation/correction immediately strengthens the Brain.

Honest confidence is the trust mechanism: showing "we're unsure about X" and being *right* about Y builds more trust than confident-wrong guesses.

---

*Next: Phase 4 — Opportunity Engine Design.*
