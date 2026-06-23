# 08 — Product Core Loop

> Canonical product definition. Last updated 2026-06-23.

## What Influuc Is

A **weekly content strategy + post writing system** for founders. The AI learns who you are (Founder Brain), plans your content week, writes every post in your voice, and posts on schedule. You review and approve — nothing goes out without you.

The Opportunity Engine is an **additive** layer that surfaces reactive content on top of the planned posts. It is not the core product.

---

## The Weekly Content Engine

### Two-Call Chain (runs every Sunday night / on reflection submit)

```
Brain Facts
    ↓
[LLM Call 1] Strategy Generation
    → Week's content angles, themes, hooks
    ↓
[LLM Call 2] Post Writing
    → All posts written in founder's voice from strategy
```

Both calls run consecutively so strategy context flows directly into post quality.

### Weekly Output

| Platform  | Volume      | Format                                      |
|-----------|-------------|---------------------------------------------|
| X         | 21 posts/wk | 2 short (<500 chars) + 1 long (>1000 chars) per day |
| LinkedIn  | 7 posts/wk  | 1 long-form per day (2000+ chars, high-value)        |

---

## First Week Generation

- Triggers immediately when user completes the **Preferences** step
- User lands on dashboard to find their first full week of content ready
- No waiting — instant value

---

## The Weekly Reflection Engine

1. User is shown a short reflection prompt (5–7 questions about their week)
2. Answers are processed → new facts added to Founder Brain
3. Brain update triggers → next week's strategy + posts generated automatically
4. **Flywheel:** better reflection → bigger brain → better content → repeat

---

## The Opportunity Engine (Additive)

- Uses Exa to find trending conversations in the founder's niche daily
- Drafts reactive posts using Brain facts
- These appear in a separate dashboard section — *not* the planned calendar
- User can approve and post opportunistically, outside the weekly schedule
- Does not replace or compete with the core weekly posts

---

## Posting Flow

1. Posts are generated and stored in `content_posts` table with status `draft`
2. Dashboard shows the weekly calendar — posts scheduled day by day
3. User reviews, edits if needed, approves
4. Approved posts fire via X API (write) and LinkedIn API (`w_member_social`)
5. Status updates to `published`

---

## Model Strategy

| Task                    | Model                          | Why                              |
|-------------------------|--------------------------------|----------------------------------|
| Strategy generation     | `anthropic/claude-haiku-4-5`   | Structured, cost-effective       |
| Post writing (scaffold) | `anthropic/claude-haiku-4-5`   | Fast iteration                   |
| Post writing (prod)     | `anthropic/claude-sonnet-4-5`  | Voice quality is the value prop  |
| Opportunity scoring     | `google/gemini-flash-2.0`      | High volume, ultra cheap         |

---

## Roadmap Order

1. ✅ Onboarding (landing → connect → extension → capture → analysis → summary → paywall)
2. 🔨 Preferences page (completes onboarding, triggers first generation)
3. 🔨 Weekly Content Engine — Trigger.dev task: strategy + post generation
4. 🔨 Dashboard — weekly calendar view, post approval UI
5. 🔨 Post to X + LinkedIn
6. 🔨 Weekly Reflection Engine
7. ➕ Opportunity Engine (additive)
