import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/DashboardClient";
import { getLatestAlterLog } from "@/app/actions/generateAlterLog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type ButtonState = "A" | "B" | "C" | "D";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const initialAlterLog = await getLatestAlterLog();

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  let buttonState: ButtonState = "A";

  if (user) {
    const totalJournalCount = await prisma.journalEntry.count({ where: { userId: user.id } });

    if (totalJournalCount === 0) {
      // 状態A: ジャーナルが1件もない → 非活性
      buttonState = "A";
    } else if (!user.lastDashboardScanAt) {
      // 状態B: ジャーナルあり・一度もSCANしていない → 活性
      buttonState = "B";
    } else {
      // 前回SCAN以降の新規ジャーナル数・セッション数を確認
      const [newJournalCount, newCoachCount] = await Promise.all([
        prisma.journalEntry.count({
          where: { userId: user.id, createdAt: { gt: user.lastDashboardScanAt } },
        }),
        prisma.coachMessage.count({
          where: { userId: user.id, role: "user", createdAt: { gt: user.lastDashboardScanAt } },
        }),
      ]);

      // 状態C: 新規ジャーナルあり or セッション3回以上 → 活性
      // 状態D: 最新状態 → 非活性
      buttonState = newJournalCount >= 1 || newCoachCount >= 3 ? "C" : "D";
    }
  }

  return (
    <DashboardClient
      initialAlterLog={initialAlterLog}
      buttonState={buttonState}
    />
  );
}
