"use client";

import { useState, useRef } from "react";

const MAX_CHARS = 12000;
const MAX_VISIONS = 5;

interface VisionItem {
  id: string;
  label: string;
  content: string;
}

interface Props {
  initialVisions: VisionItem[];
  isReadOnly: boolean;
}

export function VisionSection({ initialVisions, isReadOnly }: Props) {
  const [visions, setVisions] = useState<VisionItem[]>(initialVisions);
  const [expandedId, setExpandedId] = useState<string | null>(
    visions.length > 0 ? visions[0].id : null,
  );
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (adding || visions.length >= MAX_VISIONS) return;
    setAdding(true);
    try {
      const res = await fetch("/api/visions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `ビジョン${visions.length + 1}`, content: "" }),
      });
      if (res.ok) {
        const { vision } = (await res.json()) as { vision: VisionItem };
        setVisions((prev) => [...prev, vision]);
        setExpandedId(vision.id);
      }
    } catch {} finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (visions.length <= 1) return;
    try {
      const res = await fetch(`/api/visions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setVisions((prev) => prev.filter((v) => v.id !== id));
        if (expandedId === id) setExpandedId(visions.find((v) => v.id !== id)?.id ?? null);
      }
    } catch {}
  }

  function handleUpdate(id: string, updates: Partial<VisionItem>) {
    setVisions((prev) => prev.map((v) => v.id === id ? { ...v, ...updates } : v));
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#C4A35A]/70 flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <h2 className="text-sm font-bold text-[#C4A35A]/90 tracking-wide">マイビジョン</h2>
      </div>

      <div className="space-y-2">
        {visions.map((vision) => (
          <VisionCard
            key={vision.id}
            vision={vision}
            isExpanded={expandedId === vision.id}
            onToggle={() => setExpandedId(expandedId === vision.id ? null : vision.id)}
            onUpdate={(updates) => handleUpdate(vision.id, updates)}
            onDelete={() => handleDelete(vision.id)}
            canDelete={visions.length > 1}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>

      {/* ビジョン追加ボタン */}
      {!isReadOnly && visions.length < MAX_VISIONS && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8A8276]/60 hover:text-[#8A8276]/90 transition-colors disabled:opacity-40"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          ビジョンを追加
        </button>
      )}
    </section>
  );
}

function VisionCard({
  vision,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  canDelete,
  isReadOnly,
}: {
  vision: VisionItem;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<VisionItem>) => void;
  onDelete: () => void;
  canDelete: boolean;
  isReadOnly: boolean;
}) {
  const [label, setLabel] = useState(vision.label);
  const [content, setContent] = useState(vision.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanges = label !== vision.label || content !== vision.content;

  async function handleSave() {
    if (saving || !hasChanges) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/visions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vision.id, label: label.trim(), content: content.trim() }),
      });
      if (res.ok) {
        const { vision: updated } = (await res.json()) as { vision: VisionItem };
        onUpdate({ label: updated.label, content: updated.content });
        setLabel(updated.label);
        setContent(updated.content);
        setSaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaved(false), 3000);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  async function handleDeleteClick() {
    if (deleting) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  }

  return (
    <div
      className="rounded-xl border border-white/[0.07] overflow-hidden"
      style={{ background: "rgba(255,255,255,0.018)" }}
    >
      {/* ヘッダー（折りたたみトグル） */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[13px] text-[#E8E3D8]/75 truncate">{vision.label}</span>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#8A8276]/40 transition-transform duration-200 flex-shrink-0 ml-2"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* 展開コンテンツ */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: isExpanded ? "600px" : "0px",
          opacity: isExpanded ? 1 : 0,
          transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
        }}
      >
        <div className="px-4 pb-4 space-y-3">
          {/* ラベル入力 */}
          {!isReadOnly ? (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 50))}
              placeholder="ラベル名"
              className="w-full bg-transparent border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-[#E8E3D8]/80 placeholder-white/30 focus:outline-none focus:border-[#C4A35A]/30 transition-colors"
            />
          ) : (
            <p className="text-[12px] text-[#8A8276]/60 font-mono">{label}</p>
          )}

          {/* テキストエリア */}
          {!isReadOnly ? (
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                rows={5}
                placeholder="あなたの目標や大事にしていることを入力してください..."
                className="w-full bg-transparent border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-[#E8E3D8]/85 placeholder-white/35 leading-relaxed resize-none focus:outline-none focus:border-[#C4A35A]/30 transition-colors"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-[#8A8276]/30 font-mono">{content.length}/{MAX_CHARS}</span>
              </div>
            </div>
          ) : content ? (
            <p className="text-[13px] text-[#E8E3D8]/75 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-[11px] text-[#8A8276]/40">未入力</p>
          )}

          {/* アクションボタン */}
          {!isReadOnly && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C4A35A]/15 text-[#C4A35A]/80 hover:bg-[#C4A35A]/25"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                {saved && (
                  <span className="text-[10px] text-[#C4A35A]/60 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    保存しました
                  </span>
                )}
              </div>

              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={deleting}
                  className="text-red-400/40 hover:text-red-400/70 transition-colors disabled:opacity-20"
                  aria-label="ビジョンを削除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
