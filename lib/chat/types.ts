export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RetrievedChunk {
  n: number;
  source: string;
  score: number;
  text: string;
}

/** One JSON object per line of the response body. */
export type ChatEvent =
  | { t: "meta"; conversationId: string | null; chunks: RetrievedChunk[] }
  | { t: "delta"; text: string }
  | { t: "done"; conversationId: string | null; messageId: string | null; unanswered: boolean; model: string; latencyMs: number; tokens: { input: number; output: number } }
  | { t: "error"; message: string };

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_HISTORY = 20;
