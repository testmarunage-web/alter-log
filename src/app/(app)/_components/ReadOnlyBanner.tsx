"use client";

import Link from "next/link";
import { useReadOnly } from "./ReadOnlyProvider";

export function ReadOnlyBanner() {
  const isReadOnly = useReadOnly();
  if (!isReadOnly) return null;

  return (
    <div
      className="flex-none w-full px-4 py-2.5 flex items-center gap-3"
      style={{
        background: "rgba(196,163,90,0.08)",
        borderBottom: "1px solid rgba(196,163,90,0.18)",
      }}
    >
      <p className="flex-1 text-[11px] text-[#C4A35A]/80 leading-snug">
        サブスクリプションが無効です。新しいジャーナルの作成やSCANを利用するには、サブスクリプションを再開してください。
      </p>
      <Link
        href="/subscribe"
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#0B0E13] bg-[#C4A35A] hover:bg-[#D4B36A] transition-colors"
      >
        再開する
      </Link>
    </div>
  );
}
