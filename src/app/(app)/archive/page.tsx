import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// セクション見出し
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[10px] font-bold tracking-[0.25em] text-[#C4A35A]/70 uppercase">{label}</h2>
        {sub && <span className="text-[9px] text-[#8A8276]/60 tracking-wider">{sub}</span>}
      </div>
      <div className="mt-1.5 h-px bg-gradient-to-r from-[#C4A35A]/20 via-[#C4A35A]/8 to-transparent" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 日付フォーマット
// ─────────────────────────────────────────────────────────────────────────────
function formatJpDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const day = days[date.getDay()];
  return `${m}月${d}日（${day}）`;
}

function formatWeekRange(start: Date, end: Date): string {
  const sy = start.getFullYear();
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  // 第何週かを計算
  const weekNum = Math.ceil(sd / 7);
  return `${sy}年${sm}月 第${weekNum}週（${sm}/${sd}〜${em}/${ed}）`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function ArchivePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  const [latestReport, sessions] = user
    ? await Promise.all([
        prisma.weeklyReport.findFirst({
          where: { userId: user.id },
          orderBy: { weekStart: "desc" },
        }),
        prisma.session.findMany({
          where: { userId: user.id },
          orderBy: { date: "desc" },
          take: 20,
          include: { _count: { select: { messages: true } } },
        }),
      ])
    : [null, []];

  // メッセージがあるセッションのみ表示
  const activeSessions = sessions.filter((s) => s._count.messages > 0);

  const hasData = latestReport !== null || activeSessions.length > 0;

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
                日々のジャーナルを蓄積したり、壁打ちを行うことで、ここに週末の分析レポートが生成されます。
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

        {/* ── 対話ログ ───────────────────────────────────────────────── */}
        {hasData && (
          <div>
            <SectionHeading label="対話ログ" />

            {activeSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#8A8276]">対話の記録がありません。</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white/[0.04] backdrop-blur-sm border border-[#C4A35A]/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-[#9A9488] mb-0.5">{formatJpDate(session.date)}</p>
                      <p className="text-sm font-semibold text-[#E8E3D8]">
                        {session.openingQuestion
                          ? session.openingQuestion.slice(0, 40) + (session.openingQuestion.length > 40 ? "..." : "")
                          : "壁打ちセッション"}
                      </p>
                    </div>
                    <Link
                      href="/chat?mode=coach"
                      className="flex-shrink-0 text-xs font-medium text-[#C4A35A]/80 hover:text-[#C4A35A] flex items-center gap-1 transition-colors"
                    >
                      対話を開く
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5.5h7M6 2l3.5 3.5L6 9" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
