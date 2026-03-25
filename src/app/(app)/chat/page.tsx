import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ChatInterface } from "./_components/ChatInterface";

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // オンボーディング未完了チェック（Webhook未設定でも動くよう upsert）
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
    include: { profile: true },
  });
  if (!user.profile) redirect("/onboarding");

  // Clerkからユーザー名を取得（表示用）
  const clerkUser = await currentUser();
  const userName = clerkUser?.firstName ?? "You";

  // 今日のセッションを取得または作成（日本時間）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session = await prisma.session.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    create: { userId: user.id, date: today },
    update: {},
  });

  // 今日のメッセージを取得
  const dbMessages = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  const initialMessages = dbMessages.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant",
    content: m.content,
  }));

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9A9A9A]">読み込み中...</div>}>
      <ChatInterface
        sessionId={session.id}
        dailyLimit={session.dailyLimit}
        initialUsedCount={session.usedCount}
        initialMessages={initialMessages}
        userName={userName}
      />
    </Suspense>
  );
}
