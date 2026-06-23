/**
 * @influuc/core — shared domain model.
 *
 * These constants/types mirror the database design
 * (see docs/database/02-database-design.md) so the app, jobs, and agents
 * all reason over the same vocabulary. Keep in sync with the SQL enums.
 */

// ─── Founder Brain ──────────────────────────────────────────────────────────

/** The nine fixed layers of the Founder Brain (docs/design/03-founder-brain.md). */
export const BRAIN_LAYERS = [
  "identity",
  "expertise",
  "offer",
  "audience",
  "positioning",
  "belief",
  "story",
  "writing_style",
  "goal",
] as const;
export type BrainLayer = (typeof BRAIN_LAYERS)[number];

/** Lifecycle of an atomic Brain fact. */
export const FACT_STATUSES = [
  "candidate",
  "active",
  "superseded",
  "rejected",
] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

/** Where a piece of understanding came from (drives base confidence). */
export const SOURCE_KINDS = [
  "website",
  "linkedin",
  "x",
  "reflection",
  "correction",
  "content_performance",
  "manual",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

// ─── Opportunity Engine ─────────────────────────────────────────────────────

export const OPPORTUNITY_TYPES = [
  "industry_trend",
  "market_shift",
  "breaking_news",
  "emerging_conversation",
  "podcast",
  "partnership",
  "collaboration",
  "thought_leadership",
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_STATUSES = [
  "discovered",
  "scored",
  "matched",
  "surfaced",
  "accepted",
  "dismissed",
  "expired",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

// ─── Content + Guardrail + Publishing ───────────────────────────────────────

export const TARGET_PLATFORMS = ["x", "linkedin"] as const;
export type TargetPlatform = (typeof TARGET_PLATFORMS)[number];

export const GUARDRAIL_VERDICTS = [
  "pass_autopilot",
  "pass_approval",
  "fail",
] as const;
export type GuardrailVerdict = (typeof GUARDRAIL_VERDICTS)[number];

/** Publishing autonomy chosen by the founder. */
export const AUTONOMY_MODES = ["manual", "assisted", "autopilot"] as const;
export type AutonomyMode = (typeof AUTONOMY_MODES)[number];

// ─── Onboarding (connect-first flow, docs/design/05-onboarding.md) ──────────

export const ONBOARDING_STATES = [
  "landing",
  "connect",
  "extension",
  "capture",
  "analysis",
  "summary",
  "paywall",
  "trial",
  "preferences",
  "done",
] as const;
export type OnboardingState = (typeof ONBOARDING_STATES)[number];

// ─── Shared scalars ─────────────────────────────────────────────────────────

/** A confidence or salience score, always within [0, 1]. */
export type UnitScore = number;

/** Clamp a number into the [0, 1] range used for confidence/salience/scores. */
export function clampUnit(value: number): UnitScore {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
