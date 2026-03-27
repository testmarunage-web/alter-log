"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 1200;
const MAX_ATTEMPTS = 13; // 約15秒でフォールバック起動

export default function PaymentPendingPage() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const [phase, setPhase] = useState<"polling" | "activating" | "timeout">("polling");

  useEffect(() => {
    async function checkStatus() {
      attemptsRef.current += 1;

      try {
        const res = await fetch("/api/subscription-status");
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            // router.replace ではなくフルリロードで遷移（AppLayoutのサーバーキャッシュを確実に破棄）
            window.location.href = "/dashboard";
            return;
          }
        }
      } catch {
        // ネットワークエラーは無視して次の試行を待つ
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Webhookが届いていない可能性 → Stripe直接確認のフォールバックを起動
        runFallbackActivation();
      }
    }

    checkStatus();
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  async function runFallbackActivation() {
    setPhase("activating");
    try {
      const res = await fetch("/api/subscription-activate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.activated) {
          window.location.href = "/dashboard";
          return;
        }
      }
    } catch {
      // フォールバックも失敗
    }
    setPhase("timeout");
  }

  return (
    <main className="min-h-screen bg-[#0B0E13] flex flex-col items-center justify-center px-6">
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(ellipse, rgba(196,163,90,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        <p className="text-sm font-black tracking-tight text-[#C4A35A]/70 mb-10">Alter Log</p>

        {phase === "timeout" ? (
          <>
            <div className="flex items-center justify-center mb-8">
              <div className="w-12 h-12 rounded-full bg-[#C4A35A]/10 border border-[#C4A35A]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <h1 className="text-lg font-bold text-[#F0EAD8] mb-3">処理が混み合っています</h1>
            <p className="text-sm text-[#8A8276] leading-relaxed mb-8">
              決済自体は完了しています。少し時間をおいてから、ダッシュボードをご確認ください。
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = "/dashboard"; }}
              className="px-7 py-3 rounded-xl bg-[#C4A35A] text-[#0B0E13] font-bold text-sm hover:bg-[#D4B36A] transition-colors"
            >
              ダッシュボードを確認する
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center mb-8">
              <div className="w-12 h-12 rounded-full border-2 border-[#C4A35A]/20 border-t-[#C4A35A] animate-spin" />
            </div>
            <h1 className="text-lg font-bold text-[#F0EAD8] mb-3">
              {phase === "activating" ? "アカウントを有効化しています..." : "決済を確認しています..."}
            </h1>
            <p className="text-sm text-[#8A8276] leading-relaxed">
              しばらくそのままお待ちください。
              <br />
              自動的にダッシュボードへ移動します。
            </p>
          </>
        )}
      </div>
    </main>
  );
}
