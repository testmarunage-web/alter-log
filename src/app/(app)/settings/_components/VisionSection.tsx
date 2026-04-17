"use client";

import { useState, useRef, useEffect } from "react";
import { useRecordingLock } from "../../_components/RecordingLockProvider";

const MAX_CHARS = 12000;
const MAX_VISIONS = 5;
const MAX_REC_SEC = 300;

interface VisionItem {
  id: string;
  label: string;
  content: string;
}

interface Props {
  initialVisions: VisionItem[];
  isReadOnly: boolean;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60).toString();
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C4A35A]/70 flex-shrink-0">
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
  vision, isExpanded, onToggle, onUpdate, onDelete, canDelete, isReadOnly,
}: {
  vision: VisionItem; isExpanded: boolean; onToggle: () => void;
  onUpdate: (updates: Partial<VisionItem>) => void; onDelete: () => void;
  canDelete: boolean; isReadOnly: boolean;
}) {
  const { setNavLocked } = useRecordingLock();

  const [label, setLabel] = useState(vision.label);
  const [content, setContent] = useState(vision.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [recElapsed, setRecElapsed] = useState(0);
  const [holdingStop, setHoldingStop] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef = useRef(false);
  const recElapsedRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanges = label !== vision.label || content !== vision.content;
  const isNearLimit = recElapsed >= MAX_REC_SEC - 30;

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearTimers();
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, []);

  // BottomNav 無効化
  useEffect(() => {
    setNavLocked(isRecording || isTranscribing);
  }, [isRecording, isTranscribing, setNavLocked]);
  useEffect(() => {
    return () => setNavLocked(false);
  }, [setNavLocked]);

  // beforeunload
  useEffect(() => {
    if (!isTranscribing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isTranscribing]);

  function clearTimers() {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
  }

  function playBeep(type: "start" | "end") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtxClass = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtxClass();
      const play = () => {
        const t = ctx.currentTime;
        if (type === "start") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(1200, t);
          osc.frequency.linearRampToValueAtTime(1400, t + 0.10);
          gain.gain.setValueAtTime(0.4, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
          osc.start(t); osc.stop(t + 0.10);
        } else {
          for (const offset of [0, 0.1, 0.2]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 960;
            gain.gain.setValueAtTime(0.5, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.06);
            osc.start(t + offset); osc.stop(t + offset + 0.06);
          }
        }
      };
      if (ctx.state === "suspended") { ctx.resume().then(play).catch(() => {}); } else { play(); }
    } catch {}
  }

  async function startRecording() {
    setMicError(null);
    autoStoppedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeCandidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
      const preferredMime = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t));
      const recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 64000 };
      if (preferredMime) recorderOptions.mimeType = preferredMime;
      const recorder = new MediaRecorder(stream, recorderOptions);
      const mimeType = recorder.mimeType || preferredMime || "audio/webm";
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        clearTimers();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        setRecElapsed(0);

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (chunks.reduce((acc, c) => acc + c.size, 0) < 200) return;

        setIsTranscribing(true);
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const fd = new FormData();
        fd.append("audio", blob, `recording.${ext}`);

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const { text: transcribed } = (await res.json()) as { text?: string };
            if (transcribed) setContent((prev) => (prev ? prev + "\n" + transcribed : transcribed));
          } else {
            setMicError("文字起こしに失敗しました。");
          }
        } catch {
          setMicError("文字起こしに失敗しました。");
        } finally {
          setIsTranscribing(false);
          autoStoppedRef.current = false;
        }
      };

      recorder.start(250);
      playBeep("start");
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecElapsed(0);
      recElapsedRef.current = 0;

      elapsedTimerRef.current = setInterval(() => {
        recElapsedRef.current += 1;
        setRecElapsed(recElapsedRef.current);
        if (recElapsedRef.current === MAX_REC_SEC - 10) playBeep("end");
      }, 1000);

      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          autoStoppedRef.current = true;
          mediaRecorderRef.current.stop();
        }
      }, MAX_REC_SEC * 1000);
    } catch {
      setMicError("マイクへのアクセスが許可されていません。");
    }
  }

  function stopRecording() {
    clearTimers();
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecElapsed(0);
  }

  function handleStopPressStart() {
    setHoldingStop(true);
    holdTimerRef.current = setTimeout(() => { setHoldingStop(false); stopRecording(); }, 1000);
  }
  function handleStopPressEnd() {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    setHoldingStop(false);
  }

  async function handleSave() {
    if (saving || !hasChanges) return;
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/visions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vision.id, label: label.trim(), content: content.trim() }),
      });
      if (res.ok) {
        const { vision: updated } = (await res.json()) as { vision: VisionItem };
        onUpdate({ label: updated.label, content: updated.content });
        setLabel(updated.label); setContent(updated.content);
        setSaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaved(false), 3000);
      }
    } catch {} finally { setSaving(false); }
  }

  async function handleDeleteClick() {
    if (deleting) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
      {/* ヘッダー */}
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-[13px] text-[#E8E3D8]/75 truncate">{vision.label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#8A8276]/40 transition-transform duration-200 flex-shrink-0 ml-2"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* 展開コンテンツ */}
      <div className="overflow-hidden" style={{
        maxHeight: isExpanded ? "800px" : "0px", opacity: isExpanded ? 1 : 0,
        transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
      }}>
        <div className="px-4 pb-4 space-y-3">
          {/* ラベル */}
          {!isReadOnly ? (
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value.slice(0, 50))}
              placeholder="ラベル名"
              className="w-full bg-transparent border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-[#E8E3D8]/80 placeholder-white/30 focus:outline-none focus:border-[#C4A35A]/30 transition-colors" />
          ) : (
            <p className="text-[12px] text-[#8A8276]/60 font-mono">{label}</p>
          )}

          {/* テキストエリア */}
          {!isReadOnly ? (
            <div>
              <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                rows={5} placeholder="あなたの目標や大事にしていることを入力してください..."
                className="w-full bg-transparent border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-[#E8E3D8]/85 placeholder-white/35 leading-relaxed resize-none focus:outline-none focus:border-[#C4A35A]/30 transition-colors" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-[#8A8276]/30 font-mono">{content.length}/{MAX_CHARS}</span>
              </div>
            </div>
          ) : content ? (
            <p className="text-[13px] text-[#E8E3D8]/75 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-[11px] text-[#8A8276]/40">未入力</p>
          )}

          {/* 音声入力 */}
          {!isReadOnly && (
            <div>
              {isTranscribing ? (
                <div className="flex items-center gap-2 text-[#C4A35A]/60">
                  <span className="w-3 h-3 border border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-[11px] font-mono">文字起こし中...</span>
                </div>
              ) : isRecording ? (
                <button type="button"
                  onMouseDown={handleStopPressStart} onMouseUp={handleStopPressEnd}
                  onMouseLeave={handleStopPressEnd} onTouchStart={handleStopPressStart} onTouchEnd={handleStopPressEnd}
                  className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border transition-all duration-200 select-none ${
                    holdingStop ? "bg-red-500/25 border-red-500/40 text-red-300 scale-[0.97]" : "bg-red-500/12 border-red-500/25 text-red-400/80"
                  }`}>
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" style={{ animation: "dot-pulse 1s ease-in-out infinite" }} />
                  <span className="text-[12px] font-mono">{holdingStop ? "離すと停止します" : "長押しで停止"}</span>
                  <span className={`font-mono text-[12px] font-normal transition-colors ${isNearLimit ? "text-red-300" : "text-white/60"}`}>
                    {fmtTime(recElapsed)} / {fmtTime(MAX_REC_SEC)}
                  </span>
                </button>
              ) : (
                <button type="button" onClick={startRecording}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/[0.08] text-[#8A8276]/70 hover:text-[#8A8276] hover:border-white/[0.15] hover:bg-white/[0.02] transition-colors text-[12px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  音声で入力
                </button>
              )}
              {micError && <p className="mt-1 text-[10px] text-red-400/70">{micError}</p>}
            </div>
          )}

          {/* アクションボタン */}
          {!isReadOnly && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleSave} disabled={saving || !hasChanges}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C4A35A]/15 text-[#C4A35A]/80 hover:bg-[#C4A35A]/25">
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
                <button type="button" onClick={handleDeleteClick} disabled={deleting}
                  className="text-red-400/40 hover:text-red-400/70 transition-colors disabled:opacity-20" aria-label="ビジョンを削除">
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
