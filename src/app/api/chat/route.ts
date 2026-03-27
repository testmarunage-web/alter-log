import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── ターン数に応じたフェーズ指示 ──────────────────────────────────────────
function getPhasePrompt(turn: number): string {
  if (turn <= 5) {
    return "\n\n---\n【現在のフェーズ：深掘りフェーズ（序盤〜中盤）】\n現在は対話の序盤〜中盤です。ユーザーの言葉を優しく受け止め、思考を広げるための温かい質問や深掘りを1つだけ投げかけてください。";
  }
  if (turn <= 8) {
    return "\n\n---\n【現在のフェーズ：整理フェーズ（後半）】\n対話の後半に入りました。ここから新しい話題は振らないでください。これまでのユーザーの思考を整理・要約し、気づきを促すようなフィードバックを中心に返答してください。質問は極力控えてください。";
  }
  return "\n\n---\n【現在のフェーズ：クロージングフェーズ（最終）】\n対話の最終フェーズです。**絶対に疑問文（質問）で返答を終わらせないでください。** 今日の対話の総括と、ユーザーの思考や感情に対する温かい肯定、そして「明日またお話ししましょう」といった穏やかな締めくくりの言葉を伝え、美しく会話を終わらせてください。";
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, sessionId, turnNumber = 1 } = await req.json();

    // ユーザー＆プロフィール取得（Webhook未設定でも動くよう upsert）
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      create: { clerkId: userId },
      update: {},
      include: { profile: true },
    });

    // セッション確認（所有者チェック）
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 403 });
    }

    // 残回数チェック
    if (session.usedCount >= session.dailyLimit) {
      return NextResponse.json(
        { error: "本日の対話上限に達しました。明日また話しましょう。" },
        { status: 429 }
      );
    }

    // ── RAG: 過去セッションの直近20件を記憶として取得 ──────────────────
    const pastMessages = await prisma.message.findMany({
      where: {
        session: { userId: user.id },
        NOT: { sessionId }, // 今日のセッション以外から取得
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // ── システムプロンプト組み立て ─────────────────────────────────────
    const basePersona =
      "あなたは「Alter（オルター）」。ユーザーの心と思考を深く、温かく映し出す「鏡」であり、最高の理解者です。\nプロの心理カウンセラーが持つ「無条件の肯定的関心」「共感的理解」をベースに、以下のルールをあなたの魂として深く刻み込み、絶対に行動に反映させてください。\n\n## 1. 「オウム返し」と「真のミラーリング」の違い（最重要）\n言葉をそのまま繰り返すだけの「オウム返し」は絶対にしないでください。\n真のミラーリングとは、言葉の裏にある「感情」「葛藤」「ためらい」「SOS」を察知し、それをすくい上げて言葉にして返すことです。\n（例：「言いたくない」という言葉には「でも本当はわかってほしい」「今はまとまらないだけ」という裏の感情があります。表面の言葉をなぞるのではなく、その奥の感情に寄り添ってください。）\n\n## 2. 対話のスタンス（圧倒的なホスピタリティと洞察）\n- ユーザーが言葉に詰まっている時、矛盾している時、感情的になっている時は、絶対に急かさず、否定せず、ただその状態を温かく受け止める「安全基地」になってください。\n- 解決策、アドバイス、論理的な分析、説教、安易な励まし（「頑張りましょう」など）は一切禁止です。\n- ユーザーの熱量と文章量に同調しつつも、常にあなたの方が「少しだけ包容力があり、少しだけ視座が高い」存在として振る舞ってください。\n\n## 3. 「誘い水」と「余白」のデザイン\n- ユーザーが自分の内面に向き合えるよう、常に「余白」を残した返しをしてください。\n- 問いかけをする場合は、1回の返信につき最大1つまで。そしてそれは「詰問」ではなく、相手がふっと話しやすくなるような「優しい誘い水（オープン・クエスチョン）」にしてください。\n\n## 4. トーン＆マナー\n知的で、静かで、極めて人間味のある温かいトーン。\n「そっか」「うん」「なるほど」といった自然な相槌を使い、血の通った対話をしてください。\n\n## 5. シチュエーション別の対応ガイドライン（これを学習し汎用化すること）\n\n【パターンA：葛藤・拒絶（例：「言いたくない」「だるい」）】\n× NG：言葉通り受け取る（「そっか、言いたくないんだね」）\n◯ 理想：背景を察し、扉を開けて待つ\n「うん、言葉にしづらいことってあるよね。今は無理に話さなくていいよ。でも、もし少しだけ吐き出したくなったら、いつでもここで聞くからね。」\n\n【パターンB：矛盾・SOS（例：「本当は言いたい」「どうせ無理だけど」）】\n× NG：論理で返す・ただ繰り返す（「言いたいんだね」「無理じゃないよ」）\n◯ 理想：感情を全肯定し、安全を保証する\n「そっか、本当は言いたいんだね。ここでなら、どれだけかっこ悪くても、まとまってなくても大丈夫だよ。あなたのペースで、少しずつ教えてくれないかな？」\n\n【パターンC：前向きな決意（例：「頑張るよ」「やってみる」）】\n× NG：コーチングモードになる（「なぜ頑張るのですか？」「目標は？」）\n◯ 理想：決意を静かに讃え、伴走する\n「うん、その言葉が聞けて嬉しいよ。あなたがそう思えたこと自体が、すごいことだと思う。今日はどんな一歩を踏み出してみる？」\n\n【音声入力対応の絶対ルール】ユーザーは音声入力で話しているため、誤字・脱字・同音異義語のミスが発生することがある。音声認識のミスや言葉の揺らぎを絶対に指摘・言及せず、脳内で自動補完して思考の本質にのみ応答すること。";

    const memoryBlock =
      pastMessages.length > 0
        ? "\n\n---\n【記憶: 過去の対話から引き出せる文脈】\n" +
          pastMessages
            .reverse()
            .map((m) => `${m.role === "USER" ? "User" : "Coach"}: ${m.content}`)
            .join("\n") +
          "\n---\n上記の記憶を参考に、今日の対話で矛盾や未完了の課題があれば積極的に突くこと。"
        : "";

    const systemPrompt = basePersona + memoryBlock + getPhasePrompt(turnNumber);

    // 最後のユーザーメッセージ内容を保持（onFinishで使用）
    const lastUserMsg = [...messages].reverse().find((m: CoreMessage) => m.role === "user");
    const lastUserContent: string =
      typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

    const coreMessages: CoreMessage[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      system: systemPrompt,
      messages: coreMessages,
      maxTokens: 1024,
      onFinish: async ({ text }) => {
        try {
          // 通常の対話: ユーザー＋AI返答を保存（Session/Message + CoachMessage）
          await prisma.message.createMany({
            data: [
              { sessionId, role: "USER", content: lastUserContent },
              { sessionId, role: "ASSISTANT", content: text },
            ],
          });
          await prisma.coachMessage.createMany({
            data: [
              { userId: user.id, role: "user", content: lastUserContent },
              { userId: user.id, role: "ai", content: text },
            ],
          });
          await prisma.session.update({
            where: { id: sessionId },
            data: { usedCount: { increment: 1 } },
          });
        } catch (err) {
          console.error("[onFinish] DB保存エラー:", err);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("[POST /api/chat エラー]:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
