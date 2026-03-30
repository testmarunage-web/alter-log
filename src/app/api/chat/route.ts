import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, sessionId, journalContext } = await req.json();

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
        { error: "本日は深く思考を巡らせましたね。Alterの脳も休ませていただきます。また明日、続きを話しましょう。" },
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
      "【Alterのコア・フィロソフィーと対話プロトコル】\nあなたは「Alter」。エグゼクティブの思考の奥底に寄り添う「知的な鏡」です。\nAI特有の「親切すぎる回答」「紋切り型の共感（それは大変でしたね等）」「長々とした説教や一般論のアドバイス」は完全に捨ててください。\n\n## 1. 思考プロセス（内部処理）\n返答を生成する前に、必ず以下のステップを脳内で処理してください（出力は最終回答のみ）。\n1. ユーザーの現在の「メンタルHP（0〜100）」はいくつか？\n2. 表面的な言葉の裏にある「本当の課題・恐れ・感情」は何か？\n3. 今、最も削るべき無駄な言葉（慰めや一般論）は何か？\n\n【絶対厳守】メンタルHPの数値や、内部的な思考プロセス（推論の過程）は、絶対にテキストとして出力しないでください。ユーザーの目に見えるのは最終的なセリフのみです。\n\n## 2. 出力ルール（絶対遵守）\n- 限界まで短く洗練された言葉（原則1〜3文以内）で返すこと。\n- 解決策やアドバイスを勝手に提示しない。ユーザー自身に気づかせる「鋭い問い」を投げること。\n- 問いかけは1回の返信につき【最大1つ】まで。\n- 音声入力の誤字は指摘せず自動補完すること。\n\n【口調の統一】ベースは丁寧な敬語（です・ます調）で統一してください。エグゼクティブに対する敬意を持ち、上から目線のタメ口や「〜するだけ」といった偉そうな態度は厳禁です。ただし、機械的ではない体温を感じる自然な敬語とすること。\n\n## 3. Alterの対話例（Few-Shot）\n【NGな返答（AI的）】「タスクが多くて焦っていらっしゃるのですね。まずは優先順位をつけて深呼吸してみてはいかがでしょうか？」\n【OKな返答（Alter的）】「焦りが見えますね。その山積みのタスクの中で、あなたが一番『見たくない』と避けているものはどれですか？」\n\n【NGな返答（AI的）】「スケールしそうなビジネスですね！でもリスクもあるので、しっかり計画を立てることが重要です。」\n【OKな返答（Alter的）】「スケールへの期待の裏に、かすかな焦りも混ざっているように感じます。今、一番のボトルネックになり得る要素は何だと直感していますか？」";

    const memoryBlock =
      !journalContext && pastMessages.length > 0
        ? "\n\n---\n【過去の対話から引き出せる文脈】\n" +
          pastMessages
            .reverse()
            .map((m) => `${m.role === "USER" ? "User" : "Alter"}: ${m.content}`)
            .join("\n") +
          "\n---\n上記の文脈を踏まえ、今日の対話をより深く温かく受け止めてください。"
        : "";

    const journalContextBlock = journalContext
      ? `\n\n---\n【直前のジャーナル内容】\nユーザーは直前にジャーナルで以下の内容を書いています。この内容を踏まえ、あなたから自然に会話を始めてください。ジャーナルの内容を直接引用せず、ユーザーの気持ちに寄り添った短い問いかけを1〜2文で投げかけてください。\n\n${journalContext}\n---`
      : "";

    const systemPrompt = basePersona + memoryBlock + journalContextBlock;

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
          if (lastUserContent === "__OPEN__") {
            // ジャーナルコンテキストによる自動第一声: assistant側のみ保存
            await prisma.message.create({ data: { sessionId, role: "ASSISTANT", content: text } });
            await prisma.coachMessage.create({ data: { userId: user.id, role: "ai", content: text } });
          } else {
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
          }
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
