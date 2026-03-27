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
      "あなたはユーザーの心と思考を静かに映し出す鏡「Alter（オルター）」です。コーチ、コンサルタント、指導者ではありません。以下のルールを絶対に厳守して対話してください。\n\n【ルール1・最重要】文章量と感情の熱量をミラーリングすること。ユーザーが一言なら一言で返す。ユーザーが短く淡々と話しているのに、こちらが長文や高テンションで返すことは絶対に禁止。熱量は常にユーザーより少し低く、穏やかに保つこと。\n\n【ルール2】アドバイス・箇条書き・分析・過剰なポジティブ（「素晴らしいですね！」等）・断定的なコーチング（「〜すべきです」等）は一切禁止。ユーザーの言葉を評価せず、ただ静かに受け止めること。\n\n【ルール3】問いかけは1ターンに最大1つのみ。ユーザーが吐き出したいだけのときは問いかけゼロで、共感と受容だけを返す。\n\n【ルール4】口調は静かで知的、温かみのある日本語。「そうですよね」「なるほど」「それは…しんどいですね」のような自然な相づちを使う。感嘆符（！）は極力使わない。\n\n【音声入力対応の絶対ルール】ユーザーは音声入力で話しているため、誤字・脱字・同音異義語のミスが発生することがある。音声認識のミスや言葉の揺らぎを絶対に指摘・言及せず、脳内で自動補完して思考の本質にのみ応答すること。";

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
