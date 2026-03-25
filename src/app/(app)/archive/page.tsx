"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 取扱説明書データ
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_ITEMS = [
  {
    title: "強み・勝ち筋",
    catchphrase: "問題の「枠組み」を自分で再設定できる人",
    detail:
      "複雑な状況を即座に構造化し、本質的な問いを見出す力があります。不確実な環境でも臆せず行動に移せるのは、リスクを感情ではなく理性で受け入れる準備ができているからでしょう。対話の中で「問題の枠組み」を自ら再設定する場面が何度も見られました。これはあなたの大きな武器です。",
    accent: "border-[#3AAFCA]/30 bg-[#3AAFCA]/5",
    labelColor: "text-[#3AAFCA]",
  },
  {
    title: "思考のクセ",
    catchphrase: "完璧でないと、動けなくなる",
    detail:
      "「完璧でなければ始められない」という感覚が、着手を遅らせることがあります。外部の要因や他者の動きを待ってしまう瞬間は、実は自分の中にまだ不確かさがある時のサインかもしれません。短期的な感情の揺れが、本来の優先順位を塗り替えてしまうパターンも繰り返し現れています。",
    accent: "border-[#C4A35A]/30 bg-[#C4A35A]/5",
    labelColor: "text-[#C4A35A]",
  },
  {
    title: "価値観",
    catchphrase: "自分で選んだ道しか、本気になれない",
    detail:
      "「自分の意思で決めた」という感覚を、あなたはひどく大切にしています。誰かに言われてやった仕事より、自ら選んだ道を歩んでいる時に、あなたのエネルギーは最も高まります。成果そのものよりも、そこに至るプロセスで何を学んだかを問い続ける姿勢は、揺るぎないあなたの軸です。",
    accent: "border-[#5A8A96]/30 bg-[#5A8A96]/5",
    labelColor: "text-[#5A8A96]",
  },
  {
    title: "現在の主な課題",
    catchphrase: "「速く」と「正しく」の間で揺れている",
    detail:
      "意思決定の速度と質のトレードオフに、あなたは今も向き合っています。マネジメントという新しい役割への移行期において、これまで通用してきた「一人で解決する」という方法論が、少しずつ限界を見せ始めています。長期の自分像を言葉にすることが、今最も必要な作業かもしれません。",
    accent: "border-[#9A9488]/30 bg-[#9A9488]/5",
    labelColor: "text-[#9A9488]",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 思考の軌跡データ
// ─────────────────────────────────────────────────────────────────────────────
const HISTORY_ENTRIES = [
  { date: "3月23日（月）", theme: "意思決定の先送りについて" },
  { date: "3月21日（土）", theme: "休息 vs 学習のトレードオフ" },
  { date: "3月19日（木）", theme: "マネジメント移行期の不安" },
  { date: "3月17日（火）", theme: "自分の「軸」を言語化する試み" },
  { date: "3月14日（土）", theme: "承認欲求との向き合い方" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ProfileAccordion
// ─────────────────────────────────────────────────────────────────────────────
interface AccordionItem {
  title: string;
  catchphrase: string;
  detail: string;
  accent: string;
  labelColor: string;
}

function ProfileAccordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map(({ title, catchphrase, detail, accent, labelColor }, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={title} className={`border rounded-2xl overflow-hidden transition-all ${accent}`}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
            >
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>
                  {title}
                </p>
                <p className="text-sm font-semibold text-[#E8E3D8]">{catchphrase}</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#9A9488"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-5">
                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-[#9A9488] leading-relaxed">{detail}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "profile" | "history";

export default function ArchivePage() {
  const [mode, setMode] = useState<Mode>("profile");

  return (
    <div className="bg-[#0B0E13] min-h-screen text-[#E8E3D8] p-4 md:p-6">
      <div className="max-w-2xl">

        {/* モード切り替えトグル */}
        <div className="mb-5 inline-flex bg-white/[0.05] border border-white/[0.08] rounded-xl p-1 gap-1">
          {(["profile", "history"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === m
                  ? "bg-white/[0.1] text-[#E8E3D8] shadow-sm"
                  : "text-[#8A8276] hover:text-[#C4A35A]"
              }`}
            >
              {m === "profile" ? "取扱説明書" : "思考の軌跡"}
            </button>
          ))}
        </div>

        {/* 取扱説明書 */}
        {mode === "profile" && (
          <div>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-[#E8E3D8]">あなたの取扱説明書</h1>
              <p className="text-sm text-[#8A8276] mt-0.5">対話から読み解いた、あなたの内面の地図</p>
            </div>
            <ProfileAccordion items={PROFILE_ITEMS} />
          </div>
        )}

        {/* 思考の軌跡 */}
        {mode === "history" && (
          <div>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-[#E8E3D8]">思考の軌跡</h1>
            </div>
            <div className="space-y-2">
              {HISTORY_ENTRIES.map(({ date, theme }) => (
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
        )}

      </div>
    </div>
  );
}
