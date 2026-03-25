export default function HistoryPage() {
  const entries = [
    { date: "3月23日（月）", theme: "意思決定の先送りについて" },
    { date: "3月21日（土）", theme: "休息 vs 学習のトレードオフ" },
    { date: "3月19日（木）", theme: "マネジメント移行期の不安" },
    { date: "3月17日（火）", theme: "自分の「軸」を言語化する試み" },
    { date: "3月14日（土）", theme: "承認欲求との向き合い方" },
  ];

  return (
    <div className="p-4 md:p-6 min-h-full bg-[#0B0E13]">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#E8E3D8]">思考の軌跡</h1>
      </div>

      <div className="max-w-xl space-y-2">
        {entries.map(({ date, theme }) => (
          <div
            key={date}
            className="bg-white/[0.04] backdrop-blur-sm border border-[#C4A35A]/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-[#C4A35A]/45 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="text-xs text-[#9A9488] mb-0.5">{date}</p>
              <p className="text-sm font-semibold text-[#E8E3D8]">{theme}</p>
            </div>
            <button className="flex-shrink-0 text-xs font-medium text-[#C4A35A]/80 hover:text-[#C4A35A] flex items-center gap-1 transition-colors">
              ログを見る
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5.5h7M6 2l3.5 3.5L6 9" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
