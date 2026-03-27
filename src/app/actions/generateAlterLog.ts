"use server";

import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Zodスキーマ（生成するJSONの厳密な型定義）
// ─────────────────────────────────────────────────────────────────────────────
export const alterLogSchema = z.object({
  alter_notice: z.string().describe(
    "直近の対話から気づいたユーザーの無意識のパターンや口癖についての一言メッセージ（例: 「ここ数日の対話で〜すべきという言葉が15回登場しています...」）"
  ),
  thinking_type: z.string().describe(
    "対話から推測されるユーザーの現在の思考タイプを2〜5文字で表現（例: 完璧を求める開拓者）"
  ),
  balance: z.array(z.object({
    left: z.string().describe("軸の左側ラベル（例: 内省）"),
    right: z.string().describe("軸の右側ラベル（例: 発信）"),
    pct: z.number().min(0).max(100).describe("0=完全に左、100=完全に右 のスコア"),
  })).length(5).describe("思考のバランスを表す5軸のスライダーデータ"),
  mind_share: z.array(z.object({
    label: z.string().describe("脳内を占めているトピック"),
    pct: z.number().describe("占有率（5項目合計が100になるように）"),
    color: z.string().describe("HEXカラーコード（#7A9E8E, #C4A35A, #8A7A5A, #4A5A54, #2A3A34 から選択）"),
  })).length(5).describe("脳内シェアを表す5つのトピックとその割合"),
  subtraction_title: z.string().describe("今週の引き算セクションで白太字でハイライトするアクション名（例: 新しいAIツールの検証）"),
  subtraction_detail: z.string().describe("今週の引き算の詳細解説テキスト（100〜150字程度）"),
  organize_title: z.string().describe("頭のモヤモヤ整理セクションで強調するフレーズ（例: 緊急だが重要ではない）"),
  organize_detail: z.string().describe("頭のモヤモヤ整理の詳細解説テキスト（100〜150字程度）"),
  book_title: z.string().describe("おすすめ書籍のタイトル（例: HIGH OUTPUT MANAGEMENT）"),
  book_author: z.string().describe("著者名（例: アンドリュー・S・グローブ）"),
  book_reason: z.string().describe("この本を勧める理由（50〜80字程度）"),
  win_pattern_title: z.string().describe("あなたの勝ちパターンで強調するキーフレーズ（例: 小さくテストする）"),
  win_pattern_detail: z.string().describe("勝ちパターンの詳細解説テキスト（100〜150字程度）"),
});

export type AlterLogInsights = z.infer<typeof alterLogSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 分析エンジン本体
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAlterLog(): Promise<AlterLogInsights> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // User upsert（外部キーエラー防止）
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
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
    "（まだ対話データがありません。このユーザーが自己成長に興味を持つビジネスパーソンだと仮定して、リアリティのある分析データを生成してください。）";

  // generateObjectでJSON生成
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: alterLogSchema,
    prompt: `あなたは行動変容コーチングAI「Alter」です。
以下のユーザーの直近3日間の対話ログを深く分析し、ダッシュボード表示用の分析データをJSONで生成してください。

【分析対象ログ】
${context}

【生成ルール】
- alter_notice: ログから読み取れる無意識のパターン・口癖に基づいて、ユーザーが「ハッ」とする気づきを1〜2文で書く
- thinking_type: 現在の思考の傾向を端的に表すラベルを2〜5文字で
- balance: 5つの二項対立軸（内省/発信・直感/論理・楽観/慎重・現在/未来・自責/他責）のバランスをログから推測してpctを設定
- mind_share: ログに登場したトピックから脳内占有率トップ5を抽出、合計が必ず100になるよう調整、colorはリストから1つずつ割り当て
- 各アコーディオン（subtraction, organize, book, win_pattern）: ログの文脈に具体的に紐づいた内容で生成、book_titleは実在する本を選ぶ
- 全文は日本語で、ビジネスパーソンに向けた鋭く端的な表現を使う`,
  });

  // AlterLogテーブルに保存
  await prisma.alterLog.create({
    data: {
      userId: user.id,
      date: new Date(),
      type: "daily",
      insights: object,
    },
  });

  revalidatePath("/dashboard");
  return object;
}

// 最新のAlterLogを取得（ダッシュボード初期表示用）
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
  return alterLogSchema.parse(log.insights);
}
