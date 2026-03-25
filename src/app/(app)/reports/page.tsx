"use client";

import { useState } from "react";

// ── ヒートマップ データ（12週 × 7日 = 84 cells, 月〜日順）──────
// 0=なし 1=低 2=中 3=高 4=最高
const HEATMAP: number[] = [
  // Week 1（約12週前）
  0, 0, 0, 0, 0, 0, 0,
  // Week 2
  0, 1, 0, 1, 0, 0, 0,
  // Week 3
  1, 0, 2, 0, 1, 0, 0,
  // Week 4
  0, 2, 1, 0, 2, 0, 0,
  // Week 5
  2, 1, 0, 3, 1, 0, 0,
  // Week 6
  1, 3, 2, 1, 3, 0, 0,
  // Week 7
  3, 1, 3, 2, 2, 0, 0,
  // Week 8
  2, 3, 1, 4, 2, 0, 0,
  // Week 9
  3, 2, 3, 2, 4, 0, 0,
  // Week 10
  2, 4, 2, 3, 3, 0, 0,
  // Week 11
  4, 2, 3, 4, 2, 0, 0,
  // Week 12（直近 ・今週）
  3, 0, 2, 3, 0, 0, 0,
];

const HEAT_COLORS = [
  "#EBEBEB",
  "rgba(24,61,70,0.18)",
  "rgba(24,61,70,0.38)",
  "rgba(24,61,70,0.60)",
  "#183D46",
];

function heatColor(level: number) {
  return HEAT_COLORS[Math.min(level, 4)];
}

// ── 月間アーカイブ ────────────────────────────────────────────────
const ARCHIVES = [
  { label: "2026年3月のハイライト", sessions: 18, themes: ["意思決定", "マネジメント"], isNew: true  },
  { label: "2026年2月のハイライト", sessions: 14, themes: ["自己決定", "完璧主義"],   isNew: false },
  { label: "2026年1月のハイライト", sessions:  9, themes: ["目標設定", "行動変容"],   isNew: false },
];

// ── 過去ログ ──────────────────────────────────────────────────────
const LOGS = [
  { date: "3月23日（月）", theme: "意思決定の先送りについて" },
  { date: "3月21日（土）", theme: "休息 vs 学習のトレードオフ" },
  { date: "3月19日（木）", theme: "マネジメント移行期の不安" },
  { date: "3月17日（火）", theme: "自分の「軸」を言語化する試み" },
  { date: "3月14日（土）", theme: "承認欲求との向き合い方" },
  { date: "3月12日（木）", theme: "長期目標の言語化" },
  { date: "3月10日（火）", theme: "完璧主義のブレーキを外す方法" },
  { date: "3月 7日（土）", theme: "週末の時間の使い方を見直す" },
];

export default function ReportsPage() {
  const [query, setQuery] = useState("");

  const filteredLogs = query.trim()
    ? LOGS.filter((l) => l.theme.includes(query) || l.date.includes(query))
    : LOGS;

  return (
    <div className="p-4 md:p-6 pb-8 min-h-full">
      <div className="max-w-xl mx-auto space-y-5">

        {/* ── ① ジャーナリング・アクティビティ ─────────────── */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-widest text-[#183D46]/50 uppercase">
              アクティビティ
            </p>
            <span className="text-xs text-[#5C5C5C] font-medium">
              🔥 7日連続
            </span>
          </div>

          {/* ヒートマップ */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {/* 曜日ラベル */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              {["月", "", "水", "", "金", "", "日"].map((d, i) => (
                <div key={i} className="h-3.5 flex items-center justify-end pr-1">
                  <span className="text-[9px] text-[#C0C0C0] w-3 text-center">{d}</span>
                </div>
              ))}
            </div>

            {/* セルグリッド */}
            <div className="flex gap-1 flex-1">
              {Array.from({ length: 12 }, (_, w) => (
                <div key={w} className="flex flex-col gap-1 flex-1 min-w-[10px]">
                  {Array.from({ length: 7 }, (_, d) => {
                    const level = HEATMAP[w * 7 + d];
                    return (
                      <div
                        key={d}
                        className="h-3.5 rounded-sm"
                        style={{ background: heatColor(level) }}
                        title={`活動レベル: ${level}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 月ラベル */}
          <div className="flex mt-2 ml-5">
            {["1月", "", "", "", "2月", "", "", "", "3月", "", "", ""].map((m, i) => (
              <div key={i} className="flex-1 min-w-[10px]">
                <span className="text-[9px] text-[#C0C0C0]">{m}</span>
              </div>
            ))}
          </div>

          {/* 凡例 */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="text-[9px] text-[#C0C0C0]">少</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div
                key={l}
                className="w-3 h-3 rounded-sm"
                style={{ background: heatColor(l) }}
              />
            ))}
            <span className="text-[9px] text-[#C0C0C0]">多</span>
          </div>
        </div>

        {/* ── ② 月間サマリーアーカイブ ──────────────────────── */}
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#183D46]/50 uppercase mb-3 px-1">
            月間ハイライト
          </p>
          <div className="space-y-2">
            {ARCHIVES.map(({ label, sessions, themes, isNew }) => (
              <div
                key={label}
                className="bg-white border border-[#E8E8E8] hover:border-[#183D46]/25 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#171717]">{label}</span>
                    {isNew && (
                      <span className="text-[10px] font-bold bg-[#183D46] text-white rounded-full px-2 py-0.5 flex-shrink-0">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#9A9A9A]">{sessions}セッション</span>
                    <span className="text-[#E0E0E0]">·</span>
                    {themes.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-[rgba(24,61,70,0.07)] text-[#183D46] rounded-full px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#BCBCBC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M5 3l4 4-4 4" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* ── ③ 思考の軌跡（過去ログ検索＋一覧） ──────────── */}
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#183D46]/50 uppercase mb-3 px-1">
            思考の軌跡
          </p>

          {/* 検索バー */}
          <div className="relative mb-3">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCBCBC]"
              width="15" height="15" viewBox="0 0 15 15" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            >
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10 10l3.5 3.5" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="過去のセッションを検索..."
              className="w-full bg-white border border-[#E8E8E8] focus:border-[#183D46]/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#171717] placeholder:text-[#C8C8C8] focus:outline-none transition-colors shadow-sm"
            />
          </div>

          {/* ログ一覧 */}
          <div className="space-y-1.5">
            {filteredLogs.length === 0 ? (
              <p className="text-sm text-[#BCBCBC] text-center py-6">
                「{query}」に一致するログが見つかりませんでした
              </p>
            ) : (
              filteredLogs.map(({ date, theme }) => (
                <div
                  key={`${date}-${theme}`}
                  className="bg-white border border-[#E8E8E8] hover:border-[#183D46]/20 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-[#9A9A9A] flex-shrink-0 w-24">{date}</span>
                    <span className="text-sm text-[#171717] truncate">{theme}</span>
                  </div>
                  <button className="flex-shrink-0 text-xs font-medium text-[#183D46] flex items-center gap-1 hover:underline">
                    ログを見る
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5h6M5 2l3 3-3 3" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
