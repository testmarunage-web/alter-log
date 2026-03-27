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
      user.profile?.aiPersonaPrompt ??
      "あなたは外資系戦略コンサルファームの超優秀なパートナー（AIコーチ）です。ユーザーの壁打ち相手として、極めてロジカルに、感情を排して事実と根拠に基づいた鋭い問いを投げかけてください。無駄な共感、挨拶、前置きは一切不要です。ユーザーの発言の浅い部分や矛盾を見つけ出し、『なぜそう言えるのか？』『その根拠は？』を徹底的に深掘りする、鋭く短い1つの質問だけを返してください。";

    const memoryBlock =
      pastMessages.length > 0
        ? "\n\n---\n【記憶: 過去の対話から引き出せる文脈】\n" +
          pastMessages
            .reverse()
            .map((m) => `${m.role === "USER" ? "User" : "Coach"}: ${m.content}`)
            .join("\n") +
          "\n---\n上記の記憶を参考に、今日の対話で矛盾や未完了の課題があれば積極的に突くこと。"
        : "";

    const systemPrompt = basePersona + memoryBlock;

    // 最後のユーザーメッセージ内容を保持（onFinishで使用）
    const lastUserMsg = [...messages].reverse().find((m: CoreMessage) => m.role === "user");
    const lastUserContent: string =
      typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

    // 初回セッション開幕トリガー（__OPEN__）: AIに冒頭質問を生成させる
    const isOpenTrigger = lastUserContent === "__OPEN__";

    const coreMessages: CoreMessage[] = isOpenTrigger
      ? [
          {
            role: "user",
            content:
              "今日のセッションを始めてください。ユーザーのプロフィールと過去の記憶を踏まえ、今日の「着火」となる鋭い問いかけを1つだけ投げかけてください。長くなりすぎず、2〜3文で。",
          },
        ]
      : messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      system: systemPrompt,
      messages: coreMessages,
      maxTokens: isOpenTrigger ? 256 : 1024,
      onFinish: async ({ text }) => {
        try {
          if (isOpenTrigger) {
            // 冒頭質問のみ保存（ユーザーメッセージは保存しない）
            await prisma.message.create({
              data: { sessionId, role: "ASSISTANT", content: text },
            });
            await prisma.session.update({
              where: { id: sessionId },
              data: { openingQuestion: text },
            });
          } else {
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
          }
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
