"use client";

import Link from "next/link";
import { useRef, useCallback, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateDashboardScan } from "@/app/actions/generateAlterLog";
import type { AlterLogInsights } from "@/app/actions/alterLogSchema";
import { AlterIcon } from "../../_components/AlterIcon";

// ─────────────────────────────────────────────────────────────────────────────
// 型定義（dashboard/page.tsx からも import）
// ─────────────────────────────────────────────────────────────────────────────
export interface WeatherDay {
  dateStr: string;       // YYYY-MM-DD (JST)
  day: number;
  month: number;
  factPct: number | null; // null = AlterLog なし
  journalSnippet: string | null; // null = その日のジャーナルなし
}

export interface WordEntry {
  word: string;
  count: number;
}

export interface TimelineData {
  weatherDays: WeatherDay[];
  wordCloudWords: WordEntry[];
  journalDayCount: number;  // 直近30日でジャーナルがある日数
  observerDays: number;
  totalJournalCount: number;
  totalScanCount: number;
  totalCoachCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG アイコン
// ─────────────────────────────────────────────────────────────────────────────
const IcPen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcCompass = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);
const IcLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// 感情天気図アイコン（SVG）
function WeatherIcon({ factPct }: { factPct: number }) {
  if (factPct >= 60) {
    // 晴れ：円 + 放射線
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3.5" fill="#C4A35A" />
        <line x1="10" y1="1.5" x2="10" y2="4" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="16" x2="10" y2="18.5" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="1.5" y1="10" x2="4" y2="10" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="10" x2="18.5" y2="10" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3.9" y1="3.9" x2="5.7" y2="5.7" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14.3" y1="14.3" x2="16.1" y2="16.1" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3.9" y1="16.1" x2="5.7" y2="14.3" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14.3" y1="5.7" x2="16.1" y2="3.9" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  } else if (factPct >= 45) {
    // 晴れ時々曇り
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
        <circle cx="8" cy="9" r="3.5" fill="#A89050" />
        <path d="M11 14 Q11 12 13 12 Q15 12 15 14 Q16.5 14 16.5 15.5 Q16.5 17 15 17 H11.5 Q10 17 10 15.5 Q10 14 11 14Z" fill="#7A7265" />
      </svg>
    );
  } else if (factPct >= 30) {
    // 曇り
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
        <path d="M5 13 Q4 11 6 10 Q7 7 10 8 Q12 6 14 8 Q16.5 8 16.5 10.5 Q17.5 10.5 17.5 12.5 Q17.5 14.5 15.5 14.5 H7 Q5 14.5 5 13Z" fill="#6A6358" />
      </svg>
    );
  } else if (factPct >= 15) {
    // 雨
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
        <path d="M4.5 11 Q3.5 9 5.5 8 Q6.5 5.5 9.5 6.5 Q11.5 4.5 13.5 6.5 Q16 6.5 16 9 Q17 9 17 11 Q17 13 15 13 H6.5 Q4.5 13 4.5 11Z" fill="#526070" />
        <line x1="7" y1="14.5" x2="6" y2="17" stroke="#6090A8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="14.5" x2="9" y2="17" stroke="#6090A8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="14.5" x2="12" y2="17" stroke="#6090A8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  } else {
    // 雷雨（嵐）
    return (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
        <path d="M4 10 Q3 8 5 7 Q6 4.5 9 5.5 Q11 3.5 13 5.5 Q15.5 5.5 15.5 8 Q16.5 8 16.5 10 Q16.5 12 14.5 12 H5.5 Q4 12 4 10Z" fill="#404858" />
        <polyline points="9.5,13.5 7.5,17.5 10.5,15.5 8.5,20" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ripple ボタン（ナビ用）
// ─────────────────────────────────────────────────────────────────────────────
type Ripple = { id: number; x: number; y: number };

function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);
  const fire = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((p) => [...p, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), 700);
  }, []);
  return { ripples, fire };
}

