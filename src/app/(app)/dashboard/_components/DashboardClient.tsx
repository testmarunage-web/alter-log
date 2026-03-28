"use client";

import Link from "next/link";
import { useRef, useCallback, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAlterLog } from "@/app/actions/generateAlterLog";
import type { AlterLogInsights } from "@/app/actions/alterLogSchema";
import { AlterIcon } from "../../_components/AlterIcon";

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
const IcLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

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
// DashboardClient（メイン）
// ─────────────────────────────────────────────────────────────────────────────
type ButtonState = "A" | "B" | "C" | "D";

interface Props {
  initialAlterLog: AlterLogInsights | null;
  isFirstVisit: boolean;
  buttonState: ButtonState;
}

const LOADING_MESSAGES = [
  "テキストを走査しています...",
  "構文構造を解析しています...",
  "認知バイアスを検出しています...",
  "レポートを生成しています...",
];

export function DashboardClient({ initialAlterLog, isFirstVisit, buttonState }: Props) {
  const [log, setLog] = useState<AlterLogInsights | null>(initialAlterLog);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalFading, setModalFading] = useState(false);
  const router = useRouter();

  // 初回訪問かつlocalStorageに記録がない場合のみモーダルを表示
  useEffect(() => {
    if (!isFirstVisit) return;
    try {
      if (!localStorage.getItem("alter-log-welcomed")) {
        setShowModal(true);
      }
    } catch { /* localStorage unavailable */ }
  }, [isFirstVisit]);

  function handleModalClose() {
    setModalFading(true);
    try { localStorage.setItem("alter-log-welcomed", "1"); } catch { /* noop */ }
    setTimeout(() => {
      setShowModal(false);
      setModalFading(false);
      router.push("/chat?mode=journal");
    }, 420);
  }

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
    buttonState === "D" ? "新しいジャーナルを入力するか、セッションを3回以上重ねると解析をアップデートできます" :
    null;

  function handleGenerate() {
    if (!isButtonActive || isGenerating) return;
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

          {/* ── ナビゲーションボタン ─────────────────────────────────────────── */}
          <div className="hl-enter hl-d1 grid grid-cols-2 gap-3">
            <RippleLink href="/chat?mode=journal"
              className="rounded-xl p-4
                border border-t-[rgba(255,255,255,0.12)] border-x-[rgba(255,255,255,0.05)] border-b-transparent
                shadow-[0_8px_0_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:shadow-[0_10px_0_rgba(0,0,0,0.85),0_0_22px_rgba(196,163,90,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]
                hover:-translate-y-0.5 active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
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
                hover:-translate-y-0.5 active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                transition-all duration-100 ease-out"
              style={{ background: "linear-gradient(160deg, #1C3028 0%, #0D1A16 60%)" }}
            >
              <div className="mb-3" style={{ color: "#8BA89E" }}><IcCompass /></div>
              <p className="text-xl font-black tracking-tight leading-tight mb-1" style={{ color: "#D0D5D2" }}>セッション</p>
              <p className="text-xs font-medium mb-4" style={{ color: "#8BA89E" }}>思考を整理する</p>
              <div className="flex justify-end">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(139,168,158,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>
          </div>

          {/* ─── ① SNAPSHOT セクションヘッダー ─────────────────────────────── */}
          <div className="hl-enter hl-d2 flex items-center gap-3 pt-2">
            <span className="font-mono text-[9px] tracking-[0.25em] text-white/25 uppercase">① Snapshot</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
            {log && !isInsufficient && (
              <span className="font-mono text-[9px] text-white/15 tracking-widest">LAST SCAN</span>
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
            <HudCard
              label="認知バイアス検知"
              tag={log && !isInsufficient && biasName ? "DETECTED" : undefined}
            >
              {!log || isInsufficient ? (
                <p className="font-mono text-[11px] text-white/18">
                  {isInsufficient ? "— 情報量不足のため解析できません" : "データ収集中（解析にはジャーナル入力が必要です）"}
                </p>
              ) : (
                <>
                  {biasName && (
                    <p className="font-mono text-[13px] font-bold text-white/80 mb-2.5 tracking-wide">
                      「{biasName}」
                    </p>
                  )}
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

        </div>
      </div>

      {/* ── 初回ウェルカムモーダル ────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{
            background: "rgba(11,14,19,0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            opacity: modalFading ? 0 : 1,
            transition: "opacity 0.42s ease-out",
            pointerEvents: modalFading ? "none" : "auto",
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(160deg, rgba(26,33,42,0.98) 0%, rgba(16,21,28,0.98) 100%)",
              border: "1px solid rgba(196,163,90,0.22)",
              boxShadow: "0 0 80px rgba(196,163,90,0.10), 0 32px 64px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.05)",
              maxHeight: "90dvh",
            }}
          >
            {/* ヘッダー */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
              <AlterIcon size={26} />
              <div>
                <p className="text-xs font-bold tracking-[0.15em] text-[#C4A35A] uppercase">Alter Log</p>
                <p className="text-[10px] text-[#8A8276] mt-0.5">あなただけの思考の記録</p>
              </div>
            </div>

            {/* 本文 */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <p className="text-sm text-[#E8E3D8] leading-relaxed mb-5">
                Alterは、あなたの言葉を蓄積しながら成長する<span className="text-[#C4A35A]">「もう一人の自分」</span>です。<br />
                3つのコア機能で、思考を深めましょう。
              </p>

              <div className="space-y-2.5">
                {/* Journal */}
                <div className="flex items-start gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(196,163,90,0.06)", border: "1px solid rgba(196,163,90,0.14)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(196,163,90,0.12)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#C4A35A] tracking-wide mb-0.5">Journal</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">日々の直感や思考を、音声やテキストで吐き出す。</p>
                  </div>
                </div>

                {/* Chat */}
                <div className="flex items-start gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(139,168,158,0.06)", border: "1px solid rgba(139,168,158,0.14)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(139,168,158,0.10)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8BA89E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#8BA89E] tracking-wide mb-0.5">Chat（セッション）</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">Alterに疑問や課題をぶつけ、思考を深掘りする。</p>
                  </div>
                </div>

                {/* Report */}
                <div className="flex items-start gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#9A9488] tracking-wide mb-0.5">Report</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">蓄積されたデータから、週末にあなただけの分析レポートを受け取る。</p>
                  </div>
                </div>
              </div>
              <div className="h-5" />
            </div>

            {/* フッター：CTA */}
            <div className="flex-shrink-0 px-5 pb-5 pt-4" style={{ borderTop: "1px solid rgba(196,163,90,0.10)" }}>
              <button
                type="button"
                onClick={handleModalClose}
                className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide text-[#0B0E13] bg-[#C4A35A] hover:bg-[#D4B36A] hover:shadow-[0_0_24px_rgba(196,163,90,0.40)] active:scale-[0.98] transition-all duration-150"
              >
                ジャーナルから始める
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
