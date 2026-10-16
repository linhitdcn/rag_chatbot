import Link from "next/link";
import { BookOpen, Quote } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-4" aria-hidden />
          </span>
          KnowledgeDesk
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
      </div>

      <aside className="relative hidden flex-col justify-between overflow-hidden border-l bg-zinc-950 p-10 text-zinc-50 lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,hsl(243_75%_59%/0.45),transparent),radial-gradient(40%_40%_at_10%_90%,hsl(262_70%_55%/0.3),transparent)]"
        />
        <div className="relative space-y-3">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Turn your docs into a support agent that never sleeps.
          </p>
          <p className="max-w-md text-sm text-zinc-300">
            Upload files, crawl your site, and ship a branded chat widget with cited answers, lead capture and analytics.
          </p>
        </div>
        <figure className="relative max-w-md rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <Quote className="mb-2 size-5 text-primary" aria-hidden />
          <blockquote className="text-sm text-zinc-200">
            “We cut first-response time by 70% and the unanswered-questions inbox tells us exactly which docs to write next.”
          </blockquote>
          <figcaption className="mt-3 text-xs text-zinc-400">Dana Whitfield · Head of Support, Northwind</figcaption>
        </figure>
      </aside>
    </div>
  );
}
