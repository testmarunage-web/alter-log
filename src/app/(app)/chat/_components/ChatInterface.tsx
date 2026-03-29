"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveChatMessage, resetSession } from "@/app/actions/chat";
import { AlterIcon } from "../../_components/AlterIcon";
import { Sparkles } from "lucide-react";

// メッセージ時刻フォーマット（壁打ちモード用）
function formatTime(date?: Date): string {
  if (!date) return "";
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
}

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

// AIメッセージのマークダウン記号を除去
function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s/gm, "").trim();
}

type Mode = "journal" | "coach";

interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface JournalMessage {
  id: string;
  content: string;
  createdAt: Date;
}

interface Props {
  defaultMode: Mode;
  sessionId: string;
  dailyLimit: number;
  initialUsedCount: number;
  initialMessages: InitialMessage[];
  initialJournalMessages: JournalMessage[];
  userName: string;
  hasTodayJournal: boolean;
}

// ── Alterアバター（フラットな欠けた円） ────────────────────────────────────
function AlterAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "sm" ? 28 : 36;
  return <AlterIcon size={px} />;
}


// ── メインコンポーネント ─────────────────────────────────────────────────────
export function ChatInterface({
  defaultMode,
  sessionId,
  dailyLimit,
  initialUsedCount,
  initialMessages,
  initialJournalMessages,
  userName,
  hasTodayJournal,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const router = useRouter();

  const isJournal = defaultMode === "journal";

  const [journalMessages, setJournalMessages] = useState<JournalMessage[]>(initialJournalMessages);
  const [journalInput, setJournalInput]       = useState("");
  const [localUsedCount, setLocalUsedCount]   = useState(initialUsedCount);
  const [hintOpen, setHintOpen]               = useState(false);
  const [isResetting, setIsResetting]         = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [showWelcome, setShowWelcome]         = useState(false);
  const [welcomeFading, setWelcomeFading]     = useState(false);

  // ジャーナルモードの初回のみウェルカムモーダルを表示
  useEffect(() => {
    if (!isJournal) return;
    try {
      if (!localStorage.getItem("alter-log-welcomed")) {
        setShowWelcome(true);
      }
    } catch { /* localStorage unavailable */ }
  }, [isJournal]);

  function handleWelcomeClose() {
    setWelcomeFading(true);
    try { localStorage.setItem("alter-log-welcomed", "1"); } catch { /* noop */ }
    setTimeout(() => {
      setShowWelcome(false);
      setWelcomeFading(false);
    }, 420);
  }

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { sessionId },
      onFinish: () => setLocalUsedCount((c) => c + 1),
    });

  async function handleReset() {
    if (isResetting || isLoading) return;
    setIsResetting(true);
    try {
      await resetSession(sessionId);
      setMessages([]);
      setLocalUsedCount(0);
    } finally {
      setIsResetting(false);
    }
  }

  // 新メッセージで最下部へスクロール（壁打ちのみ・メッセージがある場合のみ）
  useEffect(() => {
    if (defaultMode !== "coach") return;
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, defaultMode]);

  function handleCoachInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    handleInputChange(e);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
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
    const now = new Date();
    setJournalMessages((prev) => [...prev, { id: `j-${Date.now()}`, content, createdAt: now }]);
    setJournalInput("");
    try {
      await saveChatMessage("journal", content);
    } finally {
      setIsSaving(false);
    }
  }

  const remaining       = dailyLimit - localUsedCount;
  const visibleMessages = messages.filter((m) => m.content !== "__OPEN__");
  const initial         = userName.slice(0, 1).toUpperCase();
  const headerCls       = "bg-[#0B0E13]/95 border-[#C4A35A]/10 backdrop-blur-md";

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
              {isJournal ? "ジャーナル" : "セッション"}
            </h1>
          </div>

          {!isJournal ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting || isLoading}
                aria-label="話題を変える"
                title="話題を変える"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8A8276] hover:text-[#E8E3D8] hover:bg-white/[0.05] transition-colors disabled:opacity-30"
              >
                <Sparkles size={14} />
              </button>
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </header>

      {/* ── ジャーナルモード ── */}
      {isJournal && (
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* 1. 入力エリア＋送信ボタン（flex-none・常に画面内） */}
          <div className="flex-none max-w-2xl mx-auto w-full px-4 pt-3 pb-2">
            <form onSubmit={submitJournal}>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={journalInput}
                  onChange={handleJournalInputChange}
                  placeholder="ここをタップして、マイクで思考を話すかテキストで入力してください。日記や愚痴、感情の吐き出しなど何でも構いません。"
                  className="w-full resize-none bg-white/[0.025] border border-white/[0.07] focus:border-[#C4A35A]/35 rounded-2xl px-5 py-4 text-sm leading-relaxed text-[#E8E3D8] placeholder:text-[#8A8276]/40 focus:outline-none transition-colors"
                  style={{ height: "140px" }}
                />
                {journalInput.length > 0 && (
                  <span className="absolute bottom-3 right-4 text-[10px] text-[#8A8276]/40 font-mono pointer-events-none">
                    {journalInput.length}
                  </span>
                )}
              </div>
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

          {/* 2. ヒントアコーディオン（flex-none・送信ボタン下） */}
          <div className="flex-none max-w-2xl mx-auto w-full px-4 pb-3">
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

          {/* 3. 過去のジャーナルログ（タイムライン・flex-1 スクロール可能） */}
          {journalMessages.length > 0 && (
            <div className="flex-1 overflow-y-auto border-t border-white/[0.04] min-h-0">
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
      )}

      {/* ── ウェルカムモーダル（ジャーナルモード・初回のみ） ── */}
      {isJournal && showWelcome && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
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
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[#C4A35A] uppercase mb-1.5">Alter</p>
                  <p className="text-sm text-[#E8E3D8] leading-relaxed">
                    こんにちは、私はAlter（オルター）です。思考の癖を映し出し、変化を促す<span className="text-[#C4A35A]">「鏡」</span>となる存在です。
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

                {/* 2. ダッシュボード */}
                <div className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(139,168,158,0.06)", border: "1px solid rgba(139,168,158,0.14)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(139,168,158,0.10)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8BA89E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#8BA89E] tracking-wide mb-0.5">2. ダッシュボード（線の可視化）</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">ジャーナルを元に、事実と感情のバランスや認知バイアスをスキャンし、客観的なデータとして確認できます。</p>
                  </div>
                </div>

                {/* 3. セッション */}
                <div className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#9A9488] tracking-wide mb-0.5">3. セッション（思考の深掘り）</p>
                    <p className="text-xs text-[#9A9488] leading-relaxed">Alterとの対話を通して、見えた課題の解像度を上げ、具体的なアクションへと落とし込みます。</p>
                  </div>
                </div>

                {/* 4. Alter Log */}
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
                    <p className="text-xs font-bold text-[#C4A35A]/60 tracking-wide mb-0.5">4. Alter Log（裏の記録）</p>
                    <p className="text-xs text-[#9A9488]/70 leading-relaxed">これは私（Alter）が密かにつけている、あなたの観察日記です。閲覧は自己責任でお願いします。</p>
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

      {/* ── 壁打ちモード ── */}
      {!isJournal && (
        <>
          {/* メッセージエリア（flex-1・スクロール） */}
          <main
            ref={messagesAreaRef}
            className="flex-1 overflow-y-auto min-h-0"
          >
            {visibleMessages.length === 0 && !isLoading ? (
              /* Empty State：ど真ん中に中央配置 */
              <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
                <AlterAvatar size="md" />
                <p className="text-sm text-[#8A8276] text-center">
                  思考の壁打ちを始めましょう。
                </p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {visibleMessages.length === 0 && isLoading && <TypingIndicator />}

                {visibleMessages.map((m) => (
                  <div key={m.id} className={`flex gap-2 items-end ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    {m.role === "assistant" ? (
                      <AlterAvatar />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#C4A35A]/20 text-[#C4A35A] flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {initial}
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "assistant"
                          ? "bg-white/[0.04] border border-[#C4A35A]/22 text-[#E8E3D8] rounded-tl-sm shadow-[0_0_14px_rgba(196,163,90,0.09)] msg-fade-in"
                          : "bg-[#C4A35A]/10 border border-[#C4A35A]/20 text-[#E8E3D8] rounded-tr-sm"
                      }`}
                    >
                      {m.role === "assistant" ? stripMarkdown(m.content) : m.content}
                    </div>
                    <span className="text-[9px] text-[#8A8276] font-mono flex-shrink-0 mb-0.5">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                ))}

                {isLoading &&
                  visibleMessages.length > 0 &&
                  visibleMessages[visibleMessages.length - 1]?.role === "user" && (
                    <TypingIndicator />
                  )}

                {/* 上限到達システムメッセージ */}
                {remaining <= 0 && !isLoading && visibleMessages.length > 0 && (
                  <div className="flex flex-col items-center gap-3 pt-2 pb-4">
                    <p className="text-sm text-[#9A9488] text-center leading-relaxed max-w-xs">
                      {hasTodayJournal ? (
                        <>本日は深く思考を巡らせましたね。<br />Alterの脳も本日は休ませていただきます。</>
                      ) : (
                        <>本日は深く思考を巡らせましたね。Alterとの対話はここまでにして、<br />今日の気づきをジャーナルに書き留めませんか？</>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(hasTodayJournal ? "/dashboard" : "/chat?mode=journal")}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[#C4A35A]/30 text-[#C4A35A] hover:bg-[#C4A35A]/10 transition-colors"
                    >
                      {hasTodayJournal ? "本日の思考分析を確認する" : "ジャーナルに思考をまとめる"}
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* 壁打ち入力フッター（flex-none: 絶対に押し出されない） */}
          <div className={`flex-none border-t ${headerCls}`}>
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-6">
              {remaining > 0 && (
                <form onSubmit={(e) => {
                  handleSubmit(e);
                  if (textareaRef.current) textareaRef.current.style.height = "auto";
                }} className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleCoachInputChange}
                    onKeyDown={(e) => handleKeyDown(e, () => {
                      if (input.trim() && !isLoading) {
                        handleSubmit(e as unknown as React.FormEvent);
                        if (textareaRef.current) textareaRef.current.style.height = "auto";
                      }
                    })}
                    placeholder="Alterに疑問や課題をぶつける..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none bg-white/[0.03] border border-white/[0.1] focus:border-[#C4A35A]/50 rounded-2xl px-4 py-3 text-sm text-[#E8E3D8] placeholder:text-[#8A8276] focus:outline-none disabled:opacity-50 transition-colors"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] transition-colors disabled:opacity-30"
                    aria-label="送信"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── タイピングインジケーター（Alter）────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <AlterAvatar />
      <div className="bg-white/[0.04] border border-[#C4A35A]/15 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-[#C4A35A]/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
