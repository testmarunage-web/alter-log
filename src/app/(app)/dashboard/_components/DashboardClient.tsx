"use client";

import Link from "next/link";
import { useRef, useCallback, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateDashboardScan } from "@/app/actions/generateAlterLog";
import { useReadOnly } from "../../_components/ReadOnlyProvider";
import type { AlterLogInsights } from "@/app/actions/alterLogSchema";
import { AlterIcon } from "../../_components/AlterIcon";

const COMMUNITY_BANNER_KEY = "alter_community_banner_dismissed";

// ─────────────────────────────────────────────────────────────────────────────
// コミュニティバナー
// ─────────────────────────────────────────────────────────────────────────────
function CommunityBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(COMMUNITY_BANNER_KEY);
      if (!dismissed) setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(COMMUNITY_BANNER_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative rounded-xl border border-[#C4A35A]/25 bg-[#C4A35A]/5 px-4 py-4 pr-10">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-[#C4A35A]/15 border border-[#C4A35A]/30 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#E8D5A0] leading-snug mb-1">
            Alter Log ユーザー限定コミュニティが始まりました
          </p>
          <p className="text-[11px] text-[#8A8276] leading-relaxed mb-2.5">
            気づきや思考プロファイルを仲間と共有できる場です。参加は無料・任意です。
          </p>
          <a
            href="https://discord.gg/n5pnJEur72"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#C4A35A] hover:text-[#D4B36A] transition-colors"
          >
            Discordに参加する
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6h9M7 2l4 4-4 4" />
            </svg>
          </a>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="閉じる"
        className="absolute top-3 right-3 text-[#8A8276]/60 hover:text-[#8A8276] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="11" y2="11" />
          <line x1="11" y1="1" x2="1" y2="11" />
        </svg>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 型定義（dashboard/page.tsx からも import）
// ─────────────────────────────────────────────────────────────────────────────
export interface WeatherDay {
  dateStr: string;
  day: number;
  month: number;
  factPct: number | null;
  journalEntries: { content: string; timeStr: string }[] | null;
}

export interface WordEntry {
  word: string;
  count: number;
}

export interface TimelineData {
  weatherDays: WeatherDay[];
  wordCloudWords: WordEntry[];
  journalDayCount: number;
  observerDays: number;
  totalJournalCount: number;
  totalScanCount: number;
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
const IcLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IcInfo = () => (
  <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="10" cy="10" r="8.5" />
    <line x1="10" y1="9" x2="10" y2="14" />
    <circle cx="10" cy="6.5" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

// 感情天気図アイコン（SVG / 18px）
function WeatherIcon({ factPct }: { factPct: number | null }) {
  const pct = factPct ?? 32; // null → 曇り
  if (pct >= 60) {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
  } else if (pct >= 45) {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="8" cy="9" r="3.5" fill="#A89050" />
        <path d="M11 14 Q11 12 13 12 Q15 12 15 14 Q16.5 14 16.5 15.5 Q16.5 17 15 17 H11.5 Q10 17 10 15.5 Q10 14 11 14Z" fill="#7A7265" />
      </svg>
    );
  } else if (pct >= 30) {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M5 13 Q4 11 6 10 Q7 7 10 8 Q12 6 14 8 Q16.5 8 16.5 10.5 Q17.5 10.5 17.5 12.5 Q17.5 14.5 15.5 14.5 H7 Q5 14.5 5 13Z" fill="#6A6358" />
      </svg>
    );
  } else if (pct >= 15) {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M4.5 11 Q3.5 9 5.5 8 Q6.5 5.5 9.5 6.5 Q11.5 4.5 13.5 6.5 Q16 6.5 16 9 Q17 9 17 11 Q17 13 15 13 H6.5 Q4.5 13 4.5 11Z" fill="#526070" />
        <line x1="7" y1="14.5" x2="6" y2="17" stroke="#6090A8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="14.5" x2="9" y2="17" stroke="#6090A8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="14.5" x2="12" y2="17" stroke="#6090A8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  } else {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
// テキストブロック（句点で分割して段落間に余白）
// ─────────────────────────────────────────────────────────────────────────────
function TextBlock({ text, className }: { text: string; className: string }) {
  const paragraphs = text.replace(/\n/g, "").split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return <p className={className}>{text}</p>;
  return (
    <div className="space-y-2">
      {paragraphs.map((s, i) => <p key={i} className={className}>{s}</p>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD カード（即時スナップショット層）
// ─────────────────────────────────────────────────────────────────────────────
function HudCard({ label, tag, description, children }: {
  label: string; tag?: string; description?: string; children: React.ReactNode;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">{label}</span>
        {description && (
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            className="text-[#C4A35A]/40 hover:text-[#C4A35A]/65 transition-colors flex-shrink-0 ml-1"
          >
            <IcInfo />
          </button>
        )}
        <span className="flex-1" />
        {tag && (
          <span className="font-mono text-[9px] tracking-widest text-[#C4A35A]/60 border border-[#C4A35A]/25 rounded px-1.5 py-0.5 leading-none">
            {tag}
          </span>
        )}
      </div>
      {infoOpen && description && (
        <p className="text-[10px] text-white/42 leading-relaxed -mt-1 mb-3">{description}</p>
      )}
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
        <div className="transition-all duration-700" style={{ width: `${factPct}%`, background: "rgba(196,163,90,0.60)" }} />
        <div className="transition-all duration-700" style={{ width: `${emotionPct}%`, background: "rgba(255,255,255,0.10)" }} />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[10px] text-[#C4A35A]/90 tracking-widest">FACT {factPct}%</span>
        <span className="font-mono text-[10px] text-white/55 tracking-widest">EMOTION {emotionPct}%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// プロファイルカード（蓄積層）
// ─────────────────────────────────────────────────────────────────────────────
function ProfileCard({ label, value, title, description }: { label: string; value: string | null; title?: string | null; description?: string }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const isLocked = value === null;
  return (
    <div
      className="border rounded-lg p-4 overflow-hidden"
      style={{
        background: isLocked ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.02)",
        borderColor: isLocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center mb-2">
        <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">{label}</span>
        {description && (
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            className="text-[#C4A35A]/40 hover:text-[#C4A35A]/65 transition-colors flex-shrink-0 ml-1"
          >
            <IcInfo />
          </button>
        )}
      </div>
      {infoOpen && description && (
        <p className="text-[10px] text-white/40 leading-relaxed mb-2">{description}</p>
      )}
      {isLocked ? (
        <div className="flex items-start gap-2 py-0.5">
          <span className="text-white/18 mt-0.5 flex-shrink-0"><IcLock /></span>
          <p className="text-[11.5px] text-white/40 leading-relaxed tracking-wide">
            データ収集中（解析にはさらに多くのジャーナル入力が必要です）
          </p>
        </div>
      ) : (
        <>
          {title && <p className="font-mono text-[13px] font-bold text-[#E8D5A0]/90 mb-2.5 tracking-wide">「{title}」</p>}
          <TextBlock text={value} className="text-[14px] text-white/78 leading-relaxed" />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 思考プロファイルカード
// ─────────────────────────────────────────────────────────────────────────────
function ThoughtProfileCard({ profile }: { profile: string }) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="border border-[#C4A35A]/20 rounded-lg px-4 py-3" style={{ background: "rgba(196,163,90,0.04)" }}>
      <div className="flex items-center mb-1.5">
        <p className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">思考プロファイル</p>
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="text-[#8A8276]/50 hover:text-[#8A8276] transition-colors ml-1"
        >
          <IcInfo />
        </button>
      </div>
      {infoOpen && (
        <p className="text-[10px] text-white/25 leading-relaxed mb-2">
          あなたの思考パターンをAlterが一言で表現したものです。SCANのたびに更新されます。
        </p>
      )}
      <p className="text-lg font-bold text-[#E8D5A0] leading-snug">{profile}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ムードマップ（感情天気図）
// ─────────────────────────────────────────────────────────────────────────────
const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];
const DUMMY_FACT_PCT = [null, 70, null, 50, null, 35, 20, null, 60, null, 45, null, 55, 30, null, null, 65, null, 40, 25, null, 75, null, 50, 60, null, 35, 70, null, 40, 30];

function WeatherMap({ days, journalDayCount }: { days: WeatherDay[]; journalDayCount: number }) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const isLocked = journalDayCount < 3;
  const daysNeeded = Math.max(0, 3 - journalDayCount);

  // 月ナビゲーション（JST現在月を初期値）
  const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const [year, setYear]   = useState(nowJst.getFullYear());
  const [month, setMonth] = useState(nowJst.getMonth()); // 0-indexed
  const isCurrentMonth = year === nowJst.getFullYear() && month === nowJst.getMonth();
  const todayStr = `${nowJst.getFullYear()}-${String(nowJst.getMonth() + 1).padStart(2, "0")}-${String(nowJst.getDate()).padStart(2, "0")}`;

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  // データルックアップ
  const dayMap = new Map(days.map((d) => [d.dateStr, d]));

  // 選択月のカレンダーグリッドを生成
  const firstDow  = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) =>
      `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      {/* ヘッダー */}
      <div className="flex items-center mb-1">
        <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">ムードマップ</span>
        <button type="button" onClick={() => setInfoOpen((v) => !v)} className="text-white/20 hover:text-white/40 transition-colors ml-1">
          <IcInfo />
        </button>
      </div>
      {infoOpen && (
        <p className="text-[10px] text-white/25 leading-relaxed mb-2">
          ジャーナルの感情傾向を天気で可視化。日付タップでその日の内容を確認できます。
        </p>
      )}
      <p className="text-[10px] text-white/40 leading-relaxed mb-3">
        日付をタップすると、その日のジャーナル内容を確認できます
      </p>

      <div className="relative">
        <div className={isLocked ? "opacity-20 pointer-events-none" : ""}>

          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/55 hover:text-white/85 hover:bg-white/[0.05] transition-colors"
              aria-label="前月"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="font-mono text-[10px] text-white/60 tracking-wide">{year}年{month + 1}月</span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/55 hover:text-white/85 hover:bg-white/[0.05] transition-colors disabled:opacity-20 disabled:cursor-default"
              aria-label="翌月"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-0.5">
            {WEEKDAYS_JP.map((d, i) => (
              <span key={d} className={`text-center font-mono text-[10px] ${i === 0 ? "text-red-400/65" : "text-white/55"}`}>{d}</span>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7">
            {cells.map((dateStr, idx) => {
              if (!dateStr) return <div key={`e-${idx}`} className="h-9" />;

              const dayNum = parseInt(dateStr.split("-")[2]);
              const isToday = dateStr === todayStr;

              // ロック中はダミー表示
              if (isLocked) {
                const dummyFactPct = DUMMY_FACT_PCT[(dayNum - 1) % DUMMY_FACT_PCT.length];
                const hasDummy = dummyFactPct !== null;
                return (
                  <div key={dateStr} className="h-9 flex flex-col items-center justify-center gap-0.5">
                    <span className={`font-mono text-[12px] leading-none ${hasDummy ? "text-white/55" : "text-white/28"}`}>{dayNum}</span>
                    {hasDummy
                      ? <WeatherIcon factPct={dummyFactPct} />
                      : <div className="w-[18px] h-[18px] flex items-center justify-center"><div className="w-1.5 h-px bg-white/10" /></div>
                    }
                  </div>
                );
              }

              const data = dayMap.get(dateStr);
              const hasJournal = !!(data?.journalEntries);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => hasJournal && router.push(`/daily/${dateStr}`)}
                  className={`h-9 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
                    hasJournal ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span className={`font-mono text-[12px] leading-none ${
                    isToday ? "text-[#C4A35A] font-bold" : hasJournal ? "text-white/70" : "text-white/38"
                  }`}>
                    {dayNum}
                  </span>
                  {hasJournal
                    ? <WeatherIcon factPct={data?.factPct ?? null} />
                    : <div className="w-[18px] h-[18px] flex items-center justify-center"><div className="w-1.5 h-px bg-white/10" /></div>
                  }
                </button>
              );
            })}
          </div>
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
  const [infoOpen, setInfoOpen] = useState(false);
  const isLocked = words.length < 5;

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
      {/* ヘッダー */}
      <div className="flex items-center mb-1">
        <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">ワードクラウド</span>
      </div>
      {infoOpen && (
        <p className="text-[10px] text-white/25 leading-relaxed mb-2">
          直近30日間のジャーナルから、よく使う言葉を抽出しています。
        </p>
      )}
      <p className="text-[10px] text-white/40 leading-relaxed mb-3">
        直近30日間のジャーナルから抽出された、あなたの思考の中心にある言葉
      </p>

      <div className="relative">
        <div className={isLocked ? "opacity-20 pointer-events-none" : ""}>
          {displayWords.length === 0 ? (
            <p className="font-mono text-[10px] text-white/20">キーワードを抽出中...</p>
          ) : (
            <div className="flex flex-wrap gap-x-3 items-baseline">
              {displayWords.map(({ word, count }, idx) => {
                const ratio = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
                const fontSize = 11 + Math.round(ratio * 9);
                const opacity = 0.35 + ratio * 0.65;
                const color = ratio > 0.5 ? "#C4A35A" : "#8A8276";
                // 文字コードベースの疑似ランダムで有機的なオフセット（ハイドレーション安全）
                const charCode = word.charCodeAt(0) + word.length * 7;
                const mt = (charCode % 5) * 2;       // 0, 2, 4, 6, 8 px
                const mb = ((charCode * 3 + idx) % 4) * 2; // 0, 2, 4, 6 px
                return (
                  <span
                    key={word}
                    className="font-mono"
                    style={{ fontSize, color, opacity, marginTop: mt, marginBottom: mb }}
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
                もう少しジャーナルを重ねると解放されます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 観測カウンター
// ─────────────────────────────────────────────────────────────────────────────
function ObserverCounter({ observerDays, totalJournalCount, totalScanCount }: {
  observerDays: number;
  totalJournalCount: number;
  totalScanCount: number;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="border border-white/[0.07] rounded-lg p-4" style={{ background: "rgba(255,255,255,0.018)" }}>
      <div className="flex items-center mb-3">
        <span className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">観測カウンター</span>
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="text-white/35 hover:text-white/55 transition-colors ml-1"
        >
          <IcInfo />
        </button>
      </div>
      {infoOpen && (
        <p className="text-[10px] text-white/25 leading-relaxed mb-3">
          Alterがあなたを観察している期間と、各機能の利用回数です。
        </p>
      )}
      <p className="text-sm text-white/72 mb-2.5 leading-relaxed">
        Alterは<span className="text-[#C4A35A] font-bold text-base">{observerDays}</span>日間あなたと共にいます
      </p>
      <div className="flex gap-4">
        <span className="font-mono text-[9px] text-white/45 tracking-wide">
          ジャーナル <span className="text-white/60">{totalJournalCount}</span>件
        </span>
        <span className="font-mono text-[9px] text-white/45 tracking-wide">
          SCAN <span className="text-white/60">{totalScanCount}</span>回
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
  const isReadOnly = useReadOnly();

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
  const factPct         = log?.fact_emotion_ratio?.fact_percentage    ?? 0;
  const emotionPct      = log?.fact_emotion_ratio?.emotion_percentage  ?? 0;
  const ratioAnalysis   = log?.fact_emotion_ratio?.analysis            ?? null;
  const biasName        = log?.cognitive_bias_detected?.bias_name      ?? null;
  const biasDescription = log?.cognitive_bias_detected?.description    ?? null;
  const passiveStatus   = log?.passive_voice_status                    ?? null;
  const passiveTitle    = log?.passive_voice_title                     ?? null;
  const observedLoops       = log?.observed_loops       ?? null;
  const observedLoopsTitle  = log?.observed_loops_title ?? null;
  const blindSpots          = log?.blind_spots          ?? null;
  const blindSpotsTitle     = log?.blind_spots_title    ?? null;
  const pendingDecisions    = log?.pending_decisions    ?? null;
  const pendingDecisionsTitle = log?.pending_decisions_title ?? null;
  const positiveObservation       = log?.positive_observation       ?? null;
  const positiveObservationTitle  = log?.positive_observation_title ?? null;

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

          {/* ── SCAN ボタン ── */}
          <div className="hl-enter">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isReadOnly || !isButtonActive || isGenerating || isPending}
              className={`w-full min-h-[56px] flex items-center justify-center py-4 px-5 rounded-lg font-mono ${
                !isReadOnly && isButtonActive && !isGenerating && !isPending
                  ? "bg-[#8BA89E]/15 border border-[#8BA89E]/40 text-[#8BA89E] hover:bg-[#8BA89E]/25 hover:border-[#8BA89E]/60 hover:shadow-[0_0_20px_rgba(139,168,158,0.3)]"
                  : "bg-white/[0.02] border border-white/[0.05] text-white/20 cursor-not-allowed"
              }`}
            >
              {isGenerating || isPending ? (
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 flex-shrink-0 border border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-mono text-[#C4A35A]/70 tracking-widest">{LOADING_MESSAGES[loadingMsgIdx]}</span>
                </div>
              ) : (
                <span className="text-[13px] font-mono tracking-[0.14em]">
                  {isReadOnly ? "SCAN  —  サブスクリプションの再開が必要です" : buttonLabel}
                </span>
              )}
            </button>
            {!isReadOnly && helperText && !isGenerating && !isPending && (
              <p className="mt-1.5 text-[10px] font-mono text-white/40 text-center tracking-wide">{helperText}</p>
            )}
            {error && (
              <p className="mt-2 text-[10px] text-red-400/60 text-center font-mono">{error}</p>
            )}
          </div>

          {/* ── ジャーナルへの導線 ── */}
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

          {/* ── 思考プロファイル ── */}
          {thoughtProfile && (
            <div className="hl-enter hl-d2">
              <ThoughtProfileCard profile={thoughtProfile} />
            </div>
          )}

          {/* ─── ① SNAPSHOT ── */}
          <div className="hl-enter hl-d2 flex items-center gap-3 pt-2">
            <span className="font-mono text-[10px] tracking-[0.25em] text-white/55 uppercase">① Snapshot</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
            {localLastScanAt && (
              <span className="font-mono text-[10px] text-white/55 tracking-widest">
                LAST SCAN {formatLastScan(localLastScanAt)}
              </span>
            )}
          </div>

          <div className="hl-enter hl-d3">
            <HudCard
              label="事実・感情バランス"
              description="ジャーナルの内容が事実ベースか感情ベースかの比率です。"
            >
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/38">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : (
                <>
                  <FactEmotionBar factPct={factPct} emotionPct={emotionPct} />
                  {ratioAnalysis && <div className="mt-3"><TextBlock text={ratioAnalysis} className="text-[14px] text-white/72 leading-relaxed" /></div>}
                </>
              )}
            </HudCard>
          </div>

          <div className="hl-enter hl-d4">
            <HudCard
              label="認知バイアス検知"
              description="ジャーナルから検出された認知の偏りパターンです。"
            >
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/38">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : !biasName || biasName === "INSUFFICIENT_DATA" ? (
                <p className="font-mono text-[11px] text-white/30">偏りなし</p>
              ) : (
                <>
                  <p className="font-mono text-[13px] font-bold text-[#E8D5A0]/90 mb-2.5 tracking-wide">「{biasName}」</p>
                  {biasDescription && <TextBlock text={biasDescription} className="text-[14px] text-white/65 leading-relaxed" />}
                </>
              )}
            </HudCard>
          </div>

          <div className="hl-enter hl-d5">
            <HudCard
              label="意思決定の主体性"
              description="文章の能動態・受動態の比率から、意思決定の主体性を分析しています。"
            >
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/38">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : passiveStatus ? (
                <>
                  {passiveTitle && <p className="font-mono text-[13px] font-bold text-[#E8D5A0]/90 mb-2.5 tracking-wide">「{passiveTitle}」</p>}
                  <TextBlock text={passiveStatus} className="text-[14px] text-white/72 leading-relaxed" />
                </>
              ) : null}
            </HudCard>
          </div>

          {(!log || isInsufficient || positiveObservation) && (
            <div className="hl-enter hl-d5">
              <HudCard
                label="ポジティブな観測"
                description="ジャーナルから事実として観察できるポジティブな行動・思考・変化です。お世辞ではなく実際の観察として記録されています。"
              >
                {!log || isInsufficient ? (
                  <p className="font-mono text-[11px] text-white/38">
                    {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                  </p>
                ) : (
                  <>
                    {positiveObservationTitle && <p className="font-mono text-[13px] font-bold text-[#E8D5A0]/90 mb-2.5 tracking-wide">「{positiveObservationTitle}」</p>}
                    <TextBlock text={positiveObservation} className="text-[14px] text-white/72 leading-relaxed" />
                  </>
                )}
              </HudCard>
            </div>
          )}

          {/* ─── ② PROFILE ── */}
          <div className="hl-enter hl-d6 flex items-center gap-3 pt-2">
            <span className="font-mono text-[10px] tracking-[0.25em] text-white/55 uppercase">② Profile</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="hl-enter hl-d6 space-y-2">
            <ProfileCard label="思考ループ観測" value={observedLoops}     title={observedLoopsTitle}     description="繰り返し出現する思考パターンをAlterが検出しています。" />
            <ProfileCard label="盲点エリア"     value={blindSpots}        title={blindSpotsTitle}        description="あなたが気づいていない可能性のある視点をAlterが指摘しています。" />
            <ProfileCard label="保留リスト"     value={pendingDecisions}  title={pendingDecisionsTitle}  description="判断を先送りにしている事項をAlterが記録しています。" />
          </div>

          {/* ─── ③ TIMELINE ── */}
          <div className="hl-enter hl-d7 flex items-center gap-3 pt-2">
            <span className="font-mono text-[10px] tracking-[0.25em] text-white/55 uppercase">③ Timeline</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="hl-enter hl-d7">
            <WeatherMap days={timelineData.weatherDays} journalDayCount={timelineData.journalDayCount} />
          </div>

          <div className="hl-enter hl-d8">
            <WordCloud words={timelineData.wordCloudWords} journalDayCount={timelineData.journalDayCount} />
          </div>

          <div className="hl-enter hl-d9">
            <ObserverCounter
              observerDays={timelineData.observerDays}
              totalJournalCount={timelineData.totalJournalCount}
              totalScanCount={timelineData.totalScanCount}
            />
          </div>

          {timelineData.totalJournalCount >= 3 && (
            <div className="hl-enter hl-d9">
              <CommunityBanner />
            </div>
          )}

        </div>
      </div>
    </>
  );
}
