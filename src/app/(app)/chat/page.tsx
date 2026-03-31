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

  // ── 「あの時のあなた」カード用：1日以上前のジャーナルからランダム1件（確認用・本番は30日）
  const thirtyDaysAgoForPast = new Date();
  thirtyDaysAgoForPast.setDate(thirtyDaysAgoForPast.getDate() - 1);

  const pastJournalCount = await prisma.journalEntry.count({
    where: { userId: user.id, createdAt: { lt: thirtyDaysAgoForPast } },
  });

  let pastJournal: { content: string; createdAt: string; dailyNote: string | null; entries: { content: string; timeStr: string }[] } | null = null;

  if (pastJournalCount > 0) {
    const skip = Math.floor(Math.random() * pastJournalCount);
    const pastEntry = await prisma.journalEntry.findFirst({
      where: { userId: user.id, createdAt: { lt: thirtyDaysAgoForPast } },
      skip,
      orderBy: { createdAt: "asc" },
    });
    if (pastEntry) {
      const entryJst = new Date(pastEntry.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const dateStr = `${entryJst.getFullYear()}-${String(entryJst.getMonth() + 1).padStart(2, "0")}-${String(entryJst.getDate()).padStart(2, "0")}`;
      const dateOnlyUtc = new Date(`${dateStr}T00:00:00.000Z`);

      // 同日の全ジャーナルとAlterLogを並列取得
      const dayStart = new Date(`${dateStr}T00:00:00+09:00`);
      const dayEnd   = new Date(`${dateStr}T23:59:59+09:00`);
      const [sameDayJournals, alterLog] = await Promise.all([
        prisma.journalEntry.findMany({
          where: { userId: user.id, createdAt: { gte: dayStart, lte: dayEnd } },
          orderBy: { createdAt: "asc" },
          select: { content: true, createdAt: true },
        }),
        prisma.alterLog.findFirst({
          where: { userId: user.id, date: dateOnlyUtc },
          select: { insights: true },
        }),
      ]);

      const insights = alterLog?.insights as { daily_note?: string } | null;
      pastJournal = {
        content: pastEntry.content,
        createdAt: pastEntry.createdAt.toISOString(),
        dailyNote: insights?.daily_note ?? null,
        entries: sameDayJournals.map((j) => {
          const t = new Date(j.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
          return {
            content: j.content,
            timeStr: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`,
          };
        }),
      };
    }
  }

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
      pastJournal={pastJournal}
    />
  );
}