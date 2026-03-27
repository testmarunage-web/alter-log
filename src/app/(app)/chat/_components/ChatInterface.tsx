"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveChatMessage } from "@/app/actions/chat";
import { AlterIcon } from "../../_components/AlterIcon";

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

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { sessionId },
      onFinish: () => setLocalUsedCount((c) => c + 1),
    });

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
    if (!content) return;
    const now = new Date();
    setJournalMessages((prev) => [...prev, { id: `j-${Date.now()}`, content, createdAt: now }]);
    setJournalInput("");
    await saveChatMessage("journal", content);
  }

  const remaining       = dailyLimit - localUsedCount;
  const visibleMessages = messages.filter((m) => m.content !== "__OPEN__");
  const initial         = userName.slice(0, 1).toUpperCase();
  const headerCls       = "bg-[#0B0E13]/95 border-[#C4A35A]/10 backdrop-blur-md";

  return (
    // h-full: AppLayoutのmain(flex-1)を埋める / overflow-hidden: 自身をはみ出させない
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#0B0E13] text-[#E8E3D8]">

      {/* ── ヘッダー（flex-none: 絶対に押し出されない） ── */}
      <header className={`flex-none border-b ${headerCls}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="ダッシュボードへ戻る"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8A8276] hover:text-[#E8E3D8] hover:bg-white/[0.05] transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          <div className="flex-1 flex justify-center">
            <h1 className="text-sm font-semibold text-[#E8E3D8] tracking-wide">
              {isJournal ? "ジャーナル" : "壁打ち"}
            </h1>
          </div>

          {!isJournal ? (
            <div className="w-16 flex justify-end items-center gap-1.5 group relative cursor-help whitespace-nowrap">
              <span className="text-xs font-mono text-[#C4A35A]/70 tabular-nums">
                {remaining}<span className="text-[#8A8276]"> / {dailyLimit}</span>
              </span>
              <svg className="w-3.5 h-3.5 text-[#8A8276] group-hover:text-[#C4A35A] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <div className="absolute top-full right-0 mt-2 w-max px-3 py-1.5 bg-[#1A222B] border border-[#C4A35A]/20 rounded-md text-[10px] text-[#E8E3D8] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                1日あたり10回まで
              </div>
            </div>
          ) : (
            <div className="w-16" />
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
                disabled={!journalInput.trim()}
                className={`mt-2.5 w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2
                  ${journalInput.trim()
                    ? "bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_20px_rgba(196,163,90,0.3)] active:scale-[0.98]"
                    : "bg-white/[0.03] border border-white/[0.06] text-[#8A8276]/30 cursor-not-allowed"
                  }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                ジャーナルを記録する
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
              <div className="mt-2 bg-white/[0.02] border border-[#C4A35A]/15 rounded-xl px-4 py-3">
                <p className="text-[10px] text-[#8A8276]/60 mb-1 tracking-wide uppercase">Alterからの問いかけ</p>
                <p className="text-sm text-[#E8E3D8] leading-relaxed">
                  <span className="font-semibold text-[#C4A35A]">「最近、一番ホッとした瞬間はいつですか？」</span>
                </p>
              </div>
            )}
          </div>

          {/* 3. 過去のジャーナルログ（flex-1 スクロール可能） */}
          {journalMessages.length > 0 && (
            <div className="flex-1 overflow-y-auto border-t border-white/[0.04] min-h-0">
              <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
                <p className="text-[10px] text-[#8A8276]/50 tracking-wide mb-1">過去のジャーナル</p>
                {[...journalMessages].reverse().map((m) => (
                  <div key={m.id} className="bg-white/[0.03] border border-[#C4A35A]/10 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-[#8A8276]/60 font-mono mb-1.5">
                      {formatDateTime(m.createdAt)}
                    </p>
                    <p className="text-sm text-[#E8E3D8]/80 leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
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
                <p className="text-sm text-[#8A8276] text-center leading-relaxed max-w-[240px]">
                  Alterに聞いてみましょう。<br />何でも話しかけてください。
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
                          ? "bg-white/[0.04] border border-[#C4A35A]/15 text-[#E8E3D8] rounded-tl-sm"
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

                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* 壁打ち入力フッター（flex-none: 絶対に押し出されない） */}
          <div className={`flex-none border-t ${headerCls}`}>
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-6">
              {remaining <= 0 ? (
                <p className="text-center text-sm text-[#9A9488] py-2">
                  今日はここまでにしましょう。明日また話しましょう。
                </p>
              ) : (
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
                    placeholder="Alterに聞いてみましょう..."
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
