"use client";

import Link from "next/link";
import { useRef, useCallback, useState } from "react";

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
const BALANCE_ITEMS = [
  { left: "内省", right: "発信", pct: 30 },
  { left: "直感", right: "論理", pct: 72 },
  { left: "楽観", right: "慎重", pct: 42 },
  { left: "現在", right: "未来", pct: 85 },
  { left: "自責", right: "他責", pct: 20 },
];

function BalanceSliders() {
  return (
    <div className="space-y-2.5 mt-2">
      {BALANCE_ITEMS.map(({ left, right, pct }) => (
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
// 脳内シェア（ドーナツ）
// ─────────────────────────────────────────────────────────────────────────────
const DONUT_SEGS = [
  { label: "A社商談への不安",   pct: 34, color: "#7A9E8E" },
  { label: "新規事業のアイデア", pct: 27, color: "#C4A35A" },
  { label: "チームの採用課題",  pct: 18, color: "#8A7A5A" },
  { label: "体調・睡眠不足",    pct: 12, color: "#4A5A54" },
  { label: "その他",            pct: 9,  color: "#2A3A34" },
];

function DonutChart() {
  const stops = DONUT_SEGS.reduce<{ color: string; start: number; end: number }[]>((acc, s) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    return [...acc, { color: s.color, start, end: start + s.pct * 3.6 }];
  }, []);
  const gradient = stops.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(", ");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 mt-2">
        <div className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(from -90deg, ${gradient})` }} />
        <div className="absolute inset-[22%] rounded-full bg-[#0B0E13]" />
      </div>
      <div className="space-y-0.5 w-full mt-1">
        {DONUT_SEGS.slice(0, 3).map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-[#9A9488] truncate flex-1">{s.label}</span>
            <span className="text-[10px] text-[#8A8276] tabular-nums">{s.pct}%</span>
          </div>
        ))}
      </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  summary: React.ReactNode;
  detail: string;
  infoText: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`${GLASS} overflow-hidden hover:border-[#C4A35A]/40 transition-all duration-300 cursor-pointer`}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="p-4">
        {/* ヘッダー行 */}
        <div className="flex items-center mb-3">
          <p className={SECTION_LABEL}>
            {icon}
            {label}
          </p>
          <div className="ml-1.5">
            <InfoTooltip text={infoText} />
          </div>
        </div>
        {/* サマリー */}
        {summary}
      </div>
      {/* 閉じている時 */}
      {!open && (
        <>
          <div className="px-4 pb-2.5 flex justify-end">
            <span className="text-[10px] text-[#8A8276]/60 tracking-wide">タップして詳細を展開 ▾</span>
          </div>
          <div className="h-3 bg-gradient-to-t from-[#C4A35A]/[0.05] to-transparent" />
        </>
      )}
      {/* 展開エリア */}
      {open && (
        <div className="px-4 pb-4 border-t border-[#C4A35A]/10">
          <p className="text-xs text-[#9A9488]/80 leading-relaxed pt-3 italic">
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

      <div className="min-h-screen bg-[#0B0E13] px-4 py-6 pb-24 md:px-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* (1) アクションボタン ────────────────────────────────────────── */}
          <div className="hl-enter grid grid-cols-2 gap-3 mb-2">
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
              <div className="mb-3" style={{ color: "#C4A35A" }}>
                <IcPen />
              </div>
              <p className="text-base font-black tracking-tight leading-tight mb-4" style={{ color: "#E8D5A0" }}>
                気持ちを吐き出す
              </p>
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
              <div className="mb-3" style={{ color: "#8BA89E" }}>
                <IcCompass />
              </div>
              <p className="text-base font-black tracking-tight leading-tight mb-4" style={{ color: "#D0D5D2" }}>
                思考を整理する
              </p>
              <div className="flex justify-end">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(139,168,158,0.70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RippleLink>
          </div>

          {/* (3) Alterの気づき（チャットUI風） ────────────────────────────────────── */}
          <div className="hl-enter hl-d1 flex gap-3 items-center mb-2">
            <CoachOrb />
            <div className="relative flex-1 bg-white/[0.06] border border-[#C4A35A]/20 rounded-2xl px-4 py-3.5 shadow-sm">
              {/* しっぽ */}
              <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: "7px solid rgba(196,163,90,0.2)",
                }} />
              <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderRight: "6px solid rgba(255,255,255,0.06)",
                }} />
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs font-bold text-[#C4A35A] tracking-wider">Alterの気づき</span>
                <InfoTooltip text="直近の対話から、Alterがあなたの無意識のパターンに気づいた時に話しかけます。" />
              </div>
              <p className="text-sm text-[#E8E3D8] leading-relaxed">
                ここ数日の対話で「〜すべき」という言葉が15回登場しています。少し無理をしていませんか？
              </p>
            </div>
          </div>

          {/* (4) 現在の思考タイプ ＆ 今の脳内シェア ──────────────────────────── */}
          <div className="hl-enter hl-d2 grid grid-cols-2 gap-3">
            <div className={`${GLASS} p-3.5`}>
              <div className="flex items-center gap-1 mb-4">
                <p className={SECTION_LABEL}>
                  現在の思考タイプ
                </p>
                <InfoTooltip text="対話から推測される、あなたの現在の思考のバランスと傾向です。" />
              </div>
              <p className="text-[13px] font-black tracking-wide text-[#E8D5A0] text-center mb-4">
                完璧を求める開拓者
              </p>
              <BalanceSliders />
            </div>

            <div className={`${GLASS} p-3.5`}>
              <div className="flex items-center gap-1 mb-3">
                <p className={SECTION_LABEL}>
                  今の脳内シェア
                </p>
                <InfoTooltip text="あなたの頭の中の占有率が高いトピックを可視化しています。" />
              </div>
              <DonutChart />
            </div>
          </div>

          {/* (5) 今週の引き算 ─────────────────────────────────────────── */}
          <div className="hl-enter hl-d3">
            <AccordionCard
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
              label="今週の引き算"
              infoText="今週やめるべきことを提案します。引き算の行動がコンディション回復の最短ルートです。"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed mt-1">
                  今週は<span className="text-[#E8E3D8] font-bold">新しいAIツールの検証</span>を一旦ストップし、脳のメモリを解放しましょう。
                </p>
              }
              detail="あなたの直近の対話を分析すると、コンディションが下降傾向にあります。今はインプットを増やすよりも、脳のメモリを空けることが最優先だと判断しました。直近72時間で新規にブックマークしたツールは推定7件。この習慣自体が「行動の代替」になっているサインです。今週は新規インプットをゼロにする実験を試してください。"
            />
          </div>

          {/* (6) 頭のモヤモヤ整理 ───────────────────────────────────────────── */}
          <div className="hl-enter hl-d4">
            <AccordionCard
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              }
              label="頭のモヤモヤ整理"
              infoText="複雑に絡み合っているタスクを、既知のフレームワークで整理します。"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed mt-1">
                  緊急度と重要度のマトリクスに当てはめると、今悩んでいることは
                  <span className="text-[#E8E3D8] font-semibold">「緊急だが重要ではない」</span>
                  領域にあります。
                </p>
              }
              detail="複数のプロジェクトが絡み合い、思考の整理が追いついていないようです。まずはこの枠組みでタスクを仕分けし、ノイズを減らしましょう。あなたが悩んでいる「A社対応」は、締切は今週だが戦略的重要性は低い案件です。これを後回しにする決断をするだけで、頭の中の占有率が推定30%解放されます。"
            />
          </div>

          {/* (7) 今のあなたに響く一冊 ─────────────────────────────────────────── */}
          <div className="hl-enter hl-d5">
            <AccordionCard
              icon={<IcBook />}
              label="今のあなたに響く一冊"
              infoText="あなたの現在地に最も共鳴する書籍・知見を、対話の文脈から選定しています。"
              summary={
                <div className="mt-2">
                  <p className="text-sm font-black text-[#E8E3D8] leading-snug mb-0.5">『HIGH OUTPUT MANAGEMENT』</p>
                  <p className="text-xs text-[#8A8276] mb-2">アンドリュー・S・グローブ 著</p>
                  <p className="text-sm text-[#9A9488] leading-relaxed">
                    「成果を出す」本質をマネジメントの視点で再定義。頑張っても前に進まない感覚の正体がここにある。
                  </p>
                </div>
              }
              detail="あなたが今ぶつかっている『権限移譲』の壁は、過去の多くのマネージャーが経験したものです。この本はその構造的な解決策を提示しています。グローブはこう言っています：「マネージャーのアウトプットは、自分の組織と影響を及ぼした隣接組織のアウトプットの合計である」。あなたが一人でやりきろうとするほど、このアウトプットは縮小します。"
            />
          </div>

          {/* (8) あなたの勝ちパターン ───────────────────────────────────────────── */}
          <div className="hl-enter hl-d6">
            <AccordionCard
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              }
              label="あなたの勝ちパターン"
              infoText="過去の対話から、あなたが停滞を打破した成功パターンを抽出しています。"
              summary={
                <p className="text-sm text-[#9A9488] leading-relaxed mt-1">
                  半年前、あなたは
                  <span className="text-[#E8E3D8] font-bold">「小さくテストする」</span>
                  ことで停滞を突破しました。今回も同じパターンが適用できます。
                </p>
              }
              detail="あなたは以前も似たような『リソース不足』の壁に直面しましたが、その際は完璧主義を捨ててプロトタイプを出すことで突破しました。その成功体験を思い出してください。具体的には、昨年11月に「完成度60%でいいから出す」と決めた瞬間、あなたのコンディションスコアは3日間で+22ポイント上昇しています。その判断軸をもう一度。"
            />
          </div>

        </div>{/* /max-w-2xl */}
      </div>{/* /min-h-screen */}
    </>
  );
}
