"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveChatMessage } from "@/app/actions/chat";
import { AlterIcon } from "../../_components/AlterIcon";
import { useReadOnly, useShowRefundNotice } from "../../_components/ReadOnlyProvider";
import { useRecordingLock } from "../../_components/RecordingLockProvider";
import { DailyCalendar } from "../../_components/DailyCalendar";
import { CopyButton } from "../../_components/CopyButton";

// ジャーナルカード用の日時フォーマット
function formatDateTime(date: Date): string {
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface JournalMessage {
  id: string;
  content: string;
  createdAt: Date;
}

interface PastJournalEntry {
  content: string;
  createdAt: string; // ISO string
  dailyNote: string | null;
  entries: { content: string; timeStr: string }[];
}

interface Props {
  initialJournalMessages: JournalMessage[];
  userName: string;
  hasTodayJournal: boolean;
  pastJournal: PastJournalEntry | null;
  journalDates: string[]; // YYYY-MM-DD（カレンダー用）
  showVisionBanner?: boolean;
  hasNeverScanned?: boolean; // lastDashboardScanAt が null のユーザー
}

// ── 「あの時のあなた」カード ────────────────────────────────────────────────
function PastJournalCard({ dateStr, entries, dailyNote }: {
  dateStr: string;
  entries: { content: string; timeStr: string }[];
  dailyNote: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const firstEntry = entries[0];
  const preview = firstEntry?.content.slice(0, 100) ?? "";
  const hasMore = (firstEntry?.content.length ?? 0) > 100 || entries.length > 1;
  const allText = entries.map((e) => e.content).join("\n\n");

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pb-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left"
          style={{ opacity: 0.5 }}
        >
          <div
            className="rounded-xl px-4 py-3 border border-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.012)" }}
          >
            <p className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase mb-1.5">
              あの時のあなた — {dateStr}
            </p>
            {!expanded ? (
              <p className="text-[13px] text-white/55 leading-relaxed pr-6">
                {preview}
                {hasMore && <span className="text-white/25">...</span>}
              </p>
            ) : (
              <div className="space-y-3 pr-6">
                {entries.map((entry, i) => (
                  <div key={i}>
                    {i > 0 && <div className="border-t border-white/[0.05] pt-3" />}
                    {entries.length > 1 && (
                      <p className="font-mono text-[8px] text-white/20 mb-1">{entry.timeStr}</p>
                    )}
                    <p className="text-[13px] text-white/55 leading-relaxed">{entry.content}</p>
                  </div>
                ))}
                {dailyNote && (
                  <p className="mt-1 pt-2 border-t border-white/[0.05] text-[11px] text-[#C4A35A]/45 leading-relaxed italic">
                    {dailyNote.slice(0, 120)}
                  </p>
                )}
              </div>
            )}
          </div>
        </button>
        {/* コピーボタン（button の外に配置して interactive 要素の入れ子を避ける） */}
        <div className="absolute top-3 right-3 z-10" style={{ opacity: 1 }}>
          <CopyButton text={allText} />
        </div>
      </div>
    </div>
  );
}

// ── Alterアバター（フラットな欠けた円） ────────────────────────────────────
function AlterAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "sm" ? 28 : 36;
  return <AlterIcon size={px} />;
}


