import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// 日付フォーマット
// ─────────────────────────────────────────────────────────────────────────────
function formatWeekRange(start: Date, end: Date): string {
  const sy = start.getFullYear();
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  const weekNum = Math.ceil(sd / 7);
  return `${sy}年${sm}月 第${weekNum}週（${sm}/${sd}〜${em}/${ed}）`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  const latestReport = user
    ? await prisma.weeklyReport.findFirst({
        where: { userId: user.id },
        orderBy: { weekStart: "desc" },
      })
    : null;

  return (
    <div className="bg-[#0B0E13] min-h-screen text-[#E8E3D8] px-4 py-6 pb-24 md:px-6">
      <div className="max-w-2xl space-y-10">

        {/* ── ウィークリーレポート ─────────────────────────────────────── */}
        <div>
          <div className="mb-5">
            <h1 className="text-xl font-bold text-[#E8E3D8]">ウィークリーレポート</h1>
            {latestReport && (
              <p className="text-sm text-[#8A8276] mt-0.5">
                {formatWeekRange(latestReport.weekStart, latestReport.weekEnd)}
              </p>
            )}
          </div>

          {latestReport ? (
            <div className="bg-[#1A222B]/30 border border-[#C4A35A]/20 rounded-xl p-5">
              <p className="text-[10px] font-bold tracking-[0.22em] text-[#C4A35A]/70 uppercase mb-3">
                今週の気づき
              </p>
              <p className="text-[11.5px] text-[#9A9488] leading-relaxed whitespace-pre-wrap">
                {latestReport.summary}
              </p>
            </div>
          ) : (
            <div className="bg-[#1A222B]/20 border border-white/[0.06] rounded-xl p-6 text-center">
              <p className="text-sm text-[#8A8276]">まだデータがありません。</p>
              <p className="text-xs text-[#8A8276]/60 mt-2 leading-relaxed">
                日々のジャーナルを蓄積することで、<br />
                ここに週末の分析レポートが生成されます。
              </p>
              <Link
                href="/chat?mode=journal"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#C4A35A]/70 hover:text-[#C4A35A] transition-colors"
              >
                ジャーナルへ
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5.5h7M6 2l3.5 3.5L6 9" />
                </svg>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
