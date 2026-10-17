-- Phase 5: per-bot widget appearance and allowed domains.
alter table public.bots add column if not exists widget jsonb not null default '{}'::jsonb;
