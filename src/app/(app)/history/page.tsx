export default function HistoryPage() {
  const entries = [
    { date: "3月23日（月）", theme: "意思決定の先送りについて" },
    { date: "3月21日（土）", theme: "休息 vs 学習のトレードオフ" },
    { date: "3月19日（木）", theme: "マネジメント移行期の不安" },
    { date: "3月17日（火）", theme: "自分の「軸」を言語化する試み" },
    { date: "3月14日（土）", theme: "承認欲求との向き合い方" },
  ];

  return (
    <div className="p-4 md:p-6 min-h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#171717]">思考の軌跡</h1>
      </div>

      <div className="max-w-xl space-y-2">
        {entries.map(({ date, theme }) => (
          <div
            key={date}
            className="bg-white border border-[#E8E8E8] rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-xs text-[#9A9A9A] mb-0.5">{date}</p>
              <p className="text-sm font-semibold text-[#171717]">{theme}</p>
            </div>
            <button className="flex-shrink-0 text-xs font-medium text-[#183D46] flex items-center gap-1 hover:underline">
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
