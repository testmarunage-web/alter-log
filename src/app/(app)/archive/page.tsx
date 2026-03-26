"use client";

import { useState } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// プロファイリングデータ
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_ITEMS = [
  {
    title: "エネルギーの源泉",
    catchphrase: "問題の「枠組み」を自分で再設定できる人",
    detail:
      "複雑な状況を即座に構造化し、本質的な問いを見出す力があります。不確実な環境でも臆せず行動に移せるのは、リスクを感情ではなく理性で受け入れる準備ができているからでしょう。対話の中で「問題の枠組み」を自ら再設定する場面が何度も見られました。これはあなたの大きな武器です。",
    accent: "border-[#C4A35A]/25 bg-[#C4A35A]/[0.04]",
    labelColor: "text-[#C4A35A]",
  },
  {
    title: "無自覚な防衛機制",
    catchphrase: "完璧でないと、動けなくなる",
    detail:
      "「完璧でなければ始められない」という感覚が、着手を遅らせることがあります。外部の要因や他者の動きを待ってしまう瞬間は、実は自分の中にまだ不確かさがある時のサインかもしれません。短期的な感情の揺れが、本来の優先順位を塗り替えてしまうパターンも繰り返し現れています。",
    accent: "border-[#C4A35A]/25 bg-[#C4A35A]/[0.04]",
    labelColor: "text-[#C4A35A]",
  },
  {
    title: "譲れないコアバリュー",
    catchphrase: "自分で選んだ道しか、本気になれない",
    detail:
      "「自分の意思で決めた」という感覚を、あなたはひどく大切にしています。誰かに言われてやった仕事より、自ら選んだ道を歩んでいる時に、あなたのエネルギーは最も高まります。成果そのものよりも、そこに至るプロセスで何を学んだかを問い続ける姿勢は、揺るぎないあなたの軸です。",
    accent: "border-[#C4A35A]/25 bg-[#C4A35A]/[0.04]",
    labelColor: "text-[#C4A35A]",
  },
  {
    title: "現在直面している壁",
    catchphrase: "「速く」と「正しく」の間で揺れている",
    detail:
      "意思決定の速度と質のトレードオフに、あなたは今も向き合っています。マネジメントという新しい役割への移行期において、これまで通用してきた「一人で解決する」という方法論が、少しずつ限界を見せ始めています。長期の自分像を言葉にすることが、今最も必要な作業かもしれません。",
    accent: "border-[#C4A35A]/25 bg-[#C4A35A]/[0.04]",
    labelColor: "text-[#C4A35A]",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 対話ログデータ
// ─────────────────────────────────────────────────────────────────────────────
const HISTORY_ENTRIES = [
  { date: "3月23日（月）", theme: "意思決定の先送りについて" },
  { date: "3月21日（土）", theme: "休息 vs 学習のトレードオフ" },
  { date: "3月19日（木）", theme: "マネジメント移行期の不安" },
  { date: "3月17日（火）", theme: "自分の「軸」を言語化する試み" },
  { date: "3月14日（土）", theme: "承認欲求との向き合い方" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ProfilingAccordion
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileItem {
  title: string;
  catchphrase: string;
  detail: string;
  accent: string;
  labelColor: string;
}

function ProfilingAccordion({ items }: { items: ProfileItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map(({ title, catchphrase, detail, accent, labelColor }, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={title} className={`border rounded-xl overflow-hidden transition-all duration-300 ${accent}`}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left gap-4"
            >
              <p className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>
                {title}
              </p>
              {isOpen ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9A9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M4 10l4-4 4 4" />
                </svg>
              ) : (
                <span className="flex-shrink-0 flex items-center gap-1 text-[9px] text-[#8A8276]/70 tracking-wider whitespace-nowrap">
                  解析を開く
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </span>
              )}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-white/[0.06]">
                <p className="text-sm font-semibold text-[#E8E3D8] mt-4 mb-2">{catchphrase}</p>
                <p className="text-sm text-[#9A9488] leading-relaxed">{detail}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// セクション見出し
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[10px] font-bold tracking-[0.25em] text-[#C4A35A]/70 uppercase">{label}</h2>
        {sub && <span className="text-[9px] text-[#8A8276]/60 tracking-wider">{sub}</span>}
      </div>
      <div className="mt-1.5 h-px bg-gradient-to-r from-[#C4A35A]/20 via-[#C4A35A]/8 to-transparent" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ArchivePage() {
  return (
    <div className="bg-[#0B0E13] min-h-screen text-[#E8E3D8] px-4 py-6 pb-24 md:px-6">
      <div className="max-w-2xl space-y-10">

        {/* ── 週間ハイライト ─────────────────────────────────────────── */}
        <div>
          <div className="mb-5">
            <h1 className="text-xl font-bold text-[#E8E3D8]">ウィークリーレポート</h1>
            <p className="text-sm text-[#8A8276] mt-0.5">2026年3月 第4週（3/22〜3/28）</p>
          </div>
          <div className="bg-[#1A222B]/30 border border-[#C4A35A]/20 rounded-xl p-5">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#C4A35A]/70 uppercase mb-3">
              今週の気づき
            </p>
            <ul className="text-sm text-[#9A9488] leading-[1.85] space-y-2.5 list-disc pl-4 marker:text-[#C4A35A]/50">
              <li>「意思決定の速度」と「質」のトレードオフに関する葛藤が顕著（新しい役割への責任感の裏返し）。</li>
              <li>「一人で解決する」という既存の方法論が限界を迎えつつある状態。</li>
              <li>後半にかけて、自らの軸を言語化しようとする前向きな兆候を観測。</li>
            </ul>
          </div>
        </div>

        {/* ── 深層のプロファイリング ────────────────────────────────── */}
        <div>
          <SectionHeading label="深層のプロファイリング" sub="対話から析出された内面構造" />
          <ProfilingAccordion items={PROFILE_ITEMS} />
        </div>

        {/* ── 分析の根拠：対話の記録 ───────────────────────────────── */}
        <div>
          <SectionHeading label="対話ログ" />

          {/* 検索ボックス（モック） */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="過去の対話から検索..."
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-xl px-4 py-2 text-sm text-[#E8E3D8] placeholder:text-[#8A8276] focus:border-[#C4A35A]/40 focus:outline-none transition-colors"
            />
            <svg
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8276]/50"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* ログリスト */}
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
                <Link href="/archive/chat/mock-id" className="flex-shrink-0 text-xs font-medium text-[#C4A35A]/80 hover:text-[#C4A35A] flex items-center gap-1 transition-colors">
                  対話を開く
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5.5h7M6 2l3.5 3.5L6 9" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
