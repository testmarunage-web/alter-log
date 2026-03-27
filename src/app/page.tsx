import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CheckoutButton } from "./_components/CheckoutButton";

// ─────────────────────────────────────────────────────────────────────────────
// SVGアイコン
// ─────────────────────────────────────────────────────────────────────────────
const IcJournal = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
  </svg>
);
const IcEye = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const features = [
  {
    icon: <IcJournal />,
    title: "ジャーナル & 壁打ち",
    body: "ありのままの思考を吐き出す。音声入力ファーストのジャーナルと、AIとのリアルタイム壁打ちで、頭の中を即座に言語化。",
  },
  {
    icon: <IcChart />,
    title: "Alter Log 分析",
    body: "思考のバランスや脳内シェアを可視化。「直感/論理」「現在/未来」など5軸のバランスと、頭の中の占有率トップ5をAIがリアルタイムに解析。",
  },
  {
    icon: <IcEye />,
    title: "客観的ファクトの抽出",
    body: "無意識の口癖やパターンをAIが指摘。あなたのログから頻出ワードや行動パターンを抽出し、自分では気づけない深層心理に光を当てる。",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ページ本体（Server Component）
// ─────────────────────────────────────────────────────────────────────────────
export default async function Home() {
  const { userId } = await auth();
  const isLoggedIn = !!userId;

  return (
    <main className="min-h-screen bg-[#0B0E13] text-[#E8E3D8] flex flex-col">

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0B0E13]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <span className="text-base font-black tracking-tight text-[#E8D5A0]">Alter Log</span>
          {isLoggedIn ? (
            <Link href="/dashboard"
              className="text-xs font-bold px-4 py-2 rounded-full border border-[#C4A35A]/40 text-[#C4A35A] hover:bg-[#C4A35A]/10 transition-colors">
              ダッシュボードへ
            </Link>
          ) : (
            <Link href="/sign-in"
              className="text-xs font-bold px-4 py-2 rounded-full border border-white/[0.12] text-[#8A8276] hover:text-[#E8E3D8] hover:border-white/20 transition-colors">
              ログイン
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-44 pb-32 overflow-hidden">
        {/* 背景グロー */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(ellipse, rgba(196,163,90,0.08) 0%, transparent 70%)" }} />
        </div>

        {/* バッジ */}
        <span className="mb-8 inline-block text-[10px] tracking-[0.2em] font-bold uppercase text-[#C4A35A]/70 border border-[#C4A35A]/20 rounded-full px-4 py-1.5">
          Executive Coaching AI
        </span>

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-black leading-[1.12] tracking-tighter max-w-2xl text-[#F0EAD8]">
          エグゼクティブコーチを、
          <br />
          <span style={{ color: "#C4A35A" }}>あなたの右腕に。</span>
        </h1>

        <p className="mt-8 text-[#8A8276] text-base sm:text-lg max-w-xl leading-relaxed">
          ジャーナルと壁打ちログから、AIがあなたの思考の癖や深層心理を分析。
          無意識のパターンを可視化し、次の一手をクリアにする思考整理プラットフォーム。
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          {isLoggedIn ? (
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_28px_rgba(196,163,90,0.35)] transition-all duration-200">
              ダッシュボードを開く
            </Link>
          ) : (
            <CheckoutButton label="月額2,980円で始める" />
          )}
          <p className="text-xs text-[#8A8276]/50">いつでもキャンセル可能</p>
        </div>
      </section>

      {/* ── 区切り線 ── */}
      <div className="w-full border-t border-white/[0.04]" />

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#C4A35A]/50 font-bold text-center mb-3">Features</p>
          <h2 className="text-2xl sm:text-3xl font-black text-center text-[#F0EAD8] mb-16 tracking-tight">
            思考を、資産にする。
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7 hover:border-[#C4A35A]/20 transition-colors duration-300">
                <div className="w-11 h-11 rounded-xl bg-[#C4A35A]/10 text-[#C4A35A] flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-[#E8D5A0] mb-2.5 tracking-wide">{f.title}</h3>
                <p className="text-xs text-[#8A8276] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 区切り線 ── */}
      <div className="w-full border-t border-white/[0.04]" />

      {/* ── Final CTA ── */}
      <section className="relative py-28 px-6 text-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[100px]"
            style={{ background: "radial-gradient(ellipse, rgba(196,163,90,0.06) 0%, transparent 70%)" }} />
        </div>

        <h2 className="relative text-3xl sm:text-4xl font-black text-[#F0EAD8] mb-4 leading-tight tracking-tighter">
          思考の質が変わると、
          <br />
          選択の質が変わる。
        </h2>
        <p className="relative text-[#8A8276] text-sm mb-10 max-w-sm mx-auto leading-relaxed">
          日々の内省を、確かな成長に変えるための思考整理プラットフォーム。
        </p>

        {isLoggedIn ? (
          <Link href="/dashboard"
            className="relative inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_28px_rgba(196,163,90,0.35)] transition-all duration-200">
            ダッシュボードを開く
          </Link>
        ) : (
          <CheckoutButton label="月額2,980円で始める" />
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-black text-[#C4A35A]/70 tracking-tight">Alter Log</p>
          <div className="flex flex-wrap justify-center gap-5 text-xs text-[#8A8276]/40 font-medium">
            <span className="hover:text-[#8A8276] transition cursor-pointer">利用規約</span>
            <span className="hover:text-[#8A8276] transition cursor-pointer">プライバシーポリシー</span>
            <span className="hover:text-[#8A8276] transition cursor-pointer">特定商取引法に基づく表記</span>
          </div>
          <p className="text-xs text-[#8A8276]/20">© 2026 Alter Log. All Rights Reserved.</p>
        </div>
      </footer>

    </main>
  );
}
