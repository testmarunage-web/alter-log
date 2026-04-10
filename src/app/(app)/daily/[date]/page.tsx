import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AlterIcon } from "@/app/(app)/_components/AlterIcon";
import { alterLogSchema } from "@/app/actions/alterLogSchema";

export const dynamic = "force-dynamic";

// YYYY-MM-DD の簡易バリデーション
function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

// YYYY-MM-DD → JST 範囲の UTC 境界を返す
function jstDayBounds(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00+09:00`),
    end:   new Date(`${dateStr}T23:59:59+09:00`),
  };
}

// YYYY-MM-DD → 「2026年4月9日（水）」
function formatDateJa(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+09:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

// HH:MM フォーマット
function toTimeStr(d: Date): string {
  // createdAt は UTC で保存されているので JST に変換
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return `${String(jst.getHours()).padStart(2, "0")}:${String(jst.getMinutes()).padStart(2, "0")}`;
}

export default async function DailyPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { date } = await params;
  const { from } = await searchParams;

  if (!isValidDate(date)) notFound();

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const { start, end } = jstDayBounds(date);

  const [journals, alterLog] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.alterLog.findFirst({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
      },
    }),
  ]);

  if (journals.length === 0 && !alterLog) notFound();

  // Alter Log のインサイト解析
  let insights: Partial<{
    daily_note: string;
    is_insufficient_data: boolean;
    fact_emotion_ratio: { fact_percentage: number; emotion_percentage: number; analysis: string };
    cognitive_bias_detected: { bias_name: string; description: string };
    passive_voice_status: string;
    observed_loops: string | null;
    blind_spots: string | null;
    pending_decisions: string | null;
  }> | null = null;

  if (alterLog) {
    try {
      insights = alterLogSchema.partial().parse(alterLog.insights);
    } catch {
      insights = null;
    }
  }

  const dateLabel = formatDateJa(date);

  // from パラメータによる表示制御
  // "journal"  → ジャーナルをメイン表示、Alter Log は折りたたみリンク
  // "alterlog" → Alter Log をメイン表示、ジャーナルは折りたたみリンク
  // undefined  → 両方フル表示（ムードマップからの遷移等）
  const showJournalMain  = !from || from === "journal";
  const showAlterMain    = !from || from === "alterlog";
  const hasJournals      = journals.length > 0;
  const hasInsights      = !!insights;

  return (
    <div className="bg-[#0B0E13] min-h-screen px-4 py-8 pb-24">
      <div className="max-w-xl mx-auto">

        {/* ── ヘッダー ── */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8A8276] hover:text-[#E8E3D8] hover:bg-white/[0.05] transition-colors flex-shrink-0"
            aria-label="ダッシュボードへ戻る"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-[#E8E3D8] tracking-wide">{dateLabel}</h1>
            <p className="text-[10px] text-[#8A8276]/50 font-mono mt-0.5">DAILY LOG</p>
          </div>
        </div>

        {/* ── ジャーナル ── */}
        {hasJournals && showJournalMain && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8A8276]/60">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8A8276]/50 uppercase">Journal</span>
              <span className="font-mono text-[9px] text-[#8A8276]/30">{journals.length}件</span>
            </div>

            <div className="space-y-3">
              {journals.map((entry, i) => (
                <div
                  key={entry.id}
                  className="rounded-xl px-4 py-4 border border-white/[0.06]"
                  style={{ background: "rgba(255,255,255,0.018)" }}
                >
                  {journals.length > 1 && (
                    <p className="font-mono text-[9px] text-[#8A8276]/35 mb-2">
                      {toTimeStr(entry.createdAt)}
                      <span className="ml-2 text-[#8A8276]/20">— {i + 1}/{journals.length}</span>
                    </p>
                  )}
                  <p className="text-[13px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* from=journal → Alter Logを折りたたみリンクで案内 */}
        {from === "journal" && hasInsights && (
          <div className="mb-6">
            <Link
              href={`/daily/${date}`}
              className="flex items-center gap-2 text-[10px] text-[#C4A35A]/50 hover:text-[#C4A35A]/80 transition-colors font-mono tracking-wide group"
            >
              <AlterIcon size={10} />
              この日のAlter Logも見る
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        )}

        {/* from=alterlog → ジャーナルを折りたたみリンクで案内 */}
        {from === "alterlog" && hasJournals && (
          <div className="mb-6">
            <Link
              href={`/daily/${date}`}
              className="flex items-center gap-2 text-[10px] text-[#8A8276]/50 hover:text-[#8A8276]/80 transition-colors font-mono tracking-wide group"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              この日のジャーナルも見る
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        )}

        {/* ── セパレーター（両方フル表示の場合のみ） ── */}
        {!from && hasJournals && hasInsights && (
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4A35A]/20 to-transparent" />
            <AlterIcon size={14} />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4A35A]/20 to-transparent" />
          </div>
        )}

        {/* ── Alter Log ── */}
        {hasInsights && showAlterMain && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlterIcon size={11} />
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#C4A35A]/60 uppercase">Alter Log</span>
              <span className="text-[9px] text-[#8A8276]/30 font-mono">— Alterの観測日記</span>
            </div>

            <div className="rounded-xl border border-[#C4A35A]/15 overflow-hidden" style={{ background: "rgba(196,163,90,0.025)" }}>

              {/* daily_note */}
              {insights.daily_note && insights.daily_note !== "INSUFFICIENT_DATA" && (
                <div className="px-5 py-5 border-b border-[#C4A35A]/10">
                  <p className="font-mono text-[11.5px] text-[#E8E3D8]/80 leading-[1.9] tracking-wide whitespace-pre-wrap">
                    {insights.daily_note}
                  </p>
                </div>
              )}

              {/* 情報量不足 */}
              {insights.is_insufficient_data && (
                <div className="px-5 py-4 border-b border-[#C4A35A]/10">
                  <p className="font-mono text-[11px] text-white/30">— 情報量不足のため解析できません</p>
                </div>
              )}

              {/* 事実・感情バランス */}
              {!insights.is_insufficient_data && insights.fact_emotion_ratio && (
                <div className="px-5 py-4 border-b border-[#C4A35A]/10">
                  <p className="font-mono text-[9px] text-[#C4A35A]/50 tracking-widest mb-2">事実・感情バランス</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${insights.fact_emotion_ratio.fact_percentage}%`, background: "rgba(196,163,90,0.60)" }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[#C4A35A]/70 tabular-nums flex-shrink-0">
                      FACT {insights.fact_emotion_ratio.fact_percentage}%
                    </span>
                  </div>
                  {insights.fact_emotion_ratio.analysis && (
                    <p className="text-[12px] text-[#E8E3D8]/55 leading-relaxed">
                      {insights.fact_emotion_ratio.analysis}
                    </p>
                  )}
                </div>
              )}

              {/* 認知バイアス検知 */}
              {!insights.is_insufficient_data && insights.cognitive_bias_detected && (
                <div className="px-5 py-4 border-b border-[#C4A35A]/10">
                  <p className="font-mono text-[9px] text-[#C4A35A]/50 tracking-widest mb-1">認知バイアス検知</p>
                  {insights.cognitive_bias_detected.bias_name && insights.cognitive_bias_detected.bias_name !== "INSUFFICIENT_DATA" ? (
                    <>
                      <p className="font-mono text-[13px] font-bold text-[#E8E3D8]/80 mb-2 tracking-wide">
                        「{insights.cognitive_bias_detected.bias_name}」
                      </p>
                      {insights.cognitive_bias_detected.description && (
                        <p className="text-[12px] text-[#E8E3D8]/50 leading-relaxed">
                          {insights.cognitive_bias_detected.description}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-mono text-[11px] text-white/30">偏りなし</p>
                  )}
                </div>
              )}

              {/* 意思決定の主体性 */}
              {!insights.is_insufficient_data && insights.passive_voice_status && (
                <div className="px-5 py-4 border-b border-[#C4A35A]/10">
                  <p className="font-mono text-[9px] text-[#C4A35A]/50 tracking-widest mb-1">意思決定の主体性</p>
                  <p className="text-[12px] text-[#E8E3D8]/55 leading-relaxed">{insights.passive_voice_status}</p>
                </div>
              )}

              {/* 思考ループ / 盲点 / 保留リスト */}
              {[
                { key: "observed_loops",    label: "思考ループ観測", value: insights.observed_loops },
                { key: "blind_spots",       label: "盲点エリア",     value: insights.blind_spots },
                { key: "pending_decisions", label: "保留リスト",     value: insights.pending_decisions },
              ].filter((x) => x.value).map(({ key, label, value }) => (
                <div key={key} className="px-5 py-4 border-b border-[#C4A35A]/10 last:border-b-0">
                  <p className="font-mono text-[9px] text-[#C4A35A]/50 tracking-widest mb-1">{label}</p>
                  <p className="text-[12px] text-[#E8E3D8]/55 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alter Log なし、ジャーナルはある場合（fromなし or from=journal のとき） */}
        {!hasInsights && hasJournals && showJournalMain && (
          <div className="flex items-center gap-3 py-4 px-4 border border-white/[0.05] rounded-lg mt-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(196,163,90,0.3)" }} />
            <p className="font-mono text-[10px] text-[#8A8276]/40 tracking-wide">
              この日のAlter Logはまだ生成されていません
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
