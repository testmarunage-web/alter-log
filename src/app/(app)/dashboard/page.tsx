import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/DashboardClient";
import { getLatestAlterLog } from "@/app/actions/generateAlterLog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type ButtonState = "A" | "B" | "C" | "D";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const initialAlterLog = await getLatestAlterLog();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  let buttonState: ButtonState = "A";
  let isFirstVisit = false;

  if (user) {
    const [todayJournalCount, todayAlterLog, totalJournalCount] = await Promise.all([
      prisma.journalEntry.count({
        where: { userId: user.id, createdAt: { gte: todayStart } },
      }),
      prisma.alterLog.findFirst({
        where: { userId: user.id, createdAt: { gte: todayStart } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.journalEntry.count({ where: { userId: user.id } }),
    ]);

    isFirstVisit = totalJournalCount === 0;

    if (todayJournalCount === 0) {
      // 状態A: 今日のジャーナル未記入
      buttonState = "A";
    } else if (!todayAlterLog) {
      // 状態B: ジャーナルあり・分析未実施
      buttonState = "B";
    } else {
      // 状態C/D: 分析済み → 直近の壁打ち数で判定
      const newCoachCount = await prisma.coachMessage.count({
        where: {
          userId: user.id,
          role: "user",
          createdAt: { gt: todayAlterLog.createdAt },
        },
      });
      buttonState = newCoachCount >= 3 ? "D" : "C";
    }
  }

  return (
    <DashboardClient
      initialAlterLog={initialAlterLog}
      isFirstVisit={isFirstVisit}
      buttonState={buttonState}
    />
  );
}
