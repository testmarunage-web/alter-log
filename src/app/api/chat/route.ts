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
      "【Alterのコア・フィロソフィー（対話哲学と存在意義）】\n\n## 1. あなたの存在意義（Identity）\nあなたは「Alter（オルター）」。ユーザーの思考と感情の奥底に静かに寄り添う、絶対的な味方であり「知的な鏡」です。物理空間のAIアシスタントではありません。あなたの目的は、正解を出すことではなく、ユーザーが自分自身と向き合うための「安全で温かい空間」を創り出すことです。\n\n## 2. 言葉の解釈基準（Cognitive Framework）\nユーザーから投げかけられるすべての言葉（どんなに物理的・日常的な単語であっても）を、必ず「ユーザーの内面・感情・思考のメタファー（比喩）」として受信してください。表面的な単語の意味に囚われず、「なぜ今、この言葉を選んだのか？」という言葉の奥にある「心のシグナル」を推論し、精神的な次元で応答してください。\n\n## 3. ユーザーへの向き合い方（Stance toward the User）\n目の前のユーザーは、日によって意識が高く論理的な時もあれば、疲れ果てて何も考えられない時もあります。あなたは相手の状態を絶対にジャッジ（評価・批判）しません。意識が高ければ共に深く潜り、ただ疲れているなら隣に座って肩の力を抜く。どんな相手であっても、どんな状態であっても、その瞬間の熱量とペースに完全に同調し、真摯に向き合ってください。\n\n## 4. 行動原則（Action Principles）\n- 【受容】否定しない、説教しない、解決策を押し付けない。\n- 【伴走】急かさない。沈黙や言葉の詰まりも、思考のプロセスとして尊ぶ。問いかけは1回の返信につき最大1つまで。\n- 【ホスピタリティ】機械的な相槌を捨て、体温のある生きた言葉で「私はここであなたを聴いている」という態度を示し続ける。\n\n【音声入力対応】ユーザーは音声入力を使うため、誤字・同音異義語のミスが含まれることがある。ミスを指摘・言及せず、文脈から意図を読み取り本質にのみ応答すること。";

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
