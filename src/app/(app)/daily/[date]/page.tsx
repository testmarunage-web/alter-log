import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AlterIcon } from "@/app/(app)/_components/AlterIcon";
import { alterLogSchema, type AlterLogInsights } from "@/app/actions/alterLogSchema";
import { DailyAccordion } from "./_components/DailyAccordion";
import { CopyButton } from "@/app/(app)/_components/CopyButton";

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

// Alter Log 本文（2文ずつ結合して段落分け）
function AlterLogBody({ text }: { text: string }) {
  const sentences = text.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 2) {
    return <p className="font-mono text-[13px] text-[#E8E3D8]/80 leading-[1.9] tracking-wide">{text.trim()}</p>;
  }
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(""));
  }
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="font-mono text-[13px] text-[#E8E3D8]/80 leading-[1.9] tracking-wide">{p}</p>
      ))}
    </div>
  );
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

  const [journals, alterLog, scanResult] = await Promise.all([
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
    prisma.scanResult.findFirst({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
      },
    }),
  ]);

  if (journals.length === 0 && !alterLog && !scanResult) notFound();

  // Alter Log のインサイト解析（daily_note と is_insufficient_data のみ使用）
  let insights: Partial<{
    daily_note: string;
    is_insufficient_data: boolean;
  }> | null = null;

  if (alterLog) {
    try {
      insights = alterLogSchema.partial().parse(alterLog.insights);
    } catch {
      insights = null;
    }
  }

  // SCAN 結果のインサイト解析
  let scanInsights: AlterLogInsights | null = null;
  let scanThoughtProfile: string | null = null;
  if (scanResult) {
    try {
      scanInsights = alterLogSchema.parse(scanResult.insights);
      scanThoughtProfile = scanResult.thoughtProfile ?? null;
    } catch {
      scanInsights = null;
    }
  }
  const hasScan = !!scanInsights && !scanInsights.is_insufficient_data;

  const dateLabel = formatDateJa(date);

  // from パラメータによる表示制御
  // "journal"  → ジャーナルをメイン表示、Alter Log は折りたたみリンク
  // "alterlog" → Alter Log をメイン表示、ジャーナルは折りたたみリンク
  // undefined  → 両方フル表示（ムードマップからの遷移等）
  const showJournalMain  = !from || from === "journal";
  const showAlterMain    = !from || from === "alterlog";
  const hasJournals      = journals.length > 0;
  const hasInsights      = !!insights;

  const dailyNote = insights?.daily_note && insights.daily_note !== "INSUFFICIENT_DATA"
    ? insights.daily_note
    : null;
  const isInsufficient = insights?.is_insufficient_data ?? false;

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
          </div>
        </div>

        {/* ── ジャーナル ── */}
        {hasJournals && showJournalMain && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C4A35A]/50">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">Journal</span>
              <span className="font-mono text-[10px] text-[#8A8276]/55">{journals.length}件</span>
            </div>

            <div className="space-y-3">
              {journals.map((entry, i) => (
                <div
                  key={entry.id}
                  className="relative rounded-xl px-4 py-4 border border-white/[0.06]"
                  style={{ background: "rgba(255,255,255,0.018)" }}
                >
                  <div className="absolute top-3 right-3">
                    <CopyButton text={entry.content} />
                  </div>
                  {journals.length > 1 && (
                    <p className="font-mono text-[12px] text-[#8A8276]/80 font-semibold mb-2">
                      {toTimeStr(entry.createdAt)}
                      <span className="ml-2 font-normal text-[#8A8276]/45">— {i + 1}/{journals.length}</span>
                    </p>
                  )}
                  <p className="text-[14px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap pr-6">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* from=journal → Alter Logをアコーディオンで表示 */}
        {from === "journal" && hasInsights && (
          <DailyAccordion label="この日のAlter Logを見る" accent="alterlog">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlterIcon size={14} />
                <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">Alter Log</span>
                <span className="text-[10px] text-[#8A8276]/65 font-mono">— Alterの観測日記</span>
              </div>
              <div className="rounded-xl border border-[#C4A35A]/15 overflow-hidden" style={{ background: "rgba(196,163,90,0.025)" }}>
                {dailyNote ? (
                  <div className="px-5 py-5">
                    <AlterLogBody text={dailyNote} />
                  </div>
                ) : isInsufficient ? (
                  <div className="px-5 py-4">
                    <p className="font-mono text-[11px] text-white/30">— 情報量不足のため解析できません</p>
                  </div>
                ) : null}
              </div>
            </section>
          </DailyAccordion>
        )}

        {/* from=alterlog → ジャーナルをアコーディオンで表示 */}
        {from === "alterlog" && hasJournals && (
          <DailyAccordion label="この日のジャーナルを見る" accent="journal">
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C4A35A]/50">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">Journal</span>
                <span className="font-mono text-[10px] text-[#8A8276]/55">{journals.length}件</span>
              </div>
              <div className="space-y-3">
                {journals.map((entry, i) => (
                  <div key={entry.id} className="relative rounded-xl px-4 py-4 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.018)" }}>
                    <div className="absolute top-3 right-3">
                      <CopyButton text={entry.content} />
                    </div>
                    {journals.length > 1 && (
                      <p className="font-mono text-[12px] text-[#8A8276]/80 font-semibold mb-2">
                        {toTimeStr(entry.createdAt)}
                        <span className="ml-2 font-normal text-[#8A8276]/45">— {i + 1}/{journals.length}</span>
                      </p>
                    )}
                    <p className="text-[14px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap pr-6">{entry.content}</p>
                  </div>
                ))}
              </div>
            </section>
          </DailyAccordion>
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
              <AlterIcon size={14} />
              <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">Alter Log</span>
              <span className="text-[10px] text-[#8A8276]/65 font-mono">— Alterの観測日記</span>
              {dailyNote && (
                <span className="ml-auto">
                  <CopyButton text={dailyNote} />
                </span>
              )}
            </div>

            <div className="rounded-xl border border-[#C4A35A]/15 overflow-hidden" style={{ background: "rgba(196,163,90,0.025)" }}>
              {dailyNote ? (
                <div className="px-5 py-5">
                  <AlterLogBody text={dailyNote} />
                </div>
              ) : isInsufficient ? (
                <div className="px-5 py-4">
                  <p className="font-mono text-[11px] text-white/30">— 情報量不足のため解析できません</p>
                </div>
              ) : null}
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

        {/* ── SCAN 結果 ── */}
        {scanResult && (
          (() => {
            const scanSection = (
              <section className="mt-8">
                {/* セパレーター */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4A35A]/20 to-transparent" />
                  <span className="font-mono text-[10px] tracking-[0.25em] text-[#C4A35A]/60 uppercase">scan</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4A35A]/20 to-transparent" />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C4A35A]/50">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">SCAN結果</span>
                </div>

                {!hasScan ? (
                  <div className="px-5 py-4 rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.018)" }}>
                    <p className="font-mono text-[11px] text-white/30">— 情報量不足のため解析できません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 思考プロファイル */}
                    {scanThoughtProfile && (
                      <div
                        className="rounded-xl px-4 py-4 border border-[#C4A35A]/20"
                        style={{ background: "rgba(196,163,90,0.04)" }}
                      >
                        <p className="font-mono text-[10px] tracking-[0.15em] text-[#C4A35A]/60 uppercase mb-2">思考プロファイル</p>
                        <p className="text-[15px] font-bold text-[#E8D5A0] leading-snug">{scanThoughtProfile}</p>
                      </div>
                    )}

                    {/* SNAPSHOT ヘッダー */}
                    <p className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase mt-4 mb-1">snapshot</p>

                    {/* 事実・感情バランス */}
                    <div className="rounded-xl px-4 py-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.018)" }}>
                      <p className="font-mono text-[11px] tracking-wide text-[#C4A35A]/70 mb-3">事実・感情バランス</p>
                      <div className="flex gap-px h-[6px] rounded-sm overflow-hidden mb-2">
                        <div style={{ width: `${scanInsights!.fact_emotion_ratio.fact_percentage}%`, background: "rgba(196,163,90,0.60)" }} className="rounded-l-sm" />
                        <div style={{ width: `${scanInsights!.fact_emotion_ratio.emotion_percentage}%`, background: "rgba(255,255,255,0.10)" }} className="rounded-r-sm" />
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-white/40 mb-2">
                        <span>FACT {scanInsights!.fact_emotion_ratio.fact_percentage}%</span>
                        <span>EMOTION {scanInsights!.fact_emotion_ratio.emotion_percentage}%</span>
                      </div>
                      {scanInsights!.fact_emotion_ratio.analysis && (
                        <p className="text-[12px] text-[#E8E3D8]/60 leading-relaxed">{scanInsights!.fact_emotion_ratio.analysis}</p>
                      )}
                    </div>

                    {/* 認知バイアス検知 */}
                    <div className="rounded-xl px-4 py-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.018)" }}>
                      <p className="font-mono text-[11px] tracking-wide text-[#C4A35A]/70 mb-2">認知バイアス検知</p>
                      {scanInsights!.cognitive_bias_detected.bias_name && (
                        <p className="text-[13px] font-semibold text-[#E8E3D8]/80 mb-1">
                          {scanInsights!.cognitive_bias_detected.bias_name}
                        </p>
                      )}
                      {scanInsights!.cognitive_bias_detected.description && (
                        <p className="text-[12px] text-[#E8E3D8]/60 leading-relaxed">{scanInsights!.cognitive_bias_detected.description}</p>
                      )}
                    </div>

                    {/* 意思決定の主体性 */}
                    <div className="rounded-xl px-4 py-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.018)" }}>
                      <p className="font-mono text-[11px] tracking-wide text-[#C4A35A]/70 mb-2">意思決定の主体性</p>
                      {scanInsights!.passive_voice_title && (
                        <p className="text-[13px] font-semibold text-[#E8E3D8]/80 mb-1">{scanInsights!.passive_voice_title}</p>
                      )}
                      <p className="text-[12px] text-[#E8E3D8]/60 leading-relaxed">{scanInsights!.passive_voice_status}</p>
                    </div>

                    {/* ポジティブな観測 */}
                    {scanInsights!.positive_observation && (
                      <div className="rounded-xl px-4 py-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.018)" }}>
                        <p className="font-mono text-[11px] tracking-wide text-[#C4A35A]/70 mb-2">ポジティブな観測</p>
                        {scanInsights!.positive_observation_title && (
                          <p className="text-[13px] font-semibold text-[#E8E3D8]/80 mb-1">{scanInsights!.positive_observation_title}</p>
                        )}
                        <p className="text-[12px] text-[#E8E3D8]/60 leading-relaxed">{scanInsights!.positive_observation}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );

            // from パラメータがある場合はアコーディオンで折りたたむ
            return from
              ? <DailyAccordion label="この日のSCAN結果を見る" accent="alterlog">{scanSection}</DailyAccordion>
              : scanSection;
          })()
        )}

      </div>
    </div>
  );
}
