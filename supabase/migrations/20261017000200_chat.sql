-- Phase 4: retrieval + usage helpers for the chat engine.

-- Top-k chunks for a bot, restricted to the sources linked to it. Curated Q&A gets a small ranking boost
-- (the returned similarity stays the raw cosine similarity so the threshold means the same for every source).
create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  p_bot_id uuid,
  match_count int default 5,
  min_similarity float default 0.7
)
returns table (chunk_id uuid, source_id uuid, source_name text, source_type public.source_type, content text, page int, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select c.id, c.source_id, s.name, s.type, c.content, c.page, (1 - (c.embedding <=> query_embedding))::float as similarity
  from chunks c
  join sources s on s.id = c.source_id
  join bot_sources bs on bs.source_id = c.source_id and bs.bot_id = p_bot_id
  where s.status = 'ready'
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by (1 - (c.embedding <=> query_embedding)) + (case when s.type = 'qa' then 0.05 else 0 end) desc
  limit least(match_count, 20);
$$;

-- Tokens used by a workspace in the current UTC month (for the spend limit).
create or replace function public.workspace_month_tokens(ws uuid)
returns bigint
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(tokens), 0)::bigint from messages
  where workspace_id = ws and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
$$;

-- Only the server (service role) may call these directly; browsers go through the API routes.
revoke execute on function public.match_chunks(extensions.vector, uuid, int, float) from public, anon, authenticated;
revoke execute on function public.workspace_month_tokens(uuid) from public, anon, authenticated;
