-- Live chat: a human agent can take over a conversation from the bot.
--   bot     the bot answers (default)
--   waiting the visitor asked for a person; nobody has replied yet
--   human   an agent took over; the bot stays silent until the agent hands the chat back
alter table public.conversations
  add column if not exists mode text not null default 'bot' check (mode in ('bot', 'waiting', 'human')),
  add column if not exists handoff_requested_at timestamptz;

alter table public.messages drop constraint if exists messages_role_check;
alter table public.messages add constraint messages_role_check check (role in ('user', 'assistant', 'agent'));
alter table public.messages add column if not exists agent_name text;

create index if not exists conversations_ws_mode_idx on public.conversations (workspace_id, mode) where mode <> 'bot';
