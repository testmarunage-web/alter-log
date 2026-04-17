"use client";

import { useState } from "react";

interface Props {
  initialStyle: string | null;
  isReadOnly: boolean;
}

const STYLES = [
  {
    value: "direct",
    label: "忖度なし",
    description: "事実をストレートに指摘します。改善点や問題点を明確に伝えます。",
  },
  {
    value: "neutral",
    label: "中立",
    description: "事実を整理して提示します。バランスの取れたフィードバックを行います。",
  },
  {
    value: "empathetic",
    label: "寄り添い型",
    description: "ポジティブな面も拾いながら、気づきを促します。",
  },
] as const;

export function FeedbackStyleSection({ initialStyle, isReadOnly }: Props) {
  // NULL → UI上は neutral をデフォルト選択表示（DBは変更しない）
  const [selected, setSelected] = useState(initialStyle ?? "neutral");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  async function handleSelect(value: string) {
    if (isReadOnly || saving || value === selected) return;
    setSelected(value);
    setHasChanged(true);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/feedback-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackStyle: value }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // エラーは無視
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#C4A35A]/70 flex-shrink-0"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <h2 className="text-sm font-bold text-[#C4A35A]/90 tracking-wide">
          Alterのフィードバックスタイル
        </h2>
      </div>

      <div className={`space-y-2 ${isReadOnly ? "opacity-50 pointer-events-none" : ""}`}>
        {STYLES.map((style) => {
          const isSelected = selected === style.value;
          return (
            <button
              key={style.value}
              type="button"
              onClick={() => handleSelect(style.value)}
              disabled={saving}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? "border-[#C4A35A]/40 bg-[#C4A35A]/[0.06]"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected ? "border-[#C4A35A]" : "border-white/20"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[#C4A35A]" />}
                </div>
                <div>
                  <p className={`text-[13px] font-semibold ${isSelected ? "text-[#E8D5A0]" : "text-[#E8E3D8]/70"}`}>
                    {style.label}
                  </p>
                  <p className="text-[11px] text-[#8A8276]/60 mt-0.5 leading-relaxed">
                    {style.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 保存完了トースト */}
      {saved && hasChanged && (
        <div
          className="mt-3 rounded-lg px-4 py-2.5 flex items-center gap-2 animate-in fade-in"
          style={{ background: "rgba(196,163,90,0.10)", border: "1px solid rgba(196,163,90,0.20)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#C4A35A]/70 flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-[12px] text-[#C4A35A]/80">
            保存しました。次回のSCAN・Alter Logから反映されます。
          </p>
        </div>
      )}
    </section>
  );
}
