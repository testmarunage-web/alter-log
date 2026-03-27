"use client";

import Link from "next/link";
import { useRef, useCallback, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAlterLog } from "@/app/actions/generateAlterLog";
import type { AlterLogInsights } from "@/app/actions/alterLogSchema";

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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);
const IcBook = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Alter 光の玉
// ─────────────────────────────────────────────────────────────────────────────
function CoachOrb() {
  return (
    <div className="w-9 h-9 rounded-full flex-shrink-0 relative overflow-hidden"
      style={{
        background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 45%, #1A6B8A)",
        boxShadow: "0 0 12px rgba(58,175,202,0.55), 0 0 4px rgba(147,228,212,0.35)",
      }}>
      <div className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle at 62% 28%, rgba(255,255,255,0.40), transparent 55%)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 思考のバランス（二項対立スライダー・5軸）
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_BALANCE = [
  { left: "内省", right: "発信", pct: 30 },
  { left: "直感", right: "論理", pct: 72 },
  { left: "楽観", right: "慎重", pct: 42 },
  { left: "現在", right: "未来", pct: 85 },
  { left: "自責", right: "他責", pct: 20 },
];

function BalanceSliders({ items }: { items: typeof DEFAULT_BALANCE }) {
  return (
    <div className="space-y-2.5 mt-2">
      {items.map(({ left, right, pct }) => (
        <div key={left}>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[#C4A35A]/80 font-semibold">{left}</span>
            <span className="text-[10px] text-[#8A8276]">{right}</span>
          </div>
          <div className="relative h-px rounded-full" style={{ background: "rgba(196,163,90,0.15)" }}>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{
                left: `calc(${pct}% - 5px)`,
                background: "radial-gradient(circle at 38% 38%, #E8D5A0, #C4A35A 55%)",
                boxShadow: "0 0 5px rgba(196,163,90,0.70)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// インフォメーションツールチップ
// ─────────────────────────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="flex items-center justify-center text-[#C4A35A]/35 hover:text-[#C4A35A]/75 transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      {show && (
        <div className="absolute left-0 top-6 z-20 w-52 p-3 bg-[#141B22] border border-[#C4A35A]/20 rounded-lg shadow-lg">
          <p className="text-xs text-[#9A9488] leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ripple ボタン
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

function RippleLink({ href, children, className = "", style }: { href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
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
// アコーディオンカード
// ─────────────────────────────────────────────────────────────────────────────
const GLASS = "bg-white/[0.04] backdrop-blur-sm border border-[#C4A35A]/20 rounded-xl";
const SECTION_LABEL = "text-xs tracking-widest text-[#C4A35A]/80 font-bold flex items-center gap-1.5";

function AccordionCard({
  icon,
  label,
  summary,
  detail,
  infoText,
  observing,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  summary: React.ReactNode;
  detail: string;
  infoText: string;
  observing?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isObserving = observing ?? detail.includes("観測中");

  return (
    <div
      className={`${GLASS} overflow-hidden hover:border-[#C4A35A]/40 transition-all duration-300 cursor-pointer relative`}
      onClick={() => setOpen((v) => !v)}
    >
      {/* 観測中オーバーレイ */}
      {isObserving && (
        <div className="absolute inset-0 bg-[#0B0E13]/50 backdrop-blur-[6px] flex items-center justify-center z-10 rounded-xl">
          <div className="bg-white/[0.06] backdrop-blur-md border border-[#C4A35A]/20 rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4A35A]/50 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold tracking-widest text-[#8A8276]">データ蓄積中</span>
          </div>
        </div>
      )}

      <div className={compact ? "px-3.5 py-3" : "p-4"}>
        <div className={`flex items-center ${compact ? "mb-1.5" : "mb-3"}`}>
          <p className={compact ? "text-[10px] tracking-widest text-[#C4A35A]/70 font-bold flex items-center gap-1" : SECTION_LABEL}>{icon}{label}</p>
          <div className="ml-1.5"><InfoTooltip text={infoText} /></div>
        </div>
        {summary}
      </div>
      {!open && (
        <>
          <div className={`${compact ? "px-3.5 pb-2" : "px-4 pb-2.5"} flex justify-end`}>
            <span className="text-[9px] text-[#8A8276]/50 tracking-wide">タップして展開 ▾</span>
          </div>
          <div className="h-2 bg-gradient-to-t from-[#C4A35A]/[0.04] to-transparent" />
        </>
      )}
      {open && (
        <div className={`${compact ? "px-3.5 pb-3" : "px-4 pb-4"} border-t border-[#C4A35A]/10`}>
          <p className="text-xs text-[#9A9488]/80 leading-relaxed pt-3 italic">{detail}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardClient（メイン）
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  initialAlterLog: AlterLogInsights | null;
  hasNewLogs: boolean;
}

const LOADING_MESSAGES = [
  "最近のあなたの言葉を読み返しています...",
  "言葉の裏側にあるテーマや、思考のクセを探しています...",
  "客観的な視点から、あなたへのフィードバックをまとめています...",
  "レポートを書き上げています。もう少しだけお待ちください...",
];

export function DashboardClient({ initialAlterLog, hasNewLogs }: Props) {
  const [log, setLog] = useState<AlterLogInsights | null>(initialAlterLog);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ローディング中のメッセージ切り替え（4秒ごと）
  useEffect(() => {
    if (!isGenerating) {
      setLoadingMsgIdx(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, [isGenerating]);

  function handleGenerate() {
    if (!hasNewLogs || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    startTransition(async () => {
      try {
        const result = await generateAlterLog();
        setLog(result);
        router.refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setIsGenerating(false);
      }
    });
  }

  // DBデータがあればそれを使い、なければ観測中プレースホルダーを表示
  const balance  = log?.balance   ?? DEFAULT_BALANCE;
  const notice   = log?.alter_notice   ?? "対話データが蓄積されると、ここにAlterからの気づきが届きます。";
  const thinkingType = log?.thinking_type ?? "観測中";

  const subtitleTitle  = log?.subtraction_title  ?? "観測中";
  const subtitleDetail = log?.subtraction_detail ?? "観測中";

  const organizeTitle  = log?.organize_title  ?? "観測中";
  const organizeDetail = log?.organize_detail ?? "観測中";

  const bookTitle  = log?.book_title  ?? "観測中";
  const bookAuthor = log?.book_author ?? "";
  const bookReason = log?.book_reason ?? "観測中";

  const winTitle  = log?.win_pattern_title  ?? "観測中";
  const winDetail = log?.win_pattern_detail ?? "観測中";

  return (
    <>
      <style>{`
        @keyframes hl-ripple {
          0%   { transform: scale(1);  opacity: 1; }
          100% { transform: scale(30); opacity: 0; }
        }
        @keyframes hl-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hl-enter { animation: hl-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .hl-d1 { animation-delay: 0.06s; }
        .hl-d2 { animation-delay: 0.12s; }
        .hl-d3 { animation-delay: 0.18s; }
        .hl-d4 { animation-delay: 0.24s; }
        .hl-d5 { animation-delay: 0.30s; }
        .hl-d6 { animation-delay: 0.36s; }
        .hl-d7 { animation-delay: 0.42s; }
      `}</style>

      <div className="bg-[#0B0E13] px-4 py-6 pb-32 md:px-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ── Alter 思考整理ボタン（最重要機能・ファーストビュー） ─────── */}
          <div className="hl-enter">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!hasNewLogs || isGenerating || isPending}
              className={`w-full min-h-[68px] flex flex-col items-center justify-center gap-1.5 py-4 px-5 rounded-2xl font-bold transition-all duration-200 ${
                hasNewLogs && !isGenerating && !isPending
                  ? "bg-[#C4A35A]/15 border border-[#C4A35A]/50 text-[#E8D5A0] hover:bg-[#C4A35A]/25 hover:border-[#C4A35A]/70 hover:shadow-[0_0_20px_rgba(196,163,90,0.2)]"
                  : "bg-white/[0.02] border border-white/[0.06] text-[#8A8276]/40 cursor-not-allowed"
              }`}
            >
              {isGenerating || isPending ? (
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 flex-shrink-0 border border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold text-[#C4A35A]/80">分析中...</span>
                </div>
              ) : (
                <span className="text-lg font-black tracking-tight leading-tight">Alterに思考を整理してもらう</span>
              )}
            </button>


            {!hasNewLogs && !isGenerating && !isPending && (
              <p className="mt-1.5 text-[10px] text-[#8A8276]/50 text-center tracking-wide">
                ※ジャーナルデータが蓄積されると実行できます
              </p>
            )}

            {error && (
              <p className="mt-2 text-[10px] text-red-400/70 text-center">{error}</p>
            )}
          </div>

          {/* (1) アクションボタン */}
          <div className="hl-enter hl-d1 grid grid-cols-2 gap-3 mb-2">
            <RippleLink href="/chat?mode=journal"
              className="rounded-xl p-4
                border border-t-[rgba(255,255,255,0.12)] border-x-[rgba(255,255,255,0.05)] border-b-transparent
                shadow-[0_8px_0_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:shadow-[0_10px_0_rgba(0,0,0,0.85),0_0_22px_rgba(196,163,90,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]
                hover:-translate-y-0.5
                active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                transition-all duration-100 ease-out"
              style={{ background: "linear-gradient(160deg, #3A2910 0%, #1A1408 60%)" }}
            >
              <div className="mb-3" style={{ color: "#C4A35A" }}><IcPen /></div>
              <p className="text-xl font-black tracking-tight leading-tight mb-1" style={{ color: "#E8D5A0" }}>ジャーナル</p>
              <p className="text-xs font-medium mb-4" style={{ color: "#C4A35A" }}>気持ちを吐き出す</p>
              <div className="flex justify-end">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(196,163,90,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>

            <RippleLink href="/chat?mode=coach"
              className="rounded-xl p-4
                border border-t-[rgba(255,255,255,0.08)] border-x-[rgba(255,255,255,0.03)] border-b-transparent
                shadow-[0_8px_0_rgba(0,0,0,0.75),inset_0_1px_0_rgba(180,210,190,0.08)]
                hover:shadow-[0_10px_0_rgba(0,0,0,0.85),0_0_22px_rgba(80,130,100,0.18),inset_0_1px_0_rgba(180,210,190,0.12)]
                hover:-translate-y-0.5
                active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                transition-all duration-100 ease-out"
              style={{ background: "linear-gradient(160deg, #1C3028 0%, #0D1A16 60%)" }}
            >
              <div className="mb-3" style={{ color: "#8BA89E" }}><IcCompass /></div>
              <p className="text-xl font-black tracking-tight leading-tight mb-1" style={{ color: "#D0D5D2" }}>壁打ち</p>
              <p className="text-xs font-medium mb-4" style={{ color: "#8BA89E" }}>思考を整理する</p>
              <div className="flex justify-end">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(139,168,158,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>
          </div>

          {/* (2) Alterの気づき */}
          <div className="hl-enter hl-d2 flex gap-3 items-center mb-2">
            <CoachOrb />
            <div className="relative flex-1 bg-white/[0.06] border border-[#C4A35A]/20 rounded-2xl px-4 py-3.5 shadow-sm">
              <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{ borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: "7px solid rgba(196,163,90,0.2)" }} />
              <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{ borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "6px solid rgba(255,255,255,0.06)" }} />
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs font-bold text-[#C4A35A] tracking-wider">Alterの気づき</span>
                <InfoTooltip text="直近の対話から、Alterがあなたの無意識のパターンに気づいた時に話しかけます。" />
              </div>
              <p className="text-sm text-[#E8E3D8] leading-relaxed">{notice}</p>
            </div>
          </div>

          {/* (3) 現在の思考タイプ（フル幅） */}
          <div className={`hl-enter hl-d3 ${GLASS} p-4 relative`}>
            {!log && (
              <div className="absolute inset-0 bg-[#0B0E13]/50 backdrop-blur-[6px] flex items-center justify-center z-10 rounded-xl">
                <div className="bg-white/[0.06] backdrop-blur-md border border-[#C4A35A]/20 rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C4A35A]/50 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-bold tracking-widest text-[#8A8276]">データ蓄積中</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 mb-3">
              <p className={SECTION_LABEL}>現在の思考タイプ</p>
              <InfoTooltip text="対話から推測される、あなたの現在の思考のバランスと傾向です。" />
            </div>
            <p className="text-base font-black tracking-wide text-[#E8D5A0] mb-4">{thinkingType}</p>
            <BalanceSliders items={balance} />
          </div>

          {/* (4) 今週の引き算（コンパクト） */}
          <div className="hl-enter hl-d4">
            <AccordionCard
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>}
              label="今週の引き算"
              infoText="今週やめるべきことを提案します。引き算の行動がコンディション回復の最短ルートです。"
              compact
              summary={
                <p className="text-xs text-[#9A9488] leading-relaxed mt-1">
                  今週は<span className="text-[#E8E3D8] font-semibold">「{subtitleTitle}」</span>を一旦ストップし、脳のメモリを解放しましょう。
                </p>
              }
              detail={subtitleDetail}
            />
          </div>

          {/* (5) 頭のモヤモヤ整理 */}
          <div className="hl-enter hl-d5">
            <AccordionCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>}
              label="頭のモヤモヤ整理"
              infoText="複雑に絡み合っているタスクを、既知のフレームワークで整理します。"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed mt-1">
                  緊急度と重要度のマトリクスに当てはめると、今悩んでいることは
                  <span className="text-[#E8E3D8] font-semibold">「{organizeTitle}」</span>
                  領域にあります。
                </p>
              }
              detail={organizeDetail}
            />
          </div>

          {/* (6) 今のあなたに響く一冊 */}
          <div className="hl-enter hl-d6">
            <AccordionCard
              icon={<IcBook />}
              label="今のあなたに響く一冊"
              infoText="あなたの現在地に最も共鳴する書籍・知見を、対話の文脈から選定しています。"
              summary={
                <div className="mt-2">
                  <p className="text-sm font-black text-[#E8E3D8] leading-snug mb-0.5">『{bookTitle}』</p>
                  <p className="text-xs text-[#8A8276] mb-2">{bookAuthor} 著</p>
                  <p className="text-sm text-[#9A9488] leading-relaxed">{bookReason}</p>
                </div>
              }
              detail={`『${bookTitle}』（${bookAuthor}著）\n\n${bookReason}`}
            />
          </div>

          {/* (7) あなたの勝ちパターン */}
          <div className="hl-enter hl-d7">
            <AccordionCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              label="あなたの勝ちパターン"
              infoText="過去の対話から、あなたが停滞を打破した成功パターンを抽出しています。"
              observing={winTitle.includes("観測中") || winDetail.includes("観測中")}
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed mt-1">
                  あなたの勝ちパターンは
                  <span className="text-[#E8E3D8] font-bold">「{winTitle}」</span>
                  です。今回も同じパターンが適用できます。
                </p>
              }
              detail={winDetail}
            />
          </div>

        </div>
      </div>
    </>
  );
}
