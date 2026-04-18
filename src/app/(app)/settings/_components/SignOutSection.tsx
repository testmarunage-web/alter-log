"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutSection() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      // フォールバック: 手動遷移
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mt-4 border border-white/[0.05] rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.012)" }}
    >
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="w-full px-4 py-4 text-center text-sm text-red-400/55 hover:text-red-400/75 hover:bg-white/[0.02] transition-colors disabled:opacity-40"
      >
        {loading ? "ログアウト中..." : "ログアウト"}
      </button>
    </div>
  );
}
