import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/DashboardClient";
import type { TimelineData, WeatherDay } from "./_components/DashboardClient";
import { getLatestAlterLog } from "@/app/actions/generateAlterLog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type ButtonState = "A" | "B" | "C" | "D";

// ─── 頻出キーワード抽出（サーバーサイド） ────────────────────────────────────
const JP_STOPWORDS = new Set([
  "する", "した", "して", "ます", "です", "ない", "ある", "いる", "なる",
  "思う", "今日", "昨日", "明日", "ちょっと", "少し", "なんか", "ずっと",
  "やっぱ", "やはり", "本当", "本当に", "自分", "感じ", "気持ち",
  "最近", "仕事", "なんと", "ほんと", "やっと",
]);

function extractKeywords(texts: string[]): { word: string; count: number }[] {
  const fullText = texts.join(" ");
  const kanjiWords  = fullText.match(/[\u4E00-\u9FFF]{2,6}/g)  ?? [];
  const kataWords   = fullText.match(/[\u30A0-\u30FF]{3,}/g)   ?? [];
  const freq: Record<string, number> = {};
  for (const word of [...kanjiWords, ...kataWords]) {
    if (JP_STOPWORDS.has(word)) continue;
    freq[word] = (freq[word] ?? 0) + 1;
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .filter(({ count }) => count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const initialAlterLog = await getLatestAlterLog();
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  let buttonState: ButtonState = "A";
  let lastScanAt: Date | null = null;
  let initialThoughtProfile: string | null = null;
  let timelineData: TimelineData = {
    weatherDays: [],
    wordCloudWords: [],
    journalDayCount: 0,
    observerDays: 1,
    totalJournalCount: 0,
    totalScanCount: 0,
  };

  if (user) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalJournalCount,
      newJournalCount,
      recentScanResults,
      recentJournals,
      totalScanCount,
      latestScanRecord,
    ] = await Promise.all([
      prisma.journalEntry.count({ where: { userId: user.id } }),
      user.lastDashboardScanAt
        ? prisma.journalEntry.count({
            where: { userId: user.id, createdAt: { gt: user.lastDashboardScanAt } },
          })
        : Promise.resolve(0),
      prisma.scanResult.findMany({
        where: { userId: user.id, date: { gte: thirtyDaysAgo } },
        select: { date: true, insights: true },
        orderBy: { date: "asc" },
      }),
      prisma.journalEntry.findMany({
        where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, content: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.scanResult.count({ where: { userId: user.id } }),
      prisma.scanResult.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, thoughtProfile: true },
      }),
    ]);

    lastScanAt = latestScanRecord?.createdAt ?? null;
    initialThoughtProfile = latestScanRecord?.thoughtProfile ?? null;

    // ── ボタン状態 ──────────────────────────────────────────────────────────
    if (totalJournalCount === 0) {
      buttonState = "A";
    } else if (!user.lastDashboardScanAt) {
      buttonState = "B";
    } else {
      buttonState = newJournalCount >= 1 ? "C" : "D";
    }

    // ── 感情天気図：scanResult date → factPct マップ ──────────────────────────
    const alterLogMap: Record<string, number> = {};
    for (const scan of recentScanResults) {
      const d = new Date(new Date(scan.date).toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const ins = scan.insights as { fact_emotion_ratio?: { fact_percentage?: number } };
      if (ins?.fact_emotion_ratio?.fact_percentage != null) {
        alterLogMap[ds] = ins.fact_emotion_ratio.fact_percentage;
      }
    }

    // ── ジャーナル日付 → エントリ（内容+時刻）マップ ──────────────────────
    const journalsByDay: Record<string, { content: string; timeStr: string }[]> = {};
    for (const j of recentJournals) {
      const d = new Date(j.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      if (!journalsByDay[ds]) journalsByDay[ds] = [];
      journalsByDay[ds].push({ content: j.content, timeStr });
    }

    // ── 30日分の weatherDays を構築 ────────────────────────────────────────
    const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const weatherDays: WeatherDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(nowJst);
      d.setDate(nowJst.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayEntries = journalsByDay[ds] ?? [];
      weatherDays.push({
        dateStr: ds,
        day: d.getDate(),
        month: d.getMonth() + 1,
        factPct: alterLogMap[ds] ?? null,
        journalEntries: dayEntries.length > 0 ? dayEntries : null,
      });
    }

    const observerDays = Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    timelineData = {
      weatherDays,
      wordCloudWords: extractKeywords(recentJournals.map((j) => j.content)),
      journalDayCount: Object.keys(journalsByDay).length,
      observerDays,
      totalJournalCount,
      totalScanCount,
    };
  }

  return (
    <DashboardClient
      initialAlterLog={initialAlterLog}
      buttonState={buttonState}
      lastScanAt={lastScanAt}
      initialThoughtProfile={initialThoughtProfile}
      timelineData={timelineData}
    />
  );
}
