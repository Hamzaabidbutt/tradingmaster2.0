import { Candle, MarketPhaseResult } from "./types";

type Phase = MarketPhaseResult["phase"];

/**
 * A compact Wyckoff-style phase read. It does not claim to identify every
 * accumulation/distribution schematic; it labels only evidence visible in the
 * candle and taker-flow data and exposes the reasons used by the signal engine.
 */
export function detectMarketPhase(candles: Candle[]): MarketPhaseResult {
  const half = Math.max(20, Math.floor(candles.length / 2));
  const recent = candles.slice(-half);
  const prior = candles.slice(Math.max(0, candles.length - half * 2), -half);
  const current = classify(recent);
  const previous = prior.length >= 10 ? classify(prior) : { phase: "neutral" as Phase, confidence: 0, reasons: [] };
  return { phase: current.phase, priorPhase: previous.phase, confidence: current.confidence, reasons: current.reasons };
}

function classify(candles: Candle[]): { phase: Phase; confidence: number; reasons: string[] } {
  if (candles.length < 10) return { phase: "neutral", confidence: 0, reasons: [] };
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const rangePct = first > 0 ? ((high - low) / first) * 100 : 0;
  const delta = candles.reduce((sum, c) => sum + ((c.takerBuyVolume ?? c.volume / 2) - (c.volume - (c.takerBuyVolume ?? c.volume / 2))), 0);
  const volume = candles.reduce((sum, c) => sum + c.volume, 0);
  const deltaShare = volume > 0 ? delta / volume : 0;
  const flat = Math.abs(changePct) <= Math.max(1.2, rangePct * 0.32);
  const confidence = Math.min(95, Math.round(45 + Math.min(25, Math.abs(deltaShare) * 120) + (flat ? 18 : 0) + Math.min(12, Math.abs(changePct) * 2)));

  if (flat && deltaShare > 0.06) return { phase: "accumulation", confidence, reasons: ["Price is compressed while taker delta is positive", "Buy aggression is being absorbed without an extended markup"] };
  if (flat && deltaShare < -0.06) return { phase: "distribution", confidence, reasons: ["Price is compressed while taker delta is negative", "Sell aggression is being absorbed without an extended markdown"] };
  if (changePct > 0.8 && deltaShare >= -0.02) return { phase: "markup", confidence, reasons: ["Price is advancing with non-negative taker flow"] };
  if (changePct < -0.8 && deltaShare <= 0.02) return { phase: "markdown", confidence, reasons: ["Price is declining with non-positive taker flow"] };
  return { phase: "neutral", confidence: Math.min(confidence, 50), reasons: ["No persistent phase imbalance in the current window"] };
}
