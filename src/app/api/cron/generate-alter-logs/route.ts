import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAlterLogForUser } from "@/app/actions/generateAlterLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 最大5分（Vercel Pro以上）

export async function GET(req: Request) {
  // Vercel推奨のCronシークレット検証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 過去24時間以内にアクティブだったユーザーを取得
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // 過去24時間にJournalEntryを作成したユーザーのIDを収集
    const journalUsers = await prisma.journalEntry.findMany({
      where: { createdAt: { gte: since } },
      select: { user: { select: { clerkId: true } } },
      distinct: ["userId"],
    });

    const clerkIds = [...new Set(journalUsers.map((e) => e.user.clerkId))];

    if (clerkIds.length === 0) {
      return NextResponse.json({ message: "No active users in the past 24h.", processed: 0 });
    }

    // 各ユーザーに対して AlterLog を順次生成
    const results: { clerkId: string; status: "ok" | "error"; error?: string }[] = [];
    for (const clerkId of clerkIds) {
      try {
        await processAlterLogForUser(clerkId);
        results.push({ clerkId, status: "ok" });
      } catch (err) {
        console.error(`[cron] AlterLog生成失敗 clerkId=${clerkId}:`, err);
        results.push({ clerkId, status: "error", error: String(err) });
      }
    }

    return NextResponse.json({
      message: "Cron completed.",
      processed: clerkIds.length,
      results,
    });
  } catch (err) {
    console.error("[cron] 予期しないエラー:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
