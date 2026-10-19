-- Per-bot live chat settings (Bot → Features → Live chat).
alter table public.bots
  add column if not exists live_chat boolean not null default true,
  add column if not exists live_chat_label text not null default 'Talk to a person',
  add column if not exists live_chat_waiting_message text not null default 'We''ve let the team know. A person will reply here shortly — you can keep typing.',
  add column if not exists live_chat_offer text not null default 'always' check (live_chat_offer in ('always', 'on_unanswered'));
