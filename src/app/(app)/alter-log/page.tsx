import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { alterLogSchema } from "@/app/actions/alterLogSchema";
import { DevBatchButton } from "./_components/DevBatchButton";

// ─────────────────────────────────────────────────────────────────────────────
// コンパスアイコン（SVG）
// ─────────────────────────────────────────────────────────────────────────────
function IcCompass() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

type Entry = {
  id: string;
  jst: string;
  logEntry: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export const dynamic = "force-dynamic";

export default async function AlterLogPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: { select: { status: true } } },
  });

  const subStatus = user?.subscription?.status;
  const isReadOnly =
    subStatus === "CANCELED" || subStatus === "INACTIVE" || subStatus == null;

  // 今日のJST日付範囲（UTC）
  const nowJstDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const todayJstStr = [
    nowJstDate.getFullYear(),
    String(nowJstDate.getMonth() + 1).padStart(2, "0"),
    String(nowJstDate.getDate()).padStart(2, "0"),
  ].join("-");
  const todayJstStartUtc = new Date(`${todayJstStr}T00:00:00+09:00`);
  const todayJstEndUtc   = new Date(`${todayJstStr}T23:59:59+09:00`);

  const [rawLogs, journalCount, todayJournalCount] = await Promise.all([
    user
      ? prisma.alterLog.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    user
      ? prisma.journalEntry.count({ where: { userId: user.id } })
      : Promise.resolve(0),
    user
      ? prisma.journalEntry.count({
          where: { userId: user.id, createdAt: { gte: todayJstStartUtc, lte: todayJstEndUtc } },
        })
      : Promise.resolve(0),
  ]);

  const hasTodayLog = rawLogs.some((l) => {
    const logDateJst = new Date(l.date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
    const todayJstLocale = nowJstDate.toLocaleDateString("ja-JP");
    return logDateJst === todayJstLocale;
  });

  const entries: Entry[] = rawLogs.flatMap((log) => {
    try {
      const insights = alterLogSchema.partial().parse(log.insights);
      // daily_note を優先表示。古いデータ（daily_note未生成）はフォールバック
      const logEntry =
        (insights.daily_note && insights.daily_note !== "INSUFFICIENT_DATA"
          ? insights.daily_note
          : null) ??
        insights.observed_loops ??
        insights.cognitive_bias_detected?.description ??
        insights.passive_voice_status ??
        null;
      if (!logEntry) return [];
      const d = log.date;
      const jst = [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, "0"),
        d.getUTCDate().toString().padStart(2, "0"),
      ].join(".");
      return [{ id: log.id, jst, logEntry }];
    } catch {
      return [];
    }
  });

  return (
    <>
      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(196,163,90,0.55); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 5px rgba(196,163,90,0); }
        }
      `}</style>

      <div className="bg-[#0B0E13] min-h-screen px-4 py-10 pb-24 md:px-8">
        <div className="max-w-xl mx-auto">

          {/* ヘッダー */}
          <div className="mb-10">
            <h1 className="text-xl font-bold text-[#C4A35A] leading-snug tracking-tight">
              Alter Log
            </h1>
            <p className="text-[11px] text-[#8A8276] mt-2 font-normal tracking-wide">
              Alterが裏側で記録している、あなたに関する密かな観測日記
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-[#C4A35A]/30 via-[#C4A35A]/10 to-transparent" />
          </div>

          {/* 分岐ロジック */}
          {entries.length === 0 && journalCount === 0 ? (
            /* 初回：ジャーナルがまだない */
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-sm text-[#8A8276] text-center">まだ記録がありません。</p>
              <p className="text-xs text-[#8A8276]/60 text-center leading-relaxed">
                まずはジャーナルから思考を吐き出してみましょう。
              </p>
              <Link
                href="/chat?mode=journal"
                className="mt-2 text-xs font-medium text-[#C4A35A]/70 hover:text-[#C4A35A] transition-colors flex items-center gap-1"
              >
                ジャーナルへ
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5.5h7M6 2l3.5 3.5L6 9" />
                </svg>
              </Link>
            </div>
          ) : entries.length === 0 ? (
            /* 初日待機：ジャーナルはあるがAlterLogがまだない */
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="w-px h-10 mb-2"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(196,163,90,0.3))" }}
              />
              <p className="font-mono text-[11px] text-[#8A8276]/60 tracking-widest uppercase text-center">
                PENDING
              </p>
              <p className="text-sm text-[#9A9488] text-center leading-relaxed max-w-xs">
                今日の記録を踏まえて、あなたが眠りにつき、明日目を覚ます頃には、Alterが密かに観測日記を記しているはずです。
              </p>
              <div
                className="w-px h-10 mt-2"
                style={{ background: "linear-gradient(to bottom, rgba(196,163,90,0.3), transparent)" }}
              />
            </div>
          ) : (
            <>
              {/* タイムライン */}
              <div className="relative">
                {/* 縦線 */}
                <div className="absolute left-[5px] top-2 bottom-0 w-px bg-gradient-to-b from-[#C4A35A]/25 via-[#C4A35A]/10 to-transparent" />

                <div className="space-y-8">
                  {entries.map((entry, i) => (
                    <div key={entry.id} className="relative pl-9">
                      {/* パルスドット */}
                      <span
                        className="absolute left-0 top-[18px] w-[11px] h-[11px] rounded-full"
                        style={{
                          background: "radial-gradient(circle at 38% 38%, #E8D5A0, #C4A35A 60%)",
                          animation: `dot-pulse ${2 + i * 0.3}s ease-in-out infinite`,
                        }}
                      />

                      {/* カード */}
                      <div className="bg-white/[0.02] border border-[#C4A35A]/15 rounded-xl p-5 mb-1">
                        {/* タイムスタンプ */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[#C4A35A]/60" aria-hidden="true">
                            <IcCompass />
                          </span>
                          <span className="font-mono text-[10px] text-[#C4A35A]/70 tabular-nums">
                            {entry.jst}
                          </span>
                        </div>

                        {/* 観察日記 本文 */}
                        {entry.logEntry && (
                          <p className="font-mono text-[11.5px] text-[#E8E3D8]/80 leading-[1.9] tracking-wide whitespace-pre-wrap">
                            {entry.logEntry}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 今夜の予告：今日ジャーナルを書いたがまだAlterLogがない場合（閲覧モード時は非表示） */}
              {!isReadOnly && todayJournalCount > 0 && !hasTodayLog && (
                <div className="mt-10 flex items-center gap-3 py-3 px-4 border border-white/[0.05] rounded-lg">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(196,163,90,0.45)", boxShadow: "0 0 6px rgba(196,163,90,0.3)" }}
                  />
                  <p className="font-mono text-[10.5px] text-[#8A8276]/60 tracking-wide">
                    今夜、Alterが観察日記を書きます。
                  </p>
                </div>
              )}
            </>
          )}

          {/* 開発用：夜間バッチ手動実行ボタン */}
          {process.env.NODE_ENV === "development" && <DevBatchButton />}

        </div>
      </div>
    </>
  );
}