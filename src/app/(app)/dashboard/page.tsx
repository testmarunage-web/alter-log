"use client";

import Link from "next/link";
import { useRef, useCallback, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SVG アイコン（絵文字ゼロ）
// ─────────────────────────────────────────────────────────────────────────────
const IcZap = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
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
const IcClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IcArrow = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const IcExternalLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// コーチ光の玉（ダッシュボード用・小）
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
// レーダーチャート（思考の俯瞰型分析）
// ─────────────────────────────────────────────────────────────────────────────
const RADAR_AXES  = ["自己効力感", "客観視", "行動の具体性", "感情の整理度", "思考の深さ"];
const RADAR_VALS  = [0.68, 0.75, 0.52, 0.65, 0.80];
const N = RADAR_AXES.length;
const CX = 50, CY = 50, RR = 32;

function rp(i: number, ratio: number) {
  const a = (i * 2 * Math.PI / N) - Math.PI / 2;
  return { x: CX + RR * ratio * Math.cos(a), y: CY + RR * ratio * Math.sin(a) };
}
function rpStr(i: number, ratio: number) { const p = rp(i, ratio); return `${p.x},${p.y}`; }

function RadarChart() {
  const grids  = [0.33, 0.66, 1.0];
  const data   = RADAR_VALS.map((v, i) => rpStr(i, v)).join(" ");
  const outer  = RADAR_VALS.map((_, i) => rpStr(i, 1.0)).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height: 90 }}>
      {grids.map((g) => (
        <polygon key={g}
          points={RADAR_AXES.map((_, i) => rpStr(i, g)).join(" ")}
          fill="none" stroke="rgba(196,163,90,0.13)" strokeWidth="0.6" />
      ))}
      {RADAR_AXES.map((_, i) => {
        const e = rp(i, 1.0);
        return <line key={i} x1={CX} y1={CY} x2={e.x} y2={e.y} stroke="rgba(196,163,90,0.10)" strokeWidth="0.5" />;
      })}
      <polygon points={outer} fill="none" stroke="rgba(196,163,90,0.08)" strokeWidth="0.5" />
      <polygon points={data} fill="rgba(58,175,202,0.18)" stroke="#3AAFCA" strokeWidth="1.1" />
      {RADAR_VALS.map((v, i) => {
        const p = rp(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="#3AAFCA" />;
      })}
      {RADAR_AXES.map((label, i) => {
        const p = rp(i, 1.42);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="6.2" fill="rgba(196,163,90,0.82)" fontFamily="sans-serif">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 脳内シェア（ドーナツ）
// ─────────────────────────────────────────────────────────────────────────────
const DONUT_SEGS = [
  { label: "A社商談への不安",   pct: 40, color: "#3AAFCA" },
  { label: "○○の採用について", pct: 30, color: "#C4A35A" },
  { label: "新規事業のアイデア", pct: 20, color: "#5A8A96" },
  { label: "その他",            pct: 10, color: "#2A3A44" },
];

function DonutChart() {
  const stops = DONUT_SEGS.reduce<{ color: string; start: number; end: number }[]>((acc, s) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    return [...acc, { color: s.color, start, end: start + s.pct * 3.6 }];
  }, []);
  const gradient = stops.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(", ");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-14 h-14">
        <div className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(from -90deg, ${gradient})` }} />
        <div className="absolute inset-[22%] rounded-full bg-[#0B0E13] flex items-center justify-center">
          <span className="text-[7px] font-bold text-[#8A8276]">今週</span>
        </div>
      </div>
      <div className="space-y-0.5 w-full">
        {DONUT_SEGS.slice(0, 3).map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[9px] text-[#9A9488] truncate flex-1">{s.label}</span>
            <span className="text-[9px] text-[#8A8276] tabular-nums">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 心のバッテリー（縦ゲージ）
// ─────────────────────────────────────────────────────────────────────────────
function BatteryGauge() {
  const pct = 65;
  const color = pct > 60 ? "#3AAFCA" : pct > 30 ? "#C4A35A" : "#EF4444";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 26, height: 54 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-1 bg-[#2A3640] rounded-sm" />
        <div className="absolute top-1.5 left-0 right-0 bottom-0 border border-[rgba(196,163,90,0.28)] rounded overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 rounded-sm transition-all"
            style={{ height: `${pct}%`, background: color, opacity: 0.75 }} />
          {[33, 66].map((p) => (
            <div key={p} className="absolute left-0 right-0 h-px bg-[rgba(196,163,90,0.08)]"
              style={{ bottom: `${p}%` }} />
          ))}
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-black tabular-nums leading-none" style={{ color }}>{pct}%</p>
        <p className="text-[9px] text-[#8A8276] mt-0.5">回復傾向</p>
      </div>
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

function RippleLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const { ripples, fire } = useRipple();
  return (
    <Link href={href} onClick={fire} className={`relative overflow-hidden block ${className}`}>
      {children}
      {ripples.map(({ id, x, y }) => (
        <span key={id} className="absolute rounded-full pointer-events-none"
          style={{
            left: x, top: y, width: 6, height: 6,
            marginLeft: -3, marginTop: -3,
            background: "rgba(196,163,90,0.4)",
            animation: "hl-ripple 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
          }} />
      ))}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// グラスカード共通スタイル
// ─────────────────────────────────────────────────────────────────────────────
const GLASS = "bg-white/[0.04] backdrop-blur-sm border border-[#C4A35A]/20 rounded-xl";
const GLASS_HOVER = "hover:-translate-y-px hover:border-[#C4A35A]/45 hover:shadow-[0_0_22px_rgba(196,163,90,0.10)] transition-all duration-400 ease-out";
const SECTION_LABEL = "text-[9px] tracking-[0.26em] text-[#C4A35A]/75 uppercase font-sans flex items-center gap-1.5";

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
const RX_TABS = ["本日の処方箋", "やらないこと", "思考のフレームワーク", "過去の成功パターン"] as const;

export default function DashboardPage() {
  const [rxTab, setRxTab] = useState(0);
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
      `}</style>

      <div className="min-h-full bg-[#0B0E13] px-4 py-6 md:px-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ① データグリッド（レーダー・ドーナツ・バッテリー）─────────── */}
          <div className="hl-enter grid grid-cols-3 gap-3">

            {/* レーダー */}
            <div className={`${GLASS} p-3 col-span-1`}>
              <p className={SECTION_LABEL}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                思考の俯瞰
              </p>
              <RadarChart />
              <div className="mt-1.5 space-y-0.5">
                {[["思考の深さ", "80"], ["客観視", "75"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[9px] text-[#8A8276]">{k}</span>
                    <span className="text-[9px] font-bold text-[#3AAFCA] tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ドーナツ */}
            <div className={`${GLASS} p-3 col-span-1`}>
              <p className={SECTION_LABEL}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10" stroke="#3AAFCA" />
                </svg>
                脳内シェア
              </p>
              <div className="mt-2">
                <DonutChart />
              </div>
            </div>

            {/* バッテリー */}
            <div className={`${GLASS} p-3 col-span-1 flex flex-col items-center justify-between`}>
              <p className={`${SECTION_LABEL} self-start`}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="7" width="18" height="11" rx="2" /><path d="M22 11v3" />
                </svg>
                バッテリー
              </p>
              <BatteryGauge />
            </div>
          </div>

          {/* ② アクション（2カラム）────────────────────────────────────── */}
          <div className="hl-enter hl-d1 grid grid-cols-2 gap-3">

            <RippleLink href="/chat?mode=journal"
              className="relative overflow-hidden block rounded-xl p-5
                bg-white/[0.08] backdrop-blur-sm
                border border-[#C4A35A]/35
                shadow-[0_4px_24px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(196,163,90,0.10)]
                hover:-translate-y-px hover:border-[#C4A35A]/60
                hover:shadow-[0_6px_28px_rgba(0,0,0,0.45),0_0_20px_rgba(196,163,90,0.12)]
                active:scale-[0.98] transition-all duration-300 ease-out"
            >
              <div className="flex items-center gap-2 mb-3 text-[#C4A35A]/70">
                <IcPen />
              </div>
              <p className="text-base font-black text-[#E8E3D8] tracking-tight leading-tight mb-1.5">
                吐き出す
              </p>
              <p className="text-[11px] text-[#8A8276] leading-snug">
                まとまっていなくて構いません。心のノイズをただ置いていってください。
              </p>
            </RippleLink>

            <RippleLink href="/chat?mode=coach"
              className="relative overflow-hidden block rounded-xl p-5
                bg-[#1C3642]/70 backdrop-blur-sm
                border border-[#3AAFCA]/35
                shadow-[0_4px_24px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(58,175,202,0.08)]
                hover:-translate-y-px hover:border-[#3AAFCA]/60
                hover:shadow-[0_6px_28px_rgba(0,0,0,0.45),0_0_20px_rgba(58,175,202,0.14)]
                active:scale-[0.98] transition-all duration-300 ease-out"
            >
              <div className="flex items-center gap-2 mb-3 text-[#3AAFCA]/70">
                <IcCompass />
              </div>
              <p className="text-base font-black text-[#C8E8EE] tracking-tight leading-tight mb-1.5">
                思考を整理する
              </p>
              <p className="text-[11px] text-[#6A9AA8] leading-snug">
                コーチと一緒に、モヤモヤの正体を見つけていきましょう。
              </p>
            </RippleLink>
          </div>

          {/* ③ コーチからの所見 ──────────────────────────────────────── */}
          <div className={`hl-enter hl-d2 ${GLASS} ${GLASS_HOVER} p-4`}>
            <p className={`${SECTION_LABEL} mb-3`}>
              <IcZap />
              コーチからの所見
            </p>
            <div className="flex gap-3 items-start">
              <CoachOrb />
              {/* 吹き出し */}
              <div className="flex-1 relative bg-white/[0.05] border border-[#3AAFCA]/20 rounded-xl rounded-tl-sm px-3.5 py-3">
                <p className="text-sm font-bold text-[#E8E3D8] leading-snug mb-1.5">
                  強い義務感に縛られ、少し無理をしているかもしれません
                </p>
                <p className="text-xs text-[#9A9488] leading-relaxed">
                  ここ数日の対話で「〜すべき」という言葉が
                  <span className="text-[#C4A35A] font-semibold"> 15回 </span>
                  登場しています。義務感がパフォーマンスの天井になっていないか、一度話してみませんか。
                </p>
              </div>
            </div>
          </div>

          {/* ④ 今のあなたへ（処方箋）──────────────────────────────────── */}
          <div className={`hl-enter hl-d3 ${GLASS} overflow-hidden`}>
            {/* ヘッダー帯 */}
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#C4A35A]/12"
              style={{ background: "linear-gradient(90deg,rgba(196,163,90,0.10) 0%,transparent 100%)" }}>
              <span className="text-[#C4A35A]/75"><IcBook /></span>
              <p className={SECTION_LABEL}>今のあなたへ</p>
            </div>

            {/* タブ */}
            <div className="flex border-b border-[#C4A35A]/10 px-1 pt-1">
              {RX_TABS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRxTab(i)}
                  className={`px-3 py-1.5 text-[10px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-200
                    ${rxTab === i
                      ? "text-[#C4A35A] border-b-2 border-[#C4A35A] -mb-px"
                      : "text-[#4A4438] hover:text-[#8A8276]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* タブ コンテンツ */}
            <div className="p-4">
              {rxTab === 0 && (
                <>
                  <p className="text-xs text-[#9A9488] leading-relaxed mb-3">
                    ここ数ヶ月の葛藤を分析した結果、今の壁を越えるためには小手先のテクニックではなく、
                    <span className="text-[#C4A35A]/80 font-medium">この一冊が決定的なブレイクスルーになるはず</span>
                    です。
                  </p>
                  <div className="flex gap-3 items-start bg-white/[0.03] border border-[#C4A35A]/10 rounded-lg p-3">
                    <div className="w-10 h-14 rounded flex-shrink-0 flex flex-col justify-end pb-1 px-0.5"
                      style={{ background: "linear-gradient(160deg,#1A3A4A,#0D1E28)" }}>
                      <span className="text-[6px] text-white/35 font-bold leading-tight text-center">HIGH<br/>OUTPUT</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#E8E3D8] leading-snug">HIGH OUTPUT MANAGEMENT</p>
                      <p className="text-[10px] text-[#8A8276] mt-0.5 mb-1.5">アンドリュー・S・グローブ</p>
                      <p className="text-[11px] text-[#9A9488] leading-snug">
                        「成果を出す」本質をマネジメントの視点で再定義。頑張っても前に進まない感覚の正体がここにある。
                      </p>
                    </div>
                  </div>
                </>
              )}
              {rxTab !== 0 && (
                <p className="text-xs text-[#4A4438] text-center py-4">
                  準備中です
                </p>
              )}
            </div>
          </div>

          {/* ⑤ タイムトラベル ──────────────────────────────────────────── */}
          <div className={`hl-enter hl-d4 ${GLASS} p-4`}
            style={{ borderColor: "rgba(196,163,90,0.16)" }}>
            <p className={`${SECTION_LABEL} mb-3`}>
              <IcClock />
              1ヶ月前のあなたからの手紙
            </p>
            <p className="text-xs text-[#9A9488] leading-relaxed mb-3">
              1ヶ月前の今日、あなたは
              <span className="text-[#B0A898] font-medium">「プロジェクトの進行」</span>
              について悩み、吐き出していました。今のあなたなら、当時の自分にどんな声をかけてあげますか？
            </p>
            <Link href="/history"
              className="inline-flex items-center gap-2 text-xs font-semibold
                text-[#C4A35A]/70 hover:text-[#C4A35A]
                border border-[#C4A35A]/25 hover:border-[#C4A35A]/55
                px-4 py-2 rounded-lg
                hover:shadow-[0_0_14px_rgba(196,163,90,0.12)]
                transition-all duration-300">
              過去のジャーナルを振り返る
              <IcArrow />
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
