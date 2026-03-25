"use client";

import Link from "next/link";
import { useState, useRef, useCallback } from "react";

// ── ripple hook ────────────────────────────────────────────────────────────
type Ripple = { id: number; x: number; y: number };

function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const createRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 750);
  }, []);

  return { ripples, createRipple };
}

// ── RippleButton ───────────────────────────────────────────────────────────
function RippleButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { ripples, createRipple } = useRipple();

  return (
    <Link
      href={href}
      onClick={createRipple}
      className={`relative overflow-hidden block ${className}`}
    >
      {children}
      {ripples.map(({ id, x, y }) => (
        <span
          key={id}
          className="absolute rounded-full pointer-events-none animate-[ripple_0.75s_cubic-bezier(0.22,1,0.36,1)_forwards]"
          style={{
            left: x,
            top: y,
            width: 8,
            height: 8,
            marginLeft: -4,
            marginTop: -4,
            background: "rgba(196,163,90,0.35)",
          }}
        />
      ))}
    </Link>
  );
}

// ── page ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <>
      {/* ── カスタムアニメーション ── */}
      <style>{`
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(28);  opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .section-enter {
          animation: fadeSlideUp 0.65s cubic-bezier(0.22,1,0.36,1) both;
        }
        .section-enter-2 { animation-delay: 0.10s; }
        .section-enter-3 { animation-delay: 0.20s; }
        .section-enter-4 { animation-delay: 0.30s; }
        .font-serif-jp { font-family: var(--font-noto-serif-jp), "Hiragino Mincho ProN", "Yu Mincho", serif; }
      `}</style>

      {/* ── ページ本体 ── */}
      <div className="min-h-full bg-[#0E1117] px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-lg mx-auto space-y-7">

          {/* ── ① コーチからの気づき ─────────────────────────── */}
          <section
            className="section-enter section-enter-1 rounded-2xl px-7 py-8
              bg-white/[0.04] backdrop-blur-md
              border border-[#C4A35A]/25
              hover:-translate-y-px hover:border-[#C4A35A]/50
              hover:shadow-[0_0_28px_rgba(196,163,90,0.10)]
              transition-all duration-500 ease-out"
          >
            <p className="text-[10px] tracking-[0.28em] text-[#C4A35A]/65 uppercase mb-5 font-sans">
              コーチからの気づき
            </p>
            <p className="font-serif-jp text-xl text-[#F0EBE1] leading-[1.75] tracking-[0.04em] mb-4">
              💡 強い義務感に縛られ、<br className="hidden sm:block" />
              少し無理をしているかもしれません
            </p>
            <p className="text-sm text-[#7A7264] leading-relaxed">
              ここ数日の対話で、「〜すべき」という言葉が
              <span className="text-[#C4A35A]/90 font-medium"> 15回 </span>
              登場しています。コーチとして少し気になりました。
            </p>
          </section>

          {/* ── ② メインアクション ────────────────────────────── */}
          <section className="section-enter section-enter-2 space-y-4">

            {/* 吐き出す */}
            <div className="space-y-2">
              <RippleButton
                href="/chat?mode=journal"
                className="w-full rounded-2xl px-7 py-8
                  bg-white/[0.05] backdrop-blur-md
                  border border-[#C4A35A]/30
                  hover:-translate-y-px hover:border-[#C4A35A]/60
                  hover:shadow-[0_4px_32px_rgba(196,163,90,0.13)]
                  transition-all duration-400 ease-out group"
              >
                <p className="font-serif-jp text-2xl text-[#F0EBE1] tracking-[0.06em] mb-2.5">
                  吐き出す
                </p>
                <p className="text-sm text-[#6A6358] leading-relaxed font-sans">
                  まとまっていなくて構いません。<br />
                  心のノイズをただ置いていってください。
                </p>
              </RippleButton>

              {/* お助けカード（アコーディオン） */}
              <div className="px-1.5">
                <button
                  type="button"
                  onClick={() => setHintOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs text-[#5A5348] hover:text-[#8A8070] transition-colors duration-300 py-1 tracking-wide"
                  aria-expanded={hintOpen}
                >
                  <span>💬 何から話せばいいか迷ったら…</span>
                  <span
                    className="text-[10px] transition-transform duration-400"
                    style={{
                      display: "inline-block",
                      transform: hintOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>

                {hintOpen && (
                  <div
                    className="mt-2 rounded-xl px-5 py-4
                      bg-white/[0.03] backdrop-blur-sm
                      border border-[#C4A35A]/15
                      animate-[fadeSlideUp_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
                  >
                    <p className="text-[10px] tracking-[0.2em] text-[#5A5348] uppercase mb-2.5">
                      コーチからの問いかけ
                    </p>
                    <p className="text-sm text-[#B0A898] leading-relaxed font-sans">
                      私がペソさんについてもっと知りたいのは…<br />
                      <span className="text-[#C4A35A]/80 font-medium">
                        「最近、一番ホッとした瞬間はいつですか？」
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 思考を整理する */}
            <RippleButton
              href="/chat?mode=coach"
              className="w-full rounded-2xl px-7 py-8
                bg-[#1E3A45]/40 backdrop-blur-md
                border border-[#3AAFCA]/20
                hover:-translate-y-px hover:border-[#3AAFCA]/45
                hover:shadow-[0_4px_32px_rgba(58,175,202,0.12)]
                transition-all duration-400 ease-out group"
            >
              <p className="font-serif-jp text-2xl text-[#C8E8EE] tracking-[0.06em] mb-2.5">
                思考を整理する
              </p>
              <p className="text-sm text-[#4A6E78] leading-relaxed font-sans">
                コーチと一緒に、モヤモヤの正体を<br />
                見つけにいきましょう。
              </p>
            </RippleButton>
          </section>

          {/* ── ③ タイムトラベル ──────────────────────────────── */}
          <section
            className="section-enter section-enter-3 rounded-2xl px-7 py-8
              bg-[#C4A35A]/[0.04] backdrop-blur-md
              border border-[#C4A35A]/18
              hover:-translate-y-px hover:border-[#C4A35A]/38
              hover:shadow-[0_4px_28px_rgba(196,163,90,0.09)]
              transition-all duration-500 ease-out"
          >
            <p className="text-[10px] tracking-[0.28em] text-[#C4A35A]/55 uppercase mb-5 font-sans">
              ⏳ 1ヶ月前のあなたからの手紙
            </p>
            <p className="text-sm text-[#7A7264] leading-relaxed mb-6 font-sans">
              1ヶ月前の今日、あなたは
              <span className="text-[#B0A898] font-medium">「プロジェクトの進行」</span>
              について悩み、吐き出していました。<br /><br />
              今のあなたなら、当時の自分にどんな声をかけてあげますか？
            </p>
            <Link
              href="/chat?mode=coach"
              className="inline-flex items-center gap-2.5 text-sm font-medium tracking-wide
                text-[#C4A35A]/80 hover:text-[#C4A35A]
                border border-[#C4A35A]/30 hover:border-[#C4A35A]/65
                px-5 py-2.5 rounded-xl
                hover:shadow-[0_0_16px_rgba(196,163,90,0.15)]
                transition-all duration-400 ease-out"
            >
              過去の自分と対話する
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 6h8M6 2l4 4-4 4" />
              </svg>
            </Link>
          </section>

        </div>
      </div>
    </>
  );
}
