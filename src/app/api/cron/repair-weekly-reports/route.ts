import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processWeeklyReportForUser, type WeeklyReportResult } from "@/app/actions/generateWeeklyReport";
import { getWeekBoundsFromMonday } from "@/lib/weekUtils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONCURRENCY = 3;
const WAIT_MS = 5000;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const weeksBack = parseInt(url.searchParams.get("weeks") || "4", 10);

  try {
    // 過去 N 週分の月曜日を生成
    const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const day = nowJst.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(nowJst);
    thisMonday.setDate(thisMonday.getDate() + diffToMonday);

    const mondayStrs: string[] = [];
    for (let i = 1; i <= weeksBack; i++) {
      const d = new Date(thisMonday);
      d.setDate(d.getDate() - 7 * i);
      mondayStrs.push([
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-"));
    }

    const results: { week: string; clerkId: string; status: string; reason?: string }[] = [];

    for (const mondayStr of mondayStrs) {
      const { mondayUtc, sundayEndUtc } = getWeekBoundsFromMonday(mondayStr);

      // その週にジャーナルがあるユーザー
      const journalUsers = await prisma.journalEntry.findMany({
        where: { createdAt: { gte: mondayUtc, lte: sundayEndUtc } },
        select: { user: { select: { id: true, clerkId: true } } },
        distinct: ["userId"],
      });

      for (let i = 0; i < journalUsers.length; i += CONCURRENCY) {
        const chunk = journalUsers.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
          chunk.map((ju) => processWeeklyReportForUser(ju.user.clerkId, { mondayStr })),
        );
        settled.forEach((r, j) => {
          if (r.status === "rejected") {
            results.push({ week: mondayStr, clerkId: chunk[j].user.clerkId, status: "error", reason: String(r.reason) });
          } else {
            const result = r.value as WeeklyReportResult;
            results.push({ week: mondayStr, clerkId: chunk[j].user.clerkId, status: result.status, ...("reason" in result ? { reason: result.reason } : {}) });
          }
        });
        if (i + CONCURRENCY < journalUsers.length) {
          await new Promise((r) => setTimeout(r, WAIT_MS));
        }
      }
    }

    const generated = results.filter((r) => r.status === "generated").length;
    const skipped = results.filter((r) => r.status === "skipped" || r.status === "exists").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      message: "Repair completed.",
      weeksBack,
      processed: results.length,
      generated,
      skipped,
      errors: errorCount,
      results,
    });
  } catch (err) {
    console.error("[repair-weekly] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
