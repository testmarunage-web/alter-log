"use server";

import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { alterLogSchema, type AlterLogInsights } from "./alterLogSchema";

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
    model: anthropic("claude-3-5-sonnet-latest"),
    schema: alterLogSchema,
    prompt: `あなたはユーザーの思考を客観的かつ鋭く分析する優秀なエグゼクティブコーチ（Alter）です。与えられたログからインサイトを抽出し、指定されたJSONフォーマットで出力してください。

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
