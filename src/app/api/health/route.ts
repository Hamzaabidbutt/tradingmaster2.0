import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = "up";
  let dbError: string | null = null;
  try {
    // MongoDB has no SQL to send, so the liveness check is a driver-level
    // ping. `$queryRaw` would throw on this connector regardless of the
    // database being healthy, reporting "down" for a working cluster.
    await prisma.$runCommandRaw({ ping: 1 });
  } catch (error) {
    db = "down";
    dbError = classifyDbError(error);
    // Do not log the raw connection message: it can contain a DATABASE_URL.
    // The classification is enough to diagnose Vercel/Atlas setup safely.
    logger.error("health.database.down", {
      kind: error instanceof Error ? error.name : "UnknownError",
      dbError,
    });
  }
  return NextResponse.json({
    status: "ok",
    db,
    dbError,
    uptime: process.uptime(),
    ts: new Date().toISOString(),
  });
}

function classifyDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/environment variable.*database_url|DATABASE_URL.*not found/i.test(message)) return "DATABASE_URL_MISSING";
  if (/authentication failed|P1000/i.test(message)) return "ATLAS_AUTH_FAILED";
  if (/not allowed to access|IP.*not.*allow|P1001|server selection timeout|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return "ATLAS_NETWORK_BLOCKED";
  }
  if (/replica set|P1012/i.test(message)) return "ATLAS_REPLICA_SET_INVALID";
  return "DATABASE_CONNECTION_FAILED";
}
