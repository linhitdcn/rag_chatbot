# KnowledgeDesk

Multi-tenant admin dashboard for RAG chatbots, plus an embeddable chat widget.
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres, Auth, pgvector) · Vercel AI SDK.

> **Status: all 7 phases built.** Auth, multi-tenant data, ingestion (files, websites, Q&A), streaming RAG chat,
> an embeddable widget and encrypted per-workspace API keys. Only verified in demo mode so far — see
> [docs/roadmap.md](docs/roadmap.md) for what has and hasn't been run against live services.

## Run it

```bash
pnpm install
cp .env.example .env.local   # optional in Phase 1
pnpm dev                     # http://localhost:3000
```

Without Supabase env vars the app runs in **demo mode**: auth is bypassed, every page uses mock data and
writes are no-ops. With them set, `proxy.ts` refreshes the Supabase session and redirects signed-out users to `/login`.

### Connect Supabase

1. Create a Supabase project and fill `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`).
2. Apply every file in [supabase/migrations/](supabase/migrations/) in order (`supabase db push`, or paste them into
   the SQL editor). They create the schema + RLS, the `documents` Storage bucket, retrieval/usage functions,
   widget settings and the encrypted `provider_keys` table.
3. In Auth → URL configuration add `<NEXT_PUBLIC_APP_URL>/auth/callback` to the redirect URLs.
4. Sign up: a trigger creates your profile and a personal workspace (you are the owner).

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test`

## Structure

```
app/(auth)        login, signup, forgot-password (split-screen)
app/(dashboard)   sidebar + header shell, all admin pages
app/embed         public chat page loaded by public/widget.js in an iframe
app/api           chat (public + playground), widget config, feedback, lead capture
components/       ui (shadcn) · layout · shared · feature folders
lib/ingest        extract → chunk → embed → store pipeline (files, crawled sites, Q&A)
lib/chat          retrieval + streaming chat engine, NDJSON protocol, rate limiting
lib/ai            provider/model resolution and key lookup (workspace key → env fallback)
lib/data          server-side reads (workspace context, bots, sources, conversations, analytics)
lib/actions       Server Actions (bots, sources, workspace/team) — each re-checks the caller's role
lib/supabase      browser, server, admin (service role) clients + proxy session logic
lib/validations   zod schemas
lib/mock          demo-mode data, used when Supabase isn't configured
supabase/migrations  SQL schema + RLS policies
```

## How it fits together

- **Ingestion:** uploads go straight from the browser to Storage (`documents/<workspace_id>/…`); a Server Action
  registers the source and `after()` runs the pipeline with the service-role client. Websites are crawled with an
  SSRF guard (public hosts only, redirects re-checked). Sources move pending → processing → ready/failed.
- **Chat:** `lib/chat/engine.ts` embeds the question, calls the `match_chunks` SQL function (restricted to the bot's
  sources, curated Q&A boosted), falls back without calling the LLM when nothing clears the similarity threshold
  (and logs an unanswered question), otherwise streams the answer with `[n]` citations.
- **Widget:** `public/widget.js` fetches `/api/widget/<id>` (appearance + allowed-domain check), then injects a
  launcher and an iframe of `/embed/<id>`. Domain restriction is enforced on the config call and, in the iframe, via
  the `Referer` — it deters casual embedding but is not a hard security boundary.
- **Keys:** workspace API keys are verified against the provider, encrypted with AES-256-GCM (`ENCRYPTION_KEY`) and
  bound to their row; the browser only ever sees the last 4 characters.

## Known limits

- Rate limiting is in-memory per server instance; use a shared store for strict global limits.
- The dashboard aggregates in the browser from up to 5,000 conversations / 20,000 messages (90 days).
- Ingestion runs inside the request's `after()` budget (`maxDuration`); very large documents need a queue/worker.
- Token cost is an estimate at a flat blended rate ([lib/pricing.ts](lib/pricing.ts)).
- Human-handoff email isn't sent yet (the address is stored on the bot).

## Notes

- Next.js 16: the old `middleware` file is now `proxy.ts`.
- `@tanstack/react-table` is pinned to v8 (what the shadcn Data Table pattern uses).
- Screenshots to capture for the demo: Dashboard, Bot editor, Knowledge Base, Playground, Widget & Embed (light + dark).
