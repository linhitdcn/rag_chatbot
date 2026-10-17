-- KnowledgeDesk — Phase 2 schema: multi-tenant workspaces, bots, knowledge, conversations.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- enums
create type public.member_role as enum ('owner', 'editor', 'viewer');
create type public.bot_status as enum ('active', 'paused');
create type public.source_type as enum ('file', 'url', 'qa');
create type public.source_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.unanswered_status as enum ('open', 'answered', 'dismissed');

-- ---------------------------------------------------------------- tenancy
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'Free',
  timezone text not null default 'UTC',
  monthly_spend_limit numeric(10, 2) not null default 50,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.member_role not null default 'editor' check (role <> 'owner'),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

-- RLS helper functions. SECURITY DEFINER so policies on workspace_members don't recurse.
create function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$$;

create function public.can_edit(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create function public.is_owner(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members where workspace_id = ws and user_id = auth.uid() and role = 'owner'
  );
$$;

-- On signup: create profile, a personal workspace, an owner membership, and accept pending invites.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ws uuid;
  inv record;
  display text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));
  joined boolean := false;
begin
  insert into profiles (id, full_name, email) values (new.id, display, coalesce(new.email, ''));

  for inv in select * from invitations where lower(email) = lower(new.email) loop
    insert into workspace_members (workspace_id, user_id, role) values (inv.workspace_id, new.id, inv.role)
      on conflict do nothing;
    delete from invitations where id = inv.id;
    joined := true;
  end loop;

  if not joined then
    insert into workspaces (name) values (display || '''s workspace') returning id into ws;
    insert into workspace_members (workspace_id, user_id, role) values (ws, new.id, 'owner');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- bots
create table public.bots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  public_id text not null unique default ('bt_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name text not null,
  description text not null default '',
  status public.bot_status not null default 'active',
  avatar_color text not null default '#6366f1',
  provider text not null default 'openai' check (provider in ('openai', 'anthropic')),
  model text not null default 'gpt-4o-mini',
  tone text not null default 'friendly' check (tone in ('friendly', 'professional', 'concise')),
  system_prompt text not null,
  welcome_message text not null default 'Hi! How can I help you today?',
  fallback_message text not null default 'Sorry, I couldn''t find that.',
  starter_questions text[] not null default '{}',
  temperature real not null default 0.3 check (temperature between 0 and 1),
  max_tokens int not null default 800,
  top_k int not null default 5,
  similarity_threshold real not null default 0.72,
  citations boolean not null default true,
  feedback boolean not null default true,
  lead_capture boolean not null default false,
  lead_fields text[] not null default '{email}',
  lead_timing text not null default 'after_3' check (lead_timing in ('start', 'after_3', 'on_unanswered')),
  handoff_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bots_workspace_idx on public.bots (workspace_id);

-- ---------------------------------------------------------------- knowledge
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type public.source_type not null,
  name text not null,
  status public.source_status not null default 'pending',
  error text,
  url text,
  question text,
  answer text,
  storage_path text,
  size_bytes bigint not null default 0,
  chunk_count int not null default 0, -- maintained by the ingestion pipeline (Phase 3)
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index sources_workspace_idx on public.sources (workspace_id);

create table public.bot_sources (
  bot_id uuid not null references public.bots (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  primary key (bot_id, source_id)
);
create index bot_sources_source_idx on public.bot_sources (source_id);

-- Phase 3 fills this table; the vector column and index are created now so the schema is stable.
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  chunk_index int not null,
  page int,
  token_count int not null default 0,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);
create index chunks_source_idx on public.chunks (source_id, chunk_index);
create index chunks_embedding_idx on public.chunks using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------- conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  visitor text not null default 'visitor',
  preview text not null default '',
  message_count int not null default 0,
  rating text check (rating in ('up', 'down')),
  unanswered boolean not null default false,
  started_at timestamptz not null default now()
);
create index conversations_ws_started_idx on public.conversations (workspace_id, started_at desc);
create index conversations_bot_idx on public.conversations (bot_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  tokens int,
  latency_ms int,
  model text,
  unanswered boolean not null default false,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_ws_created_idx on public.messages (workspace_id, created_at desc);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  captured_at timestamptz not null default now()
);
create index leads_ws_idx on public.leads (workspace_id, captured_at desc);

create table public.unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  question text not null,
  variants text[] not null default '{}',
  count int not null default 1,
  status public.unanswered_status not null default 'open',
  last_seen_at timestamptz not null default now()
);
create index unanswered_ws_idx on public.unanswered_questions (workspace_id, status);

-- ---------------------------------------------------------------- updated_at
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger bots_touch before update on public.bots for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.bots enable row level security;
alter table public.sources enable row level security;
alter table public.bot_sources enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.unanswered_questions enable row level security;

-- profiles: you see yourself and people you share a workspace with; you edit only yourself.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from workspace_members a join workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- workspaces
create policy workspaces_select on public.workspaces for select to authenticated using (public.is_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

-- members: everyone in the workspace can list; only owners manage. Owner rows can't be touched via the API.
create policy members_select on public.workspace_members for select to authenticated using (public.is_member(workspace_id));
create policy members_update on public.workspace_members for update to authenticated
  using (public.is_owner(workspace_id) and role <> 'owner')
  with check (public.is_owner(workspace_id) and role <> 'owner');
create policy members_delete on public.workspace_members for delete to authenticated
  using (public.is_owner(workspace_id) and role <> 'owner');

create policy invitations_select on public.invitations for select to authenticated using (public.is_member(workspace_id));
create policy invitations_insert on public.invitations for insert to authenticated with check (public.is_owner(workspace_id));
create policy invitations_delete on public.invitations for delete to authenticated using (public.is_owner(workspace_id));

-- Workspace-scoped content: members read, editors/owners write.
create policy bots_select on public.bots for select to authenticated using (public.is_member(workspace_id));
create policy bots_insert on public.bots for insert to authenticated with check (public.can_edit(workspace_id));
create policy bots_update on public.bots for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy bots_delete on public.bots for delete to authenticated using (public.can_edit(workspace_id));

create policy sources_select on public.sources for select to authenticated using (public.is_member(workspace_id));
create policy sources_insert on public.sources for insert to authenticated with check (public.can_edit(workspace_id));
create policy sources_update on public.sources for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy sources_delete on public.sources for delete to authenticated using (public.can_edit(workspace_id));

-- bot_sources has no workspace_id: authorize through the bot, and require the source to be in the same workspace.
create policy bot_sources_select on public.bot_sources for select to authenticated using (
  exists (select 1 from bots b where b.id = bot_id and public.is_member(b.workspace_id))
);
create policy bot_sources_write on public.bot_sources for all to authenticated
  using (exists (select 1 from bots b where b.id = bot_id and public.can_edit(b.workspace_id)))
  with check (exists (
    select 1 from bots b join sources s on s.workspace_id = b.workspace_id
    where b.id = bot_id and s.id = source_id and public.can_edit(b.workspace_id)
  ));

create policy chunks_select on public.chunks for select to authenticated using (public.is_member(workspace_id));

create policy conversations_select on public.conversations for select to authenticated using (public.is_member(workspace_id));
create policy conversations_delete on public.conversations for delete to authenticated using (public.can_edit(workspace_id));
create policy messages_select on public.messages for select to authenticated using (public.is_member(workspace_id));
create policy leads_select on public.leads for select to authenticated using (public.is_member(workspace_id));
create policy leads_delete on public.leads for delete to authenticated using (public.can_edit(workspace_id));

create policy unanswered_select on public.unanswered_questions for select to authenticated using (public.is_member(workspace_id));
create policy unanswered_update on public.unanswered_questions for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));

-- Conversations, messages, leads, chunks and unanswered rows are written by the public chat API and
-- the ingestion pipeline with the service-role client (Phases 3–5), which bypasses RLS.

-- Browser clients must never call the SECURITY DEFINER helpers' trigger function directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
