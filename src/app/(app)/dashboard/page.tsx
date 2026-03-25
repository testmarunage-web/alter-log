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
const BALANCE_ITEMS = [
  { left: "自分軸", right: "他人軸", pct: 30 },
  { left: "直感",   right: "論理",   pct: 72 },
  { left: "楽観",   right: "慎重",   pct: 42 },
  { left: "現在",   right: "未来",   pct: 85 },
  { left: "自責",   right: "他責",   pct: 20 },
];

function BalanceSliders() {
  return (
    <div className="space-y-2.5 mt-2">
      {BALANCE_ITEMS.map(({ left, right, pct }) => (
        <div key={left}>
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-[#C4A35A]/80 font-semibold">{left}</span>
            <span className="text-[9px] text-[#8A8276]">{right}</span>
          </div>
          <div className="relative h-px rounded-full" style={{ background: "rgba(196,163,90,0.15)" }}>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{
                left: `calc(${pct}% - 5px)`,
                background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 55%)",
                boxShadow: "0 0 5px rgba(58,175,202,0.70)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
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
      <div className="relative w-16 h-16">
        <div className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(from -90deg, ${gradient})` }} />
        <div className="absolute inset-[22%] rounded-full bg-[#0B0E13]" />
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
// コンディション推移（Sparkline 折れ線グラフ・フルワイド）
// ─────────────────────────────────────────────────────────────────────────────
const SPARK_VALS = [42, 48, 45, 55, 60, 63, 65];

function SparklineChart() {
  const today = new Date();
  const SPARK_DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const W = 100, H = 44;
  const pad = { t: 6, b: 14, l: 2, r: 2 };
  const min = Math.min(...SPARK_VALS) - 8;
  const max = Math.max(...SPARK_VALS) + 4;
  const xs = SPARK_VALS.map((_, i) => pad.l + (i / (SPARK_VALS.length - 1)) * (W - pad.l - pad.r));
  const ys = SPARK_VALS.map((v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b));
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const area = `${xs[0]},${H - pad.b} ` + xs.map((x, i) => `${x},${ys[i]}`).join(" ") + ` ${xs[xs.length - 1]},${H - pad.b}`;
  const last = SPARK_VALS[SPARK_VALS.length - 1];

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black tabular-nums leading-none text-[#3AAFCA]">{last}</span>
        <span className="text-[10px] text-[#8A8276]">/ 100</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="flex-1" style={{ height: 44 }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3AAFCA" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3AAFCA" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#spark-fill)" />
        <polyline points={polyline} fill="none" stroke="#3AAFCA" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 2.2 : 1.1}
            fill={i === xs.length - 1 ? "#3AAFCA" : "rgba(58,175,202,0.40)"} />
        ))}
        {xs.map((x, i) => (
          <text key={i} x={x} y={H - 1} textAnchor="middle" fontSize="5.5"
            fill="rgba(138,130,118,0.7)" fontFamily="sans-serif">
            {SPARK_DAYS[i]}
          </text>
        ))}
      </svg>
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
const SECTION_LABEL = "text-[9px] tracking-[0.26em] text-[#C4A35A]/75 uppercase font-sans flex items-center gap-1.5";

function AccordionCard({
  icon,
  label,
  summary,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  summary: React.ReactNode;
  detail: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`${GLASS} overflow-hidden hover:border-[#C4A35A]/40 transition-all duration-300 cursor-pointer`}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="p-4">
        {/* ヘッダー行 */}
        <p className={`${SECTION_LABEL} mb-3`}>
          {icon}
          {label}
        </p>
        {/* サマリー（常時表示） */}
        {summary}
      </div>
      {/* 開閉シェブロン（中央・テキストなし） */}
      <div className="flex justify-center pb-3 border-t border-[#C4A35A]/8 pt-2 -mt-1">
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="rgba(196,163,90,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {/* 展開エリア */}
      {open && (
        <div className="px-4 pb-4 border-t border-[#C4A35A]/10">
          <p className="text-[11px] text-[#9A9488]/80 leading-relaxed pt-3 italic">
            {detail}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
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

      <div className="min-h-full bg-[#0B0E13] px-4 py-6 md:px-6">
        <div className="max-w-2xl mx-auto space-y-3">

          {/* ① 上段：2カラム（バランス・ドーナツ）───────────────────── */}
          <div className="hl-enter grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`${GLASS} p-3`}>
              <p className={SECTION_LABEL}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                思考の俯瞰
              </p>
              <BalanceSliders />
            </div>

            <div className={`${GLASS} p-3`}>
              <p className={SECTION_LABEL}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10" stroke="#3AAFCA" />
                </svg>
                今の脳内シェア
              </p>
              <div className="mt-2">
                <DonutChart />
              </div>
            </div>
          </div>

          {/* ② 下段：フルワイド（Sparkline）─────────────────────────── */}
          <div className={`hl-enter hl-d1 ${GLASS} p-3`}>
            <p className={`${SECTION_LABEL} mb-2`}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              コンディション推移
            </p>
            <SparklineChart />
          </div>

          {/* ③ アクション（2カラム）────────────────────────────────────── */}
          <div className="hl-enter hl-d2 grid grid-cols-2 gap-3">

            <RippleLink href="/chat?mode=journal"
              className="rounded-xl p-5
                border border-t-[rgba(255,255,255,0.12)] border-x-[rgba(255,255,255,0.05)] border-b-transparent
                shadow-[0_8px_0_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:shadow-[0_10px_0_rgba(0,0,0,0.85),0_0_22px_rgba(196,163,90,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]
                hover:-translate-y-0.5
                active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                transition-all duration-100 ease-out"
              style={{ background: "linear-gradient(160deg, #3A2910 0%, #1A1408 60%)" }}
            >
              <div className="mb-3" style={{ color: "#C4A35A" }}>
                <IcPen />
              </div>
              <p className="text-base font-black tracking-tight leading-tight mb-1"
                style={{ color: "#E8D5A0" }}>
                吐き出す
              </p>
              <p className="text-[11px] leading-snug mb-4" style={{ color: "#8A7848" }}>
                今の気持ちを吐き出す
              </p>
              <div className="flex justify-end">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(196,163,90,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>

            <RippleLink href="/chat?mode=coach"
              className="rounded-xl p-5
                border border-t-[rgba(255,255,255,0.10)] border-x-[rgba(255,255,255,0.04)] border-b-transparent
                shadow-[0_8px_0_rgba(0,0,0,0.75),inset_0_1px_0_rgba(58,175,202,0.12)]
                hover:shadow-[0_10px_0_rgba(0,0,0,0.85),0_0_22px_rgba(58,175,202,0.18),inset_0_1px_0_rgba(58,175,202,0.18)]
                hover:-translate-y-0.5
                active:translate-y-2 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                transition-all duration-100 ease-out"
              style={{ background: "linear-gradient(160deg, #0F3545 0%, #071820 60%)" }}
            >
              <div className="mb-3" style={{ color: "#3AAFCA" }}>
                <IcCompass />
              </div>
              <p className="text-base font-black tracking-tight leading-tight mb-1"
                style={{ color: "#C8E8EE" }}>
                思考を整理する
              </p>
              <p className="text-[11px] leading-snug mb-4" style={{ color: "#4A8A9A" }}>
                Alterと共に、モヤモヤの正体を突き止める
              </p>
              <div className="flex justify-end">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(58,175,202,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>
          </div>

          {/* ④ Alterの気づき（アコーディオン）─────────────────────────── */}
          <div className="hl-enter hl-d3">
            <AccordionCard
              icon={<IcZap />}
              label="Alterの気づき"
              summary={
                <div className="flex gap-3 items-start">
                  <CoachOrb />
                  <div className="flex-1 bg-white/[0.05] border border-[#3AAFCA]/20 rounded-xl rounded-tl-sm px-3.5 py-3">
                    <p className="text-sm font-bold text-[#E8E3D8] leading-snug mb-1.5">
                      強い義務感に縛られ、少し無理をしているかもしれません
                    </p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">
                      ここ数日の対話で「〜すべき」という言葉が
                      <span className="text-[#C4A35A] font-semibold"> 15回 </span>
                      登場しています。
                    </p>
                  </div>
                </div>
              }
              detail="過去3日間のジャーナルで『やらなきゃ』という焦りの言葉が頻出しています。一方で『やりたい』という主語が欠落しているため、この指摘をしました。"
            />
          </div>

          {/* ⑤ Alterの処方箋（アコーディオン）─────────────────────────── */}
          <div className="hl-enter hl-d4">
            <AccordionCard
              icon={<IcBook />}
              label="Alterの処方箋"
              summary={
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
              }
              detail="あなたが今ぶつかっている『権限移譲』の壁は、過去の多くのマネージャーが経験したものです。この本はその構造的な解決策を提示しています。"
            />
          </div>

          {/* ⑥ Alterの引き算（アコーディオン）─────────────────────────── */}
          <div className="hl-enter hl-d5">
            <AccordionCard
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
              label="Alterの引き算"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed">
                  今週は新しいAIツールの検証を一旦ストップし、脳のメモリを解放しましょう。
                </p>
              }
              detail="あなたの『コンディション』グラフが下降傾向にあります。今はインプットを増やすよりも、脳のメモリを空けることが最優先だと判断しました。"
            />
          </div>

          {/* ⑦ Alterの補助線（アコーディオン）─────────────────────────── */}
          <div className="hl-enter hl-d6">
            <AccordionCard
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              }
              label="Alterの補助線"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed">
                  緊急度と重要度のマトリクスに当てはめると、今悩んでいることは
                  <span className="text-[#E8E3D8] font-semibold">「緊急だが重要ではない」</span>
                  領域にあります。
                </p>
              }
              detail="複数のプロジェクトが絡み合い、思考の整理が追いついていないようです。まずはこの枠組みでタスクを仕分けし、ノイズを減らしましょう。"
            />
          </div>

          {/* ⑧ Alterの道標（アコーディオン）───────────────────────────── */}
          <div className="hl-enter hl-d7">
            <AccordionCard
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              }
              label="Alterの道標"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed">
                  半年前、あなたは
                  <span className="text-[#C4A35A]/85 font-semibold">「小さくテストする」</span>
                  ことで停滞を突破しました。今回も同じパターンが適用できます。
                </p>
              }
              detail="あなたは以前も似たような『リソース不足』の壁に直面しましたが、その際は完璧主義を捨ててプロトタイプを出すことで突破しました。その成功体験を思い出してください。"
            />
          </div>

        </div>
      </div>
    </>
  );
}