function RippleLink({ href, children, className = "", style }: {
  href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const { ripples, fire } = useRipple();
  return (
    <Link href={href} onClick={fire} className={`relative overflow-hidden block ${className}`} style={style}>
      {children}
      {ripples.map(({ id, x, y }) => (
        <span key={id} className="absolute rounded-full pointer-events-none"
          style={{
            left: x, top: y, width: 6, height: 6,
            marginLeft: -3, marginTop: -3,
            background: "rgba(255,255,255,0.35)",
            animation: "hl-ripple 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
          }} />
      ))}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD カード（即時スナップショット層）
// ─────────────────────────────────────────────────────────────────────────────
function HudCard({ label, tag, children }: {
  label: string; tag?: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[9px] tracking-[0.22em] text-white/30 uppercase">{label}</span>
        {tag && (
          <span className="font-mono text-[9px] tracking-widest text-[#C4A35A]/60 border border-[#C4A35A]/25 rounded px-1.5 py-0.5 leading-none">
            {tag}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 事実・感情バランスバー
// ─────────────────────────────────────────────────────────────────────────────
function FactEmotionBar({ factPct, emotionPct }: { factPct: number; emotionPct: number }) {
  return (
    <div>
      <div className="flex gap-px mb-2 h-[6px] rounded-sm overflow-hidden">
        <div
          className="transition-all duration-700"
          style={{ width: `${factPct}%`, background: "rgba(196,163,90,0.60)" }}
        />
        <div
          className="transition-all duration-700"
          style={{ width: `${emotionPct}%`, background: "rgba(255,255,255,0.10)" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[9px] text-[#C4A35A]/70 tracking-widest">FACT {factPct}%</span>
        <span className="font-mono text-[9px] text-white/25 tracking-widest">EMOTION {emotionPct}%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// プロファイルカード（蓄積層）
// ─────────────────────────────────────────────────────────────────────────────
function ProfileCard({ label, value }: { label: string; value: string | null }) {
  const isLocked = value === null;
  return (
    <div
      className="border rounded-lg p-4 overflow-hidden"
      style={{
        background: isLocked ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.02)",
        borderColor: isLocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
      }}
    >
      <span className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase block mb-2">{label}</span>
      {isLocked ? (
        <div className="flex items-start gap-2 py-0.5">
          <span className="text-white/18 mt-0.5 flex-shrink-0"><IcLock /></span>
          <p className="text-[11.5px] text-white/22 leading-relaxed tracking-wide">
            データ収集中（解析にはさらに多くのジャーナル入力が必要です）
          </p>
        </div>
      ) : (
        <p className="text-[12.5px] text-white/65 leading-relaxed">{value}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 感情の天気図
// ─────────────────────────────────────────────────────────────────────────────
function WeatherMap({ days, journalDayCount }: { days: WeatherDay[]; journalDayCount: number }) {
  const [selectedDay, setSelectedDay] = useState<WeatherDay | null>(null);
  const isLocked = journalDayCount < 1;
  const daysNeeded = Math.max(0, 1 - journalDayCount);

  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      <span className="font-mono text-[9px] tracking-[0.22em] text-white/30 uppercase block mb-3">ムードマップ</span>
      <div className="relative">
        {/* コンテンツ（ロック時はぼかし） */}
        <div className={isLocked ? "opacity-20 pointer-events-none" : ""}>
          <div className="grid grid-cols-7 gap-1">
            {(isLocked ? Array.from({ length: 30 }, (_, i) => ({
              dateStr: `dummy-${i}`,
              day: i + 1,
              month: 3,
              factPct: [70, 50, 35, 20, 10, 60, 45][i % 7],
              journalSnippet: i % 3 !== 0 ? "dummy" : null,
            })) : days).map((day) => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  if (!day.journalSnippet) return;
                  setSelectedDay(selectedDay?.dateStr === day.dateStr ? null : day as WeatherDay);
                }}
                className={`flex flex-col items-center py-1.5 rounded transition-colors ${
                  day.journalSnippet ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default"
                } ${selectedDay?.dateStr === day.dateStr ? "bg-white/[0.06]" : ""}`}
              >
                <span className="text-[8px] text-white/20 mb-0.5 font-mono">{day.day}</span>
                {day.journalSnippet ? (
                  <WeatherIcon factPct={day.factPct ?? 50} />
                ) : (
                  <div className="w-1.5 h-px bg-white/10 mt-1" />
                )}
              </button>
            ))}
          </div>
          {selectedDay && !isLocked && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="font-mono text-[9px] text-white/25 mb-1.5">
                {selectedDay.month}/{selectedDay.day}
                {selectedDay.factPct !== null && (
                  <span className="ml-2 text-[#C4A35A]/50">FACT {selectedDay.factPct}%</span>
                )}
              </p>
              <p className="text-[11.5px] text-white/50 leading-relaxed">{selectedDay.journalSnippet}</p>
            </div>
          )}
        </div>
        {/* ロックオーバーレイ */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-white/20 flex justify-center mb-1.5"><IcLock /></span>
              <p className="text-[10px] text-white/25 font-mono tracking-wide">
                あと{daysNeeded}日分のジャーナルで解放
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ワードクラウド
// ─────────────────────────────────────────────────────────────────────────────
function WordCloud({ words, journalDayCount }: { words: WordEntry[]; journalDayCount: number }) {
  const isLocked = journalDayCount < 1;
  const daysNeeded = Math.max(0, 1 - journalDayCount);

  const dummyWords: WordEntry[] = [
    { word: "???", count: 8 }, { word: "???", count: 5 }, { word: "??", count: 7 },
    { word: "????", count: 3 }, { word: "???", count: 6 }, { word: "?????", count: 4 },
    { word: "??", count: 9 }, { word: "????", count: 2 }, { word: "???", count: 5 },
  ];

  const displayWords = isLocked ? dummyWords : words;
  const maxCount = displayWords.length > 0 ? Math.max(...displayWords.map((w) => w.count)) : 1;
  const minCount = displayWords.length > 0 ? Math.min(...displayWords.map((w) => w.count)) : 1;

  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      <span className="font-mono text-[9px] tracking-[0.22em] text-white/30 uppercase block mb-3">ワードクラウド</span>
      <div className="relative">
        <div className={isLocked ? "opacity-20 pointer-events-none" : ""}>
          {displayWords.length === 0 ? (
            <p className="font-mono text-[10px] text-white/20">キーワードを抽出中...</p>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-2 items-baseline">
              {displayWords.map(({ word, count }) => {
                const ratio = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
                const fontSize = 11 + Math.round(ratio * 9);
                const opacity = 0.35 + ratio * 0.65;
                const color = ratio > 0.5 ? "#C4A35A" : "#8A8276";
                return (
                  <span
                    key={word}
                    className="font-mono"
                    style={{ fontSize, color, opacity }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-white/20 flex justify-center mb-1.5"><IcLock /></span>
              <p className="text-[10px] text-white/25 font-mono tracking-wide">
                あと{daysNeeded}日分のジャーナルで解放
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 観察カウンター
// ─────────────────────────────────────────────────────────────────────────────
function ObserverCounter({ observerDays, totalJournalCount, totalScanCount, totalCoachCount }: {
  observerDays: number;
  totalJournalCount: number;
  totalScanCount: number;
  totalCoachCount: number;
}) {
  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      <span className="font-mono text-[9px] tracking-[0.22em] text-white/30 uppercase block mb-3">観測ログ</span>
      <p className="text-sm text-white/55 mb-2.5 leading-relaxed">
        Alterは<span className="text-[#C4A35A] font-bold text-base">{observerDays}</span>日間あなたと共にいます
      </p>
      <div className="flex gap-4">
        <span className="font-mono text-[9px] text-white/25 tracking-wide">
          ジャーナル <span className="text-white/40">{totalJournalCount}</span>件
        </span>
        <span className="font-mono text-[9px] text-white/25 tracking-wide">
          SCAN <span className="text-white/40">{totalScanCount}</span>回
        </span>
        <span className="font-mono text-[9px] text-white/25 tracking-wide">
          壁打ち <span className="text-white/40">{totalCoachCount}</span>回
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardClient（メイン）
// ─────────────────────────────────────────────────────────────────────────────
type ButtonState = "A" | "B" | "C" | "D";

interface Props {
  initialAlterLog: AlterLogInsights | null;
  buttonState: ButtonState;
  lastScanAt: Date | null;
  initialThoughtProfile: string | null;
  timelineData: TimelineData;
}

function formatLastScan(date: Date): string {
  const d = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const mm  = String(d.getMonth() + 1).padStart(2, "0");
  const dd  = String(d.getDate()).padStart(2, "0");
  const hh  = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${min}`;
}

const LOADING_MESSAGES = [
  "思考構造を解析中...",
  "認知バイアスを検出中...",
  "事実・感情比率を算出中...",
  "レポートを生成中...",
];

export function DashboardClient({ initialAlterLog, buttonState, lastScanAt, initialThoughtProfile, timelineData }: Props) {
  const [log, setLog] = useState<AlterLogInsights | null>(initialAlterLog);
  const [localLastScanAt, setLocalLastScanAt] = useState<Date | null>(lastScanAt);
  const [thoughtProfile, setThoughtProfile] = useState<string | null>(initialThoughtProfile);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ローディングメッセージ切り替え（4秒ごと）
  useEffect(() => {
    if (!isGenerating) { setLoadingMsgIdx(0); return; }
    const id = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 4000);
    return () => clearInterval(id);
  }, [isGenerating]);

  const isButtonActive = buttonState === "B" || buttonState === "C";
  const buttonLabel =
    buttonState === "A" ? "SCAN  —  ジャーナル入力が必要です" :
    buttonState === "B" ? "SCAN  —  思考を解析する" :
    buttonState === "C" ? "SCAN  —  最新の入力を解析する" :
    "SCAN  —  解析済み（最新状態）";
  const helperText =
    buttonState === "A" ? "解析を開始するには、まずジャーナルを入力してください。" :
    buttonState === "D" ? "新しいジャーナルを入力すると解析をアップデートできます" :
    null;

  function handleGenerate() {
    if (!isButtonActive || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    startTransition(async () => {
      try {
        const { insights, thoughtProfile: newProfile } = await generateDashboardScan();
        setLog(insights);
        setLocalLastScanAt(new Date());
        setThoughtProfile(newProfile);
        router.refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setIsGenerating(false);
      }
    });
  }

  const isInsufficient = log?.is_insufficient_data === true;

  // ① 即時スナップショット
  const factPct         = log?.fact_emotion_ratio?.fact_percentage    ?? 0;
  const emotionPct      = log?.fact_emotion_ratio?.emotion_percentage  ?? 0;
  const ratioAnalysis   = log?.fact_emotion_ratio?.analysis            ?? null;
  const biasName        = log?.cognitive_bias_detected?.bias_name      ?? null;
  const biasDescription = log?.cognitive_bias_detected?.description    ?? null;
  const passiveStatus   = log?.passive_voice_status                    ?? null;

  // ② 蓄積プロファイル（null = ロック表示）
  const observedLoops    = log?.observed_loops     ?? null;
  const blindSpots       = log?.blind_spots        ?? null;
  const pendingDecisions = log?.pending_decisions  ?? null;

  return (
    <>
      <style>{`
        @keyframes hl-ripple {
          0%   { transform: scale(1);  opacity: 1; }
          100% { transform: scale(30); opacity: 0; }
        }
        @keyframes hl-up {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hl-enter { animation: hl-up 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .hl-d1 { animation-delay: 0.05s; }
        .hl-d2 { animation-delay: 0.10s; }
        .hl-d3 { animation-delay: 0.15s; }
        .hl-d4 { animation-delay: 0.20s; }
        .hl-d5 { animation-delay: 0.25s; }
        .hl-d6 { animation-delay: 0.30s; }
        .hl-d7 { animation-delay: 0.35s; }
        .hl-d8 { animation-delay: 0.40s; }
        .hl-d9 { animation-delay: 0.45s; }
      `}</style>

      <div className="bg-[#0B0E13] px-4 py-6 pb-32 md:px-6">
        <div className="max-w-2xl mx-auto space-y-3">

          {/* ── SCAN ボタン ────────────────────────────────────────────────── */}
          <div className="hl-enter">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isButtonActive || isGenerating || isPending}
              className={`w-full min-h-[56px] flex items-center justify-center py-4 px-5 rounded-lg font-mono transition-all duration-200 ${
                isButtonActive && !isGenerating && !isPending
                  ? "bg-[#C4A35A]/10 border border-[#C4A35A]/40 text-[#C4A35A] hover:bg-[#C4A35A]/15 hover:border-[#C4A35A]/60"
                  : "bg-white/[0.02] border border-white/[0.05] text-white/20 cursor-not-allowed"
              }`}
            >
              {isGenerating || isPending ? (
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 flex-shrink-0 border border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-mono text-[#C4A35A]/70 tracking-widest">{LOADING_MESSAGES[loadingMsgIdx]}</span>
                </div>
              ) : (
                <span className="text-[13px] font-mono tracking-[0.14em]">{buttonLabel}</span>
              )}
            </button>

            {helperText && !isGenerating && !isPending && (
              <p className="mt-1.5 text-[10px] font-mono text-white/20 text-center tracking-wide">{helperText}</p>
            )}
            {error && (
              <p className="mt-2 text-[10px] text-red-400/60 text-center font-mono">{error}</p>
            )}
          </div>

          {/* ── ジャーナルへの導線（メイン） ─────────────────────────────────── */}
          <div className="hl-enter hl-d1">
            <RippleLink href="/chat?mode=journal"
              className="rounded-xl p-4
                border border-t-[rgba(255,255,255,0.12)] border-x-[rgba(255,255,255,0.05)] border-b-transparent
                shadow-[0_8px_0_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:shadow-[0_10px_0_rgba(0,0,0,0.85),0_0_22px_rgba(196,163,90,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]
                hover:-translate-y-0.5 active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                transition-all duration-100 ease-out"
              style={{ background: "linear-gradient(160deg, #3A2910 0%, #1A1408 60%)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="mb-3" style={{ color: "#C4A35A" }}><IcPen /></div>
                  <p className="text-xl font-black tracking-tight leading-tight mb-1" style={{ color: "#E8D5A0" }}>JOURNAL</p>
                  <p className="text-xs font-medium" style={{ color: "#C4A35A" }}>気持ちを吐き出す</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(196,163,90,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>
          </div>

          {/* ─── 思考プロファイル ─────────────────────────────────────────────── */}
          {thoughtProfile && (
            <div className="hl-enter hl-d2 border border-[#C4A35A]/20 rounded-lg px-4 py-3" style={{ background: "rgba(196,163,90,0.04)" }}>
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#8A8276] uppercase mb-1.5">思考プロファイル</p>
              <p className="text-lg font-bold text-[#E8D5A0] leading-snug">{thoughtProfile}</p>
            </div>
          )}

          {/* ─── ① SNAPSHOT セクションヘッダー ─────────────────────────────── */}
          <div className="hl-enter hl-d2 flex items-center gap-3 pt-2">
            <span className="font-mono text-[9px] tracking-[0.25em] text-white/25 uppercase">① Snapshot</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
            {localLastScanAt && (
              <span className="font-mono text-[9px] text-white/15 tracking-widest">
                LAST SCAN {formatLastScan(localLastScanAt)}
              </span>
            )}
          </div>

          {/* ── 1. 事実・感情バランス ─────────────────────────────────────────── */}
          <div className="hl-enter hl-d3">
            <HudCard label="事実・感情バランス">
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/18">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : (
                <>
                  <FactEmotionBar factPct={factPct} emotionPct={emotionPct} />
                  {ratioAnalysis && (
                    <p className="mt-3 text-[12.5px] text-white/55 leading-relaxed">{ratioAnalysis}</p>
                  )}
                </>
              )}
            </HudCard>
          </div>

          {/* ── 2. 認知バイアス検知 ───────────────────────────────────────────── */}
          <div className="hl-enter hl-d4">
            <HudCard label="認知バイアス検知">
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/18">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : !biasName || biasName === "INSUFFICIENT_DATA" ? (
                <p className="font-mono text-[11px] text-white/30">偏りなし</p>
              ) : (
                <>
                  <p className="font-mono text-[13px] font-bold text-white/80 mb-2.5 tracking-wide">
                    「{biasName}」
                  </p>
                  {biasDescription && (
                    <p className="text-[12.5px] text-white/50 leading-relaxed">{biasDescription}</p>
                  )}
                </>
              )}
            </HudCard>
          </div>

          {/* ── 3. 意思決定の主体性 ───────────────────────────────────────────── */}
          <div className="hl-enter hl-d5">
            <HudCard label="意思決定の主体性">
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/18">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : passiveStatus ? (
                <p className="text-[12.5px] text-white/55 leading-relaxed">{passiveStatus}</p>
              ) : null}
            </HudCard>
          </div>

          {/* ─── ② PROFILE セクションヘッダー ──────────────────────────────── */}
          <div className="hl-enter hl-d6 flex items-center gap-3 pt-2">
            <span className="font-mono text-[9px] tracking-[0.25em] text-white/25 uppercase">② Profile</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* ── 蓄積プロファイル層（nullの場合はロック表示） ──────────────────── */}
          <div className="hl-enter hl-d6 space-y-2">
            <ProfileCard label="思考ループ観測" value={observedLoops} />
            <ProfileCard label="盲点エリア"     value={blindSpots} />
            <ProfileCard label="保留リスト"     value={pendingDecisions} />
          </div>

          {/* ─── ③ TIMELINE セクションヘッダー ──────────────────────────────── */}
          <div className="hl-enter hl-d7 flex items-center gap-3 pt-2">
            <span className="font-mono text-[9px] tracking-[0.25em] text-white/25 uppercase">③ Timeline</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* ── 内面マップ（ムードマップ） ───────────────────────────────────── */}
          <div className="hl-enter hl-d7">
            <WeatherMap days={timelineData.weatherDays} journalDayCount={timelineData.journalDayCount} />
          </div>

          {/* ── ワードクラウド ───────────────────────────────────────────────── */}
          <div className="hl-enter hl-d8">
            <WordCloud words={timelineData.wordCloudWords} journalDayCount={timelineData.journalDayCount} />
          </div>

          {/* ── 観測ログ（常に表示） ─────────────────────────────────────────── */}
          <div className="hl-enter hl-d9">
            <ObserverCounter
              observerDays={timelineData.observerDays}
              totalJournalCount={timelineData.totalJournalCount}
              totalScanCount={timelineData.totalScanCount}
              totalCoachCount={timelineData.totalCoachCount}
            />
          </div>

          {/* ── Alterステータス（壁打ちへの控えめな導線） ── */}
          <div className="hl-enter hl-d9 flex justify-center pt-4 pb-8">
            <Link
              href="/chat?mode=coach"
              className="flex items-center gap-2 text-[11px] font-mono text-white/35 hover:text-white/55 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C4A35A]/70" />
              <span>Alterは対話可能な状態です</span>
            </Link>
          </div>

        </div>
      </div>

    </>
  );
}
