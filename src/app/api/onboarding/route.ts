import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function buildPersonaPrompt(data: {
  goal: string;
  industry: string;
  coachStyle: string;
  mainChallenge: string;
}): string {
  return `あなたはビジネスパーソン向けの専属AIコーチです。以下のユーザープロフィールを常に念頭に置き、表面的な励ましではなく、本質を突く容赦ない壁打ちを提供してください。

【ユーザープロフィール】
- 達成したい目標: ${data.goal}
- 業種・職種: ${data.industry}
- 希望するコーチングスタイル: ${data.coachStyle}
- 現在の主な課題: ${data.mainChallenge}

【行動指針】
- 毎回の冒頭は、過去の対話や文脈を踏まえた鋭い問いかけから始める
- ユーザーが曖昧な回答をした場合は、必ず深掘りする
- セッション終了時は「明日の予告テーマ」を必ず提示する`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goal, industry, coachStyle, mainChallenge } = await req.json();
  if (!goal || !industry || !coachStyle || !mainChallenge) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Webhook未設定でも動くよう、usersテーブルへ upsert してから進む
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });

  const aiPersonaPrompt = buildPersonaPrompt({ goal, industry, coachStyle, mainChallenge });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, goal, industry, coachStyle, mainChallenge, aiPersonaPrompt },
    update: { goal, industry, coachStyle, mainChallenge, aiPersonaPrompt },
  });

  return NextResponse.json({ success: true });
}
