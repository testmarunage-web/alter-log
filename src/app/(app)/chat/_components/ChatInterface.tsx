"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// React StrictMode の2重発火ガード
const openedSessions = new Set<string>();

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

interface Props {
  sessionId: string;
  dailyLimit: number;
  initialUsedCount: number;
  initialMessages: InitialMessage[];
  userName: string;
}

// ── Alterアバター（抽象的な光の玉） ─────────────────────────────────────────
function AlterOrb({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  return (
    <div
      className={`${dim} rounded-full flex-shrink-0 relative overflow-hidden`}
      style={{
        background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 45%, #1A6B8A)",
        boxShadow: "0 0 14px rgba(58, 175, 202, 0.55), 0 0 4px rgba(147, 228, 212, 0.4)",
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 62% 28%, rgba(255,255,255,0.42), transparent 58%)",
        }}
      />
    </div>
  );
}

// ── 共通チャット入力欄 ────────────────────────────────────────────────────────
function ChatInput({
  value,
  onChange,
  onKeyDown,
  onSubmit,
  disabled,
  textareaRef,
  showHint,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showHint?: React.ReactNode;
}) {
  return (
    <div>
      {showHint}
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="何でも話しかけてください..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-white/[0.03] border border-white/[0.1] focus:border-[#C4A35A]/50 rounded-2xl px-4 py-3 text-sm text-[#E8E3D8] placeholder:text-[#8A8276] focus:outline-none disabled:opacity-50 transition-colors"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />
        {/* マイクボタン */}
        <button
          type="button"
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[#8A8276] hover:text-[#C4A35A] transition-colors"
          aria-label="音声入力"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-[#3AAFCA] text-[#0B0E13] hover:bg-[#4ABFDA] transition-colors disabled:opacity-30"
          aria-label="送信"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────────────────
export function ChatInterface({
  sessionId,
  dailyLimit,
  initialUsedCount,
  initialMessages,
  userName,
}: Props) {
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasOpenedRef = useRef(false);

  const router       = useRouter();
  const searchParams = useSearchParams();

  const [currentMode, setCurrentMode] = useState<Mode>(
    searchParams.get("mode") === "coach" ? "coach" : "journal"
  );
  const [journalMessages, setJournalMessages] = useState<{ id: string; content: string }[]>([]);
  const [journalInput, setJournalInput]       = useState("");
  const [localUsedCount, setLocalUsedCount]   = useState(initialUsedCount);
  const [hintOpen, setHintOpen]               = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { sessionId },
      onFinish: () => setLocalUsedCount((c) => c + 1),
    });

  // Alterモード：初回のみ開幕トリガーを送る
  useEffect(() => {
    if (currentMode !== "coach") return;
    if (initialMessages.length > 0) return;
    if (hasOpenedRef.current) return;
    if (openedSessions.has(sessionId)) return;
    hasOpenedRef.current = true;
    openedSessions.add(sessionId);
    append({ role: "user", content: "__OPEN__" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 新メッセージで最下部へスクロール
  useEffect(() => {
    if (currentMode === "coach") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentMode]);

  function handleAlterInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    handleInputChange(e);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  function handleJournalInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setJournalInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  function submitJournal(e?: React.FormEvent) {
    e?.preventDefault();
    if (!journalInput.trim()) return;
    setJournalMessages((prev) => [
      ...prev,
      { id: `j-${Date.now()}`, content: journalInput.trim() },
    ]);
    setJournalInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const remaining       = dailyLimit - localUsedCount;
  const visibleMessages = messages.filter((m) => m.content !== "__OPEN__");
  const initial         = userName.slice(0, 1).toUpperCase();
  const isJournal       = currentMode === "journal";

  const headerFooterCls = "bg-[#0B0E13]/95 border-[#C4A35A]/10 backdrop-blur-md";

  // ── ヒントアコーディオン（記録モードのみ） ─────────────────────────────────
  const HintAccordion = isJournal ? (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setHintOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-[#8A8276] hover:text-[#E8E3D8] transition-colors"
        aria-expanded={hintOpen}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        話すテーマに迷ったら
        <span style={{ display: "inline-block", transform: hintOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }} className="text-[10px]">▾</span>
      </button>
      {hintOpen && (
        <div className="mt-1.5 bg-white/[0.02] border border-[#C4A35A]/20 rounded-xl px-4 py-2.5">
          <p className="text-xs text-[#8A8276] mb-1">Alterからの問いかけ</p>
          <p className="text-sm text-[#E8E3D8] leading-relaxed">
            <span className="font-semibold text-[#C4A35A]">「最近、一番ホッとした瞬間はいつですか？」</span>
          </p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="h-full min-h-screen bg-[#0B0E13] text-[#E8E3D8] flex flex-col">

      {/* ── ヘッダー ── */}
      <header className={`border-b ${headerFooterCls} sticky top-0 z-10`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* 戻るボタン */}
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

          {/* セグメンテッドコントロール */}
          <div className="flex-1 flex justify-center">
            <div className="bg-white/[0.04] border border-white/[0.05] p-1 rounded-full flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentMode("journal")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isJournal
                    ? "bg-[#C4A35A]/20 text-[#E8E3D8]"
                    : "text-[#8A8276] hover:text-[#E8E3D8]"
                }`}
              >
                ジャーナル
              </button>
              <button
                type="button"
                onClick={() => setCurrentMode("coach")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  !isJournal
                    ? "bg-[#C4A35A]/20 text-[#E8E3D8]"
                    : "text-[#8A8276] hover:text-[#E8E3D8]"
                }`}
              >
                壁打ち
              </button>
            </div>
          </div>

          {/* 残りセッション数 */}
          <div className="w-16 flex justify-end items-center gap-1.5 group relative cursor-help">
            <span className="text-xs font-mono text-[#C4A35A]/70 tabular-nums">
              {remaining}<span className="text-[#8A8276]"> / {dailyLimit}</span>
            </span>
            <svg className="w-3.5 h-3.5 text-[#8A8276] group-hover:text-[#C4A35A] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            {/* ツールチップ */}
            <div className="absolute top-full right-0 mt-2 w-max px-3 py-1.5 bg-[#1A222B] border border-[#C4A35A]/20 rounded-md text-[10px] text-[#E8E3D8] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              1日あたり10回まで
            </div>
          </div>
        </div>
      </header>

      {/* ── 記録モード ── */}
      {isJournal && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
              {/* Alterの固定プロンプト */}
              <div className="flex gap-3">
                <AlterOrb />
                <div className="max-w-[78%] bg-[#3AAFCA]/10 border border-[#3AAFCA]/20 rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm leading-relaxed text-[#E8E3D8]">
                  今日はどんな一日でしたか？ 何があったか、何を感じたか、思いつくままに教えてください。（うまくまとまっていなくて大丈夫です）
                </div>
              </div>

              {/* ユーザーが送ったメモ一覧 */}
              {journalMessages.map((m) => (
                <div key={m.id} className="flex gap-3 flex-row-reverse">
                  <div className="w-9 h-9 rounded-full bg-[#C4A35A]/20 text-[#C4A35A] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <div className="max-w-[78%] bg-[#C4A35A]/10 border border-[#C4A35A]/20 text-[#E8E3D8] rounded-2xl rounded-tr-sm px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </main>

          <div className={`border-t ${headerFooterCls} sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-6">
              <ChatInput
                value={journalInput}
                onChange={handleJournalInputChange}
                onKeyDown={(e) => handleKeyDown(e, submitJournal)}
                onSubmit={submitJournal}
                disabled={false}
                textareaRef={textareaRef}
                showHint={HintAccordion}
              />
            </div>
          </div>
        </>
      )}

      {/* ── 壁打ちモード ── */}
      {!isJournal && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

              {visibleMessages.length === 0 && isLoading && <TypingIndicator />}

              {visibleMessages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "assistant" ? (
                    <AlterOrb />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#C4A35A]/20 text-[#C4A35A] flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {initial}
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "assistant"
                        ? "bg-[#3AAFCA]/10 border border-[#3AAFCA]/20 text-[#E8E3D8] rounded-tl-sm"
                        : "bg-[#C4A35A]/10 border border-[#C4A35A]/20 text-[#E8E3D8] rounded-tr-sm"
                    }`}
                  >
                    {m.role === "assistant" ? stripMarkdown(m.content) : m.content}
                  </div>
                </div>
              ))}

              {isLoading &&
                visibleMessages.length > 0 &&
                visibleMessages[visibleMessages.length - 1]?.role === "user" && (
                  <TypingIndicator />
                )}

              <div ref={bottomRef} />
            </div>
          </main>

          <div className={`border-t ${headerFooterCls} sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-6">
              {remaining <= 0 ? (
                <p className="text-center text-sm text-[#9A9488] py-2">
                  今日はここまでにしましょう。明日また話しましょう。
                </p>
              ) : (
                <ChatInput
                  value={input}
                  onChange={(e) => {
                    handleAlterInputChange(e);
                  }}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => {
                      if (input.trim() && !isLoading) {
                        handleSubmit(e as unknown as React.FormEvent);
                        if (textareaRef.current) textareaRef.current.style.height = "auto";
                      }
                    })
                  }
                  onSubmit={(e) => {
                    handleSubmit(e);
                    if (textareaRef.current) textareaRef.current.style.height = "auto";
                  }}
                  disabled={isLoading}
                  textareaRef={textareaRef}
                />
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
      <AlterOrb />
      <div className="bg-[#3AAFCA]/10 border border-[#3AAFCA]/20 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-[#3AAFCA]/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}