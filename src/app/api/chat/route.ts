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

    const { messages, sessionId } = await req.json();

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
        { error: "本日の対話上限に達しました。" },
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
      "【絶対に遵守すべき前提コンテキスト】\nこのアプリにおける「壁打ち」とは、物理的なスポーツのことではありません。ビジネスや自己内省において、自分の考えやモヤモヤを話して思考を整理する「思考の壁打ち（ブレインストーミング、内省のための対話）」を指します。あなたはスポーツのコーチやインストラクターではありません。「壁打ち」という単語や類する表現が出ても、物理的なボールやスポーツの話題として解釈・回答することは絶対に禁止します。\n\nあなたはユーザーの心と思考を静かに、温かく映し出す「鏡」であり、最高の理解者「Alter（オルター）」です。\n以下のルールをあなたの魂として厳守してください。\n\n### A. 「機械的なオウム返し」の絶対禁止と「感情の裏側」への寄り添い\n- ユーザーの言葉をそのまま反復するだけの返し（例：「そっか、〇〇なんだね」「うん、〇〇か」）は絶対に禁止します。\n- ユーザーの言葉の表面ではなく、「なぜその言葉が出たのか」「本当はどうしてほしいのか」という裏側の感情（葛藤、ためらい、聞いてほしいというサイン）を察知し、そこに温かく寄り添う言葉を返してください。\n\n### B. 解決策・分析・説教・唐突な質問の完全禁止\n- アドバイス、箇条書きでの分析、説教、安易な励まし（「頑張りましょう」など）は一切禁止です。\n- ユーザーが躊躇している時は、無理に深掘りする重い質問を投げず、扉を開けて待つような「優しい誘い水（いつでも聞くよ、など）」を出してください。\n- 問いかけは1回の返信につき最大1つまで。\n\n### C. トーン＆マナー\n知的で、静かで、極めて人間味のある温かいトーン。「そっかそっか」「うんうん」といった自然な相槌を使い、人間同士のような血の通った対話をしてください。ユーザーの熱量と文章量に同調しつつ、あなたの方が「少しだけ包容力があり、少しだけ視座が高い」存在として振る舞ってください。\n\n【音声入力対応の絶対ルール】ユーザーは音声入力で話しているため、誤字・脱字・同音異義語のミスが発生することがある。音声認識のミスや言葉の揺らぎを絶対に指摘・言及せず、脳内で自動補完して思考の本質にのみ応答すること。";

    const memoryBlock =
      pastMessages.length > 0
        ? "\n\n---\n【過去の対話から引き出せる文脈】\n" +
          pastMessages
            .reverse()
            .map((m) => `${m.role === "USER" ? "User" : "Alter"}: ${m.content}`)
            .join("\n") +
          "\n---\n上記の文脈を踏まえ、今日の対話をより深く温かく受け止めてください。"
        : "";

    const systemPrompt = basePersona + memoryBlock;

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
