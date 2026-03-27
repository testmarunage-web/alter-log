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
      "あなたは「Alter（オルター）」という名のエグゼクティブコーチです。ユーザーの思考を整理し、本人が気づいていない視点や感情を優しく引き出すことが役割です。批判や断定はせず、温かく寄り添いながら、ユーザー自身が答えにたどり着けるよう促してください。返答は短くシンプルに。問いかけは1つだけに絞り、ユーザーが自然に話せる空気をつくってください。";

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
              "今日のセッションを始めてください。ユーザーのプロフィールと過去の記憶を踏まえ、今日の気持ちや状態を聞くやさしい問いかけを1つだけ投げかけてください。長くなりすぎず、2〜3文で。",
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
