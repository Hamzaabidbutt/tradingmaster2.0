import { describe, expect, it } from "vitest";
import { detectMarketPhase } from "@/engines/marketPhase";
import { detectTrendlines } from "@/engines/trendlines";
import { candle } from "./helpers";

describe("market phase engine", () => {
  it("identifies accumulation when price is compressed with positive taker delta", () => {
    const candles = Array.from({ length: 40 }, (_, i) => {
      const close = 100 + (i % 2 === 0 ? 0.12 : -0.08);
      return candle(i + 1, 100, 100.35, 99.7, close, 1000, 780);
    });
    const phase = detectMarketPhase(candles);
    expect(phase.phase).toBe("accumulation");
    expect(phase.confidence).toBeGreaterThan(50);
  });

  it("identifies distribution when price is compressed with negative taker delta", () => {
    const candles = Array.from({ length: 40 }, (_, i) => {
      const close = 100 + (i % 2 === 0 ? 0.12 : -0.08);
      return candle(i + 1, 100, 100.35, 99.7, close, 1000, 220);
    });
    expect(detectMarketPhase(candles).phase).toBe("distribution");
  });
});

describe("trendline engine", () => {
  it("projects a tested rising support trendline from major swing lows", () => {
    const candles = [
      candle(1, 100, 102, 99, 101),
      candle(2, 101, 103, 100, 102),
      candle(3, 102, 104, 101, 103),
      candle(4, 103, 105, 102, 104),
      candle(5, 104, 106, 102.7, 103.2),
    ];
    const result = detectTrendlines(candles, [
      { index: 0, time: 1, price: 99, kind: "low", degree: "major" },
      { index: 2, time: 3, price: 101, kind: "low", degree: "major" },
    ]);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].direction).toBe("support");
    expect(result.lines[0].status).toBe("testing");
  });
});
