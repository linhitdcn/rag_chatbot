import { getPublicBot } from "@/lib/data/public";
import { isHostAllowed } from "@/lib/validations/widget";

/** Appearance config for the loader script. Cross-origin by design: it runs on the customer's site. */
export async function GET(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const bot = await getPublicBot(publicId);
  const origin = request.headers.get("origin");

  let host: string | null = null;
  try { host = origin ? new URL(origin).host : null; } catch { /* malformed Origin header */ }

  if (!bot) return Response.json({ error: "Unknown bot" }, { status: 404, headers: { "access-control-allow-origin": "*" } });
  // Browsers always send Origin on this cross-origin fetch; a missing one is only acceptable for unrestricted bots.
  const allowed = bot.widget.domains.length === 0 || (host !== null && isHostAllowed(host, bot.widget.domains));
  if (!allowed) return Response.json({ error: "This domain isn't allowed to embed the widget." }, { status: 403, headers: { "access-control-allow-origin": origin ?? "*", vary: "origin" } });

  const { color, position, icon, title, poweredBy } = bot.widget;
  return Response.json({ color, position, icon, title, poweredBy }, {
    headers: { "access-control-allow-origin": origin ?? "*", vary: "origin", "cache-control": "public, max-age=60" },
  });
}
