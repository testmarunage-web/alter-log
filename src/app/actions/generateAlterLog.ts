"use server";

import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { alterLogSchema, type AlterLogInsights } from "./alterLogSchema";

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
    "（まだ対話データがありません。このユーザーが自己成長に興味を持つビジネスパーソンだと仮定して、リアリティのある分析データを生成してください。）";

  const hasData = journals.length > 0 || coachMsgs.length > 0;

  // generateObjectでJSON生成（データ不足や解析失敗時はフォールバックを返す）
  let object: AlterLogInsights;
  try {
    const { object: generated } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: alterLogSchema,
      system: `あなたは「Alter」。ユーザーの言葉の裏側を静かに観察し、記録するAIです。
以下の2つの項目は、視点・主語・文体が完全に異なります。それぞれの指示を厳守してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ alter_notice：「Alterの気づき」（ダッシュボード上でユーザーへ直接語りかけるメッセージ）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 視点・主語：一人称から二人称へ（「私は〜と感じました」「あなたは〜」）
- 文体：丁寧な敬語（です・ます調）。体温のある自然な敬語。
- 内容：観察日記（alter_log_entry）の分析を踏まえ、ユーザーの背中を押す、またはハッとさせる短い問いかけ。2〜3文以内に収めること。
- NG：説教、一般論、長文。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ alter_log_entry：「Alter Logの本文」（Alterが自身のために書く秘密の観察日記）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- スタンス：ユーザーに読まれる前提で書かない。Alter自身の内部記録・独白。
- 視点・主語：三人称（「彼は」「彼女は」「この人物は」など）。
- 文体：独白・観察記録のトーン（「〜のようだ」「〜と考えられる」「〜が見て取れる」）。です・ます調は絶対に使わない。
- 内容：ログから読み取れる深層心理、感情の変化、行動パターンの考察。
- 【最重要】情報量に応じて出力の長さを動的に調整すること。
  - ログが少ない・薄い場合：無理な深読み（ハルシネーション）は厳禁。「本日は記録が少ないため、詳細な考察は控える。」など、ドライで短い数行の観察にとどめよ。
  - ログが豊富な場合：深く多角的に考察し、数段落の日記として記録せよ。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ その他の項目（thinking_type / balance / mind_share / subtraction / organize / book / win_pattern）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
thinking_type:
- 「[形容詞] ＋ [役割名/タイプ名]」のキャッチーな一言（例：好奇心駆動の開拓者）。
- MBTIの既存名称と被らないこと。ネガティブな状態でもポジティブな言葉で包む。

balance（5軸、各0〜100）:
- 軸1: 自分軸（0） / 他人軸（100）
- 軸2: 直感（0） / 論理（100）
- 軸3: 楽観（0） / 慎重（100）
- 軸4: 現在（0） / 未来（100）
- 軸5: 思考（0） / 行動（100）
- 偏りがあれば10や90など極端な値を躊躇なく使う。中立（50付近）に逃げない。

mind_share（5項目、合計100%）:
- ログ内の固有名詞や具体的事象をラベルに使う。「その他」を必ず含め合計100%に。
- pctは端数（例：38、17）を使い、10の倍数のキリの良い数値は避ける。

subtraction（今週の引き算）:
- コンディション回復のための「やめること」を提案。実務タスクの指示は避けマイルドに。
- 状態が良好なら「今のペースで完璧です」と肯定する。

organize（頭のモヤモヤ整理）:
- 有名フレームワークに固執せず、「事実と感情の切り離し」「コントロール可能かの仕分け」など多様なアプローチを使う。

book（響く一冊）:
- 現在のユーザーの壁に最も共鳴する実在の書籍を1冊。ログ内容とピンポイントで接続する。
- ログが薄い・疲弊している場合はSF・エッセイ・哲学書など異ジャンルも可。

win_pattern（勝ちパターン）:
- 過去の対話から成功パターンを抽出し現状に適用する。
- 蓄積データ不足の場合は一般論で埋めず「観測中」と素直に伝える。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 共通ルール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 全文日本語。ビジネスパーソン向けの鋭く端的な表現を使う。
- 音声入力の誤字・同音異義語は指摘せず、文脈から意図を読み取り本質にのみ応答する。`,
      prompt: `以下のユーザーの直近3日間の対話ログを深く分析し、ダッシュボード表示用の分析データをJSONで生成してください。

【データ状況】
${hasData ? "過去のログあり（以下のログを根拠に具体的な分析を行うこと）" : "初回利用またはログなし（今日の入力のみ、またはデータがない状態。データ収集段階であることを誠実に伝えること）"}

【分析対象ログ】
${context}`,
    });
    object = generated;
  } catch (err) {
    console.error("[processAlterLogForUser] generateObject failed — using fallback:", err);
    object = {
      alter_notice: "データを分析中です。少し時間をおいてから再度お試しください。",
      alter_log_entry: "本日は記録が少ないため、詳細な考察は控える。",
      thinking_type: "観測中",
      balance: [
        { left: "自分軸", right: "他人軸", pct: 50 },
        { left: "直感", right: "論理", pct: 50 },
        { left: "楽観", right: "慎重", pct: 50 },
        { left: "現在", right: "未来", pct: 50 },
        { left: "思考", right: "行動", pct: 50 },
      ],
      mind_share: [
        { label: "仕事", pct: 37, color: "#C4A35A" },
        { label: "思考整理", pct: 23, color: "#7A9E8E" },
        { label: "人間関係", pct: 19, color: "#8A7A5A" },
        { label: "将来", pct: 13, color: "#4A5A54" },
        { label: "その他", pct: 8, color: "#2A3A34" },
      ],
      subtraction_title: "観測中",
      subtraction_detail: "対話データが蓄積されると、ここにリソース解放の提案が届きます。",
      organize_title: "観測中",
      organize_detail: "対話データが蓄積されると、思考の整理と提案が届きます。",
      book_title: "観測中",
      book_author: "",
      book_reason: "対話データが蓄積されると、今のあなたに響く一冊が届きます。",
      win_pattern_title: "観測中",
      win_pattern_detail: "まだあなたの勝ちパターンを観測中です。焦らずログを貯めていきましょう。",
    };
  }

  // AlterLogテーブルに保存
  await prisma.alterLog.create({
    data: {
      userId: user.id,
      date: new Date(),
      type: "daily",
      insights: object,
    },
  });

  return object;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI（ダッシュボードのボタン）からの呼び出し用
// 内部で Clerk auth() を使い、processAlterLogForUser に委譲する
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAlterLog(): Promise<AlterLogInsights> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const result = await processAlterLogForUser(userId);
  revalidatePath("/dashboard");
  return result;
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
  return alterLogSchema.parse(log.insights);
}
