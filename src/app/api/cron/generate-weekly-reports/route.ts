import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processWeeklyReportForUser, type WeeklyReportResult } from "@/app/actions/generateWeeklyReport";

async function sendDiscordAlert(message: string): Promise<void> {
  const url = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.error("[discord alert] failed:", e);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 処理時間短縮のための調整:
// - 40人/group で 300秒タイムアウトしたため、並列数を増やし・待機時間を短縮
// - 6並列 × 3秒待機で概ね200秒以内に収まる想定（40〜50人規模）
const CONCURRENCY = 6;
const WAIT_MS = 3000;

/**
 * clerkIds 配列をソートした上で、インデックスの偶奇でグループに分割する。
 * 文字コード和ベースの旧方式は clerkId の実際の分布に偏りがあり不均等になっていたため、
 * 全体を取得→ソート→index ベースで分けることで常に ±1 人以内の均等分割を保証する。
 */
function filterByGroup(clerkIds: string[], group: 0 | 1): string[] {
  const sorted = [...clerkIds].sort();
  return sorted.filter((_, i) => (i % 2) === group);
}

async function runConcurrent(
  clerkIds: string[],
  group: number | null,
): Promise<{ clerkId: string; result: WeeklyReportResult | null; error?: string }[]> {
  const results: { clerkId: string; result: WeeklyReportResult | null; error?: string }[] = [];
  const prefix = group !== null ? `[weekly:g${group}]` : "[weekly]";
  for (let i = 0; i < clerkIds.length; i += CONCURRENCY) {
    const chunk = clerkIds.slice(i, i + CONCURRENCY);
    console.log(`${prefix} chunk ${Math.floor(i / CONCURRENCY) + 1}: processing ${chunk.length} users`);
    const settled = await Promise.allSettled(chunk.map((id) => processWeeklyReportForUser(id)));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results.push({ clerkId: chunk[j], result: r.value });
      } else {
        console.error(`${prefix} WeeklyReport生成失敗 clerkId=${chunk[j]}:`, r.reason);
        results.push({ clerkId: chunk[j], result: null, error: String(r.reason) });
      }
    });
    if (i + CONCURRENCY < clerkIds.length) {
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }
  }
  return results;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const groupParam = url.searchParams.get("group");
  const group: 0 | 1 | null =
    groupParam === "0" ? 0 : groupParam === "1" ? 1 : null;

  try {
    // 前週（月〜日）の JST 範囲を計算
    const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const day = nowJst.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(nowJst);
    thisMonday.setDate(thisMonday.getDate() + diffToMonday);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevSunday.getDate() + 6);

    const fmt = (d: Date) => [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");

    const mondayStr = fmt(prevMonday);
    const sundayStr = fmt(prevSunday);
    const mondayUtc = new Date(`${mondayStr}T00:00:00+09:00`);
    const sundayEndUtc = new Date(`${sundayStr}T23:59:59+09:00`);

    // 前週にジャーナルがあるユーザーを収集
    const journalUsers = await prisma.journalEntry.findMany({
      where: { createdAt: { gte: mondayUtc, lte: sundayEndUtc } },
      select: { user: { select: { clerkId: true } } },
      distinct: ["userId"],
    });

    let clerkIds = [...new Set(journalUsers.map((e) => e.user.clerkId))];

    if (group !== null) {
      clerkIds = filterByGroup(clerkIds, group);
    }

    const prefix = group !== null ? `[weekly:g${group}]` : "[weekly]";

    if (clerkIds.length === 0) {
      return NextResponse.json({ message: "No active users.", group, processed: 0 });
    }

    const count = clerkIds.length;
    if (count >= 80) {
      await sendDiscordAlert(`⚠️ Weekly Report Cron: グループ${group}のユーザー数が${count}人です。`);
    }

    console.log(`${prefix} ${count}人の WeeklyReport を生成開始 (week=${mondayStr}〜${sundayStr})`);
    const startMs = Date.now();

    const results = await runConcurrent(clerkIds, group);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const generated = results.filter((r) => r.result?.status === "generated").length;
    const skipped = results.filter((r) => r.result?.status === "skipped" || r.result?.status === "exists").length;
    const errorCount = results.filter((r) => r.error).length;
    console.log(`${prefix} 完了: generated=${generated} skipped=${skipped} error=${errorCount} elapsed=${elapsed}s`);

    return NextResponse.json({
      message: "Weekly report cron completed.",
      group,
      week: `${mondayStr}〜${sundayStr}`,
      processed: clerkIds.length,
      generated,
      skipped,
      errors: errorCount,
      elapsedSec: elapsed,
    });
  } catch (err) {
    console.error("[weekly cron] 予期しないエラー:", err);
    await sendDiscordAlert(`🚨 Weekly Report Cron エラー: ${String(err).slice(0, 300)}`);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
