/**
 * @influuc/db — generated Supabase types + convenience row aliases.
 *
 * Regenerate after schema changes: `pnpm --filter @influuc/db gen:types`
 * Migrations live in ./migrations and are the source of truth for the schema.
 */
export * from "./database.types";
export type { Database, Json } from "./database.types";

import type { Tables, TablesInsert } from "./database.types";

// Handy row aliases for the most-used tables.
export type Account = Tables<"accounts">;
export type Founder = Tables<"founders">;
export type Subscription = Tables<"subscriptions">;
export type OperatingPreferences = Tables<"operating_preferences">;
export type PlatformConnection = Tables<"platform_connections">;
export type RawSource = Tables<"raw_sources">;
export type BrainLayer = Tables<"brain_layers">;
export type BrainFact = Tables<"brain_facts">;
export type BrainFactVersion = Tables<"brain_fact_versions">;
export type FactProvenance = Tables<"fact_provenance">;
export type Opportunity = Tables<"opportunities">;
export type ContentItem = Tables<"content_items">;
export type GuardrailReview = Tables<"guardrail_reviews">;
export type Publication = Tables<"publications">;
export type LearningSignal = Tables<"learning_signals">;
export type Reflection = Tables<"reflections">;
export type EventRow = Tables<"events">;

export type NewBrainFact = TablesInsert<"brain_facts">;
export type NewOpportunity = TablesInsert<"opportunities">;
