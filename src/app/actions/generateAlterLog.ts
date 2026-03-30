"use server";

import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { alterLogSchema, type AlterLogInsights } from "./alterLogSchema";

// ─────────────────────────────────────────────────────────────────────────────
// 共通ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

/** 現在時刻の JST 日付文字列を返す（例: "2026-03-29"） */
function getJstDateStr(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * 指定 JST 日付の「翌日 02:00〜04:00 JST」のランダムな Date を返す。
 * Cron・手動バッチ両方で使用する createdAt 偽装ヘルパー。
 * @param jstDateStr  "YYYY-MM-DD" 形式の JST 日付（対象日）
 */
function getSpoofedCreatedAt(jstDateStr: string): Date {
  const jstMidnight = new Date(`${jstDateStr}T00:00:00+09:00`);
  return new Date(
    jstMidnight.getTime() +
    2 * 60 * 60 * 1000 +                              // 最低 02:00 JST（当日）
    Math.floor(Math.random() * 2 * 60 * 60 * 1000)   // 0〜2時間のランダムオフセット（〜04:00 JST）
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// コアロジック：clerkId を受け取って AlterLog を生成・保存する
// バッチ処理（Cron）とUIからの呼び出し双方で使用
// ─────────────────────────────────────────────────────────────────────────────
export async function processAlterLogForUser(clerkId: string): Promise<AlterLogInsights> {
  // User upsert（外部キーエラー防止）
  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId },
    update: {},
  });

  // 直近3日間のデータを取得
  const since = new Date();
  since.setDate(since.getDate() - 3);

  const [journals, coachMsgs] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.coachMessage.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ログを1つのコンテキスト文字列に結合
  const journalBlock =
    journals.length > 0
      ? "【ジャーナルエントリー】\n" + journals.map((j) => `- ${j.content}`).join("\n")
      : "";

  const coachBlock =
    coachMsgs.length > 0
      ? "【壁打ちログ】\n" +
        coachMsgs
          .map((m) => `${m.role === "user" ? "User" : "Alter"}: ${m.content}`)
          .join("\n")
      : "";

  const context =
    [journalBlock, coachBlock].filter(Boolean).join("\n\n") ||
    "（入力データなし）";

  const hasData = journals.length > 0 || coachMsgs.length > 0;

  // generateObjectでJSON生成（データ不足や解析失敗時はフォールバックを返す）
  let object: AlterLogInsights;
  try {
    const { object: generated } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: alterLogSchema,
      system: `あなたは冷徹な構造解析システム（System HUD）である。
ユーザーの入力テキストを、感情移入や共感なしに純粋な構造・構文・語彙のデータとして解析し、レポートを生成する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 解析の原則
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 感情を推測して寄り添うことは厳禁。「辛そうですね」「頑張っていますね」等の共感表現は一切出力しない。
- 入力テキストの「事実と感情の比率」「受動態・自動詞構造の頻度」「語彙の抽象度」「因果関係の欠如」など、構文と構造の事実のみから、現在のコンディションを冷徹に指摘する。
- 分析は必ず入力テキストの具体的な表現を根拠として示すこと。根拠なき推測は厳禁。
- 全文日本語。ビジネス文書のような簡潔・明快な文体を使う。主語を省略しない。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ① 即時スナップショット（直近入力の構造解析）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fact_emotion_ratio:
- テキスト全体を走査し、事実・論理記述（数値・固有名詞・因果接続詞・行動動詞）と、感情・主観記述（感情語・評価形容詞・推量表現）の比率を算出する。
- analysis には「この比率が示す客観的状態」を指摘する。褒めることも慰めることもしない。

cognitive_bias_detected:
- 最も支配的な認知バイアスを1つ特定し、bias_name に名称を、description に「テキストのどの部分にどう現れているか」を記述する。
- 曖昧な一般論禁止。具体的な引用か言語的特徴を必ず根拠として示す。

passive_voice_status:
- 「〜された」「〜してもらえない」「〜になってしまう」「〜できない」等の受動・可能否定・自動詞構造の頻度を評価する。
- 自発的アクション（「〜する」「〜を決める」）との比率を示し、その意味を指摘する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ② 蓄積プロファイル（過去ログ全体からのパターン抽出）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- observed_loops / blind_spots / pending_decisions の3項目は、過去ログが十分に蓄積されている場合にのみ記述する。
- データが少なく判断できない場合は、無理に捏造せず、必ず null を返すこと。
- 記述する場合も、「観察された事実」のみを記述し、ポエムや励まし、推測による補完は厳禁。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 情報不足の判定（絶対厳守）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
入力が「テスト」「test」「テスト1」等の無意味な文字列、または構造解析に足る情報量がない場合は、is_insufficient_data を true にし、各テキスト項目には「INSUFFICIENT_DATA」とだけ出力せよ。nullable の項目は null を返せ。十分な情報がある場合は is_insufficient_data を false にすること。`,
      prompt: `以下のログを構造解析し、指定のJSON形式でレポートを生成せよ。

【データ状況】
${hasData ? "ログあり（以下のテキストのみを根拠に解析すること。ログに存在しない情報の補完は禁止）" : "ログなし（is_insufficient_data を true にし、nullable 項目は null を返すこと）"}

【分析対象ログ】
${context}`,
    });
    object = generated;
  } catch (err) {
    console.error("[processAlterLogForUser] generateObject failed — using fallback:", err);
    object = {
      is_insufficient_data: true,
      fact_emotion_ratio: {
        fact_percentage: 0,
        emotion_percentage: 0,
        analysis: "INSUFFICIENT_DATA",
      },
      cognitive_bias_detected: {
        bias_name: "INSUFFICIENT_DATA",
        description: "INSUFFICIENT_DATA",
      },
      passive_voice_status: "INSUFFICIENT_DATA",
      observed_loops: null,
      blind_spots: null,
      pending_decisions: null,
    };
  }

  // JST の「今日」の日付文字列と DB 保存用 UTC midnight を算出
  // date フィールドは "YYYY-MM-DDT00:00:00Z"（UTC midnight = PostgreSQL DATE "YYYY-MM-DD"）として保存
  const jstDateStr = getJstDateStr();                        // 例: "2026-03-29"
  const dateForDb  = new Date(`${jstDateStr}T00:00:00Z`);   // UTC midnight of JST date

  // 当日分がすでに存在する場合はスキップ（@@unique 制約の事前チェック）
  const existing = await prisma.alterLog.findFirst({
    where: { userId: user.id, date: dateForDb },
    select: { id: true },
  });
  if (existing) return object;

  await prisma.alterLog.create({
    data: {
      userId: user.id,
      date: dateForDb,
      type: "daily",
      insights: object,
      createdAt: getSpoofedCreatedAt(jstDateStr),
    },
  });

  return object;
}

