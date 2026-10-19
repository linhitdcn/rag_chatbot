import type {
  Bot, Chunk, Conversation, Lead, Message, Source, TeamMember, UnansweredQuestion,
} from "@/lib/types";

import { resolveWidget } from "@/lib/validations/widget";

/** Anchor date so mock data is deterministic (no hydration mismatches). */
const NOW = new Date("2026-10-16T09:30:00Z").getTime();
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const workspace = { id: "ws_1", name: "Acme Inc.", plan: "Pro", timezone: "Asia/Ho_Chi_Minh" };
export const currentUser = { name: "Linh Tran", email: "linh@acme.com", role: "owner" as const };

const rawBots: Omit<Bot, "widget">[] = [
  {
    id: "bot_1", publicId: "bt_8fK2mQ", name: "Support Assistant",
    description: "Answers customer questions about orders, shipping and returns.",
    status: "active", avatarColor: "#6366f1", sourceCount: 4, conversations30d: 842,
    provider: "openai", model: "gpt-4o-mini", tone: "friendly",
    systemPrompt: "You are Acme's friendly support assistant. Help customers with orders, shipping and returns. Keep answers short and actionable.",
    welcomeMessage: "Hi there! 👋 How can I help you today?",
    fallbackMessage: "I couldn't find that in our knowledge base. Want me to connect you with a human?",
    starterQuestions: ["How do I track my order?", "What is your return policy?", "Do you ship internationally?"],
    temperature: 0.3, maxTokens: 800, topK: 5, similarityThreshold: 0.72,
    sourceIds: ["src_1", "src_2", "src_3", "src_5"],
    features: { citations: true, leadCapture: true, leadFields: ["name", "email"], leadTiming: "after_3", handoffEmail: "support@acme.com", feedback: true, liveChat: true, liveChatLabel: "Talk to a person", liveChatWaitingMessage: "We've let the team know. A person will reply here shortly — you can keep typing.", liveChatOffer: "always" },
  },
  {
    id: "bot_2", publicId: "bt_Zp91xL", name: "Sales Concierge",
    description: "Qualifies leads and answers pricing and product questions.",
    status: "active", avatarColor: "#8b5cf6", sourceCount: 3, conversations30d: 391,
    provider: "anthropic", model: "claude-sonnet-5-5", tone: "professional",
    lastError: { kind: "rate_limit", provider: "anthropic", model: "claude-sonnet-5-5", message: "Anthropic rate limit reached for claude-sonnet-5-5. Wait a moment, or switch this bot to another model or provider in its Model settings.", at: "2026-10-16T09:12:00Z" },
    systemPrompt: "You are a professional sales concierge for Acme. Explain plans and pricing clearly, and invite visitors to book a demo.",
    welcomeMessage: "Welcome to Acme! Ask me anything about our plans.",
    fallbackMessage: "I'm not sure about that one — let me get someone from sales to follow up.",
    starterQuestions: ["What plans do you offer?", "Is there a free trial?", "Can I get a demo?"],
    temperature: 0.4, maxTokens: 1000, topK: 6, similarityThreshold: 0.7,
    sourceIds: ["src_2", "src_4", "src_6"],
    features: { citations: true, leadCapture: true, leadFields: ["name", "email", "phone"], leadTiming: "start", handoffEmail: "sales@acme.com", feedback: true, liveChat: true, liveChatLabel: "Talk to a person", liveChatWaitingMessage: "We've let the team know. A person will reply here shortly — you can keep typing.", liveChatOffer: "always" },
  },
  {
    id: "bot_3", publicId: "bt_Qw33Rt", name: "HR Helpdesk",
    description: "Internal bot for employee policies and onboarding.",
    status: "paused", avatarColor: "#0ea5e9", sourceCount: 1, conversations30d: 64,
    provider: "openai", model: "gpt-4o", tone: "concise",
    systemPrompt: "You answer internal HR policy questions concisely, citing the handbook.",
    welcomeMessage: "Hello! Ask me about HR policies.",
    fallbackMessage: "That isn't covered in the handbook. Please contact hr@acme.com.",
    starterQuestions: ["How many vacation days do I get?", "How do I submit expenses?"],
    temperature: 0.2, maxTokens: 600, topK: 4, similarityThreshold: 0.75,
    sourceIds: ["src_7"],
    features: { citations: true, leadCapture: false, leadFields: ["email"], leadTiming: "start", handoffEmail: "hr@acme.com", feedback: false, liveChat: false, liveChatLabel: "Talk to a person", liveChatWaitingMessage: "We've let the team know. A person will reply here shortly — you can keep typing.", liveChatOffer: "always" },
  },
];

export const bots: Bot[] = rawBots.map((b) => ({
  ...b,
  widget: resolveWidget(b.id === "bot_1" ? { domains: ["acme.com"] } : null, { name: b.name, welcomeMessage: b.welcomeMessage }),
}));

