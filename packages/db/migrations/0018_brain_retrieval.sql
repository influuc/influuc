-- Migration 0018: Brain retrieval + confidence scoring (SCRUM-23)

-- (1) Confidence x salience ranking — works today, no embeddings needed.
--     Replaces "top N by raw confidence" with importance-weighted ranking.
create or replace function public.rank_brain_facts(p_founder uuid, p_limit int default 60)
returns table (layer brain_layer_type, key text, content text, confidence numeric, score numeric)
language sql stable security definer set search_path = public as $$
  select f.layer, f.key, f.content, f.confidence,
         (f.confidence * coalesce(f.salience, 0.5))::numeric as score
  from brain_facts f
  where f.founder_id = p_founder and f.status = 'active'
  order by score desc
  limit p_limit;
$$;

-- (2) Semantic retrieval — relevant facts for a query embedding (cosine), tie-broken
--     by confidence. Activates once brain_facts.embedding is populated.
create or replace function public.match_brain_facts(
  p_founder uuid, p_embedding vector(1536), p_limit int default 40
)
returns table (layer brain_layer_type, key text, content text, confidence numeric, similarity numeric)
language sql stable security definer set search_path = public as $$
  select f.layer, f.key, f.content, f.confidence,
         (1 - (f.embedding <=> p_embedding))::numeric as similarity
  from brain_facts f
  where f.founder_id = p_founder and f.status = 'active' and f.embedding is not null
  order by f.embedding <=> p_embedding, f.confidence desc
  limit p_limit;
$$;

-- service_role only (server jobs call these)
revoke execute on function public.rank_brain_facts(uuid, int) from public, anon, authenticated;
revoke execute on function public.match_brain_facts(uuid, vector, int) from public, anon, authenticated;
