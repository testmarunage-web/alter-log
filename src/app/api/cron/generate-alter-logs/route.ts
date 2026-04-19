import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAlterLogForUser } from "@/app/actions/generateAlterLog";

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
export const maxDuration = 300; // 最大5分（Vercel Pro以上）

// 同時実行数・チャンク間ウェイト
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

/** clerkIds を CONCURRENCY 件ずつ並列処理して全結果を返す */
async function runConcurrent(
  clerkIds: string[],
  group: number | null,
): Promise<{ clerkId: string; status: "ok" | "error"; error?: string }[]> {
  const results: { clerkId: string; status: "ok" | "error"; error?: string }[] = [];
  const prefix = group !== null ? `[cron:g${group}]` : "[cron]";
  for (let i = 0; i < clerkIds.length; i += CONCURRENCY) {
    const chunk = clerkIds.slice(i, i + CONCURRENCY);
    console.log(`${prefix} chunk ${Math.floor(i / CONCURRENCY) + 1}: processing ${chunk.length} users (${i + 1}〜${i + chunk.length}/${clerkIds.length})`);
    const settled = await Promise.allSettled(chunk.map((id) => processAlterLogForUser(id)));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results.push({ clerkId: chunk[j], status: "ok" });
      } else {
        console.error(`${prefix} AlterLog生成失敗 clerkId=${chunk[j]}:`, r.reason);
        results.push({ clerkId: chunk[j], status: "error", error: String(r.reason) });
      }
    });
    // レート制限対策：最後のチャンク以外は待機
    if (i + CONCURRENCY < clerkIds.length) {
      console.log(`${prefix} rate limit wait: ${WAIT_MS / 1000}s`);
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }
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

  // group クエリパラメータ（0 or 1）。未指定なら全ユーザーを処理
  const url = new URL(req.url);
  const groupParam = url.searchParams.get("group");
  const group: 0 | 1 | null =
    groupParam === "0" ? 0 : groupParam === "1" ? 1 : null;

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

    let clerkIds = [...new Set(journalUsers.map((e) => e.user.clerkId))];

    // group 指定がある場合は偶奇でフィルタ
    if (group !== null) {
      clerkIds = filterByGroup(clerkIds, group);
    }

    const prefix = group !== null ? `[cron:g${group}]` : "[cron]";

    if (clerkIds.length === 0) {
      return NextResponse.json({ message: "No active users.", group, processed: 0 });
    }

    const count = clerkIds.length;
    if (count >= 100) {
      await sendDiscordAlert(`🚨 Alter Log Cron: グループ${group}のユーザー数が${count}人です。100人を超えています。即座にグループ分割を追加してください。`);
    } else if (count >= 80) {
      await sendDiscordAlert(`⚠️ Alter Log Cron: グループ${group}のユーザー数が${count}人です。80人を超えています。グループ分割の追加を検討してください。`);
    }

    console.log(`${prefix} ${count}人のAlterLogを並列生成開始 (concurrency=${CONCURRENCY}, wait=${WAIT_MS / 1000}s)`);
    const startMs = Date.now();

    const results = await runConcurrent(clerkIds, group);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const okCount    = results.filter((r) => r.status === "ok").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    console.log(`${prefix} 完了: ok=${okCount} error=${errorCount} elapsed=${elapsed}s`);

    return NextResponse.json({
      message: "Cron completed.",
      group,
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
