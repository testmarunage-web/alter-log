import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAlterLogForUser } from "@/app/actions/generateAlterLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 最大5分（Vercel Pro以上）

// Anthropic APIのレート制限を考慮した同時実行数
const CONCURRENCY = 5;

/** items を concurrency 件ずつ並列処理して全結果を返す */
async function runConcurrent(
  clerkIds: string[],
  concurrency: number
): Promise<{ clerkId: string; status: "ok" | "error"; error?: string }[]> {
  const results: { clerkId: string; status: "ok" | "error"; error?: string }[] = [];
  for (let i = 0; i < clerkIds.length; i += concurrency) {
    const chunk = clerkIds.slice(i, i + concurrency);
    console.log(`[cron] chunk ${Math.floor(i / concurrency) + 1}: processing ${chunk.length} users (${i + 1}〜${i + chunk.length}/${clerkIds.length})`);
    const settled = await Promise.allSettled(chunk.map((id) => processAlterLogForUser(id)));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results.push({ clerkId: chunk[j], status: "ok" });
      } else {
        console.error(`[cron] AlterLog生成失敗 clerkId=${chunk[j]}:`, r.reason);
        results.push({ clerkId: chunk[j], status: "error", error: String(r.reason) });
      }
    });
  }
  return results;
}

export async function GET(req: Request) {
  // Vercel推奨のCronシークレット検証
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 前日（N-1日）のJST 00:00〜23:59:59 をUTCに変換
    const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    nowJst.setDate(nowJst.getDate() - 1);
    const yesterdayJstStr = [
      nowJst.getFullYear(),
      String(nowJst.getMonth() + 1).padStart(2, "0"),
      String(nowJst.getDate()).padStart(2, "0"),
    ].join("-");
    const jstDayStartUtc = new Date(`${yesterdayJstStr}T00:00:00+09:00`);
    const jstDayEndUtc   = new Date(`${yesterdayJstStr}T23:59:59+09:00`);

    // 前日にJournalEntryを作成したユーザーのIDを収集
    const journalUsers = await prisma.journalEntry.findMany({
      where: { createdAt: { gte: jstDayStartUtc, lte: jstDayEndUtc } },
      select: { user: { select: { clerkId: true } } },
      distinct: ["userId"],
    });

    const clerkIds = [...new Set(journalUsers.map((e) => e.user.clerkId))];

    if (clerkIds.length === 0) {
      return NextResponse.json({ message: "No active users in the past 24h.", processed: 0 });
    }

    console.log(`[cron] ${clerkIds.length}人のAlterLogを並列生成開始 (concurrency=${CONCURRENCY})`);
    const startMs = Date.now();

    // 同時実行数 CONCURRENCY でチャンク並列処理
    const results = await runConcurrent(clerkIds, CONCURRENCY);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const okCount    = results.filter((r) => r.status === "ok").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    console.log(`[cron] 完了: ok=${okCount} error=${errorCount} elapsed=${elapsed}s`);

    return NextResponse.json({
      message: "Cron completed.",
      processed: clerkIds.length,
      ok: okCount,
      errors: errorCount,
      elapsedSec: elapsed,
      results,
    });
  } catch (err) {
    console.error("[cron] 予期しないエラー:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
