// NOTE: このファイルは "use server" を持たない通常のサーバーサイドモジュールです。
// processWeeklyReportForUser は Cron/repair エンドポイントからのみ呼び出され、
// ブラウザから直接 RPC 呼び出しされないことを保証します。

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getWeekBoundsFromMonday } from "@/lib/weekUtils";
import { getWeeklyReportStancePrompt } from "@/lib/feedbackStylePrompt";
import { buildVisionBlock } from "@/lib/visionUtils";
import { wrapJournal, USER_INPUT_SAFETY_NOTICE } from "@/lib/promptSanitize";

// ─────────────────────────────────────────────────────────────────────────────
// 週次レポートスキーマ
// ─────────────────────────────────────────────────────────────────────────────
const weeklyReportSchema = z.object({
  summary: z.string().describe("今週の一言サマリー（30文字以内）"),
  highlights: z.string().describe("今週のハイライト（印象的なジャーナルの要約、2〜3点）"),
  changes: z.string().describe("先週からの変化（思考パターン、感情バランス、テーマの変化）"),
  observation: z.string().describe("Alterからの総合観察（マイビジョンとの一致・乖離含む）"),
});

// ─────────────────────────────────────────────────────────────────────────────
// JST 週境界ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

/** 指定日の属する週の月曜日（JST）を返す */
function getJstMonday(d: Date): Date {
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const day = jst.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 日曜なら-6、それ以外は1-day
  jst.setDate(jst.getDate() + diff);
  return jst;
}

