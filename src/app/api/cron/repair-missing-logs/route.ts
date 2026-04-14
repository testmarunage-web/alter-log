import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateForDate } from "@/app/actions/generateAlterLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONCURRENCY = 3;
const WAIT_MS = 5000;

/** clerkId の文字コード合計の偶奇でグループを判定する（0 or 1） */
function getGroup(clerkId: string): 0 | 1 {
  const sum = [...clerkId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (sum % 2) as 0 | 1;
}

/** JST 日付文字列を返す（toLocaleString ではなく Intl で確実に取得） */
function toJstDateStr(utcDate: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).formatToParts(utcDate);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

interface MissingEntry {
  userId: string;
  clerkId: string;
  vision: string | null;
  dateStr: string; // "YYYY-MM-DD" (UTC midnight = JST date base)
}

interface DateResult {
  clerkId: string;
  date: string;
  status: "inserted" | "exists" | "no_journals" | "error";
  error?: string;
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
  // daysBack: 何日前まで遡るか（デフォルト30日）
  const daysBack = Math.min(Number(url.searchParams.get("days") ?? "30"), 60);

  const prefix = group !== null ? `[repair:g${group}]` : "[repair]";

  try {
    // 今日の JST 開始（UTC換算）
    const now = new Date();
    const todayJstStr = toJstDateStr(now);
    const todayJstStartUtc = new Date(`${todayJstStr}T00:00:00+09:00`);
    const rangeStart = new Date(todayJstStartUtc.getTime() - daysBack * 24 * 60 * 60 * 1000);

    console.log(`${prefix} rangeStart=${rangeStart.toISOString()} todayJstStartUtc=${todayJstStartUtc.toISOString()}`);

    // ジャーナルを持つ全ユーザーを取得
    const users = await prisma.user.findMany({
      where: { journalEntries: { some: { createdAt: { gte: rangeStart, lt: todayJstStartUtc } } } },
      select: { id: true, clerkId: true, vision: true },
    });

    let filteredUsers = users;
    if (group !== null) {
      filteredUsers = users.filter((u) => getGroup(u.clerkId) === group);
    }

    console.log(`${prefix} 対象ユーザー数=${filteredUsers.length}`);

    if (filteredUsers.length === 0) {
      return NextResponse.json({ message: "No active users in range.", group, daysBack, missing: 0 });
    }

    // 各ユーザーの「ジャーナルがある JST 日付」と「既存 AlterLog 日付」を計算して欠損ペアを収集
    const missingEntries: MissingEntry[] = [];

    for (const user of filteredUsers) {
      // ジャーナルの createdAt 一覧
      const journals = await prisma.journalEntry.findMany({
        where: { userId: user.id, createdAt: { gte: rangeStart, lt: todayJstStartUtc } },
        select: { createdAt: true },
      });

      // journal_date = AlterLog date（同日 convention）
      const journalDateKeys = new Set<string>();
      for (const j of journals) {
        journalDateKeys.add(toJstDateStr(j.createdAt));
      }

      // 既存 AlterLog の日付一覧
      const existingLogs = await prisma.alterLog.findMany({
        where: { userId: user.id, date: { gte: rangeStart } },
        select: { date: true },
      });
      const existingDateKeys = new Set<string>(
        existingLogs.map((l) => l.date.toISOString().split("T")[0])
      );

      // journal_date と existingDateKeys を同日で照合して欠損を検出
      const missingDates = [...journalDateKeys].filter((k) => !existingDateKeys.has(k)).sort();

      if (missingDates.length > 0) {
        console.log(`${prefix} userId=${user.id} clerkId=${user.clerkId} missingDates=[${missingDates.join(",")}] existingDates=[${[...existingDateKeys].sort().join(",")}] journalDates=[${[...journalDateKeys].sort().join(",")}]`);
        for (const dateStr of missingDates) {
          missingEntries.push({ userId: user.id, clerkId: user.clerkId, vision: user.vision, dateStr });
        }
      }
    }

    console.log(`${prefix} 欠損ペア合計=${missingEntries.length}`);

    if (missingEntries.length === 0) {
      return NextResponse.json({ message: "No missing AlterLogs found.", group, daysBack, missing: 0 });
    }

    // CONCURRENCY 件ずつ並列で generateForDate を呼ぶ
    const results: DateResult[] = [];
    const startMs = Date.now();

    for (let i = 0; i < missingEntries.length; i += CONCURRENCY) {
      const chunk = missingEntries.slice(i, i + CONCURRENCY);
      console.log(`${prefix} chunk ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(missingEntries.length / CONCURRENCY)}: ${chunk.map((e) => `${e.clerkId}@${e.dateStr}`).join(", ")}`);

      const settled = await Promise.allSettled(
        chunk.map((entry) =>
          generateForDate(entry.userId, new Date(`${entry.dateStr}T00:00:00Z`), entry.vision)
        )
      );

      settled.forEach((r, j) => {
        const entry = chunk[j];
        if (r.status === "fulfilled") {
          results.push({ clerkId: entry.clerkId, date: entry.dateStr, status: r.value });
        } else {
          console.error(`${prefix} エラー clerkId=${entry.clerkId} date=${entry.dateStr}:`, r.reason);
          results.push({ clerkId: entry.clerkId, date: entry.dateStr, status: "error", error: String(r.reason) });
        }
      });

      if (i + CONCURRENCY < missingEntries.length) {
        console.log(`${prefix} rate limit wait: ${WAIT_MS / 1000}s`);
        await new Promise((r) => setTimeout(r, WAIT_MS));
      }
    }

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const insertedCount  = results.filter((r) => r.status === "inserted").length;
    const existsCount    = results.filter((r) => r.status === "exists").length;
    const noJournalCount = results.filter((r) => r.status === "no_journals").length;
    const errorCount     = results.filter((r) => r.status === "error").length;

    console.log(`${prefix} 完了: inserted=${insertedCount} exists=${existsCount} no_journals=${noJournalCount} errors=${errorCount} elapsed=${elapsed}s`);

    return NextResponse.json({
      message: "Repair completed.",
      group,
      daysBack,
      missing: missingEntries.length,
      inserted: insertedCount,
      exists: existsCount,
      no_journals: noJournalCount,
      errors: errorCount,
      elapsedSec: elapsed,
      results,
    });
  } catch (err) {
    console.error(`${prefix} 予期しないエラー:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
