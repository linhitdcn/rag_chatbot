-- More providers (Google Gemini, Groq: both have free tiers), a configurable embedding provider, and a
-- "last error" marker on bots so admins see rate-limit problems and can switch model.

alter table public.bots drop constraint if exists bots_provider_check;
alter table public.bots add constraint bots_provider_check check (provider in ('openai', 'anthropic', 'google', 'groq'));

alter table public.provider_keys drop constraint if exists provider_keys_provider_check;
alter table public.provider_keys add constraint provider_keys_provider_check check (provider in ('openai', 'anthropic', 'google', 'groq'));

-- {kind: 'rate_limit' | 'auth' | 'provider' | 'error', provider, model, message, at}. Cleared on the next success.
alter table public.bots add column if not exists last_error jsonb;

-- Embeddings from different models live in different vector spaces, so every chunk records its model and
-- retrieval only compares like with like. Both supported models output 1536 dimensions.
alter table public.workspaces add column if not exists embedding_provider text not null default 'google'
  check (embedding_provider in ('google', 'openai'));
alter table public.chunks add column if not exists embedding_model text not null default 'openai:text-embedding-3-small';

drop function if exists public.match_chunks(extensions.vector, uuid, int, float);
create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  p_bot_id uuid,
  p_embedding_model text,
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
    and c.embedding_model = p_embedding_model
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by (1 - (c.embedding <=> query_embedding)) + (case when s.type = 'qa' then 0.05 else 0 end) desc
  limit least(match_count, 20);
$$;

revoke execute on function public.match_chunks(extensions.vector, uuid, text, int, float) from public, anon, authenticated;

-- New bots default to a free-tier model.
alter table public.bots alter column provider set default 'google';
alter table public.bots alter column model set default 'gemini-2.5-flash';