/** 前週の月曜〜日曜の JST 日付文字列を返す */
function getPreviousWeekBounds(): { mondayStr: string; sundayStr: string; mondayUtc: Date; sundayEndUtc: Date } {
  const now = new Date();
  const thisMonday = getJstMonday(now);
  // 前週の月曜 = 今週の月曜 - 7日
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

  return {
    mondayStr,
    sundayStr,
    mondayUtc: new Date(`${mondayStr}T00:00:00+09:00`),
    sundayEndUtc: new Date(`${sundayStr}T23:59:59+09:00`),
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// 1ユーザー分の週次レポート生成
// ─────────────────────────────────────────────────────────────────────────────
export type WeeklyReportResult =
  | { status: "generated" }
  | { status: "skipped"; reason: string }
  | { status: "exists" };

export async function processWeeklyReportForUser(
  clerkId: string,
  options?: { mondayStr?: string },
): Promise<WeeklyReportResult> {
  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId },
    update: {},
  });

  // 対象週の特定
  let mondayStr: string;
  let sundayStr: string;
  let mondayUtc: Date;
  let sundayEndUtc: Date;

  if (options?.mondayStr) {
    const bounds = getWeekBoundsFromMonday(options.mondayStr);
    mondayStr = options.mondayStr;
    sundayStr = bounds.sundayStr;
    mondayUtc = bounds.mondayUtc;
    sundayEndUtc = bounds.sundayEndUtc;
  } else {
    const bounds = getPreviousWeekBounds();
    mondayStr = bounds.mondayStr;
    sundayStr = bounds.sundayStr;
    mondayUtc = bounds.mondayUtc;
    sundayEndUtc = bounds.sundayEndUtc;
  }

  const prefix = `[weeklyReport] clerkId=${clerkId} week=${mondayStr}`;

  // 重複チェック
  const existing = await prisma.weeklyReport.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: new Date(`${mondayStr}T00:00:00Z`) } },
  });
  if (existing && existing.highlights) {
    console.log(`${prefix} already exists with full data, skipping`);
    return { status: "exists" };
  }

  // データ収集
  const [journals, alterLogs, scanResults] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id, createdAt: { gte: mondayUtc, lte: sundayEndUtc } },
      orderBy: { createdAt: "asc" },
      select: { content: true, createdAt: true },
    }),
    prisma.alterLog.findMany({
      where: { userId: user.id, date: { gte: mondayUtc, lte: sundayEndUtc } },
      orderBy: { date: "asc" },
      select: { insights: true, date: true },
    }),
    prisma.scanResult.findMany({
      where: { userId: user.id, date: { gte: mondayUtc, lte: sundayEndUtc } },
      orderBy: { date: "asc" },
      select: { insights: true, thoughtProfile: true, date: true },
    }),
  ]);

  console.log(`${prefix} journals=${journals.length} alterLogs=${alterLogs.length} scans=${scanResults.length}`);

  const MIN_JOURNALS = 3;
  if (journals.length < MIN_JOURNALS) {
    console.log(`${prefix} skipped: only ${journals.length} journals (min ${MIN_JOURNALS})`);
    return { status: "skipped", reason: `only ${journals.length} journals (min ${MIN_JOURNALS})` };
  }

  // 前週レポート（比較用）
  const prevMonday = new Date(`${mondayStr}T00:00:00Z`);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevReport = await prisma.weeklyReport.findFirst({
    where: { userId: user.id, weekStart: prevMonday },
    select: { summary: true, highlights: true, changes: true, observation: true },
  });

  // ユーザーのビジョン
  const visionText = await buildVisionBlock(user.id, "weekly");

  // プロンプト構築
  const journalText = journals
    .map((j) => {
      const d = new Date(j.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      return `[${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}]\n${wrapJournal(j.content)}`;
    })
    .join("\n\n---\n\n");

  const alterLogText = alterLogs
    .map((a) => {
      const insights = a.insights as Record<string, unknown>;
      return `[${new Date(a.date).toISOString().slice(5, 10)}] ${insights?.daily_note || "(なし)"}`;
    })
    .join("\n");

  const scanText = scanResults
    .map((s) => {
      const insights = s.insights as Record<string, unknown>;
      const bias = insights?.cognitive_bias_detected as Record<string, unknown> | undefined;
      return `[${new Date(s.date).toISOString().slice(5, 10)}] プロファイル: ${s.thoughtProfile || "N/A"} / バイアス: ${bias?.bias_name || "N/A"}`;
    })
    .join("\n");

  const systemPrompt = `あなたは「Alter」。ユーザーの内省を観察する、もう一人の自分。
${getWeeklyReportStancePrompt(user.feedbackStyle)}
1週間分のジャーナル・Alter Log・SCAN結果を総合的に分析し、週次レポートを生成してください。

## ルール
- 事実に基づいて分析すること。推測は最小限に。
- ユーザーの思考パターンの変化や傾向を捉えること。
- 「いいね」「頑張ってるね」のような安易な肯定は不要。具体的な観察を。
${visionText ? `- ユーザーのビジョン・目標:\n${visionText}\n  ビジョンとの一致・乖離がある場合は言及すること。` : ""}
${prevReport ? `- 先週のレポートとの比較で変化を記述すること。` : "- これが最初のレポートなので、比較対象はなし。現状の分析に集中すること。"}

## 出力フォーマット
JSON で以下のフィールドを返してください:
- summary: 今週を一言で表す（30文字以内、キャッチーに）
- highlights: 今週のハイライト（印象的なジャーナルの要約を2〜3点、改行区切り）
- changes: 先週からの変化（思考パターン、感情バランス、テーマの変化を具体的に）
- observation: Alterからの総合観察（200〜400文字。マイビジョンとの一致・乖離を含む）${USER_INPUT_SAFETY_NOTICE}`;

  const userMessage = `## 対象期間: ${mondayStr} 〜 ${sundayStr}

## ジャーナル（${journals.length}件）
${journalText}

${alterLogs.length > 0 ? `## Alter Log（日次）\n${alterLogText}` : ""}

${scanResults.length > 0 ? `## SCAN結果\n${scanText}` : ""}

${prevReport ? `## 先週のレポート
- 一言: ${prevReport.summary}
- ハイライト: ${prevReport.highlights || "(なし)"}
- 変化: ${prevReport.changes || "(なし)"}
- 観察: ${prevReport.observation || "(なし)"}` : ""}`;

  const result = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: weeklyReportSchema,
    system: systemPrompt,
    prompt: userMessage,
    maxTokens: 2048,
  });

  const report = result.object;
  console.log(`${prefix} generated: summary="${report.summary}"`);

  // DB upsert
  const weekStartDate = new Date(`${mondayStr}T00:00:00Z`);
  const weekEndDate = new Date(`${sundayStr}T00:00:00Z`);

  await prisma.weeklyReport.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart: weekStartDate } },
    create: {
      userId: user.id,
      weekStart: weekStartDate,
      weekEnd: weekEndDate,
      summary: report.summary,
      highlights: report.highlights,
      changes: report.changes,
      observation: report.observation,
      rawJson: report,
      chartData: {
        journalCount: journals.length,
        alterLogCount: alterLogs.length,
        scanCount: scanResults.length,
      },
    },
    update: {
      summary: report.summary,
      highlights: report.highlights,
      changes: report.changes,
      observation: report.observation,
      rawJson: report,
      chartData: {
        journalCount: journals.length,
        alterLogCount: alterLogs.length,
        scanCount: scanResults.length,
      },
    },
  });

  console.log(`${prefix} saved to DB`);
  return { status: "generated" };
}