export const sources: Source[] = [
  { id: "src_1", type: "file", name: "Shipping & Returns Policy.pdf", status: "ready", chunkCount: 42, sizeBytes: 2_340_000, lastSyncedAt: ago(60 * 24 * 3), botIds: ["bot_1"] },
  { id: "src_2", type: "file", name: "Product Catalog 2026.pdf", status: "ready", chunkCount: 188, sizeBytes: 9_120_000, lastSyncedAt: ago(60 * 24 * 9), botIds: ["bot_1", "bot_2"] },
  { id: "src_3", type: "url", name: "https://acme.com/help", url: "https://acme.com/help", status: "processing", chunkCount: 64, sizeBytes: 480_000, lastSyncedAt: ago(4), botIds: ["bot_1"] },
  { id: "src_4", type: "file", name: "Pricing & Plans.docx", status: "ready", chunkCount: 18, sizeBytes: 310_000, lastSyncedAt: ago(60 * 24 * 1), botIds: ["bot_2"] },
  { id: "src_5", type: "qa", name: "How do I reset my password?", question: "How do I reset my password?", answer: "Go to Settings → Security and choose “Reset password”. We'll email you a link that is valid for 30 minutes.", status: "ready", chunkCount: 1, sizeBytes: 420, lastSyncedAt: ago(60 * 5), botIds: ["bot_1"] },
  { id: "src_6", type: "url", name: "https://acme.com/pricing", url: "https://acme.com/pricing", status: "failed", error: "Request failed with status 403: the site blocked our crawler.", chunkCount: 0, sizeBytes: 0, lastSyncedAt: ago(60 * 2), botIds: ["bot_2"] },
  { id: "src_7", type: "file", name: "Employee Handbook.pdf", status: "pending", chunkCount: 0, sizeBytes: 5_800_000, lastSyncedAt: null, botIds: ["bot_3"] },
  { id: "src_8", type: "file", name: "FAQ export.csv", status: "ready", chunkCount: 73, sizeBytes: 120_000, lastSyncedAt: ago(60 * 24 * 14), botIds: [] },
  { id: "src_9", type: "qa", name: "Do you offer student discounts?", question: "Do you offer student discounts?", answer: "Yes — students get 30% off any annual plan with a valid .edu email.", status: "ready", chunkCount: 1, sizeBytes: 190, lastSyncedAt: ago(60 * 24 * 2), botIds: ["bot_2"] },
];

