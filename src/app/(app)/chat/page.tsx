import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatInterface } from "./_components/ChatInterface";

// キャッシュを無効化し、毎回サーバーでレンダリングさせることで
// loading.tsx（Suspense境界）が確実にトリガーされるようにする
export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const defaultMode = params.mode === "coach" ? "coach" : "journal";

  // User upsert（外部キーエラー防止）
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
    include: { profile: true },
  });
  // プロフィールがなければ自動生成（オンボーディング質問フロー廃止に伴う）
  if (!user.profile) {
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        goal: "",
        industry: "",
        coachStyle: "",
        mainChallenge: "",
        aiPersonaPrompt: "",
      },
    });
  }

  const clerkUser = await currentUser();
  const userName = clerkUser?.firstName ?? "You";

  // ─── ジャーナル履歴を取得 ───────────────────────────────────────────────
  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const initialJournalMessages = journalEntries.map((e) => ({
    id: e.id,
    content: e.content,
    createdAt: e.createdAt,
  }));

  // ─── 壁打ちセッション（日次）を取得または作成 ────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session = await prisma.session.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    create: { userId: user.id, date: today },
    update: {},
  });

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
    <ChatInterface
      defaultMode={defaultMode}
      sessionId={session.id}
      dailyLimit={session.dailyLimit}
      initialUsedCount={session.usedCount}
      initialMessages={initialMessages}
      initialJournalMessages={initialJournalMessages}
      userName={userName}
    />
  );
}
