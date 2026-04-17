import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportClient } from "./_components/ReportClient";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  // 全レポートを取得（最大52件 = 1年分）
  const reports = await prisma.weeklyReport.findMany({
    where: { userId: user.id },
    orderBy: { weekStart: "desc" },
    take: 52,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      summary: true,
      highlights: true,
      changes: true,
      observation: true,
      chartData: true,
    },
  });

  const serialized = reports.map((r) => {
    const chart = r.chartData as { journalCount?: number } | null;
    return {
      id: r.id,
      weekStart: r.weekStart.toISOString().slice(0, 10),
      weekEnd: r.weekEnd.toISOString().slice(0, 10),
      summary: r.summary,
      highlights: r.highlights,
      changes: r.changes,
      observation: r.observation,
      journalCount: chart?.journalCount ?? 0,
    };
  });

  return (
    <div className="bg-[#0B0E13] min-h-screen px-4 py-8 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-[#E8E3D8] mb-6">
          ウィークリーレポート
        </h1>
        <ReportClient reports={serialized} />
      </div>
    </div>
  );
}
