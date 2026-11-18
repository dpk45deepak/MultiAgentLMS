/**
 * Rough pricing so usage_events.cost_usd is a useful ESTIMATE. Token counts
 * are approximated from character length (~4 chars/token) because the provider
 * wrappers return plain text, not usage objects. Prices are USD per 1M tokens
 * and are deliberately easy to edit — replace them with your real rates (and
 * measure real cost per notes set / quiz / chat message before setting plan
 * prices). Unknown models fall back to a conservative default.
 */
export interface ModelPrice {
  inPerMillion: number;
  outPerMillion: number;
}

const PRICES: { match: RegExp; price: ModelPrice }[] = [
  { match: /gpt-oss-120b/i, price: { inPerMillion: 0.15, outPerMillion: 0.6 } },
  { match: /gpt-oss-20b/i, price: { inPerMillion: 0.075, outPerMillion: 0.3 } },
  { match: /llama.*(70b|maverick|scout)/i, price: { inPerMillion: 0.6, outPerMillion: 0.8 } },
  { match: /qwen/i, price: { inPerMillion: 0.3, outPerMillion: 0.6 } },
  { match: /gemini.*flash/i, price: { inPerMillion: 0.3, outPerMillion: 2.5 } },
  { match: /gemini.*pro/i, price: { inPerMillion: 1.25, outPerMillion: 10 } },
];

const DEFAULT_PRICE: ModelPrice = { inPerMillion: 0.5, outPerMillion: 1.5 };

export function estimateTokens(chars: number): number {
  return Math.max(0, Math.ceil(chars / 4));
}

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const price = PRICES.find((p) => p.match.test(model))?.price ?? DEFAULT_PRICE;
  const cost = (tokensIn * price.inPerMillion + tokensOut * price.outPerMillion) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
