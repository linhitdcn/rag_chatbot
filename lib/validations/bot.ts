import { z } from "zod";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/ai/providers";

export const botSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().max(200).default(""),
  status: z.enum(["active", "paused"]),
  systemPrompt: z.string().min(10, "Describe how the bot should behave (min 10 characters)"),
  tone: z.enum(["friendly", "professional", "concise"]),
  welcomeMessage: z.string().min(1, "Welcome message is required").max(300),
  starterQuestions: z.array(z.object({ value: z.string().min(1, "Question can't be empty") })).max(6),
  fallbackMessage: z.string().min(1, "Fallback message is required").max(300),
  provider: z.enum(PROVIDER_IDS),
  model: z.string().min(1),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().int().min(100).max(4000),
  topK: z.number().int().min(1).max(20),
  similarityThreshold: z.number().min(0.3).max(0.95),
  sourceIds: z.array(z.string()),
  citations: z.boolean(),
  leadCapture: z.boolean(),
  leadFields: z.array(z.enum(["name", "email", "phone"])),
  leadTiming: z.enum(["start", "after_3", "on_unanswered"]),
  handoffEmail: z.union([z.string().email("Enter a valid email"), z.literal("")]),
  feedback: z.boolean(),
  liveChat: z.boolean(),
  liveChatLabel: z.string().trim().min(1, "Button label is required").max(40, "Keep it under 40 characters"),
  liveChatWaitingMessage: z.string().trim().min(1, "Waiting message is required").max(200, "Keep it under 200 characters"),
  liveChatOffer: z.enum(["always", "on_unanswered"]),
});

export type BotFormValues = z.infer<typeof botSchema>;

export const MODELS = Object.fromEntries(PROVIDER_IDS.map((p) => [p, PROVIDERS[p].models])) as unknown as Record<(typeof PROVIDER_IDS)[number], readonly string[]>;
