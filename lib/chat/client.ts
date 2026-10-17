import type { ChatEvent } from "./types";

/** Reads the NDJSON chat stream, yielding each event as it arrives. */
export async function* readChatEvents(res: Response): AsyncGenerator<ChatEvent> {
  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).error ?? message; } catch { /* non-JSON error body */ }
    yield { t: "error", message };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as ChatEvent;
    }
  }
}
