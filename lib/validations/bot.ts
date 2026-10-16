import { z } from "zod";

export const botSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().max(200).default(""),
  status: z.enum(["active", "paused"]),
  systemPrompt: z.string().min(10, "Describe how the bot should behave (min 10 characters)"),
  tone: z.enum(["friendly", "professional", "concise"]),
  welcomeMessage: z.string().min(1, "Welcome message is required").max(300),
  starterQuestions: z.array(z.object({ value: z.string().min(1, "Question can't be empty") })).max(6),
  fallbackMessage: z.string().min(1, "Fallback message is required").max(300),
  provider: z.enum(["openai", "anthropic"]),
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
});

export type BotFormValues = z.infer<typeof botSchema>;

export const MODELS = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1"],
  anthropic: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"],
} as const;
