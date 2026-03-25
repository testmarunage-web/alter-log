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

// ── page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 pb-8 min-h-full">
      <div className="max-w-xl mx-auto space-y-4">

        {/* ① コーチからの所見 ────────────────────────────────── */}
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

        {/* ② 今日の問い ─────────────────────────────────────── */}
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
            href="/chat"
            className="inline-flex items-center gap-2 bg-white text-[#183D46] font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#F2F2F2] transition-colors"
          >
            この問いに答える
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5h9M7 2l4.5 4.5L7 11" />
            </svg>
          </Link>
        </div>

        {/* ③④ バッテリー + 脳内シェア ─────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* ③ 心のバッテリー残量 */}
          <Card className="p-5">
            <CardLabel>🔋 心のバッテリー</CardLabel>
            {/* Battery body */}
            <div className="flex items-center gap-1 mb-3">
              <div className="flex-1 h-7 border-2 border-[#D8D8D8] rounded-lg relative overflow-hidden">
                {/* Fill */}
                <div className="absolute inset-0 w-[30%] bg-amber-400 rounded-md" />
                {/* Segment separators */}
                {[25, 50, 75].map((p) => (
                  <div
                    key={p}
                    className="absolute top-0 bottom-0 w-px bg-[#D8D8D8]"
                    style={{ left: `${p}%` }}
                  />
                ))}
                {/* % label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#171717] z-10">30%</span>
                </div>
              </div>
              {/* Terminal nub */}
              <div className="w-1.5 h-4 bg-[#D8D8D8] rounded-r-sm flex-shrink-0" />
            </div>
            <p className="text-xs text-amber-600 font-semibold">要休息</p>
            <p className="text-xs text-[#9A9A9A] mt-0.5 leading-snug">
              対話後は回復傾向にあります
            </p>
          </Card>

          {/* ④ 今週の脳内シェア */}
          <Card className="p-5">
            <CardLabel>🧠 脳内シェア</CardLabel>
            {/* Donut chart */}
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
            {/* Legend */}
            <div className="space-y-1">
              {[
                { color: "#183D46", label: "業務不安", pct: "40%" },
                { color: "#4D9AA8", label: "人間関係", pct: "30%" },
                { color: "#8BBFC9", label: "キャリア", pct: "20%" },
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

        {/* ⑤ 感情とエネルギーの波 ────────────────────────────── */}
        <Card className="p-5">
          <CardLabel>🌊 感情とエネルギーの波</CardLabel>
          <div className="relative">
            <svg
              viewBox="0 0 280 70"
              className="w-full h-14"
              preserveAspectRatio="none"
            >
              {/* Area fill */}
              <path
                d="M0,28 C18,24 30,30 46,30 C62,30 72,58 92,60 C112,62 122,40 138,38 C154,36 165,22 184,20 C203,18 215,32 230,34 C245,36 258,30 280,28 L280,70 L0,70 Z"
                fill="rgba(24,61,70,0.07)"
              />
              {/* Line */}
              <path
                d="M0,28 C18,24 30,30 46,30 C62,30 72,58 92,60 C112,62 122,40 138,38 C154,36 165,22 184,20 C203,18 215,32 230,34 C245,36 258,30 280,28"
                fill="none"
                stroke="#183D46"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.65"
              />
              {/* Wednesday dip dot */}
              <circle cx="92" cy="60" r="3" fill="#183D46" opacity="0.8" />
              {/* Wed callout */}
              <text x="84" y="55" fontSize="7" fill="#183D46" opacity="0.7" fontWeight="bold">水</text>
            </svg>
            {/* Day labels */}
            <div className="flex justify-between mt-1 px-0.5">
              {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
                <span
                  key={d}
                  className={`text-[10px] ${d === "水" ? "text-[#183D46] font-bold" : "text-[#BCBCBC]"}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* ⑥⑦ ブロック + 勝ち筋 ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* ⑥ 無意識のブロック */}
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

          {/* ⑦ 勝ち筋の発見 */}
          <div className="bg-[rgba(24,61,70,0.04)] border border-[#183D46]/15 rounded-2xl p-5">
            <CardLabel>🎯 勝ち筋の発見</CardLabel>
            <p className="text-xs text-[#5C5C5C] leading-relaxed">
              午前中にタスクを3つに絞った日は、夜の達成感が
              <span className="font-bold text-[#183D46]"> 80%高い</span>
              傾向。
            </p>
          </div>
        </div>

        {/* ⑧ 脳内の登場人物マップ ─────────────────────────── */}
        <Card className="p-5">
          <CardLabel>🤝 脳内の登場人物マップ</CardLabel>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {/* A部長 */}
            <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3.5 text-center">
              <div className="text-2xl mb-1.5">😮‍💨</div>
              <p className="text-sm font-bold text-[#171717]">A部長</p>
              <p className="text-[10px] text-rose-500 font-semibold mt-0.5">⚡ エネルギーを奪う</p>
            </div>
            {/* Bさん */}
            <div className="bg-[rgba(24,61,70,0.04)] border border-[#183D46]/15 rounded-xl p-3.5 text-center">
              <div className="text-2xl mb-1.5">😊</div>
              <p className="text-sm font-bold text-[#171717]">Bさん</p>
              <p className="text-[10px] text-[#183D46] font-semibold mt-0.5">✨ ポジティブな影響</p>
            </div>
          </div>
        </Card>

        {/* ⑨⑩ モヤモヤ + パワーワード ─────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* ⑨ 未消化のモヤモヤ */}
          <Card className="p-5">
            <CardLabel>📝 モヤモヤ</CardLabel>
            <p className="text-sm text-[#5C5C5C] leading-relaxed">
              3日前の
              <span className="font-semibold text-[#171717]">「あの件の断り方」</span>
              、まだ脳の片隅に残っていませんか？
            </p>
          </Card>

          {/* ⑩ 今週のパワーワード */}
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

        {/* ⑪ タイムトラベル（定点観測） ──────────────────── */}
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
            href="/chat"
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
