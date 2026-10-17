-- Phase 6: per-workspace provider API keys, encrypted by the app (AES-256-GCM) before they reach the database.
create table public.provider_keys (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  ciphertext text not null,
  last4 text not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);

alter table public.provider_keys enable row level security;

-- Members may see THAT a key exists (and its last 4 chars); the ciphertext column is never readable from the
-- browser. Writes go through Server Actions with the service-role client after an owner check.
revoke all on public.provider_keys from anon, authenticated;
grant select (workspace_id, provider, last4, updated_at) on public.provider_keys to authenticated;
create policy provider_keys_select on public.provider_keys for select to authenticated using (public.is_member(workspace_id));
