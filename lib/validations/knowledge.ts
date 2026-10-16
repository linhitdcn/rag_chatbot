import { z } from "zod";

export const urlSourceSchema = z.object({
  url: z.string().url("Enter a full URL, e.g. https://example.com/help"),
  maxPages: z.number().int().min(1, "At least 1 page").max(500, "Max 500 pages"),
});
export const qaSchema = z.object({
  question: z.string().min(5, "Question is too short"),
  answer: z.string().min(5, "Answer is too short"),
});
export type UrlSourceValues = z.infer<typeof urlSourceSchema>;
export type QaValues = z.infer<typeof qaSchema>;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".csv"];
export const MAX_FILE_MB = 20;
