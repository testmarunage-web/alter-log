import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMissingDailyLogs } from "@/app/actions/generateAlterLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONCURRENCY = 5;
const WAIT_MS = 5000;

/** clerkId の文字コード合計の偶奇でグループを判定する（0 or 1） */
function getGroup(clerkId: string): 0 | 1 {
  const sum = [...clerkId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (sum % 2) as 0 | 1;
}

/** clerkId リストを CONCURRENCY 件ずつ並列で generateMissingDailyLogs する */
async function runRepairConcurrent(
  clerkIds: string[],
  group: number | null,
): Promise<{ clerkId: string; status: "ok" | "error"; error?: string }[]> {
  const results: { clerkId: string; status: "ok" | "error"; error?: string }[] = [];
  const prefix = group !== null ? `[repair:g${group}]` : "[repair]";
  for (let i = 0; i < clerkIds.length; i += CONCURRENCY) {
    const chunk = clerkIds.slice(i, i + CONCURRENCY);
    console.log(`${prefix} chunk ${Math.floor(i / CONCURRENCY) + 1}: ${chunk.length} users (${i + 1}〜${i + chunk.length}/${clerkIds.length})`);
    // maxGenerate=30 で制限を外し、過去30日分の全欠損を生成する
    const settled = await Promise.allSettled(chunk.map((id) => generateMissingDailyLogs(id, 30)));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results.push({ clerkId: chunk[j], status: "ok" });
      } else {
        console.error(`${prefix} 失敗 clerkId=${chunk[j]}:`, r.reason);
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
  // Cronシークレットで認証（管理者のみ実行可能）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // group クエリパラメータ（0 or 1）。未指定なら全ユーザー
  const url = new URL(req.url);
  const groupParam = url.searchParams.get("group");
  const group: 0 | 1 | null =
    groupParam === "0" ? 0 : groupParam === "1" ? 1 : null;

  try {
    // ジャーナルを持つ全ユーザーのclerkIdを取得
    const users = await prisma.user.findMany({
      where: { journalEntries: { some: {} } },
      select: { clerkId: true },
    });

    let clerkIds = users.map((u) => u.clerkId);

    // group 指定がある場合は偶奇でフィルタ
    if (group !== null) {
      clerkIds = clerkIds.filter((id) => getGroup(id) === group);
    }

    const prefix = group !== null ? `[repair:g${group}]` : "[repair]";

    if (clerkIds.length === 0) {
      return NextResponse.json({ message: "No users with journal entries.", group, processed: 0 });
    }

    console.log(`${prefix} ${clerkIds.length}人の欠損AlterLog補完開始 (concurrency=${CONCURRENCY}, wait=${WAIT_MS / 1000}s)`);
    const startMs = Date.now();

    const results = await runRepairConcurrent(clerkIds, group);

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const okCount    = results.filter((r) => r.status === "ok").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    console.log(`${prefix} 完了: ok=${okCount} error=${errorCount} elapsed=${elapsed}s`);

    return NextResponse.json({
      message: "Repair completed.",
      group,
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
