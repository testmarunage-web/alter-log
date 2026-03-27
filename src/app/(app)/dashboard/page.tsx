import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/DashboardClient";
import { getLatestAlterLog } from "@/app/actions/generateAlterLog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const initialAlterLog = await getLatestAlterLog();

  // hasNewLogs 判定
  // 最新の AlterLog 以降に JournalEntry または CoachMessage が 1 件以上あるか
  let hasNewLogs = false;
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (user) {
    const latestLog = await prisma.alterLog.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const since = latestLog?.createdAt ?? new Date(0);

    const [journalCount, coachCount] = await Promise.all([
      prisma.journalEntry.count({
        where: { userId: user.id, createdAt: { gt: since } },
      }),
      prisma.coachMessage.count({
        where: { userId: user.id, role: "user", createdAt: { gt: since } },
      }),
    ]);
    hasNewLogs = journalCount + coachCount > 0;
  }

  return <DashboardClient initialAlterLog={initialAlterLog} hasNewLogs={hasNewLogs} />;
}