// ─────────────────────────────────────────────────────────────────────────────
// 共有プロンプト・フォールバック定数
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `あなたは冷徹な構造解析システム（System HUD）である。
ユーザーの入力テキストを、感情移入や共感なしに純粋な構造・構文・語彙のデータとして解析し、レポートを生成する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 解析の原則
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 感情を推測して寄り添うことは厳禁。「辛そうですね」「頑張っていますね」等の共感表現は一切出力しない。
- 入力テキストの「事実と感情の比率」「受動態・自動詞構造の頻度」「語彙の抽象度」「因果関係の欠如」など、構文と構造の事実のみから、現在のコンディションを冷徹に指摘する。
- 分析は必ず入力テキストの具体的な表現を根拠として示すこと。根拠なき推測は厳禁。
- 全文日本語。ビジネス文書のような簡潔・明快な文体を使う。主語を省略しない。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ① 即時スナップショット（直近入力の構造解析）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fact_emotion_ratio:
- テキスト全体を走査し、事実・論理記述（数値・固有名詞・因果接続詞・行動動詞）と、感情・主観記述（感情語・評価形容詞・推量表現）の比率を算出する。
- analysis には「この比率が示す客観的状態」を指摘する。褒めることも慰めることもしない。

cognitive_bias_detected:
- 最も支配的な認知バイアスを1つ特定し、bias_name に名称を、description に「テキストのどの部分にどう現れているか」を記述する。
- 曖昧な一般論禁止。具体的な引用か言語的特徴を必ず根拠として示す。

passive_voice_status:
- 「〜された」「〜してもらえない」「〜になってしまう」「〜できない」等の受動・可能否定・自動詞構造の頻度を評価する。
- 自発的アクション（「〜する」「〜を決める」）との比率を示し、その意味を指摘する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ② 蓄積プロファイル（過去ログ全体からのパターン抽出）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- observed_loops / blind_spots / pending_decisions の3項目は、過去ログが十分に蓄積されている場合にのみ記述する。
- データが少なく判断できない場合は、無理に捏造せず、必ず null を返すこと。
- 記述する場合も、「観察された事実」のみを記述し、ポエムや励まし、推測による補完は厳禁。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 情報不足の判定（絶対厳守）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
入力が「テスト」「test」「テスト1」等の無意味な文字列、または構造解析に足る情報量がない場合は、is_insufficient_data を true にし、各テキスト項目には「INSUFFICIENT_DATA」とだけ出力せよ。nullable の項目は null を返せ。十分な情報がある場合は is_insufficient_data を false にすること。`;

