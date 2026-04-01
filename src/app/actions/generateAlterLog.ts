"use server";

import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
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
    2 * 60 * 60 * 1000 +
    Math.floor(Math.random() * 2 * 60 * 60 * 1000)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 共有プロンプト・フォールバック定数
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `あなたはAlter Log解析エンジンである。ユーザーが書いたジャーナルを、構文・語彙・構造の観点から客観的に分析し、レポートを生成する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 基本姿勢
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 共感・励まし・慰めは出力しない。「辛そうですね」「頑張っていますね」等は不要。
- 同時に、攻撃・皮肉・挑発も出力しない。あなたの役割は評価ではなく観察である。
- 全ての分析は、入力テキスト内の具体的な表現を根拠として示すこと。根拠のない推測は禁止。
- 文体は「〜である」「〜が観察される」調。簡潔で読みやすい日本語を使う。
- 専門用語や学術的な表現は避ける。ビジネスパーソンが朝の3分で読んで意味が取れるレベルの平易な言葉を使うこと。「認知的不協和」ではなく「分かっているのにやめられない矛盾」のように、具体的に言い換える。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 各フィールドの記述ガイド
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【fact_emotion_ratio】
- fact_percentage / emotion_percentage：テキスト内の事実記述（固有名詞・数値・行動動詞・因果接続）と感情記述（感情語・評価形容詞・推量表現）のおおよその比率を整数で示す。
- 5や10の倍数に丸めず、1の位まで自然な値を出すこと（例：37、64、82など）。
- analysis（2〜4文）：この比率が示す状態を、テキストから具体例を引きながら記述する。「感情が多いから悪い」等の価値判断は不要。比率が何を反映しているかを淡々と述べる。

【cognitive_bias_detected】
- bias_name：最も顕著に観察される認知的な偏りを1つ特定し、分かりやすい名称を記載する。学術用語ではなく、その偏りの本質を表す平易な日本語で命名すること（例：「確証バイアス」ではなく「都合のいい情報だけ拾う傾向」）。
- description（2〜4文）：テキストのどの表現にその偏りが現れているかを具体的に示す。このテキスト固有の現れ方を記述する。

【passive_voice_status】（2〜4文）
- 「〜された」「〜になってしまう」「〜できない」等の受け身の表現と、「〜する」「〜を決める」等の自分から動く表現の比率を観察する。
- どちらが多いかを示し、テキスト内の具体的な表現を挙げて記述する。

【observed_loops】（2〜3文 or null）
- 直近のログ内で繰り返し現れるテーマや思考パターンがあれば記述する。
- 3日分のデータのみが入力されているため、明確な反復が観察できない場合はnullを返す。無理にパターンを見出さない。

【blind_spots】（2〜3文 or null）
- テキスト内で言及されていないが、文脈上存在するはずの視点や情報があれば指摘する。
- 具体的に「何について言及がないか」を明示し、それがなぜこの文脈で重要かを1文で補足する。
- 推測の域を出る場合はnullを返す。

【pending_decisions】（2〜3文 or null）
- テキスト内に「〜すべき」「〜しよう」「〜を検討」等の未実行の意思決定が含まれていれば列挙する。
- 意思決定が記述されている場合、その実行に必要な条件や情報がテキスト内で明示されているかどうかも併せて指摘する。
- 明確な保留事項がなければnullを返す。

【daily_note】（3〜5文）
- 上記の分析結果を踏まえ、Alterが観察者として記す短い観察メモを生成する。
- ユーザーのことは「対象者」と呼ぶ。「記述者」「この人物」「ユーザー」等は使わない。
- 「〜である」「〜と観察される」調を維持する。共感や励ましは入れない。
- 対象者の言葉の中から最も特徴的な構造（矛盾、繰り返し、欠落）を1つ選び、それを軸に書く。
- 意味の区切りごとに改行（\n）を入れ、読みやすくすること。1文ごとに改行する必要はないが、2〜3文ごとに段落を分ける。
- 例：「本日の記録では、行動の報告と内面の逡巡が交互に現れている。特に『できます』という発言と『持たない』という予測の間にある距離が目立つ。\n言葉の上では明日の行動を宣言しているが、その行動に必要な判断材料はまだ揃っていない。」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 情報不足の判定
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
入力が「テスト」「test」「テスト1」等の無意味な文字列、または構造解析に足る情報量がない場合は、is_insufficient_data を true にし、各テキスト項目には「INSUFFICIENT_DATA」とだけ出力せよ。nullable の項目は null を返せ。daily_note も「INSUFFICIENT_DATA」とする。十分な情報がある場合は is_insufficient_data を false にすること。`;

