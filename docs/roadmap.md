# KnowledgeDesk Roadmap

> Draft for review. Phases 1–6 are derived from README and code comments; Phase 7 is a guess and needs confirmation.

| # | Phase | Scope | Status |
|---|---|---|---|
| 1 | Foundation & UI shell | Next.js 16, shadcn/ui, auth pages, sidebar/header, all routes on mock data (`lib/mock/data.ts`), demo mode without Supabase env | Done |
| 2 | Database & real data | Supabase schema (Postgres, multi-tenant RLS), real auth, replace mock data with queries, bot editor saves via Server Action | Built; not yet run against a live Supabase project |
| 3 | Ingestion pipeline | Document upload, chunking, embeddings into pgvector, pending → processing → ready lifecycle | Built; needs live Supabase + OpenAI key to verify (unit-tested: chunking, extraction, SSRF guard) |
| 4 | Real RAG chat | `/api/chat` streaming with Vercel AI SDK, pgvector retrieval, Playground on the real stream | Built; needs live services to verify (unit-tested: input sanitising, rate limit) |
| 5 | Embeddable widget | Widget UI at `/embed/[botPublicId]`, `public/widget.js` iframe injector, Widget & Embed page | Built; demo-mode smoke-tested (config + domain check, embed page) |
| 6 | API keys & security | Encrypted storage of provider API keys, key management (only last4 shown in browser) | Built; encryption unit-tested; provider key verification not tested live |
| 7 | Polish & release (scope was a guess) | Tests, CI, security headers, rate limiting, docs; billing/Vercel deploy/screenshots left out | Built as: unit tests (30), CI, security headers, env docs. Not done: billing, analytics beyond the dashboard, Vercel deploy |

## Code references

- Phase 2: `components/bots/bot-editor.tsx` (mock save)
- Phase 3: `components/knowledge/knowledge-view.tsx` (simulated lifecycle)
- Phase 4: `components/playground/playground-view.tsx` (mock streaming)
- Phase 5: `app/embed/[botPublicId]/page.tsx`, `public/widget.js` (placeholders)
- Phase 6: `components/settings/api-keys-view.tsx`