// ── メインコンポーネント ─────────────────────────────────────────────────────
export function ChatInterface({
  initialJournalMessages,
  userName,
  hasTodayJournal,
  pastJournal,
  journalDates,
  showVisionBanner = false,
  hasNeverScanned = false,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const journalListRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const isReadOnly = useReadOnly();
  const showRefundNotice = useShowRefundNotice();
  const { setNavLocked } = useRecordingLock();

  const [journalMessages, setJournalMessages] = useState<JournalMessage[]>(initialJournalMessages);
  const [journalInput, setJournalInput]       = useState("");
  const [hintOpen, setHintOpen]               = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [showWelcome, setShowWelcome]         = useState(false);
  const [welcomeFading, setWelcomeFading]     = useState(false);
  const [showFocusTooltip, setShowFocusTooltip] = useState(false);
  const [showScanSuggestion, setShowScanSuggestion] = useState(false);
  const [inputVisible, setInputVisible]       = useState(true);
  const [isRecording, setIsRecording]         = useState(false);
  const [isTranscribing, setIsTranscribing]   = useState(false);
  const [micError, setMicError]               = useState<string | null>(null);
  const [textInputOpen, setTextInputOpen]     = useState(false);
  const [recElapsed, setRecElapsed]           = useState(0);   // 録音経過秒数
  const [autoStopped, setAutoStopped]         = useState(false); // 5分自動停止フラグ
  const [visionBannerDismissed, setVisionBannerDismissed] = useState(false);
  const [scanCardVisible, setScanCardVisible]             = useState(false); // SCAN未実行カード表示
  const [scanCardDismissed, setScanCardDismissed]         = useState(false); // セッション中閉じたか
  const [sizeStopped, setSizeStopped]         = useState(false); // 20MB超過自動停止フラグ
  const [holdingStop, setHoldingStop]         = useState(false); // 停止ボタン長押し中フラグ
  const [refundDismissed, setRefundDismissed] = useState(false); // 返金案内バナー閉じ済み
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const animFrameRef      = useRef<number | null>(null);
  const waveCanvasRef     = useRef<HTMLCanvasElement | null>(null);
  const elapsedTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef    = useRef(false); // onstop の stale closure 対策
  const recElapsedRef     = useRef(0);    // ビープ判定用（state updater外から参照）
  const sizeLimitStoppedRef = useRef(false); // 20MB超過フラグ（stale closure 対策）
  const wakeLockRef          = useRef<WakeLockSentinel | null>(null); // 画面スリープ防止
  const visibilityHandlerRef = useRef<(() => void) | null>(null);    // visibilitychange リスナー
  const bgStoppedRef         = useRef(false); // バックグラウンド移行による停止フラグ
  const holdTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null); // 長押しタイマー

  const MAX_REC_SEC = 300; // 5分

  // ── 通知音ヘルパー ───────────────────────────────────────────────────────────
  function playBeep(type: "start" | "warning" | "end") {
    console.log("[playBeep] called:", type);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtxClass = window.AudioContext ?? (window as any).webkitAudioContext;
      // closed状態のAudioContextは再利用不可 → 新規作成
      const existing = audioContextRef.current;
      const ctx: AudioContext =
        existing && existing.state !== "closed" ? existing : new AudioCtxClass();
      console.log("[playBeep] AudioContext state:", ctx.state);

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
          // ON:0-60ms / OFF:60-100ms / ON:100-160ms / OFF:160-200ms / ON:200-280ms→fadeout
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
        console.log("[playBeep] oscillator started:", type);
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(play).catch((e) => console.warn("[playBeep] resume failed:", e));
      } else {
        play();
      }
    } catch (e) {
      console.warn("[playBeep] error:", e);
    }
  }

  // 初回のみウェルカムモーダルを表示
  useEffect(() => {
    try {
      if (!localStorage.getItem("alter-log-welcomed")) {
        setShowWelcome(true);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // コンポーネントアンマウント時に録音・AudioContext・タイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      audioContextRef.current?.close();
      // Wake Lock と visibilitychange のクリーンアップ
      wakeLockRef.current?.release().catch(() => {});
      if (visibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
    };
  }, []);

  // 音声入力ヒント（フォーカス時・3回まで）
  const VOICE_HINT_KEY = "alter-log-voice-hint-count";

  function handleTextareaFocus() {
    try {
      const count = parseInt(localStorage.getItem(VOICE_HINT_KEY) ?? "0", 10);
      if (count < 3) {
        localStorage.setItem(VOICE_HINT_KEY, String(count + 1));
        setShowFocusTooltip(true);
      }
    } catch { /* localStorage unavailable */ }
  }

  function handleTextareaBlur() {
    setShowFocusTooltip(false);
  }

  function handleTooltipDismiss() {
    try { localStorage.setItem(VOICE_HINT_KEY, "3"); } catch { /* noop */ }
    setShowFocusTooltip(false);
  }

  // ── 音声入力（Whisper API） ──────────────────────────────────────────────

  /** 録音に紐づくすべてのタイマー・AudioContext を停止・解放する */
  function stopRecordingResources() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    const canvas = waveCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Wake Lock 解除
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    // visibilitychange リスナー解除
    if (visibilityHandlerRef.current) {
      document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }
  }

  /** チャンクをそのままWhisper APIに送信して文字起こし（バックグラウンド移行・エラー時の救済用） */
  async function transcribeChunks(chunks: Blob[], mimeType: string, notifyMsg: string) {
    if (chunks.length === 0) return;
    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size < 200) return;
    setIsTranscribing(true);
    setMicError(notifyMsg);
    try {
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      const fd = new FormData();
      fd.append("audio", blob, `audio.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (res.ok) {
        const { text } = await res.json() as { text: string };
        if (text?.trim()) {
          setJournalInput((prev) => prev ? `${prev}\n${text.trim()}` : text.trim());
          setTextInputOpen(true);
          setTimeout(() => textareaRef.current?.focus(), 100);
        }
      }
    } catch {
      // 救済送信失敗は無視（既にエラーメッセージを表示済み）
    } finally {
      setIsTranscribing(false);
      setRecElapsed(0);
      autoStoppedRef.current = false;
      sizeLimitStoppedRef.current = false;
    }
  }

  /** AnalyserNode から周波数データを取得してキャンバスに描画（~25fps に間引き） */
  function startWaveDrawLoop() {
    const INTERVAL = 40; // ms — ~25fps
    let lastTime = 0;

    const draw = (timestamp: number) => {
      // フレームレート間引き
      if (timestamp - lastTime < INTERVAL) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastTime = timestamp;

      const canvas = waveCanvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;

      // キャンバスの内部解像度を表示サイズに同期
      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;
      if (displayW === 0 || displayH === 0) {
        // まだレイアウト確定していない場合は次フレームへ
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
        canvas.width = Math.round(displayW * dpr);
        canvas.height = Math.round(displayH * dpr);
      }

      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return;

      // 毎フレームリセット（transform の積み上がり防止）
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, displayW, displayH);

      const BAR_COUNT = 8;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // 声帯域（低〜中周波数の前半）を使用
      const voiceBins = Math.floor(analyser.frequencyBinCount * 0.45);

      const gap = 4;
      const barW = (displayW - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const minBarH = 3;

      for (let i = 0; i < BAR_COUNT; i++) {
        const sampleIdx = Math.floor((i / BAR_COUNT) * voiceBins);
        const v = dataArray[sampleIdx] / 255; // 0〜1
        const barH = minBarH + v * (displayH - minBarH * 2);
        const x = i * (barW + gap);
        const y = (displayH - barH) / 2;
        const r = Math.min(barW / 2, 4);

        ctx2d.globalAlpha = 0.3 + v * 0.7;
        ctx2d.fillStyle = "#C9A84C";

        // 角丸バー
        ctx2d.beginPath();
        ctx2d.moveTo(x + r, y);
        ctx2d.lineTo(x + barW - r, y);
        ctx2d.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx2d.lineTo(x + barW, y + barH - r);
        ctx2d.quadraticCurveTo(x + barW, y + barH, x + barW - r, y + barH);
        ctx2d.lineTo(x + r, y + barH);
        ctx2d.quadraticCurveTo(x, y + barH, x, y + barH - r);
        ctx2d.lineTo(x, y + r);
        ctx2d.quadraticCurveTo(x, y, x + r, y);
        ctx2d.closePath();
        ctx2d.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
  }

  // isRecording が true になった直後（canvasがDOMに現れた後）にドローループを開始
  useEffect(() => {
    if (isRecording && analyserRef.current) {
      startWaveDrawLoop();
    }
    // isRecording が false になった時の停止は recorder.onstop で行うため不要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  async function handleMicToggle() {
    setMicError(null);

    if (isRecording) {
      // 手動停止
      mediaRecorderRef.current?.stop();
      return;
    }

    // 録音開始
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。");
      return;
    }

    // iOS Safari では webm 出力が不安定なため、mp4 を最優先にフォールバックチェーンを構築する
    const mimeCandidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    const preferredMime = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t));
    // 64kbps に制限: 10分 × 64000bps / 8 ≈ 4.8MB（Whisper 25MB 上限に余裕）
    const recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 64000 };
    if (preferredMime) recorderOptions.mimeType = preferredMime;
    const recorder = new MediaRecorder(stream, recorderOptions);
    // 実際に採用された MIME タイプ（fallback 時は recorder.mimeType から取得）
    const mimeType = recorder.mimeType || preferredMime || "audio/webm";
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
        // 20MB超えたら自動停止（iOSでビットレートが高い場合の安全策）
        const totalSize = audioChunksRef.current.reduce((sum, b) => sum + b.size, 0);
        if (totalSize > 20 * 1024 * 1024 && mediaRecorderRef.current?.state === "recording") {
          sizeLimitStoppedRef.current = true;
          autoStoppedRef.current = true;
          setSizeStopped(true);
          setAutoStopped(true);
          mediaRecorderRef.current.stop();
        }
      }
    };

    recorder.onstop = async () => {
      // stale closure を回避するため ref の値をスナップショット
      const wasAutoStopped = autoStoppedRef.current;
      const wasSizeStopped = sizeLimitStoppedRef.current;
      const wasBgStopped   = bgStoppedRef.current;
      stopRecordingResources();
      stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);

      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const blobSizeMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log(`[recording] onstop blob size=${blobSizeMB}MB chunks=${audioChunksRef.current.length} autoStopped=${wasAutoStopped}`);

      if (blob.size < 200) {
        setRecElapsed(0);
        autoStoppedRef.current = false;
        return;
      }

      setIsTranscribing(true);
      try {
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const fd = new FormData();
        fd.append("audio", blob, `audio.${ext}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });

        if (res.ok) {
          const { text } = await res.json() as { text: string };
          if (text?.trim()) {
            setJournalInput((prev) => prev ? `${prev}\n${text.trim()}` : text.trim());
            setTextInputOpen(true);
            setTimeout(() => textareaRef.current?.focus(), 100);
          }
          // 停止理由に応じたメッセージ
          if (wasBgStopped) {
            setMicError("画面がバックグラウンドになったため録音を停止しました。ここまでの内容は保存されています。");
          } else if (wasAutoStopped && !wasSizeStopped) {
            setMicError("5分経過のため録音を終了しました。続きがある場合はもう一度録音してください。");
          }
        } else {
          const errBody = await res.json().catch(() => ({ error: "不明なエラー" }));
          if (errBody.error === "file_too_large") {
            setMicError("録音ファイルが大きすぎます。短めに区切って再度お試しください。");
          } else if (wasAutoStopped) {
            setMicError("録音を終了しました。続きがある場合はもう一度マイクボタンを押してお話しください。");
          } else {
            setMicError(`音声の変換に失敗しました。お手数ですが、短めに区切って再度お試しください。${errBody.error ? `（${errBody.error}）` : ""}`);
          }
        }
      } catch {
        setMicError(wasAutoStopped
          ? "録音を終了しました。続きがある場合はもう一度マイクボタンを押してお話しください。"
          : "音声の送信に失敗しました。接続を確認してください。"
        );
      } finally {
        setIsTranscribing(false);
        setAutoStopped(false);
        autoStoppedRef.current = false;
        setSizeStopped(false);
        sizeLimitStoppedRef.current = false;
        bgStoppedRef.current = false;
        setRecElapsed(0);
      }
    };

    // onerror: 録音エラー時にチャンク救済送信
    recorder.onerror = () => {
      const savedChunks = [...audioChunksRef.current];
      const savedMime = mimeType;
      stopRecordingResources();
      stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      autoStoppedRef.current = false;
      sizeLimitStoppedRef.current = false;
      setAutoStopped(false);
      setSizeStopped(false);
      transcribeChunks(savedChunks, savedMime, "録音エラーが発生しました。ここまでの内容を保存しています。");
    };

    mediaRecorderRef.current = recorder;
    // timeslice 250ms: 定期的に ondataavailable を発火させてデータロスを防ぐ
    recorder.start(250);
    playBeep("start"); // 録音開始音

    // Wake Lock（画面スリープ防止）— 非対応ブラウザはスキップ
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        // visibilitychange で解除された場合（着信・アプリ切替など）に再取得
        wakeLockRef.current.addEventListener("release", async () => {
          if (mediaRecorderRef.current?.state === "recording" && document.visibilityState === "visible") {
            try {
              wakeLockRef.current = await navigator.wakeLock.request("screen");
            } catch { /* 再取得失敗は無視 */ }
          }
        });
      }
    } catch { /* Wake Lock 取得失敗は無視 */ }

    // visibilitychange: バックグラウンド移行時に録音を停止（チャンクは onstop で処理）
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && mediaRecorderRef.current?.state === "recording") {
        bgStoppedRef.current = true;
        autoStoppedRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
    visibilityHandlerRef.current = handleVisibilityChange;
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 経過秒数カウンター（1秒ごと）
    setRecElapsed(0);
    recElapsedRef.current = 0;
    setAutoStopped(false);
    autoStoppedRef.current = false;
    elapsedTimerRef.current = setInterval(() => {
      recElapsedRef.current += 1;
      const next = recElapsedRef.current;
      setRecElapsed(next);
      // 残り10秒（290秒経過）でトリプルビープ
      if (next === MAX_REC_SEC - 10) playBeep("end");
    }, 1000);

    // 5分自動停止タイマー（音なし）
    autoStopTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        autoStoppedRef.current = true;
        setAutoStopped(true);
        mediaRecorderRef.current.stop();
      }
    }, MAX_REC_SEC * 1000);

    // AudioContext + AnalyserNode を録音ストリームに接続
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtxClass = window.AudioContext ?? (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass() as AudioContext;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.88;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
    } catch {
      // AudioContext が使えない環境でも録音は続行
    }

    setIsRecording(true);
  }

  /** mm:ss フォーマット */
  function fmtTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(1, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── 停止ボタン長押しハンドラ（1秒以上で停止） ──
  function handleStopPressStart() {
    setHoldingStop(true);
    holdTimerRef.current = setTimeout(() => {
      setHoldingStop(false);
      mediaRecorderRef.current?.stop();
    }, 1000);
  }
  function handleStopPressEnd() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingStop(false);
  }

  // 長押しタイマーのクリーンアップ
  useEffect(() => {
    return () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); };
  }, []);

  // ── 録音中・文字起こし中は BottomNav を無効化 ──
  useEffect(() => {
    setNavLocked(isRecording || isTranscribing);
  }, [isRecording, isTranscribing, setNavLocked]);
  useEffect(() => {
    return () => setNavLocked(false);
  }, [setNavLocked]);

  // ── 文字起こし中のページ離脱警告 ──
  useEffect(() => {
    if (!isTranscribing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isTranscribing]);

  // 過去ジャーナルのスクロール検知 → 入力エリアの表示/非表示
  useEffect(() => {
    const el = journalListRef.current;
    if (!el) return;
    const handleScroll = () => { setInputVisible(el.scrollTop <= 20); };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  function handleWelcomeClose() {
    setWelcomeFading(true);
    try { localStorage.setItem("alter-log-welcomed", "1"); } catch { /* noop */ }
    setTimeout(() => {
      setShowWelcome(false);
      setWelcomeFading(false);
    }, 420);
  }

  function handleJournalInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setJournalInput(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  async function submitJournal(e?: React.FormEvent) {
    e?.preventDefault();
    const content = journalInput.trim();
    if (!content || isSaving) return;
    setIsSaving(true);
    setShowScanSuggestion(false);
    const now = new Date();
    setJournalMessages((prev) => [...prev, { id: `j-${Date.now()}`, content, createdAt: now }]);
    setJournalInput("");
    try {
      await saveChatMessage(content);
      setShowScanSuggestion(true);
      if (hasNeverScanned && !scanCardDismissed) {
        setScanCardVisible(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const initial   = userName.slice(0, 1).toUpperCase();
  const headerCls = "bg-[#0B0E13]/95 border-[#C4A35A]/10 backdrop-blur-md";

  const todayJst = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const hasTodayJournalEntry =
    hasTodayJournal ||
    journalMessages.some(
      (m) => m.createdAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) === todayJst
    );

  // suppress unused variable warning
  void initial;

  return (
    // h-full: AppLayoutのmain(flex-1)を埋める / overflow-hidden: 自身をはみ出させない
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#0B0E13] text-[#E8E3D8]">
      <style>{`
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-fade-in { animation: msg-in 0.32s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── ヘッダー（flex-none: 絶対に押し出されない） ── */}
      <header className={`flex-none border-b ${headerCls}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => { if (!isSaving) router.push("/dashboard"); }}
            disabled={isSaving || isRecording}
            aria-label="ダッシュボードへ戻る"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8A8276] hover:text-[#E8E3D8] hover:bg-white/[0.05] transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          <div className="flex-1 flex justify-center">
            <h1 className="text-sm font-semibold text-[#E8E3D8] tracking-wide">
              ジャーナル
            </h1>
          </div>

          <div className="w-8" />
        </div>
      </header>

      {/* ── ジャーナルモード ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* 閲覧モード時: 入力エリアをブロックしてメッセージ表示 */}
        {isReadOnly && (
          <div className="flex-none max-w-2xl mx-auto w-full px-4 pt-3 pb-2">
            <div
              className="rounded-2xl px-4 py-3 text-center"
              style={{ background: "rgba(196,163,90,0.06)", border: "1px solid rgba(196,163,90,0.15)" }}
            >
              <p className="text-[12px] text-[#C4A35A]/70 leading-relaxed">
                サブスクリプションの再開が必要です
              </p>
            </div>
          </div>
        )}

        {/* マイビジョン未設定バナー */}
        {showVisionBanner && !visionBannerDismissed && (
          <div className={`flex-none max-w-2xl mx-auto w-full px-4 pt-3 pb-1${isRecording ? " pointer-events-none opacity-40" : ""}`}>
            <div
              className="rounded-xl px-4 py-4 flex items-start gap-3"
              style={{ background: "rgba(196,163,90,0.07)", border: "1px solid rgba(196,163,90,0.18)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#C4A35A]/75 leading-relaxed">
                  新機能「マイビジョン」が追加されました。あなたの目標や大事にしていることを入力すると、SCANやAlter Logの分析がより深くなります。他のサービスでジャーナリングをされていた方は、そちらのまとめを入力いただくのもおすすめです。
                </p>
                <div className="mt-3 flex justify-center">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C4A35A]/20 border border-[#C4A35A]/35 text-[13px] font-mono text-[#C4A35A]/85 hover:bg-[#C4A35A]/28 hover:text-[#C4A35A] transition-colors"
                  >
                    設定する
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisionBannerDismissed(true)}
                className="flex-shrink-0 mt-0.5 text-white/25 hover:text-white/50 transition-colors"
                aria-label="閉じる"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 返金案内バナー（解約後7日以内のみ） */}
        {showRefundNotice && !refundDismissed && (
          <div className="flex-none max-w-2xl mx-auto w-full px-4 pt-3 pb-1">
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: "rgba(138,130,118,0.08)", border: "1px solid rgba(138,130,118,0.18)" }}
            >
              <p className="flex-1 text-[11px] text-[#8A8276]/80 leading-snug">
                7日以内の返金をご希望の場合は support@alter-log.com までご連絡ください。
              </p>
              <button
                type="button"
                onClick={() => setRefundDismissed(true)}
                className="flex-shrink-0 mt-0.5 text-white/25 hover:text-white/50 transition-colors"
                aria-label="閉じる"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ジャーナルを書くミニバー（入力エリア非表示時） */}
        {!isReadOnly && (
        <div
          className={`flex-none max-w-2xl mx-auto w-full overflow-hidden${isRecording ? " pointer-events-none opacity-40" : ""}`}
          style={{
            maxHeight: inputVisible ? "0px" : "52px",
            transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div className="px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setInputVisible(true);
                journalListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-full py-2.5 rounded-full border border-white/[0.08] text-xs text-[#8A8276]/70 hover:text-[#8A8276] hover:border-white/[0.15] hover:bg-white/[0.02] transition-all flex items-center justify-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              ジャーナルを書く
            </button>
          </div>
        </div>
        )}

        {/* 入力エリア全体（スクロールで非表示・ミニバーで再表示） */}
        {!isReadOnly && (
        <div
          className="flex-none overflow-hidden"
          style={{
            maxHeight: inputVisible ? "800px" : "0px",
            transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* 1. 入力エリア＋送信ボタン */}
          <div className="max-w-2xl mx-auto w-full px-4 pt-3 pb-2">

            <form onSubmit={submitJournal}>
              {/* ① マイクボタン（主役・常に固定サイズ） */}
              {isRecording ? (
                /* 録音中: 長押し（1秒）で停止 */
                <button
                  type="button"
                  onMouseDown={handleStopPressStart}
                  onMouseUp={handleStopPressEnd}
                  onMouseLeave={handleStopPressEnd}
                  onTouchStart={handleStopPressStart}
                  onTouchEnd={handleStopPressEnd}
                  aria-label="長押しで録音を停止"
                  className={`relative w-full py-5 rounded-2xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-3 transition-all duration-200 text-white select-none ${
                    holdingStop ? "bg-[#B71C1C] scale-[0.97]" : "bg-[#C62828]"
                  }`}
                >
                  <span className="absolute inset-0 rounded-2xl border border-red-700/25 animate-ping" />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                    <rect x="5" y="5" width="14" height="14" rx="2" />
                  </svg>
                  {holdingStop ? "離すと停止します" : "長押しで停止"}
                  <span
                    className={`ml-1 font-mono text-[13px] font-normal transition-colors ${recElapsed >= MAX_REC_SEC - 30 ? "text-red-200" : "text-white/70"}`}
                  >
                    {fmtTime(recElapsed)} / {fmtTime(MAX_REC_SEC)}
                  </span>
                </button>
              ) : (
                /* 非録音時: タップで開始 / 文字起こし中 */
                <button
                  type="button"
                  onClick={handleMicToggle}
                  disabled={isTranscribing || isSaving}
                  aria-label="音声入力を開始"
                  className={`relative w-full py-5 rounded-2xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-3 transition-all duration-200
                    ${isTranscribing
                      ? "bg-white/[0.05] border border-[#C4A35A]/25 text-[#C4A35A]/70 cursor-not-allowed"
                      : "bg-white/[0.05] border border-white/[0.10] text-[#E8E3D8]/90 hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-[#E8E3D8] active:scale-[0.98]"
                    } ${isSaving ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {isTranscribing ? (
                    <>
                      <span className="w-5 h-5 border-2 border-[#C4A35A]/50 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      音声を変換中...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                      音声で話す
                    </>
                  )}
                </button>
              )}

              {/* 録音開始直後: 上限案内 */}
              {isRecording && (
                <p className="mt-1.5 text-center text-[10px] text-white/30 font-mono">
                  最大5分まで録音できます
                </p>
              )}

              {/* ウェーブフォームキャンバス（録音中のみボタン下に表示） */}
              {isRecording && (
                <canvas
                  ref={waveCanvasRef}
                  className="w-full mt-1.5 rounded-lg"
                  style={{ height: "36px", display: "block" }}
                />
              )}

              {/* 5分自動停止メッセージ */}
              {autoStopped && !sizeStopped && isTranscribing && (
                <div className="mt-2 rounded-xl px-4 py-2.5 bg-[#C4A35A]/08 border border-[#C4A35A]/20">
                  <p className="text-[12px] text-[#C4A35A]/70 text-center">
                    録音時間の上限に達したため停止しました。内容を変換しています...
                  </p>
                </div>
              )}
              {/* 20MB超過自動停止メッセージ */}
              {sizeStopped && isTranscribing && (
                <div className="mt-2 rounded-xl px-4 py-2.5 bg-[#C4A35A]/08 border border-[#C4A35A]/20">
                  <p className="text-[12px] text-[#C4A35A]/70 text-center">
                    録音データの上限に達したため停止しました。そこまでの内容を変換しています...
                  </p>
                </div>
              )}

              {/* マイクエラー表示 */}
              {micError && (
                <div className="mt-2 rounded-xl px-4 py-2.5 bg-red-500/10 border border-red-500/25 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-red-400/80 leading-snug">{micError}</p>
                  <button
                    type="button"
                    onClick={() => setMicError(null)}
                    className="text-white/20 hover:text-white/40 transition-colors flex-shrink-0"
                    aria-label="閉じる"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* 区切り */}
              <p className="text-center text-[11px] text-[#8A8276]/50 my-2.5">または</p>

              {/* テキストで入力 トグルボタン */}
              <button
                type="button"
                disabled={isRecording}
                onClick={() => {
                  const next = !textInputOpen;
                  setTextInputOpen(next);
                  if (next) setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className={`w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none
                  ${textInputOpen
                    ? "border border-white/[0.10] bg-white/[0.04] text-[#E8E3D8]/80"
                    : "border border-white/[0.08] bg-transparent text-[#8A8276]/80 hover:text-[#8A8276] hover:border-white/[0.13] hover:bg-white/[0.03]"
                  }`}
              >
                {/* 鉛筆アイコン */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                テキストで入力
                {/* 開閉シェブロン */}
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ transform: textInputOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* テキストエリア（アニメーション付き開閉） */}
              <div
                className="overflow-hidden"
                style={{
                  maxHeight: textInputOpen ? "200px" : "0px",
                  transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                <div className="relative pt-2">
                  <textarea
                    ref={textareaRef}
                    value={journalInput}
                    onChange={handleJournalInputChange}
                    onKeyDown={(e) => handleKeyDown(e, () => submitJournal())}
                    onFocus={handleTextareaFocus}
                    onBlur={handleTextareaBlur}
                    placeholder="今日あったこと、感じたこと、モヤモヤ…"
                    className="w-full resize-none bg-white/[0.025] border border-white/[0.07] focus:border-[#C4A35A]/35 rounded-2xl px-5 py-4 text-sm leading-relaxed text-[#E8E3D8] placeholder:text-[#8A8276]/40 focus:outline-none transition-colors"
                    style={{ height: "120px" }}
                  />
                  {journalInput.length > 0 && (
                    <span className={`absolute bottom-3 right-4 text-[10px] font-mono pointer-events-none transition-colors ${journalInput.length >= 11500 ? "text-red-400/70" : "text-[#8A8276]/40"}`}>
                      {journalInput.length.toLocaleString()} / 12,000
                    </span>
                  )}
                </div>
              </div>

              {/* 送信ボタン（テキストがある、またはテキストエリアが開いているときに表示） */}
              {(textInputOpen || journalInput.trim()) && (
                <button
                  type="submit"
                  disabled={!journalInput.trim() || isSaving}
                  className={`mt-2.5 w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2
                    ${journalInput.trim() && !isSaving
                      ? "bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_20px_rgba(196,163,90,0.3)] active:scale-[0.98]"
                      : "bg-white/[0.03] border border-white/[0.06] text-[#8A8276]/30 cursor-not-allowed"
                    }`}
                >
                  {isSaving ? (
                    <span className="w-4 h-4 border border-[#8A8276]/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                  {isSaving ? "保存中..." : "ジャーナルを記録する"}
                </button>
              )}
            </form>
          </div>

          {/* 2. ヒントアコーディオン（今日の投稿が0件のときのみ表示） */}
          {!hasTodayJournalEntry && (
            <div className="max-w-2xl mx-auto w-full px-4 pb-3">
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-[#8A8276]/70 hover:text-[#8A8276] transition-colors"
                aria-expanded={hintOpen}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                話すことがない場合は
                <span style={{ display: "inline-block", transform: hintOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }} className="text-[10px]">▾</span>
              </button>
              {hintOpen && (
                <div className="mt-2 rounded-xl px-4 py-3 shadow-[0_0_18px_rgba(196,163,90,0.10)]"
                  style={{ background: "rgba(26,20,8,0.6)", border: "1px solid rgba(196,163,90,0.22)" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlterIcon size={12} />
                    <p className="text-[10px] text-[#C4A35A]/70 tracking-widest uppercase font-bold">Alterからの問いかけ</p>
                  </div>
                  <p className="text-sm text-[#E8E3D8] leading-relaxed font-medium">
                    「最近、一番ホッとした瞬間はいつですか？」
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 「あの時のあなた」カード */}
          {(() => {
            if (!pastJournal) return null;
            const pastDate = new Date(pastJournal.createdAt);
            const pastDateStr = pastDate.toLocaleDateString("ja-JP", {
              timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
            });
            return <PastJournalCard dateStr={pastDateStr} entries={pastJournal.entries} dailyNote={pastJournal.dailyNote} />;
          })()}
        </div>
        )}

        {/* SCAN導線（ジャーナル投稿後・SCAN未実行ユーザーのみ）
            ※ 入力エリアdiv外に配置してスクロール領域を圧迫しないようにする */}
        {showScanSuggestion && hasNeverScanned && !scanCardDismissed && (
          <div
            className={`flex-none max-w-2xl mx-auto w-full px-4 pt-2 pb-1${isRecording ? " pointer-events-none opacity-40" : ""}`}
            style={{
              opacity: scanCardVisible ? 1 : 0,
              transition: "opacity 500ms ease-in",
            }}
          >
            <div
              className="rounded-2xl px-5 py-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-[13px] text-[#E8E3D8]/70 leading-relaxed">
                  ジャーナルが記録されました。SCANであなたの思考パターンを分析してみましょう。
                </p>
                <button
                  type="button"
                  onClick={() => { setScanCardDismissed(true); setScanCardVisible(false); }}
                  className="flex-shrink-0 mt-0.5 text-white/20 hover:text-white/45 transition-colors"
                  aria-label="閉じる"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C4A35A] text-[13px] font-mono font-bold text-[#0B0E13] hover:bg-[#D4B36A] transition-colors"
                >
                  SCANで分析する
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* カレンダー（入力エリア直下、ジャーナルが1件以上ある場合に表示） */}
        {journalDates.length > 0 && (
          <div className={`flex-none max-w-2xl mx-auto w-full px-4 py-3 border-t border-white/[0.04]${isRecording ? " pointer-events-none opacity-40" : ""}`}>
            <DailyCalendar markedDates={journalDates} from="journal" />
          </div>
        )}

        {/* 3. 過去のジャーナルログ（タイムライン・flex-1 スクロール可能） */}
        {journalMessages.length > 0 && (
          <div ref={journalListRef} className="flex-1 overflow-y-auto border-t border-white/[0.04] min-h-0">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <p className="text-[11px] text-[#8A8276]/70 font-mono tracking-widest uppercase mb-4">過去のジャーナル</p>
              <div className="relative">
                {/* 縦線 */}
                <div className="absolute left-[5px] top-1 bottom-0 w-px bg-gradient-to-b from-[#C4A35A]/30 via-[#C4A35A]/12 to-transparent" />
                <div className="space-y-6 pl-5">
                  {[...journalMessages].reverse().map((m) => (
                    <div key={m.id} className="relative">
                      {/* ドット */}
                      <span className="absolute -left-[22px] top-[5px] w-2.5 h-2.5 rounded-full bg-[#0B0E13] border border-[#C4A35A]/45" />
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[12px] text-[#8A8276]/90 font-mono font-semibold tracking-wide">
                          {formatDateTime(m.createdAt)}
                        </p>
                        <CopyButton text={m.content} />
                      </div>
                      <p className="text-sm text-[#E8E3D8]/90 leading-relaxed whitespace-pre-wrap">
                        {m.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── ウェルカムモーダル（初回のみ） ── */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{
            background: "rgba(11,14,19,0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            opacity: welcomeFading ? 0 : 1,
            transition: "opacity 0.42s ease-out",
            pointerEvents: welcomeFading ? "none" : "auto",
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(160deg, rgba(22,29,38,0.98) 0%, rgba(14,19,26,0.98) 100%)",
              border: "1px solid rgba(196,163,90,0.22)",
              boxShadow: "0 0 80px rgba(196,163,90,0.10), 0 32px 64px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.05)",
              maxHeight: "90dvh",
            }}
          >
            {/* ── 吹き出しヘッダー ── */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4 flex-shrink-0">
              {/* Alter アイコン */}
              <div className="flex-shrink-0 pt-1">
                <AlterIcon size={32} />
              </div>
              {/* 吹き出し本体 */}
              <div className="relative flex-1">
                {/* しっぽ（左向き三角） — 外枠 */}
                <span
                  className="absolute top-3"
                  style={{
                    left: -9,
                    width: 0,
                    height: 0,
                    borderTop: "6px solid transparent",
                    borderBottom: "6px solid transparent",
                    borderRight: "9px solid rgba(196,163,90,0.22)",
                  }}
                />
                {/* しっぽ — 内側（背景色で塗りつぶし） */}
                <span
                  className="absolute top-3"
                  style={{
                    left: -7,
                    width: 0,
                    height: 0,
                    borderTop: "6px solid transparent",
                    borderBottom: "6px solid transparent",
                    borderRight: "9px solid #141d28",
                  }}
                />
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(20,29,40,0.95)",
                    border: "1px solid rgba(196,163,90,0.22)",
                  }}
                >
                  <p className="text-sm text-[#E8E3D8] leading-relaxed">
                    こんにちは、私はAlter（オルター）です。あなたの思考の癖を映し出し、変化を促す<span className="text-[#C4A35A]">「鏡」</span>となる存在です。
                  </p>
                </div>
              </div>
            </div>

            {/* ── 使い方ステップ ── */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <div className="space-y-2.5">
                {/* 1. ジャーナル */}
                <div className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(196,163,90,0.06)", border: "1px solid rgba(196,163,90,0.14)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(196,163,90,0.12)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#C4A35A] tracking-wide mb-0.5">1. ジャーナル（点の記録）</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">日々感じたことやモヤモヤを、音声やテキストでそのまま吐き出します。すべての起点となります。</p>
                  </div>
                </div>

                {/* 2. スキャン */}
                <div className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(139,168,158,0.06)", border: "1px solid rgba(139,168,158,0.14)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(139,168,158,0.10)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8BA89E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#8BA89E] tracking-wide mb-0.5">2. スキャン（思考の構造解析）</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">ジャーナルをもとに、事実と感情のバランス、認知の偏り、思考の変化をスキャンします。あなたの頭の中が丸見えになります。</p>
                  </div>
                </div>

                {/* 3. Alter Log */}
                <div className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(196,163,90,0.03)", border: "1px solid rgba(196,163,90,0.08)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(196,163,90,0.06)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#C4A35A]/80 tracking-wide mb-0.5">3. Alter Log（究極の客観視）</p>
                    <p className="text-xs text-[#9A9488]/90 leading-relaxed">これは私（Alter）が毎晩深夜に密かにつけている、あなたの観察日記です。お見せする前提で書いていないので、閲覧は自己責任で。</p>
                  </div>
                </div>
              </div>
              <div className="h-4" />
            </div>

            {/* ── CTA ── */}
            <div className="flex-shrink-0 px-5 pb-5 pt-4" style={{ borderTop: "1px solid rgba(196,163,90,0.10)" }}>
              <button
                type="button"
                onClick={handleWelcomeClose}
                className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide text-[#0B0E13] bg-[#C4A35A] hover:bg-[#D4B36A] hover:shadow-[0_0_24px_rgba(196,163,90,0.40)] active:scale-[0.98] transition-all duration-150"
              >
                ジャーナルから始める
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
