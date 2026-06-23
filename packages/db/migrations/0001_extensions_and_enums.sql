-- Influuc — migration 0001: extensions + enums
-- Source of truth: docs/database/02-database-design.md

-- Extensions
create extension if not exists vector;                       -- pgvector (HNSW) for Brain embeddings
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext;                       -- case-insensitive email
create extension if not exists moddatetime with schema extensions; -- updated_at triggers

-- Enums (mirror packages/core domain model)
create type sub_status as enum ('trialing','active','past_due','canceled','incomplete');
create type platform as enum ('x','linkedin');
create type connection_status as enum ('active','needs_reauth','revoked','error');
create type source_kind as enum ('website','linkedin','x','reflection','correction','content_performance','manual');
create type job_status as enum ('queued','running','succeeded','failed','dead');
create type brain_layer_type as enum ('identity','expertise','offer','audience','positioning','belief','story','writing_style','goal');
create type fact_status as enum ('candidate','active','superseded','rejected');
create type opp_type as enum ('industry_trend','market_shift','breaking_news','emerging_conversation','podcast','partnership','collaboration','thought_leadership');
create type opp_status as enum ('discovered','scored','matched','surfaced','accepted','dismissed','expired');
create type target_platform as enum ('x','linkedin');
create type content_status as enum ('draft','guardrail_pending','guardrail_failed','awaiting_approval','approved','scheduled','published','rejected','archived');
create type guardrail_verdict as enum ('pass_autopilot','pass_approval','fail');
create type pub_status as enum ('scheduled','publishing','published','failed','canceled');
create type signal_kind as enum ('edit','performance','acceptance','dismissal','engagement','reflection');
create type autonomy_mode as enum ('manual','assisted','autopilot');
