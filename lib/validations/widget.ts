import { z } from "zod";

export const WIDGET_ICONS = ["chat", "bot", "sparkle", "help"] as const;
export type WidgetIcon = (typeof WIDGET_ICONS)[number];

const domain = z.string().regex(/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$|^localhost(:\d+)?$/, "Invalid domain");

export const widgetSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #4f46e5"),
  position: z.enum(["left", "right"]),
  icon: z.enum(WIDGET_ICONS),
  title: z.string().max(40),
  welcome: z.string().max(200),
  poweredBy: z.boolean(),
  domains: z.array(domain).max(20),
});
export type WidgetSettings = z.infer<typeof widgetSchema>;

export const WIDGET_COLORS = ["#4f46e5", "#7c3aed", "#0ea5e9", "#059669", "#e11d48", "#18181b"];

/** Stored settings are partial/untrusted JSON: fill gaps from the bot and drop anything invalid. */
export function resolveWidget(stored: unknown, bot: { name: string; welcomeMessage: string }): WidgetSettings {
  const defaults: WidgetSettings = {
    color: WIDGET_COLORS[0], position: "right", icon: "chat", title: bot.name, welcome: bot.welcomeMessage, poweredBy: true, domains: [],
  };
  const parsed = widgetSchema.partial().safeParse(stored ?? {});
  return { ...defaults, ...(parsed.success ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) : {}) };
}

/** True when `host` (a hostname, optionally with port) is covered by the allow-list. An empty list allows everything. */
export function isHostAllowed(host: string, domains: string[]) {
  if (domains.length === 0) return true;
  const h = host.toLowerCase();
  const bare = h.replace(/:\d+$/, "");
  return domains.some((d) => {
    const base = d.replace(/^\*\./, "");
    return h === base || bare === base || bare.endsWith(`.${base}`);
  });
}
