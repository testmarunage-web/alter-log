"use client";

import { useState } from "react";

export function CheckoutButton({ label = "月額2,980円で始める" }: { label?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });

      if (!res.ok) {
        const text = await res.text();
        console.error("Checkout API error:", res.status, text);
        alert("決済画面への遷移に失敗しました。再度お試しください。");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Stripe checkout URL not returned", data);
        alert("決済URLの取得に失敗しました。再度お試しください。");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("通信エラーが発生しました。再度お試しください。");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-bold text-base tracking-wide transition-all duration-200
        ${loading
          ? "bg-[#C4A35A]/30 border border-[#C4A35A]/30 text-[#C4A35A]/50 cursor-not-allowed"
          : "bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_28px_rgba(196,163,90,0.35)] active:scale-[0.98]"
        }`}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin" />
          <span>処理中...</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
