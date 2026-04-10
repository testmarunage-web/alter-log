"use client";

import { useState } from "react";

interface Props {
  /** トリガーボタンのラベルテキスト */
  label: string;
  /** ゴールド系 (alterlog) またはグレー系 (journal) のアクセントカラー */
  accent: "journal" | "alterlog";
  children: React.ReactNode;
}

export function DailyAccordion({ label, accent, children }: Props) {
  const [open, setOpen] = useState(false);

  const isGold = accent === "alterlog";

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 text-[11px] font-mono tracking-wide transition-colors ${
          isGold
            ? "text-[#C4A35A]/55 hover:text-[#C4A35A]/90"
            : "text-[#8A8276]/50 hover:text-[#8A8276]/80"
        }`}
      >
        {/* アイコン */}
        {isGold ? (
          /* AlterIcon SVG inline */
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ) : (
          /* 鉛筆アイコン */
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        )}

        {label}

        {/* 開閉シェブロン */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* コンテンツ（アニメーション付き開閉） */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: open ? "2000px" : "0px",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
