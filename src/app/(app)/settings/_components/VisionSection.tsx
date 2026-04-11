"use client";

import { useState, useRef } from "react";

const MAX_CHARS = 12000;

interface Props {
  initialVision: string | null;
  isReadOnly: boolean;
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

export function VisionSection({ initialVision, isReadOnly }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [text, setText] = useState(initialVision ?? "");
  const [savedText, setSavedText] = useState(initialVision ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const hasContent = savedText.trim().length > 0;

  function enterEdit() {
    setText(savedText);
    setMode("edit");
    setSaveError(null);
    setMicError(null);
  }

  function cancelEdit() {
    // 録音中なら止める
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
    setText(savedText);
    setMode("view");
    setSaveError(null);
    setMicError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vision: text }),
      });
      if (!res.ok) {
        setSaveError("保存に失敗しました。もう一度お試しください。");
        return;
      }
      const trimmed = text.trim();
      setSavedText(trimmed);
      setText(trimmed);
      setMode("view");
    } catch {
      setSaveError("通信エラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  }

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        const totalSize = chunks.reduce((acc, c) => acc + c.size, 0);
        if (totalSize < 200) return;

        setIsTranscribing(true);
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const fd = new FormData();
        fd.append("audio", blob, `recording.${ext}`);

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const { text: transcribed } = (await res.json()) as { text?: string };
            if (transcribed) {
              setText((prev) => (prev ? prev + "\n" + transcribed : transcribed));
            }
          } else {
            setMicError("文字起こしに失敗しました。");
          }
        } catch {
          setMicError("文字起こしに失敗しました。");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setMicError("マイクへのアクセスが許可されていません。");
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  return (
    <section className="mb-8">
      {/* セクションタイトル */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#C4A35A]/60"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <h2 className="font-mono text-[12px] tracking-[0.18em] text-[#C4A35A]/75 uppercase">
          My Vision
        </h2>
      </div>

      <div
        className="rounded-xl border border-[#C4A35A]/15 overflow-hidden"
        style={{ background: "rgba(196,163,90,0.025)" }}
      >
        {mode === "view" ? (
          /* ── 表示モード ── */
          <div className="px-5 py-5">
            {hasContent ? (
              <p className="text-[13px] text-[#E8E3D8]/80 leading-relaxed whitespace-pre-wrap mb-4">
                {savedText}
              </p>
            ) : (
              <p className="text-[12px] text-white/30 leading-relaxed mb-4">
                あなたの目標・大事にしていること・なりたい姿などを自由に入力してください。ここに入力された内容をもとに、SCANやAlter Logの分析がより深くなります。
              </p>
            )}

            {isReadOnly ? (
              <p className="text-[11px] text-white/20">
                サブスクリプションを再開すると編集できます
              </p>
            ) : (
              <button
                type="button"
                onClick={enterEdit}
                className="text-[11px] font-mono text-[#C4A35A]/60 hover:text-[#C4A35A]/85 transition-colors flex items-center gap-1.5"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {hasContent ? "編集する" : "入力する"}
              </button>
            )}
          </div>
        ) : (
          /* ── 編集モード ── */
          <div className="px-5 py-5">
            <p className="text-[11px] text-white/30 leading-relaxed mb-3">
              あなたの目標・大事にしていること・なりたい姿などを自由に入力してください。SCANやAlter Logの分析の参考情報として使われます。
            </p>

            {/* テキストエリア */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={7}
              placeholder="例：3年後には独立して自分のプロダクトを持ちたい。大事にしているのは誠実さと継続力。..."
              className="w-full bg-transparent border border-white/[0.08] rounded-lg px-4 py-3 text-[13px] text-[#E8E3D8]/85 placeholder-white/20 leading-relaxed resize-none focus:outline-none focus:border-[#C4A35A]/30 transition-colors font-sans"
            />

            {/* 文字数 + マイクボタン */}
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-3">
                {/* マイクボタン */}
                {isTranscribing ? (
                  <div className="flex items-center gap-1.5 text-[#C4A35A]/60">
                    <span className="w-3 h-3 border border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <span className="text-[10px] font-mono">変換中...</span>
                  </div>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400/80 hover:bg-red-500/20 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"
                      style={{ animation: "dot-pulse 1s ease-in-out infinite" }}
                    />
                    <StopIcon />
                    <span className="text-[10px] font-mono">停止</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[#8A8276]/70 hover:text-[#E8E3D8]/70 hover:border-white/[0.14] transition-colors"
                  >
                    <MicIcon />
                    <span className="text-[10px] font-mono">音声入力</span>
                  </button>
                )}

                {micError && (
                  <span className="text-[10px] text-red-400/60 font-mono">{micError}</span>
                )}
              </div>

              <span className="text-[10px] font-mono text-white/20">
                {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>

            {/* 保存 / キャンセル */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isRecording || isTranscribing}
                className="flex-1 py-2.5 rounded-lg bg-[#C4A35A]/15 border border-[#C4A35A]/30 text-[#C4A35A]/80 hover:bg-[#C4A35A]/22 hover:text-[#C4A35A] transition-colors text-[12px] font-mono font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? "保存中..." : "保存する"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white/50 hover:border-white/[0.12] transition-colors text-[12px] font-mono disabled:opacity-40 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
            </div>

            {saveError && (
              <p className="mt-2 text-[11px] text-red-400/60 font-mono">{saveError}</p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}
