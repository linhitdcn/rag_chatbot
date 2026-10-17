/** Blended $/1M tokens used for the cost estimate until per-model pricing lands. */
export const ESTIMATED_USD_PER_MILLION_TOKENS = 0.6;
export const estimateCostUsd = (tokens: number) => (tokens / 1_000_000) * ESTIMATED_USD_PER_MILLION_TOKENS;
