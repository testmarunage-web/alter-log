"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function IcMoon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function DevBatchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleRun() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/dev/generate-missing-logs", { method: "POST" });
      const json = await res.json();
      setResult(res.ok ? "生成完了" : `エラー: ${json.error}`);
      if (res.ok) router.refresh();
    } catch {
      setResult("リクエスト失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border-t border-dashed border-white/[0.08] pt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className="text-[10px] font-mono text-[#8A8276]/50 hover:text-[#C4A35A]/60 disabled:opacity-40
                     transition-colors border border-white/[0.08] hover:border-[#C4A35A]/20
                     rounded px-3 py-1.5 flex items-center gap-1.5"
        >
          {loading ? (
            <span className="w-2.5 h-2.5 border border-[#8A8276]/50 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[#8A8276]/50">
              <IcMoon />
            </span>
          )}
          開発用：夜間バッチを手動実行
        </button>
        {result && (
          <span className="text-[10px] font-mono text-[#8A8276]/50">{result}</span>
        )}
      </div>
    </div>
  );
}