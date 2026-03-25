"use client";

import Link from "next/link";
import { useState } from "react";

// ── page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <div className="min-h-full bg-[#FAFAF8] px-5 py-10 md:px-8 md:py-14">
      <div className="max-w-lg mx-auto space-y-10">

        {/* ── コーチからの気づき ───────────────────────────────── */}
        <section className="bg-white border border-[#E8E4DE] rounded-3xl px-7 py-8 shadow-sm">
          <p className="text-[11px] font-bold tracking-widest text-[#183D46]/40 uppercase mb-5">
            コーチからの気づき
          </p>
          <p className="text-xl font-bold text-[#1A1A1A] leading-snug mb-4">
            💡 強い義務感に縛られ、少し無理をしているかもしれません
          </p>
          <p className="text-sm text-[#7A7A7A] leading-relaxed">
            ここ数日の対話で、「〜すべき」という言葉が
            <span className="text-[#183D46] font-semibold"> 15回 </span>
            登場しています。コーチとして少し気になりました。
          </p>
        </section>

        {/* ── 2つのメインアクション ────────────────────────────── */}
        <section className="space-y-4">

          {/* 吐き出す */}
          <div className="space-y-3">
            <Link
              href="/chat?mode=journal"
              className="block w-full bg-[#183D46] text-white rounded-3xl px-7 py-8 hover:bg-[#1e4d59] active:scale-[0.99] transition-all shadow-md group"
            >
              <p className="text-2xl font-black mb-2 tracking-tight">吐き出す</p>
              <p className="text-sm text-white/65 leading-relaxed font-normal">
                まとまっていなくて構いません。<br />
                心のノイズをただ置いていってください。
              </p>
            </Link>

            {/* お助けカード（アコーディオン） */}
            <div className="px-1">
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                className="flex items-center gap-2 text-sm text-[#9A9A9A] hover:text-[#5C5C5C] transition-colors py-1"
                aria-expanded={hintOpen}
              >
                <span>💬 何から話せばいいか迷ったら…</span>
                <span
                  className="text-xs transition-transform duration-300"
                  style={{ display: "inline-block", transform: hintOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ▾
                </span>
              </button>

              {hintOpen && (
                <div className="mt-2 bg-[#F7F5F2] border border-[#E8E4DE] rounded-2xl px-5 py-4">
                  <p className="text-xs text-[#9A9A9A] mb-2">コーチからの問いかけ</p>
                  <p className="text-sm text-[#3A3A3A] leading-relaxed">
                    私がペソさんについてもっと知りたいのは…<br />
                    <span className="font-semibold text-[#183D46]">
                      「最近、一番ホッとした瞬間はいつですか？」
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 思考を整理する */}
          <Link
            href="/chat?mode=coach"
            className="block w-full bg-[#EBF4F6] border border-[#C8DDE2] text-[#1A1A1A] rounded-3xl px-7 py-8 hover:border-[#183D46]/40 hover:bg-[#E2EEF2] active:scale-[0.99] transition-all group"
          >
            <p className="text-2xl font-black mb-2 tracking-tight text-[#183D46]">思考を整理する</p>
            <p className="text-sm text-[#5C7A82] leading-relaxed font-normal">
              コーチと一緒に、モヤモヤの正体を<br />
              見つけにいきましょう。
            </p>
          </Link>
        </section>

        {/* ── タイムトラベル ────────────────────────────────────── */}
        <section className="bg-[#FFFDF7] border border-[#EDE8DC] rounded-3xl px-7 py-8">
          <p className="text-[11px] font-bold tracking-widest text-[#B09A6A]/70 uppercase mb-5">
            ⏳ 1ヶ月前のあなたからの手紙
          </p>
          <p className="text-sm text-[#5C5C5C] leading-relaxed mb-6">
            1ヶ月前の今日、あなたは
            <span className="font-semibold text-[#3A3A3A]">「プロジェクトの進行」</span>
            について悩み、吐き出していました。<br /><br />
            今のあなたなら、当時の自分にどんな声をかけてあげますか？
          </p>
          <Link
            href="/chat?mode=coach"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#183D46] bg-white border border-[#E8E4DE] px-5 py-3 rounded-xl hover:border-[#183D46]/40 transition-colors shadow-sm"
          >
            過去の自分と対話する
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 6h8M6 2l4 4-4 4" />
            </svg>
          </Link>
        </section>

      </div>
    </div>
  );
}
