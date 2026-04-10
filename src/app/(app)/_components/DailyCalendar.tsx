"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

interface Props {
  /** データが存在する日付の配列（YYYY-MM-DD） */
  markedDates: string[];
  /** カレンダー上部のラベル（省略可） */
  label?: string;
  /** /daily/[date]?from=xxx のクエリパラメータ（省略時はパラメータなし） */
  from?: string;
}

export function DailyCalendar({ markedDates, label, from }: Props) {
  const router = useRouter();

  // 現在の JST 日付を初期値にする
  const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const [year, setYear]   = useState(nowJst.getFullYear());
  const [month, setMonth] = useState(nowJst.getMonth()); // 0-indexed

  const markedSet = new Set(markedDates);

  // グリッドセルを構築
  const firstDow   = new Date(year, month, 1).getDay(); // 0=日
  const totalDays  = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${nowJst.getFullYear()}-${String(nowJst.getMonth() + 1).padStart(2, "0")}-${String(nowJst.getDate()).padStart(2, "0")}`;
  const isCurrentMonth = year === nowJst.getFullYear() && month === nowJst.getMonth();

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return; // 未来には進めない
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="rounded-xl border border-white/[0.07] px-3 py-3" style={{ background: "rgba(255,255,255,0.018)" }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={prevMonth}
          className="w-6 h-6 flex items-center justify-center rounded-md text-[#8A8276]/40 hover:text-[#E8E3D8]/70 hover:bg-white/[0.05] transition-colors"
          aria-label="前月"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {label && (
            <span className="font-mono text-[8px] tracking-[0.2em] text-[#8A8276]/30 uppercase">{label}</span>
          )}
          <span className="font-mono text-[10px] text-[#8A8276]/60 tracking-wide">
            {year}年{month + 1}月
          </span>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-6 h-6 flex items-center justify-center rounded-md text-[#8A8276]/40 hover:text-[#E8E3D8]/70 hover:bg-white/[0.05] transition-colors disabled:opacity-20 disabled:cursor-default"
          aria-label="翌月"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 曜日ラベル */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <span
            key={d}
            className={`text-center font-mono text-[8px] ${
              i === 0 ? "text-red-400/35" : i === 6 ? "text-[#8A8276]/30" : "text-white/18"
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="h-8" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasData = markedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          const dow = idx % 7;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => hasData && router.push(`/daily/${dateStr}${from ? `?from=${from}` : ""}`)}
              className={`h-8 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors
                ${hasData ? "hover:bg-white/[0.05] cursor-pointer" : "cursor-default"}
              `}
            >
              <span
                className={`font-mono text-[11px] leading-none ${
                  isToday
                    ? "text-[#C4A35A] font-bold"
                    : hasData
                    ? "text-[#E8E3D8]/70"
                    : dow === 0
                    ? "text-white/18"
                    : "text-white/18"
                }`}
              >
                {day}
              </span>
              {/* データドット */}
              <span
                className="w-1 h-1 rounded-full"
                style={{
                  background: hasData
                    ? isToday
                      ? "rgba(196,163,90,0.9)"
                      : "rgba(196,163,90,0.55)"
                    : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
