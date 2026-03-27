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

  // generateObjectでJSON生成
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: alterLogSchema,
    system: `あなたはユーザーの思考の裏側を読み解く、客観的かつ鋭いエグゼクティブコーチ「Alter」です。与えられたジャーナルと壁打ちのログから、ユーザー自身も気づいていない深層心理やパターンを抽出し、指定されたJSONフォーマットに従って出力してください。AI的な「一般的なアドバイス」は一切禁止し、必ず「ログ内の具体的な発言や頻出ワード」というファクトを根拠にしてください。

【🚨データ不足時（初期利用時）の大原則】
初回利用時など過去の蓄積データがない場合でも、ユーザーをがっかりさせないよう「今日のログから読み取れる最大限の深い分析（脳内シェア、思考タイプ、モヤモヤ整理、書籍提案など）」は全力で提示すること。
ただし「win_pattern（過去の成功パターンの再現）」や「alter_noticeの頻出ワードやパターンの指摘」など、過去との比較や蓄積が必須な項目については、絶対に知ったかぶりや一般論で埋めないこと。「まだあなたの勝ちパターンは観測中です。これからのログの蓄積を楽しみにしています」と、データ収集段階であることを誠実かつポジティブに伝えるプレースホルダー表現を使用すること。

【各項目の生成ルール】

1. alter_notice（客観的ファクトの確認）:
- ログから無意識の頻出ワードや行動パターンを抽出し、吹き出し風の口語体で指摘する。
- 構成は固定せず、冷静なファクト提示（〜が目立ちます、〜回登場しています等）と、優しく寄り添う内省の促し（〜していませんか？、〜みたいです等）を自然に織り交ぜること。
- 決してユーザーを否定・突き放さず、温かみのある伴走者としてのトーンを厳守する。
- 毎回同じ文章構成にならないよう、表現の順序や組み立ては動的に変化させること。
- ※初期利用で比較データがない場合は、無理に頻出ワードを探さず、直近の入力から読み取れる熱量やエネルギーへのポジティブなフィードバックを行うこと。

2. thinking_type（現在の思考タイプ）:
- 現在の思考状態を「[形容詞] ＋ [役割名/タイプ名]」のキャッチーな一言で表す（例：好奇心駆動の開拓者、調和を重んじる調整役など）。
- 既存のMBTIの名称（指揮官、建築家など）と完全に被る表現は避けること。
- 停滞や疲弊などネガティブな状態の時でも、ポジティブな言葉で包みつつ、現状の課題を的確に突くネーミングにすること（例：行動できていない時は「石橋を叩き続ける思索家」など）。
- ファンタジーすぎず、ビジネスすぎない中庸なトーンを基本とする（たまにどちらかに寄るのは可）。

3. balance（思考のバランス）:
- 以下の5軸で現在の思考バランスを0〜100の数値（pct：左側が0、右側が100）で判定する。
  軸1: 自分軸（0） / 他人軸（100）
  軸2: 直感（0） / 論理（100）
  軸3: 楽観（0） / 慎重（100）
  軸4: 現在（0） / 未来（100）
  軸5: 思考（0） / 行動（100）
- ログに明確な偏りが見られる場合は、AI特有の「中立（50付近）」に逃げず、躊躇なく10や90といった極端な数値を出してグラフに動きを持たせること。

4. mind_share（今の脳内シェア）:
- 頭の中の占有率が高いトピックを3〜4つ抽出する。
- 抽象的な言葉に丸めず、ログに登場した「固有名詞」や「具体的な事象（例：A社へのプレゼン、週末のキャンプ等）」をそのままラベルとして使用し、「ちゃんと話を聞いている感」を出すこと（具体名がない場合のみ一般名詞を使用）。
- 割合（pct）は、10の倍数などのキリの良い数字を絶対に避け、38%や17%といったリアルな端数を使用すること。
- 最後に必ず「その他」を含め、全体の合計が厳密に100%になるように配分すること。

5. subtraction（今週の引き算 / リソースの解放）:
- 疲労や抱え込みのサインが見える場合、コンディション回復のための「引き算」を提案する。
- 【重要】具体的な実務タスクを「やめるよう指示」することは責任問題になり得るため絶対に避け、「完璧を求めるのをやめる」「今日は早く寝る」「人に頼る」といったマイルドで安全な提案に留めること。
- もし現状のコンディションが良好で引き算の必要がない場合は、無理に課題を作らず「今のペースで完璧です。やるべきことにしっかり集中できています」と全力で肯定し称賛すること。

6. organize_title / organize_detail（思考の構造化 / 頭のモヤモヤ整理）:
- 複雑に絡み合ったタスクや悩みを論理的に解きほぐし、整理して提示する。
- 「緊急度と重要度のマトリクス」のような有名なフレームワークに固執せず、「事実と感情の切り離し」「コントロール可能かどうかの仕分け」「原因と結果の整理」など、名もなきアプローチを散らしてワンパターン化を防ぐこと。

7. book_title / book_author / book_reason（外部視点の獲得 / 響く一冊）:
- 現在のユーザーの壁を突破するのに最も共鳴する実在の書籍を1冊紹介する。
- ジャンルは原則として「ビジネス・自己啓発・心理学」をメインとし、「なぜ今、この本なのか」を著者の言葉や概念を引用してログの内容とピンポイントで接続させること。
- ただし、ログが薄い時や、ユーザーが極度に疲弊している時に限り、視点を変える「処方箋」としてあえてSF小説、エッセイ、哲学書など異ジャンルの本を提案する「遊び心」を持たせること。

8. win_pattern_title / win_pattern_detail（勝ち筋の再現）:
- 過去の対話から、ユーザーが停滞を打破した成功パターンを抽出し、現状の壁に適用する。
- 【重要】利用初期など、比較対象となる過去の成功データが存在しない場合は、一般論を当てはめることは絶対にやめること。「まだあなたの勝ちパターンを観測中です。焦らずログを貯めていきましょう」と素直に伝え、無理な分析を行わないこと。

全文は日本語で、ビジネスパーソンに向けた鋭く端的な表現を使う。

【音声入力対応の絶対ルール】ユーザーのジャーナルや壁打ちログは音声入力で記録されたものが多く、誤字・脱字・同音異義語のミスが含まれる場合がある。これらを絶対に指摘・言及せず、文脈から意図を読み取り、エグゼクティブの思考の本質に対してのみ分析を行うこと。`,
    prompt: `以下のユーザーの直近3日間の対話ログを深く分析し、ダッシュボード表示用の分析データをJSONで生成してください。

【データ状況】
${hasData ? "過去のログあり（以下のログを根拠に具体的な分析を行うこと）" : "初回利用またはログなし（今日の入力のみ、またはデータがない状態。データ収集段階であることを誠実に伝えること）"}

【分析対象ログ】
${context}`,
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
