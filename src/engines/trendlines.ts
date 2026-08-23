import { Candle, SwingPoint, Trendline, TrendlineResult } from "./types";

/**
 * Build actionable trendlines from the two latest compatible swing points.
 * The result is intentionally conservative: a line needs two distinct pivots
 * and is marked broken only by a candle close beyond a small ATR-like buffer.
 */
export function detectTrendlines(candles: Candle[], swings: SwingPoint[]): TrendlineResult {
  const price = candles[candles.length - 1]?.close ?? 0;
  const averageRange = candles.slice(-20).reduce((sum, c) => sum + (c.high - c.low), 0) / Math.max(1, Math.min(20, candles.length));
  const tolerance = Math.max(averageRange * 0.2, price * 0.001);
  const lines: Trendline[] = [];

  const support = buildLine("support", swings.filter((s) => s.kind === "low" && s.degree === "major").slice(-4), candles, tolerance);
  const resistance = buildLine("resistance", swings.filter((s) => s.kind === "high" && s.degree === "major").slice(-4), candles, tolerance);
  if (support) lines.push(support);
  if (resistance) lines.push(resistance);

  const summary = lines.map((line) => {
    const action = line.status === "broken" ? "broken" : line.status === "testing" ? "being tested" : "holding";
    return `${line.direction === "support" ? "Support" : "Resistance"} trendline ${action} (${line.touches} swing touches, strength ${line.strength})`;
  });
  return { lines, summary };
}

function buildLine(
  direction: Trendline["direction"],
  points: SwingPoint[],
  candles: Candle[],
  tolerance: number
): Trendline | null {
  if (points.length < 2 || candles.length === 0) return null;
  const end = points[points.length - 1];
  const start = points[points.length - 2];
  if (end.time === start.time) return null;

  const slope = (end.price - start.price) / (end.time - start.time);
  const last = candles[candles.length - 1];
  const projected = start.price + slope * (last.time - start.time);
  const close = last.close;
  const broken = direction === "support" ? close < projected - tolerance : close > projected + tolerance;
  const testing = !broken && Math.abs(close - projected) <= tolerance * 1.5;
  const touches = points.filter((point) => Math.abs(point.price - (start.price + slope * (point.time - start.time))) <= tolerance * 2).length;
  const strength = Math.min(100, Math.round(30 + touches * 18 + Math.min(30, Math.abs(slope) * last.time / Math.max(priceScale(last.close), 1))));

  return {
    direction,
    start: { time: start.time, price: start.price },
    end: { time: end.time, price: end.price },
    currentPrice: Number(projected.toFixed(8)),
    touches,
    distancePct: close > 0 ? Number((Math.abs(close - projected) / close * 100).toFixed(3)) : 0,
    strength,
    status: broken ? "broken" : testing ? "testing" : "holding",
  };
}

function priceScale(price: number): number {
  return Math.max(Math.abs(price), 0.000001);
}