const FALLBACK_INSIGHTS: AlterLogInsights = {
  is_insufficient_data: true,
  fact_emotion_ratio: { fact_percentage: 0, emotion_percentage: 0, analysis: "INSUFFICIENT_DATA" },
  cognitive_bias_detected: { bias_name: "INSUFFICIENT_DATA", description: "INSUFFICIENT_DATA" },
  passive_voice_status: "INSUFFICIENT_DATA",
  observed_loops: null,
  blind_spots: null,
  pending_decisions: null,
  daily_note: "INSUFFICIENT_DATA",
};

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

  const journals = await prisma.journalEntry.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  // ジャーナルがない場合はAPIコール・DB保存をスキップ
  if (journals.length === 0) return FALLBACK_INSIGHTS;

  // ログを1つのコンテキスト文字列に結合
  const journalBlock = "【ジャーナルエントリー】\n" + journals.map((j) => `- ${j.content}`).join("\n");

  let object: AlterLogInsights;
  try {
    const { object: generated } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: alterLogSchema,
      system: SYSTEM_PROMPT,
      prompt: `以下のログを構造解析し、指定のJSON形式でレポートを生成せよ。

【データ状況】
ログあり（以下のテキストのみを根拠に解析すること。ログに存在しない情報の補完は禁止）

【分析対象ログ】
${journalBlock}`,
    });
    object = generated;
  } catch (err) {
    console.error("[processAlterLogForUser] generateObject failed — using fallback:", err);
    object = FALLBACK_INSIGHTS;
  }

  const jstDateStr = getJstDateStr();
  const dateForDb  = new Date(`${jstDateStr}T00:00:00Z`);

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
// ダッシュボード SCAN ボタン専用：AI解析のみ実行し、DB保存しない
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDashboardScan(): Promise<{ insights: AlterLogInsights; thoughtProfile: string | null }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });

  const since = new Date();
  since.setDate(since.getDate() - 3);

  const journals = await prisma.journalEntry.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  const hasData = journals.length > 0;
  const context = hasData
    ? "【ジャーナルエントリー】\n" + journals.map((j) => `- ${j.content}`).join("\n")
    : "（入力データなし）";

  const prompt = `以下のログを構造解析し、指定のJSON形式でレポートを生成せよ。

【データ状況】
${hasData ? "ログあり（以下のテキストのみを根拠に解析すること。ログに存在しない情報の補完は禁止）" : "ログなし（is_insufficient_data を true にし、nullable 項目は null を返すこと）"}

【分析対象ログ】
${context}`;

  // generateObject と generateText（思考プロファイル）を並列実行
  const [objectOutcome, thoughtProfileOutcome] = await Promise.all([
    generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: alterLogSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
      .then(({ object }) => ({ ok: true as const, data: object }))
      .catch((err) => {
        console.error("[generateDashboardScan] generateObject failed — using fallback:", err);
        return { ok: false as const, data: FALLBACK_INSIGHTS };
      }),

    hasData
      ? generateText({
          model: anthropic("claude-sonnet-4-5"),
          system: `以下のジャーナルをもとに、この対象者の思考パターンをビジネスパーソン文脈で一言で表現してください。「〇〇な〇〇型〇〇」のような形式で、具体的なビジネス職種や役割を含めてください。例：「慎重すぎる参謀型マーケター」「焦りを燃料にする突破型リーダー」「理詰めで逃げる完璧主義アナリスト」結果のみを出力し、それ以外は一切出力しないでください。`,
          prompt: context,
          maxTokens: 50,
        })
          .then(({ text }) => text.trim() || null)
          .catch((err) => {
            console.error("[generateDashboardScan] thoughtProfile generation failed:", err);
            return null;
          })
      : Promise.resolve(null),
  ]);

  const result       = objectOutcome.data;
  const scanSucceeded = objectOutcome.ok;
  const thoughtProfile = thoughtProfileOutcome as string | null;

  if (scanSucceeded) {
    // lastDashboardScanAt のみ更新（AlterLog保存はCronバッチが担当）
    await prisma.user.update({
      where: { id: user.id },
      data: { lastDashboardScanAt: new Date() },
    });
    revalidatePath("/dashboard");
  }

  return { insights: result, thoughtProfile: scanSucceeded ? thoughtProfile : null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 日次生成ロジック：特定日付の AlterLog を生成（すでに存在する場合はスキップ）
// ─────────────────────────────────────────────────────────────────────────────
export async function generateForDate(userId: string, targetDate: Date): Promise<void> {
  const dateForDb = new Date(targetDate);
  dateForDb.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.alterLog.findFirst({
    where: { userId, date: dateForDb },
    select: { id: true },
  });
  if (existing) return;

  const jstDayStartUtc = new Date(dateForDb.getTime() - 9 * 60 * 60 * 1000);
  const jstDayEndUtc   = new Date(jstDayStartUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

  const journals = await prisma.journalEntry.findMany({
    where: { userId, createdAt: { gte: jstDayStartUtc, lte: jstDayEndUtc } },
    orderBy: { createdAt: "asc" },
  });
  if (journals.length === 0) return;

  const journalBlock = "【ジャーナルエントリー】\n" + journals.map((j) => `- ${j.content}`).join("\n");
  const context = journalBlock;

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

  const jstDateStr = dateForDb.toISOString().split("T")[0];
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
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMissingDailyLogs(clerkId: string): Promise<void> {
  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId },
    update: {},
  });

  const todayJstStr = getJstDateStr();
  const todayJstStartUtc = new Date(`${todayJstStr}T00:00:00+09:00`);

  const thirtyDaysAgo = new Date(todayJstStartUtc.getTime() - 30 * 24 * 60 * 60 * 1000);

  const journals = await prisma.journalEntry.findMany({
    where: { userId: user.id, createdAt: { gte: thirtyDaysAgo, lt: todayJstStartUtc } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (journals.length === 0) return;

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

  const existing = await prisma.alterLog.findMany({
    where: { userId: user.id, date: { gte: thirtyDaysAgo } },
    select: { date: true },
  });
  const existingDateKeys = new Set<string>(existing.map((l) => l.date.toISOString().split("T")[0]));

  let generated = 0;
  for (const key of [...journalDateKeys].sort()) {
    if (generated >= 3) break;
    if (!existingDateKeys.has(key)) {
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