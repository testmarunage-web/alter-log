"use client";

import { useRef, useState } from "react";

type InputMode = "voice" | "text";
type Status = "idle" | "recording" | "transcribing" | "submitting" | "done";

const MAX_REC_SEC = 300; // 5分

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60).toString();
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface Props {
  bookId: string;
}

export function ReviewForm({ bookId }: Props) {
  const [inputMode, setInputMode]   = useState<InputMode>("voice");
  const [status, setStatus]         = useState<Status>("idle");
  const [textInput, setTextInput]   = useState("");
  const [recElapsed, setRecElapsed] = useState(0);
  const [error, setError]           = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const elapsedTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef   = useRef(false);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);

  const isProcessing = status === "recording" || status === "transcribing" || status === "submitting";
  const isDone       = status === "done";

  function stopTimers() {
    if (elapsedTimerRef.current)  { clearInterval(elapsedTimerRef.current);  elapsedTimerRef.current = null; }
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current);  autoStopTimerRef.current = null; }
  }

  // ── 音声録音 ─────────────────────────────────────────────────────────────

  async function handleMicToggle() {
    setError(null);

    if (status === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const wasAutoStopped = autoStoppedRef.current;
      stopTimers();
      stream.getTracks().forEach((t) => t.stop());
      setRecElapsed(0);
      autoStoppedRef.current = false;

      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      if (blob.size < 200) {
        setStatus("idle");
        return;
      }

      setStatus("transcribing");
      try {
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const fd = new FormData();
        fd.append("audio", blob, `audio.${ext}`);

        const res = await fetch(`/api/books/${bookId}/review`, { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json() as { text: string };
          setResultText(data.text);
          setStatus("done");
          if (wasAutoStopped) {
            setError("5分経過のため録音を終了しました。続きがある場合はもう一度録音してください。");
          }
        } else {
          const errBody = await res.json().catch(() => ({ error: "不明なエラー" }));
          setError(
            wasAutoStopped
              ? "録音を終了しました。続きがある場合はもう一度マイクボタンを押してお話しください。"
              : `音声の変換に失敗しました。${errBody.error ? `（${errBody.error}）` : ""}`
          );
          setStatus("idle");
        }
      } catch {
        setError(
          wasAutoStopped
            ? "録音を終了しました。続きがある場合はもう一度マイクボタンを押してお話しください。"
            : "音声の送信に失敗しました。接続を確認してください。"
        );
        setStatus("idle");
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250);

    setRecElapsed(0);
    autoStoppedRef.current = false;
    elapsedTimerRef.current = setInterval(() => setRecElapsed((p) => p + 1), 1000);
    autoStopTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        autoStoppedRef.current = true;
        mediaRecorderRef.current.stop();
      }
    }, MAX_REC_SEC * 1000);

    setStatus("recording");
  }

  // ── テキスト送信 ──────────────────────────────────────────────────────────

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = textInput.trim();
    if (!text) return;

    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch(`/api/books/${bookId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json() as { text: string };
        setResultText(data.text);
        setStatus("done");
      } else {
        const errBody = await res.json().catch(() => ({ error: "不明なエラー" }));
        setError(`送信に失敗しました。${errBody.error ? `（${errBody.error}）` : ""}`);
        setStatus("idle");
      }
    } catch {
      setError("送信に失敗しました。接続を確認してください。");
      setStatus("idle");
    }
  }

  // ── 完了状態 ──────────────────────────────────────────────────────────────

  if (isDone && resultText) {
    return (
      <div className="rounded-2xl border border-[#C4A35A]/20 px-5 py-5" style={{ background: "rgba(196,163,90,0.03)" }}>
        <p className="font-mono text-[9px] tracking-[0.2em] text-[#C4A35A]/50 uppercase mb-3">レビュー完了</p>
        <p className="text-[13px] text-[#E8E3D8]/70 leading-[1.85] whitespace-pre-wrap">{resultText}</p>
        {error && (
          <p className="mt-3 text-[11px] text-[#C4A35A]/60">{error}</p>
        )}
      </div>
    );
  }

  // ── 入力フォーム ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* モード切替トグル（処理中は非表示） */}
      {!isProcessing && (
        <div className="flex gap-1 p-1 rounded-xl border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.018)" }}>
          <button
            type="button"
            onClick={() => setInputMode("voice")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200
              ${inputMode === "voice"
                ? "bg-white/[0.08] text-[#E8E3D8]/80"
                : "text-[#8A8276]/50 hover:text-[#8A8276]/80"
              }`}
          >
            {/* マイクアイコン */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            音声
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode("text");
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200
              ${inputMode === "text"
                ? "bg-white/[0.08] text-[#E8E3D8]/80"
                : "text-[#8A8276]/50 hover:text-[#8A8276]/80"
              }`}
          >
            {/* キーボードアイコン */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            テキスト
          </button>
        </div>
      )}

      {/* ── 音声モード ── */}
      {inputMode === "voice" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={status === "transcribing"}
            className={`relative w-full py-5 rounded-2xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-3 transition-all duration-200
              ${status === "recording"
                ? "bg-[#C62828] text-white active:scale-[0.98]"
                : status === "transcribing"
                  ? "bg-white/[0.05] border border-[#C4A35A]/25 text-[#C4A35A]/70 cursor-not-allowed"
                  : "bg-white/[0.05] border border-white/[0.10] text-[#E8E3D8]/70 hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-[#E8E3D8] active:scale-[0.98]"
              }`}
          >
            {status === "recording" && (
              <span className="absolute inset-0 rounded-2xl border border-red-700/25 animate-ping" />
            )}

            {status === "transcribing" ? (
              <>
                <span className="w-5 h-5 border-2 border-[#C4A35A]/50 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                音声を変換中...
              </>
            ) : status === "recording" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
                タップして停止
                <span className={`ml-1 font-mono text-[13px] font-normal transition-colors ${recElapsed >= MAX_REC_SEC - 30 ? "text-red-200" : "text-white/70"}`}>
                  {fmtTime(recElapsed)} / {fmtTime(MAX_REC_SEC)}
                </span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                音声でレビューする
              </>
            )}
          </button>

          {status === "recording" && (
            <p className="text-center text-[10px] text-white/30 font-mono">
              最大5分まで録音できます
            </p>
          )}
        </div>
      )}

      {/* ── テキストモード ── */}
      {inputMode === "text" && (
        <form onSubmit={handleTextSubmit} className="space-y-2">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="この本の感想、気づき、印象に残ったこと..."
              disabled={isProcessing}
              className="w-full resize-none bg-white/[0.025] border border-white/[0.07] focus:border-[#C4A35A]/35 rounded-2xl px-5 py-4 text-sm leading-relaxed text-[#E8E3D8] placeholder:text-[#8A8276]/40 focus:outline-none transition-colors disabled:opacity-50"
              style={{ height: "140px" }}
            />
            {textInput.length > 0 && (
              <span className={`absolute bottom-3 right-4 text-[10px] font-mono pointer-events-none transition-colors ${textInput.length >= 1800 ? "text-red-400/70" : "text-[#8A8276]/40"}`}>
                {textInput.length.toLocaleString()} / 2,000
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2
              ${textInput.trim() && !isProcessing
                ? "bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_20px_rgba(196,163,90,0.3)] active:scale-[0.98]"
                : "bg-white/[0.03] border border-white/[0.06] text-[#8A8276]/30 cursor-not-allowed"
              }`}
          >
            {status === "submitting" ? (
              <span className="w-4 h-4 border border-[#0B0E13]/60 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
            {status === "submitting" ? "送信中..." : "レビューを送信する"}
          </button>
        </form>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="rounded-xl px-4 py-2.5 bg-red-500/10 border border-red-500/25 flex items-center justify-between gap-3">
          <p className="text-[12px] text-red-400/80 leading-snug">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-white/20 hover:text-white/40 transition-colors flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
