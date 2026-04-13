import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMissingDailyLogs } from "@/app/actions/generateAlterLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Anthropic APIのレート制限を考慮した同時実行数
const CONCURRENCY = 5;

/** clerkId リストを concurrency 件ずつ並列で generateMissingDailyLogs する */
async function runRepairConcurrent(
  clerkIds: string[],
  concurrency: number
): Promise<{ clerkId: string; status: "ok" | "error"; error?: string }[]> {
  const results: { clerkId: string; status: "ok" | "error"; error?: string }[] = [];
  for (let i = 0; i < clerkIds.length; i += concurrency) {
    const chunk = clerkIds.slice(i, i + concurrency);
    console.log(`[repair] chunk ${Math.floor(i / concurrency) + 1}: ${chunk.length} users (${i + 1}〜${i + chunk.length}/${clerkIds.length})`);
    const settled = await Promise.allSettled(chunk.map((id) => generateMissingDailyLogs(id)));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results.push({ clerkId: chunk[j], status: "ok" });
      } else {
        console.error(`[repair] 失敗 clerkId=${chunk[j]}:`, r.reason);
        results.push({ clerkId: chunk[j], status: "error", error: String(r.reason) });
      }
    });
    // レート制限対策：最後のチャンク以外は10秒待機
    if (i + concurrency < clerkIds.length) {
      console.log("[repair] rate limit wait: 10s");
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  return results;
}

export async function GET(req: Request) {
  // Cronシークレットで認証（管理者のみ実行可能）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ジャーナルを持つ全ユーザーのclerkIdを取得
    const users = await prisma.user.findMany({
      where: {
        journalEntries: { some: {} },
      },
      select: { clerkId: true },
    });

    const clerkIds = users.map((u) => u.clerkId);

    if (clerkIds.length === 0) {
      return NextResponse.json({ message: "No users with journal entries.", processed: 0 });
    }

    console.log(`[repair] ${clerkIds.length}人の欠損AlterLog補完開始 (concurrency=${CONCURRENCY})`);
    const startMs = Date.now();

    const results = await runRepairConcurrent(clerkIds, CONCURRENCY);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const okCount    = results.filter((r) => r.status === "ok").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    console.log(`[repair] 完了: ok=${okCount} error=${errorCount} elapsed=${elapsed}s`);

    return NextResponse.json({
      message: "Repair completed.",
      processed: clerkIds.length,
      ok: okCount,
      errors: errorCount,
      elapsedSec: elapsed,
      results,
    });
  } catch (err) {
    console.error("[repair] 予期しないエラー:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
