"use client";

import SignalTable from "./SignalTable";
import { SignalRow } from "@/hooks/useDashboard";

type Category = "scalping" | "intraday" | "swing";

function categoryOf(signal: SignalRow): Category {
  // Position trades share the swing board: both need multi-day management,
  // while the three requested boards remain predictable and easy to scan.
  if (signal.estHoldingMin < 4 * 60) return "scalping";
  if (signal.estHoldingMin < 24 * 60) return "intraday";
  return "swing";
}

const BOARDS: { key: Category; title: string; note: string }[] = [
  { key: "scalping", title: "Scalping signals", note: "Expected to play out within four hours" },
  { key: "intraday", title: "Intraday signals", note: "Same-day trade ideas" },
  { key: "swing", title: "Swing signals", note: "Multi-day and position trade ideas" },
];

export default function SignalCategoryBoards({
  signals,
  loading,
  error,
  expanded,
  onExpand,
}: {
  signals: SignalRow[];
  loading: boolean;
  error: string | null;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {BOARDS.map((board) => {
        const rows = signals.filter((signal) => categoryOf(signal) === board.key);
        return (
          <div key={board.key}>
            <p className="mb-1 px-1 text-[10px] text-slate-500">{board.note}</p>
            <SignalTable
              title={board.title}
              signals={rows}
              loading={loading}
              error={error}
              expanded={expanded}
              onExpand={onExpand}
            />
          </div>
        );
      })}
    </div>
  );
}
