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

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  const [rawLogs, journalCount] = await Promise.all([
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
  ]);

  const todayJst = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const hasTodayLog = rawLogs.some((l) => {
    const logDateJst = new Date(l.date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
    return logDateJst === todayJst;
  });

  const entries: Entry[] = rawLogs.flatMap((log) => {
    try {
      const insights = alterLogSchema.partial().parse(log.insights);
      const logEntry =
        insights.observed_loops ??
        insights.cognitive_bias_detected?.description ??
        insights.passive_voice_status ??
        null;
      if (!logEntry) return [];
      const jst = log.createdAt
        .toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/\//g, ".")
        .replace(",", "");
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

          {entries.length > 0 ? (
            /* タイムライン */
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
          ) : !hasTodayLog && journalCount > 0 ? (
            /* 待機中：ジャーナルはあるがAlterLogがまだ生成されていない */
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div
                className="w-px h-10 mb-2"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(196,163,90,0.3))" }}
              />
              <p className="font-mono text-[11px] text-[#8A8276]/60 tracking-widest uppercase text-center">
                PENDING
              </p>
              <p className="text-sm text-[#9A9488] text-center leading-relaxed max-w-xs">
                今日のジャーナルやセッションの結果を踏まえて、今夜Alterが観測日記を記すはずです。
              </p>
              <div
                className="w-px h-10 mt-2"
                style={{ background: "linear-gradient(to bottom, rgba(196,163,90,0.3), transparent)" }}
              />
            </div>
          ) : (
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
          )}

          {/* 開発用：夜間バッチ手動実行ボタン */}
          {process.env.NODE_ENV === "development" && <DevBatchButton />}

        </div>
      </div>
    </>
  );
}