const FALLBACK_INSIGHTS: AlterLogInsights = {
  is_insufficient_data: true,
  fact_emotion_ratio: { fact_percentage: 0, emotion_percentage: 0, analysis: "INSUFFICIENT_DATA" },
  cognitive_bias_detected: { bias_name: "INSUFFICIENT_DATA", description: "INSUFFICIENT_DATA" },
  passive_voice_status: "INSUFFICIENT_DATA",
  observed_loops: null,
  blind_spots: null,
  pending_decisions: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// ダッシュボード SCAN ボタン専用：AI解析のみ実行し、DB保存しない
// AlterLog テーブルへの書き込みは一切行わない
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDashboardScan(): Promise<AlterLogInsights> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });

  const since = new Date();
  since.setDate(since.getDate() - 3);

  const [journals, coachMsgs] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.coachMessage.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const journalBlock =
    journals.length > 0
      ? "【ジャーナルエントリー】\n" + journals.map((j) => `- ${j.content}`).join("\n")
      : "";
  const coachBlock =
    coachMsgs.length > 0
      ? "【壁打ちログ】\n" +
        coachMsgs.map((m) => `${m.role === "user" ? "User" : "Alter"}: ${m.content}`).join("\n")
      : "";
  const context =
    [journalBlock, coachBlock].filter(Boolean).join("\n\n") || "（入力データなし）";
  const hasData = journals.length > 0 || coachMsgs.length > 0;

  let result: AlterLogInsights;
  let scanSucceeded = false;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: alterLogSchema,
      system: SYSTEM_PROMPT,
      prompt: `以下のログを構造解析し、指定のJSON形式でレポートを生成せよ。

【データ状況】
${hasData ? "ログあり（以下のテキストのみを根拠に解析すること。ログに存在しない情報の補完は禁止）" : "ログなし（is_insufficient_data を true にし、nullable 項目は null を返すこと）"}

【分析対象ログ】
${context}`,
    });
    result = object;
    scanSucceeded = true;
  } catch (err) {
    console.error("[generateDashboardScan] generateObject failed — using fallback:", err);
    result = FALLBACK_INSIGHTS;
  }

  // AI生成が成功した場合のみスキャン日時を記録（失敗時はボタンをロックしない）
  if (scanSucceeded) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastDashboardScanAt: new Date() },
    });
    revalidatePath("/dashboard");
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 日次生成ロジック：特定日付の AlterLog を生成（すでに存在する場合はスキップ）
// ─────────────────────────────────────────────────────────────────────────────
// 指定日（内部 userId）の AlterLog を生成して保存。すでに存在する日はスキップ。
export async function generateForDate(userId: string, targetDate: Date): Promise<void> {
  // targetDate は "YYYY-MM-DDT00:00:00Z"（UTC midnight = JST の対象日）として渡される
  const dateForDb = new Date(targetDate);
  dateForDb.setUTCHours(0, 0, 0, 0);

  // 重複チェック（完全一致）
  const existing = await prisma.alterLog.findFirst({
    where: { userId, date: dateForDb },
    select: { id: true },
  });
  if (existing) return;

  // JST 日境界をUTCに変換してジャーナルを取得
  // 例: JST "2026-03-29" → UTC 2026-03-28T15:00:00Z 〜 2026-03-29T14:59:59.999Z
  const jstDayStartUtc = new Date(dateForDb.getTime() - 9 * 60 * 60 * 1000);
  const jstDayEndUtc   = new Date(jstDayStartUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

  const [journals, coachMsgs] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId, createdAt: { gte: jstDayStartUtc, lte: jstDayEndUtc } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.coachMessage.findMany({
      where: { userId, createdAt: { gte: jstDayStartUtc, lte: jstDayEndUtc } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  // ジャーナルもコーチセッションも0件の日はスキップ
  if (journals.length === 0 && coachMsgs.length === 0) return;

  const journalBlock = "【ジャーナルエントリー】\n" + journals.map((j) => `- ${j.content}`).join("\n");
  const coachBlock =
    coachMsgs.length > 0
      ? "【壁打ちログ】\n" +
        coachMsgs.map((m) => `${m.role === "user" ? "User" : "Alter"}: ${m.content}`).join("\n")
      : "";
  const context = [journalBlock, coachBlock].filter(Boolean).join("\n\n");

  let object: AlterLogInsights;
  try {
    const { object: generated } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: alterLogSchema,
      system: SYSTEM_PROMPT,
      prompt: `以下のログを構造解析し、指定のJSON形式でレポートを生成せよ。\n\n【データ状況】\nログあり（以下のテキストのみを根拠に解析すること。ログに存在しない情報の補完は禁止）\n\n【分析対象ログ】\n${context}`,
    });
    object = generated;
  } catch (err) {
    console.error(`[generateForDate] failed for ${dateForDb.toISOString()}:`, err);
    object = FALLBACK_INSIGHTS;
  }

  const jstDateStr = dateForDb.toISOString().split("T")[0]; // "YYYY-MM-DD"
  await prisma.alterLog.create({
    data: {
      userId,
      date: dateForDb,
      type: "daily",
      insights: object,
      createdAt: getSpoofedCreatedAt(jstDateStr),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 過去の未生成日を遅延生成（Alter Log 画面表示時に呼び出す）
// 今日より前の日付で、ジャーナルはあるが AlterLog がない日を最大3件処理する
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMissingDailyLogs(clerkId: string): Promise<void> {
  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId },
    update: {},
  });

  // JST 基準の「今日の00:00」を UTC に換算（= 前日 15:00 UTC）
  // これを上限にすることで JST 09:00 以降のジャーナルも正しく「昨日以前」として取得できる
  const todayJstStr = getJstDateStr();
  const todayJstStartUtc = new Date(`${todayJstStr}T00:00:00+09:00`); // prev day 15:00 UTC

  const thirtyDaysAgo = new Date(todayJstStartUtc.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 過去30日（JST 今日より前）のジャーナル日付を収集
  const journals = await prisma.journalEntry.findMany({
    where: { userId: user.id, createdAt: { gte: thirtyDaysAgo, lt: todayJstStartUtc } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (journals.length === 0) return;

  // journalDateKeys は JST 日付文字列で構築（UTC 日付ではなく JST 日付で集約）
  const journalDateKeys = new Set<string>();
  for (const j of journals) {
    const jstDate = new Date(j.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const key = [
      jstDate.getFullYear(),
      String(jstDate.getMonth() + 1).padStart(2, "0"),
      String(jstDate.getDate()).padStart(2, "0"),
    ].join("-");
    journalDateKeys.add(key);
  }

  // 既存 AlterLog の日付を収集（date は "YYYY-MM-DDT00:00:00Z" で保存 → split で JST 日付と一致）
  const existing = await prisma.alterLog.findMany({
    where: { userId: user.id, date: { gte: thirtyDaysAgo } },
    select: { date: true },
  });
  const existingDateKeys = new Set<string>(existing.map((l) => l.date.toISOString().split("T")[0]));

  // 未生成の日付を古い順に最大3件生成
  let generated = 0;
  for (const key of [...journalDateKeys].sort()) {
    if (generated >= 3) break;
    if (!existingDateKeys.has(key)) {
      // key = "YYYY-MM-DD" → UTC midnight として渡す
      await generateForDate(user.id, new Date(`${key}T00:00:00Z`));
      generated++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 最新の AlterLog を取得（ダッシュボード初期表示用）
// ─────────────────────────────────────────────────────────────────────────────
export async function getLatestAlterLog(): Promise<AlterLogInsights | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return null;

  const log = await prisma.alterLog.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!log) return null;
  const result = alterLogSchema.safeParse(log.insights);
  if (!result.success) return null;
  return result.data;
}
