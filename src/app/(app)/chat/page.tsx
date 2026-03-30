import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatInterface } from "./_components/ChatInterface";

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

  // プロフィールがなければ自動生成（オンボーディング廃止に伴う）
  if (!user.profile) {
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        goal: "", industry: "", coachStyle: "", mainChallenge: "", aiPersonaPrompt: "",
      },
    });
  }

  const clerkUser = await currentUser();
  const userName = clerkUser?.firstName ?? "You";

  // 今日のジャーナル有無（JST 基準で判定）
  const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const todayJstStr = [
    nowJst.getFullYear(),
    String(nowJst.getMonth() + 1).padStart(2, "0"),
    String(nowJst.getDate()).padStart(2, "0"),
  ].join("-");
  const todayStartJstUtc = new Date(`${todayJstStr}T00:00:00+09:00`); // JST 00:00 → UTC

  const todayJournalCount = await prisma.journalEntry.count({
    where: { userId: user.id, createdAt: { gte: todayStartJstUtc } },
  });
  const hasTodayJournal = todayJournalCount > 0;

  // ジャーナル履歴（全件、昇順）
  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const initialJournalMessages = journalEntries.map((e) => ({
    id: e.id,
    content: e.content,
    createdAt: e.createdAt,
  }));

  // 壁打ちセッション（日次 upsert）
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
      hasTodayJournal={hasTodayJournal}
    />
  );
}