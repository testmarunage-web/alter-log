"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveChatMessage } from "@/app/actions/chat";
import { AlterIcon } from "../../_components/AlterIcon";
import { useReadOnly } from "../../_components/ReadOnlyProvider";

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

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pb-3">
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
            <p className="text-[11.5px] text-white/55 leading-relaxed">
              {preview}
              {hasMore && <span className="text-white/25">...</span>}
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div key={i}>
                  {i > 0 && <div className="border-t border-white/[0.05] pt-3" />}
                  {entries.length > 1 && (
                    <p className="font-mono text-[8px] text-white/20 mb-1">{entry.timeStr}</p>
                  )}
                  <p className="text-[11.5px] text-white/55 leading-relaxed">{entry.content}</p>
                </div>
              ))}
              {dailyNote && (
                <p className="mt-1 pt-2 border-t border-white/[0.05] text-[10.5px] text-[#C4A35A]/45 leading-relaxed italic">
                  {dailyNote.slice(0, 120)}
                </p>
              )}
            </div>
          )}
        </div>
      </button>
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
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const journalListRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const isReadOnly = useReadOnly();

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  // 初回のみウェルカムモーダルを表示
  useEffect(() => {
    try {
      if (!localStorage.getItem("alter-log-welcomed")) {
        setShowWelcome(true);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // コンポーネントアンマウント時に録音を停止
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
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
  async function handleMicToggle() {
    setMicError(null);

    if (isRecording) {
      // 録音停止
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

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // マイクストリームを解放
      stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);

      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      if (blob.size < 200) return; // 録音が短すぎる場合はスキップ

      setIsTranscribing(true);
      try {
        const fd = new FormData();
        fd.append("audio", blob, `audio.${mimeType.includes("webm") ? "webm" : "mp4"}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });

        if (res.ok) {
          const { text } = await res.json() as { text: string };
          if (text?.trim()) {
            setJournalInput((prev) => prev ? `${prev}\n${text.trim()}` : text.trim());
            // テキストエリアにフォーカスを戻す
            setTimeout(() => textareaRef.current?.focus(), 100);
          }
        } else {
          const { error } = await res.json().catch(() => ({ error: "不明なエラー" }));
          setMicError(`音声の変換に失敗しました。${error ?? ""}`);
        }
      } catch {
        setMicError("音声の送信に失敗しました。接続を確認してください。");
      } finally {
        setIsTranscribing(false);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }

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
            disabled={isSaving}
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

        {/* ジャーナルを書くミニバー（入力エリア非表示時） */}
        {!isReadOnly && (
        <div
          className="flex-none max-w-2xl mx-auto w-full overflow-hidden"
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

            {/* フロー説明 */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <span className={`text-[10px] font-mono transition-colors ${isRecording ? "text-red-400/70" : isTranscribing ? "text-[#C4A35A]/60" : "text-[#8A8276]/35"}`}>① 話すかテキスト入力</span>
              <span className="text-[10px] text-[#8A8276]/20">→</span>
              <span className={`text-[10px] font-mono transition-colors ${journalInput.trim() && !isRecording && !isTranscribing ? "text-[#8A8276]/50" : "text-[#8A8276]/20"}`}>② 内容を確認</span>
              <span className="text-[10px] text-[#8A8276]/20">→</span>
              <span className={`text-[10px] font-mono transition-colors ${journalInput.trim() && !isRecording && !isTranscribing ? "text-[#C4A35A]/50" : "text-[#8A8276]/20"}`}>③ 保存</span>
            </div>

            <form onSubmit={submitJournal}>
              {/* ① マイクボタン（主役） */}
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={isTranscribing || isSaving}
                aria-label={isRecording ? "録音を停止" : "音声入力を開始"}
                className={`relative w-full py-5 rounded-2xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-3 transition-all duration-200
                  ${isRecording
                    ? "bg-red-500 text-white active:scale-[0.98]"
                    : isTranscribing
                      ? "bg-white/[0.05] border border-[#C4A35A]/25 text-[#C4A35A]/70 cursor-not-allowed"
                      : "bg-white/[0.05] border border-white/[0.10] text-[#E8E3D8]/70 hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-[#E8E3D8] active:scale-[0.98]"
                  } ${isSaving ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {/* 録音中パルスリング */}
                {isRecording && (
                  <span className="absolute inset-0 rounded-2xl border-2 border-red-400/40 animate-ping" />
                )}

                {isTranscribing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-[#C4A35A]/50 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    音声を変換中...
                  </>
                ) : isRecording ? (
                  <>
                    {/* 停止アイコン（四角） */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                      <rect x="5" y="5" width="14" height="14" rx="2" />
                    </svg>
                    タップして停止
                  </>
                ) : (
                  <>
                    {/* マイクアイコン */}
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

              {/* 区切り線（or テキストで入力） */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-[10px] text-[#8A8276]/30 font-mono">またはテキストで入力</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>

              {/* ① テキストエリア（② 内容確認も兼ねる） */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={journalInput}
                  onChange={handleJournalInputChange}
                  onKeyDown={(e) => handleKeyDown(e, () => submitJournal())}
                  onFocus={handleTextareaFocus}
                  onBlur={handleTextareaBlur}
                  placeholder="今日あったこと、感じたこと、モヤモヤ…なんでもどうぞ。"
                  className="w-full resize-none bg-white/[0.025] border border-white/[0.07] focus:border-[#C4A35A]/35 rounded-2xl px-5 py-4 text-sm leading-relaxed text-[#E8E3D8] placeholder:text-[#8A8276]/40 focus:outline-none transition-colors"
                  style={{ height: "120px" }}
                />
                {journalInput.length > 0 && (
                  <span className="absolute bottom-3 right-4 text-[10px] text-[#8A8276]/40 font-mono pointer-events-none">
                    {journalInput.length}
                  </span>
                )}
              </div>

              {/* ③ 送信ボタン */}
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

          {/* SCAN導線（ジャーナル投稿後に表示） */}
          {showScanSuggestion && (
            <div className="max-w-2xl mx-auto w-full px-4 pb-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 text-xs text-[#8BA89E]/70 hover:text-[#8BA89E] transition-colors"
              >
                <AlterIcon size={12} />
                <span>SCANで思考を解析する</span>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5.5h7M6 2l3.5 3.5L6 9" />
                </svg>
              </button>
            </div>
          )}

          {/* 「あの時のあなた」カード */}
          {(() => {
            if (!pastJournal) {
              return (
                <div className="max-w-2xl mx-auto w-full px-4 pb-3">
                  <p className="text-[10px] text-white/[0.18] font-mono tracking-wide text-center">
                    30日後、過去のあなたと再会できます
                  </p>
                </div>
              );
            }
            const pastDate = new Date(pastJournal.createdAt);
            const pastDateStr = pastDate.toLocaleDateString("ja-JP", {
              timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
            });
            return <PastJournalCard dateStr={pastDateStr} entries={pastJournal.entries} dailyNote={pastJournal.dailyNote} />;
          })()}
        </div>
        )}

        {/* 3. 過去のジャーナルログ（タイムライン・flex-1 スクロール可能） */}
        {journalMessages.length > 0 && (
          <div ref={journalListRef} className="flex-1 overflow-y-auto border-t border-white/[0.04] min-h-0">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <p className="text-[10px] text-[#8A8276]/45 tracking-widest uppercase mb-4">過去のジャーナル</p>
              <div className="relative">
                {/* 縦線 */}
                <div className="absolute left-[5px] top-1 bottom-0 w-px bg-gradient-to-b from-[#C4A35A]/30 via-[#C4A35A]/12 to-transparent" />
                <div className="space-y-6 pl-5">
                  {[...journalMessages].reverse().map((m) => (
                    <div key={m.id} className="relative">
                      {/* ドット */}
                      <span className="absolute -left-[22px] top-[5px] w-2.5 h-2.5 rounded-full bg-[#0B0E13] border border-[#C4A35A]/45" />
                      <p className="text-[10px] text-[#8A8276]/55 font-mono tracking-wide mb-1.5">
                        {formatDateTime(m.createdAt)}
                      </p>
                      <p className="text-sm text-[#E8E3D8]/75 leading-relaxed whitespace-pre-wrap">
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
                    <p className="text-xs text-[#9A9488] leading-relaxed">日々感じたことやモヤモヤを、ありのままテキストで吐き出します。すべての起点となります。</p>
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
