"use client";

import { useState } from "react";

/** クリップボードコピーボタン。親要素に position: relative が必要。 */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }).catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="コピー"
      className={`flex items-center gap-1 transition-colors ${
        copied
          ? "text-[#C4A35A]/80"
          : "text-[#8A8276]/30 hover:text-[#8A8276]/70"
      }`}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-mono text-[9px] tracking-wide">コピーしました</span>
        </>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
