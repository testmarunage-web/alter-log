"use client";

import { useState, useRef, useEffect } from "react";

const MAX_CHARS = 12000;
const MAX_REC_SEC = 300; // 5分

interface Props {
  initialVision: string | null;
  isReadOnly: boolean;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60).toString();
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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
  const [recElapsed, setRecElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef = useRef(false);
  const recElapsedRef = useRef(0); // ビープ判定用（state updater外から参照）

  // アンマウント時にタイマー・ストリームをクリーンアップ
  useEffect(() => {
    return () => {
      clearTimers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  function clearTimers() {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }

  const hasContent = savedText.trim().length > 0;

  // ── 通知音ヘルパー ───────────────────────────────────────────────────────────
  function playBeep(type: "start" | "warning" | "end") {
    console.log("[VisionSection playBeep] called:", type);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtxClass = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtxClass();
      console.log("[VisionSection playBeep] AudioContext state:", ctx.state);

      const play = () => {
        const t = ctx.currentTime;
        if (type === "start") {
          // 録音開始：1200Hz→1400Hzの上昇トーン、100ms
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(1200, t);
          osc.frequency.linearRampToValueAtTime(1400, t + 0.10);
          gain.gain.setValueAtTime(0.4, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
          osc.start(t);
          osc.stop(t + 0.10);
        } else if (type === "warning") {
          // 残り30秒：短い高音ビープ（880Hz, 120ms）
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.start(t);
          osc.stop(t + 0.12);
        } else {
          // 残り10秒（4:50）：ピピピッ 3連ビープ（960Hz, 280ms）
          const beepTimes = [0, 0.1, 0.2];
          for (const offset of beepTimes) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 960;
            const onDur = offset === 0.2 ? 0.08 : 0.06;
            gain.gain.setValueAtTime(0.5, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, t + offset + onDur);
            osc.start(t + offset);
            osc.stop(t + offset + onDur);
          }
        }
        console.log("[VisionSection playBeep] oscillator started:", type);
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(play).catch((e) => console.warn("[VisionSection playBeep] resume failed:", e));
      } else {
        play();
      }
    } catch (e) {
      console.warn("[VisionSection playBeep] error:", e);
    }
  }

  function enterEdit() {
    setText(savedText);
    setMode("edit");
    setSaveError(null);
    setMicError(null);
  }

  function cancelEdit() {
    if (isRecording) {
      clearTimers();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setRecElapsed(0);
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
    autoStoppedRef.current = false;
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
        clearTimers();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        setRecElapsed(0);

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
          autoStoppedRef.current = false;
        }
      };

      recorder.start(250);
      playBeep("start"); // 録音開始音
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecElapsed(0);
      recElapsedRef.current = 0;

      // 経過秒数カウンター
      elapsedTimerRef.current = setInterval(() => {
        recElapsedRef.current += 1;
        const next = recElapsedRef.current;
        setRecElapsed(next);
        // 残り10秒（290秒経過）でトリプルビープ
        if (next === MAX_REC_SEC - 10) playBeep("end");
      }, 1000);

      // 5分自動停止（音なし）
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
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
    setRecElapsed(0);
  }

  const isNearLimit = recElapsed >= MAX_REC_SEC - 30;

  return (
    <section className="mb-8">
      {/* セクションタイトル */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#C4A35A]/70 flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <h2 className="text-xl font-bold text-[#C4A35A] leading-snug tracking-tight">
          My Vision
        </h2>
      </div>
      <p className="text-[11px] text-[#8A8276] mb-4 leading-relaxed">
        Alterが裏側で参照している、あなた自身の目標・価値観・なりたい姿
      </p>

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
              <p className="text-[12px] text-white/55 leading-relaxed mb-4">
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
            <p className="text-[11px] text-white/50 leading-relaxed mb-3">
              あなたの目標・大事にしていること・なりたい姿などを自由に入力してください。SCANやAlter Logの分析の参考情報として使われます。
            </p>

            {/* テキストエリア */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={7}
              placeholder="例：3年後には独立して自分のプロダクトを持ちたい。大事にしているのは誠実さと継続力。..."
              className="w-full bg-transparent border border-white/[0.08] rounded-lg px-4 py-3 text-[13px] text-[#E8E3D8]/85 placeholder-white/35 leading-relaxed resize-none focus:outline-none focus:border-[#C4A35A]/30 transition-colors font-sans"
            />

            {/* 音声入力エリア */}
            <div className="mt-2.5 mb-4">
              {isTranscribing ? (
                <div className="flex items-center gap-2 text-[#C4A35A]/60">
                  <span className="w-3 h-3 border border-[#C4A35A]/60 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-[11px] font-mono">文字起こし中...</span>
                </div>
              ) : isRecording ? (
                <div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg bg-red-500/12 border border-red-500/25 text-red-400/80 hover:bg-red-500/18 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"
                      style={{ animation: "dot-pulse 1s ease-in-out infinite" }}
                    />
                    <span className="text-[12px] font-mono">タップして停止</span>
                    <span
                      className={`font-mono text-[12px] font-normal transition-colors ${
                        isNearLimit ? "text-red-300" : "text-white/60"
                      }`}
                    >
                      {fmtTime(recElapsed)} / {fmtTime(MAX_REC_SEC)}
                    </span>
                  </button>
                  <p className="mt-1.5 text-[10px] font-mono text-white/25 text-right">
                    最大5分まで録音できます
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.12] text-[#8A8276]/80 hover:border-[#C4A35A]/25 hover:text-[#C4A35A]/65 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span className="text-[11px] font-mono">音声入力</span>
                  </button>
                  <span className="text-[10px] font-mono text-white/20">
                    {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </span>
                </div>
              )}
              {micError && (
                <p className="mt-1.5 text-[10px] text-red-400/60 font-mono">{micError}</p>
              )}
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
          50%       { opacity: 0.3; }
        }
      `}</style>
    </section>
  );
}
