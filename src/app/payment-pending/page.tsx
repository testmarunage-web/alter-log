"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PaymentPendingPage() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 30; // 最大60秒ポーリング（2秒×30回）

  useEffect(() => {
    async function checkStatus() {
      attemptsRef.current += 1;

      try {
        const res = await fetch("/api/subscription-status");
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // ネットワークエラーは無視して次の試行を待つ
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        // タイムアウト：サブスクリプションページに戻す
        if (intervalRef.current) clearInterval(intervalRef.current);
        router.replace("/subscribe?timeout=true");
      }
    }

    // 即時1回 + 2秒ごとにポーリング
    checkStatus();
    intervalRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

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

        {/* スピナー */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-full border-2 border-[#C4A35A]/20 border-t-[#C4A35A] animate-spin" />
        </div>

        <h1 className="text-lg font-bold text-[#F0EAD8] mb-3">決済を確認しています...</h1>
        <p className="text-sm text-[#8A8276] leading-relaxed">
          しばらくそのままお待ちください。
          <br />
          自動的にダッシュボードへ移動します。
        </p>
      </div>
    </main>
  );
}
