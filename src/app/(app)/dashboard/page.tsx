import Link from "next/link";

// ── helpers ────────────────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-[#E8E8E8] rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-[#183D46]/45 uppercase mb-3">
      {children}
    </p>
  );
}

// ── mock data ──────────────────────────────────────────────────────────────

const constellationNodes = [
  { id: "a", label: "完璧への渇望", x: 135, y: 28, r: 5, primary: true },
  { id: "b", label: "他者からの評価", x: 230, y: 55, r: 4, primary: true },
  { id: "c", label: "自己批判",       x: 55,  y: 55, r: 3, primary: false },
  { id: "d", label: "承認欲求",       x: 185, y: 100, r: 3.5, primary: false },
  { id: "e", label: "内なる比較",     x: 90,  y: 100, r: 2.5, primary: false },
];

const constellationEdges: [string, string][] = [
  ["a", "b"], ["a", "c"], ["a", "d"], ["b", "d"], ["c", "e"], ["d", "e"],
];

function getNode(id: string) {
  return constellationNodes.find((n) => n.id === id)!;
}

// ── page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 pb-8 min-h-full">
      <div className="max-w-xl mx-auto space-y-4">

        {/* ★ マインド・コンステレーション ────────────────────── */}
        <div className="bg-[#183D46] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
              ✦ マインド・コンステレーション
            </span>
            <span className="text-[10px] bg-white/10 text-white/60 rounded-full px-2 py-0.5">
              学習中
            </span>
          </div>
          <p className="text-xs text-white/55 mb-5 leading-relaxed">
            現在の焦点：
            <span className="text-white/90 font-semibold">『完璧への渇望』</span>
            と
            <span className="text-white/90 font-semibold">『他者からの評価』</span>
            について学習中...
          </p>

          {/* Constellation SVG */}
          <div className="relative mb-2">
            <svg
              viewBox="0 0 280 130"
              className="w-full"
              style={{ height: "110px" }}
              aria-hidden="true"
            >
              {/* Edges */}
              {constellationEdges.map(([fromId, toId]) => {
                const from = getNode(fromId);
                const to   = getNode(toId);
                return (
                  <line
                    key={`${fromId}-${toId}`}
                    x1={from.x} y1={from.y}
                    x2={to.x}   y2={to.y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Nodes */}
              {constellationNodes.map((n) => (
                <circle
                  key={n.id}
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={n.primary ? "white" : "rgba(255,255,255,0.55)"}
                />
              ))}

              {/* Node labels */}
              <text x="120" y="18" fontSize="9" fill="rgba(255,255,255,0.85)" fontWeight="600" textAnchor="middle">完璧への渇望</text>
              <text x="230" y="44" fontSize="8.5" fill="rgba(255,255,255,0.70)" textAnchor="middle">他者からの評価</text>
              <text x="50"  y="44" fontSize="8"   fill="rgba(255,255,255,0.50)" textAnchor="middle">自己批判</text>
              <text x="190" y="118" fontSize="8"  fill="rgba(255,255,255,0.50)" textAnchor="middle">承認欲求</text>
              <text x="82"  y="118" fontSize="7.5" fill="rgba(255,255,255,0.40)" textAnchor="middle">内なる比較</text>
            </svg>
          </div>

          <p className="text-[10px] text-white/25">
            最終更新: 3時間前 · 次の更新まで 21時間
          </p>
        </div>

        {/* ★ 今日のアクション ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* ジャーナル */}
          <Link
            href="/chat?mode=journal"
            className="bg-[#F7F5F2] border border-[#E0DDD9] rounded-2xl p-5 flex flex-col hover:border-[#C8C4BE] transition-colors group"
          >
            <div className="text-2xl mb-3">☕️</div>
            <p className="text-sm font-bold text-[#171717]">ジャーナル</p>
            <p className="text-xs text-[#9A9A9A] mt-1.5 leading-snug">
              ただ吐き出す
              <br />
              <span className="text-[#BCBCBC]">聴くモード</span>
            </p>
          </Link>

          {/* 壁打ち */}
          <Link
            href="/chat?mode=coach"
            className="bg-[#EBF4F6] border border-[#C8DDE2] rounded-2xl p-5 flex flex-col hover:border-[#183D46]/40 transition-colors group"
          >
            <div className="text-2xl mb-3">🔥</div>
            <p className="text-sm font-bold text-[#171717]">壁打ち</p>
            <p className="text-xs text-[#9A9A9A] mt-1.5 leading-snug">
              思考を整理する
              <br />
              <span className="text-[#BCBCBC]">対話モード</span>
            </p>
          </Link>
        </div>

        {/* ① 今日の問い ─────────────────────────────────────── */}
        <div className="bg-[#183D46] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
              🧭 今日の問い
            </span>
            <span className="text-[10px] font-bold bg-orange-400 text-white rounded-full px-2.5 py-1 uppercase tracking-wide">
              未回答
            </span>
          </div>
          <p className="text-lg font-bold text-white leading-snug mb-6">
            その意思決定を先送りにしているのは、何への恐れですか？
          </p>
          <Link
            href="/chat?mode=coach"
            className="inline-flex items-center gap-2 bg-white text-[#183D46] font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#F2F2F2] transition-colors"
          >
            この問いに答える
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5h9M7 2l4.5 4.5L7 11" />
            </svg>
          </Link>
        </div>

        {/* ② コーチからの所見 ────────────────────────────────── */}
        <Card className="px-5 py-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#183D46] flex items-center justify-center text-lg flex-shrink-0">
            💡
          </div>
          <div className="pt-0.5">
            <CardLabel>コーチからの所見</CardLabel>
            <p className="text-sm text-[#5C5C5C] leading-relaxed">
              最近、無意識に一人で抱え込もうとする傾向があります。
              少し肩の力を抜いてみませんか？
            </p>
          </div>
        </Card>

        {/* ③④ バッテリー + 脳内シェア ─────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* 心のバッテリー */}
          <Card className="p-5">
            <CardLabel>🔋 心のバッテリー</CardLabel>
            <div className="flex items-center gap-1 mb-3">
              <div className="flex-1 h-7 border-2 border-[#D8D8D8] rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 w-[30%] bg-amber-400 rounded-md" />
                {[25, 50, 75].map((p) => (
                  <div
                    key={p}
                    className="absolute top-0 bottom-0 w-px bg-[#D8D8D8]"
                    style={{ left: `${p}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#171717] z-10">30%</span>
                </div>
              </div>
              <div className="w-1.5 h-4 bg-[#D8D8D8] rounded-r-sm flex-shrink-0" />
            </div>
            <p className="text-xs text-amber-600 font-semibold">要休息</p>
            <p className="text-xs text-[#9A9A9A] mt-0.5 leading-snug">
              対話後は回復傾向にあります
            </p>
          </Card>

          {/* 脳内シェア */}
          <Card className="p-5">
            <CardLabel>🧠 脳内シェア</CardLabel>
            <div className="flex justify-center mb-3">
              <div
                className="w-16 h-16 rounded-full relative"
                style={{
                  background:
                    "conic-gradient(#183D46 0deg 144deg, #4D9AA8 144deg 252deg, #8BBFC9 252deg 324deg, #E0DDD9 324deg 360deg)",
                }}
              >
                <div className="absolute inset-2.5 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-[#5C5C5C]">今週</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { color: "#183D46", label: "業務不安", pct: "40%" },
                { color: "#4D9AA8", label: "人間関係", pct: "30%" },
                { color: "#8BBFC9", label: "キャリア",  pct: "20%" },
              ].map(({ color, label, pct }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[10px] text-[#5C5C5C] truncate">{label}</span>
                  <span className="text-[10px] text-[#9A9A9A] ml-auto">{pct}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ⑤⑥ ブロック + 勝ち筋 ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* 無意識のブロック */}
          <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-5">
            <CardLabel>🚧 無意識のブロック</CardLabel>
            <p className="text-sm text-[#5C5C5C] leading-relaxed">
              今週、
              <span className="font-bold text-amber-700">「〜すべき」</span>
              が{" "}
              <span className="text-lg font-black text-amber-600">15</span>
              {" "}回。
            </p>
            <p className="text-xs text-[#9A9A9A] mt-2 leading-snug">
              義務感に縛られていませんか？
            </p>
          </div>

          {/* 勝ち筋の発見 */}
          <div className="bg-[rgba(24,61,70,0.04)] border border-[#183D46]/15 rounded-2xl p-5">
            <CardLabel>🎯 勝ち筋の発見</CardLabel>
            <p className="text-xs text-[#5C5C5C] leading-relaxed">
              午前中にタスクを3つに絞った日は、夜の達成感が
              <span className="font-bold text-[#183D46]"> 80%高い</span>
              傾向。
            </p>
          </div>
        </div>

        {/* ⑦⑧ モヤモヤ + パワーワード ─────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* 未消化のモヤモヤ */}
          <Card className="p-5">
            <CardLabel>📝 モヤモヤ</CardLabel>
            <p className="text-sm text-[#5C5C5C] leading-relaxed">
              3日前の
              <span className="font-semibold text-[#171717]">「あの件の断り方」</span>
              、まだ脳の片隅に残っていませんか？
            </p>
          </Card>

          {/* パワーワード */}
          <Card className="p-5">
            <CardLabel>🌟 パワーワード</CardLabel>
            <div className="relative">
              <span className="text-4xl text-[#183D46]/10 font-serif absolute -top-1 -left-1 leading-none select-none">
                "
              </span>
              <p className="text-xs text-[#5C5C5C] leading-relaxed pt-2 pl-1 italic">
                結局、やるしかないなら早くやった方がマシ
              </p>
            </div>
          </Card>
        </div>

        {/* ⑨ タイムトラベル ──────────────────────────────── */}
        <div className="bg-[#F7F5F2] border border-[#E0DDD9] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⏳</span>
            <span className="text-[10px] font-bold tracking-widest text-[#9A9A9A] uppercase">
              タイムトラベル・1ヶ月前
            </span>
          </div>
          <p className="text-sm text-[#5C5C5C] leading-relaxed mb-4">
            1ヶ月前、あなたは
            <span className="font-semibold text-[#171717]">「〇〇のプロジェクト」</span>
            で深く悩んでいました。
          </p>
          <p className="text-sm font-semibold text-[#171717] leading-relaxed mb-5">
            今のあなたから、当時の自分に何と声をかけますか？
          </p>
          <Link
            href="/chat?mode=coach"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#183D46] bg-white border border-[#E8E8E8] px-4 py-2.5 rounded-xl hover:border-[#183D46]/30 transition-colors shadow-sm"
          >
            セッションで答える
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6h8M6 2l4 4-4 4" />
            </svg>
          </Link>
        </div>

      </div>
    </div>
  );
}
