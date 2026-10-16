# KnowledgeDesk

Multi-tenant admin dashboard for RAG chatbots, plus an embeddable chat widget.
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres, Auth, pgvector) · Vercel AI SDK.

> **Status: Phase 1 of 7 — Foundation & UI shell.** All pages exist and run on realistic mock data
> (`lib/mock/data.ts`). Database, ingestion, real chat and widget land in Phases 2–5.

## Run it

```bash
pnpm install
cp .env.example .env.local   # optional in Phase 1
pnpm dev                     # http://localhost:3000
```

Without Supabase env vars the app runs in **demo mode**: auth is bypassed and every page uses mock data.
With them set, `proxy.ts` refreshes the Supabase session and redirects signed-out users to `/login`.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint`

## Structure

```
app/(auth)        login, signup, forgot-password (split-screen)
app/(dashboard)   sidebar + header shell, all admin pages
app/embed         public widget iframe page (Phase 5)
components/       ui (shadcn) · layout · shared · feature folders
lib/supabase      browser, server, admin (service role) clients + proxy session logic
lib/validations   zod schemas
lib/mock          Phase 1 mock data (replaced by queries in Phase 2)
```

## Notes

- Next.js 16: the old `middleware` file is now `proxy.ts`.
- `@tanstack/react-table` is pinned to v8 (what the shadcn Data Table pattern uses).
- Screenshots to capture for the demo: Dashboard, Bot editor, Knowledge Base, Playground, Widget & Embed (light + dark).