const chunkTexts = [
  "Orders are processed within 1–2 business days. Once your order ships you will receive a tracking number by email.",
  "Items can be returned within 30 days of delivery as long as they are unused and in their original packaging.",
  "International shipping is available to over 40 countries. Delivery typically takes 7–14 business days.",
  "Refunds are issued to the original payment method within 5–7 business days after we receive the returned item.",
  "Express shipping is available at checkout for an additional fee and arrives in 2–3 business days.",
];
export function chunksFor(sourceId: string, count = 12): Chunk[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${sourceId}_c${i}`, sourceId, index: i, page: Math.floor(i / 3) + 1,
    tokenCount: 120 + ((i * 37) % 260), content: chunkTexts[i % chunkTexts.length],
  }));
}

export const conversations: Conversation[] = (() => {
  const r = rng(7);
  const previews = [
    "Where is my order #48213?", "How do I return a damaged item?", "Do you ship to Germany?",
    "What's included in the Pro plan?", "Can I change my delivery address?", "Is there a student discount?",
    "How long does a refund take?", "I want to book a demo", "How many vacation days do I get?",
    "My coupon code isn't working", "What payment methods do you accept?", "Can I cancel my subscription?",
  ];
  return Array.from({ length: 48 }, (_, i) => {
    const rate = r();
    return {
      id: `conv_${i + 1}`,
      visitor: i % 4 === 0 ? ["Sarah Miller", "Tom Nguyen", "Priya Shah", "Marco Rossi", "Ana Lopez"][i % 5] : `visitor-${(1000 + i * 7).toString(16)}`,
      botId: bots[i % 3 === 2 ? 1 : i % 5 === 4 ? 2 : 0].id,
      preview: previews[i % previews.length],
      messageCount: 2 + Math.floor(r() * 12),
      rating: rate > 0.7 ? "up" : rate < 0.12 ? "down" : null,
      hasLead: i % 4 === 0,
      unanswered: r() < 0.14,
      startedAt: ago(20 + i * 190 + Math.floor(r() * 90)),
      mode: i === 1 ? "waiting" : "bot",
    } satisfies Conversation;
  });
})();

export const leads: Lead[] = Array.from({ length: 12 }, (_, i) => {
  const names = ["Sarah Miller", "Tom Nguyen", "Priya Shah", "Marco Rossi", "Ana Lopez", "Kenji Sato", "Lena Fischer", "Omar Haddad", "Chloe Martin", "Diego Alvarez", "Mia Johansson", "Noah Williams"];
  const n = names[i];
  const conv = conversations.filter((c) => c.hasLead)[i % 12];
  return {
    id: `lead_${i + 1}`, name: n,
    email: `${n.toLowerCase().replace(" ", ".")}@example.com`,
    phone: i % 3 === 0 ? "" : `+1 555 01${(10 + i).toString()}`,
    botId: conv.botId, conversationId: conv.id, capturedAt: ago(90 + i * 640),
  };
});

export const unanswered: UnansweredQuestion[] = [
  { id: "uq_1", question: "Do you offer gift wrapping?", variants: ["gift wrap available?", "can you wrap it as a gift"], botId: "bot_1", count: 14, lastSeenAt: ago(35), status: "open" },
  { id: "uq_2", question: "Is there an Android app?", variants: ["android app?", "play store download"], botId: "bot_2", count: 9, lastSeenAt: ago(220), status: "open" },
  { id: "uq_3", question: "Can I pay with crypto?", variants: ["bitcoin accepted?"], botId: "bot_1", count: 6, lastSeenAt: ago(60 * 20), status: "open" },
  { id: "uq_4", question: "What is your SLA for enterprise plans?", variants: ["enterprise uptime guarantee"], botId: "bot_2", count: 5, lastSeenAt: ago(60 * 30), status: "open" },
  { id: "uq_5", question: "Do you have a store in Hanoi?", variants: ["physical store location"], botId: "bot_1", count: 3, lastSeenAt: ago(60 * 52), status: "open" },
  { id: "uq_6", question: "How do I change my invoice email?", variants: [], botId: "bot_2", count: 2, lastSeenAt: ago(60 * 70), status: "open" },
];

export const team: TeamMember[] = [
  { id: "u1", name: "Linh Tran", email: "linh@acme.com", role: "owner", status: "active" },
  { id: "u2", name: "Minh Pham", email: "minh@acme.com", role: "editor", status: "active" },
  { id: "u3", name: "Sofia Chen", email: "sofia@acme.com", role: "viewer", status: "active" },
  { id: "u4", name: "—", email: "newhire@acme.com", role: "editor", status: "invited" },
];

export function transcriptFor(conversationId: string): Message[] {
  const conv = conversations.find((c) => c.id === conversationId) ?? conversations[0];
  return [
    { id: "m1", role: "user", content: conv.preview, createdAt: conv.startedAt },
    {
      id: "m2", role: "assistant",
      content: "Orders are processed within 1–2 business days, and you'll get a tracking number by email once it ships [1]. If it's been longer than that, I can help look into it.",
      createdAt: conv.startedAt, tokens: 412, latencyMs: 1320, model: "gpt-4o-mini", feedback: conv.rating,
      citations: [
        { n: 1, sourceName: "Shipping & Returns Policy.pdf", score: 0.89, snippet: chunkTexts[0] },
        { n: 2, sourceName: "https://acme.com/help", score: 0.81, snippet: chunkTexts[4] },
      ],
    },
    { id: "m3", role: "user", content: "Do you do express delivery too?", createdAt: conv.startedAt },
    {
      id: "m4", role: "assistant",
      content: "Yes! Express shipping is available at checkout for an additional fee and arrives in 2–3 business days [1].",
      createdAt: conv.startedAt, tokens: 298, latencyMs: 980, model: "gpt-4o-mini",
      citations: [{ n: 1, sourceName: "Shipping & Returns Policy.pdf", score: 0.91, snippet: chunkTexts[4] }],
    },
    { id: "m5", role: "user", content: "Do you offer gift wrapping?", createdAt: conv.startedAt },
    {
      id: "m6", role: "assistant", unanswered: true,
      content: "I couldn't find that in our knowledge base. Want me to connect you with a human?",
      createdAt: conv.startedAt, tokens: 96, latencyMs: 640, model: "gpt-4o-mini",
    },
  ];
}

// ---- Dashboard analytics ---------------------------------------------------
export function conversationsPerDay(days: number) {
  const r = rng(days * 13);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(NOW - (days - 1 - i) * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      conversations: Math.round(28 + i * (days > 30 ? 0.25 : 0.7) + r() * 22 + (d.getUTCDay() % 6 === 0 ? -12 : 0)),
    };
  });
}

export const messagesByBot = [
  { bot: "Support Assistant", messages: 4120 },
  { bot: "Sales Concierge", messages: 1890 },
  { bot: "HR Helpdesk", messages: 310 },
];

export const topQuestions = [
  { question: "Where is my order?", count: 212 },
  { question: "What is your return policy?", count: 167 },
  { question: "Do you ship internationally?", count: 131 },
  { question: "What's included in the Pro plan?", count: 96 },
  { question: "How do I reset my password?", count: 74 },
];

export const kpis = [
  { key: "conversations", label: "Conversations", value: "1,297", delta: 12.4 },
  { key: "messages", label: "Messages", value: "6,320", delta: 8.1 },
  { key: "answerRate", label: "Answer rate", value: "91.6%", delta: 2.3 },
  { key: "leads", label: "Leads captured", value: "184", delta: 21.7 },
  { key: "cost", label: "Token cost (month)", value: "$18.42", delta: -4.2 },
] as const;

export const usageByDay = Array.from({ length: 30 }, (_, i) => {
  const r = rng(i + 99)();
  const d = new Date(NOW - (29 - i) * 86_400_000);
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    tokens: Math.round(120_000 + r * 260_000),
  };
});

export function getBot(id: string) {
  return bots.find((b) => b.id === id);
}
export function getSource(id: string) {
  return sources.find((s) => s.id === id);
}
