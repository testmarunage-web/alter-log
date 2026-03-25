"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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

export function ChatInterface({
  sessionId,
  dailyLimit,
  initialUsedCount,
  initialMessages,
  userName,
}: Props) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const hasOpenedRef = useRef(false);

  const searchParams = useSearchParams();
  const initialMode  = (searchParams.get("mode") === "coach" ? "coach" : "journal") as Mode;

  const [mode, setMode]               = useState<Mode>(initialMode);
  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [localUsedCount, setLocalUsedCount] = useState(initialUsedCount);
  const [safetyMode, setSafetyMode]   = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { sessionId },
      onFinish: () => setLocalUsedCount((c) => c + 1),
    });

  // コーチモードに初めて切り替えたとき、メッセージがなければ開幕トリガーを送る
  useEffect(() => {
    if (mode !== "coach") return;
    if (initialMessages.length > 0) return;
    if (hasOpenedRef.current) return;
    if (openedSessions.has(sessionId)) return;

    hasOpenedRef.current = true;
    openedSessions.add(sessionId);
    append({ role: "user", content: "__OPEN__" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 新メッセージで最下部へスクロール
  useEffect(() => {
    if (mode === "coach") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  function handleCoachInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    handleInputChange(e);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    }
  }

  const remaining       = dailyLimit - localUsedCount;
  const visibleMessages = messages.filter((m) => m.content !== "__OPEN__");
  const initial         = userName.slice(0, 1).toUpperCase();

  // 背景色をモードで切り替え
  const pageBg   = mode === "journal" ? "bg-[#F7F5F2]" : "bg-[#F4F8F9]";
  const borderBg = mode === "journal" ? "bg-[#F7F5F2]/95 border-[#E8E8E8]" : "bg-[#F4F8F9]/95 border-[#C8DDE2]";

  return (
    <div className={`h-full min-h-screen ${pageBg} text-[#171717] flex flex-col transition-colors duration-300`}>

      {/* ── ヘッダー + セグメントコントロール ── */}
      <header className={`border-b ${borderBg} backdrop-blur-md sticky top-0 z-10`}>
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          {/* Segmented Control */}
          <div className="flex p-1 bg-black/[0.06] rounded-xl">
            <button
              onClick={() => setMode("journal")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "journal"
                  ? "bg-white shadow-sm text-[#171717]"
                  : "text-[#9A9A9A] hover:text-[#5C5C5C]"
              }`}
            >
              ☕️ ジャーナル
            </button>
            <button
              onClick={() => setMode("coach")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "coach"
                  ? "bg-[#183D46] shadow-sm text-white"
                  : "text-[#9A9A9A] hover:text-[#5C5C5C]"
              }`}
            >
              🔥 壁打ち
            </button>
          </div>

          {/* モードの説明 */}
          <p className="text-center text-[11px] text-[#BCBCBC] mt-1.5">
            {mode === "journal"
              ? "ただ吐き出す — 聴くモード"
              : "思考を整理する — 対話モード"}
          </p>
        </div>
      </header>

      {/* ── ジャーナルモード ─────────────────────────── */}
      {mode === "journal" && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6">
              {/* Date label */}
              <p className="text-xs text-[#BCBCBC] mb-4 select-none">
                {new Date().toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>

              {/* Journal canvas */}
              <textarea
                value={journalText}
                onChange={(e) => {
                  setJournalText(e.target.value);
                  setJournalSaved(false);
                }}
                placeholder="今日の出来事や感情を書き出す..."
                className="w-full resize-none border-none bg-transparent text-base text-[#171717] leading-loose placeholder:text-[#D0CFC9] focus:outline-none"
                style={{ minHeight: "55vh" }}
              />
            </div>
          </main>

          {/* Journal footer */}
          <div className={`border-t ${borderBg} backdrop-blur-md sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-xs text-[#C8C8C8] tabular-nums">
                {journalText.length} 文字
              </span>
              <button
                onClick={() => setJournalSaved(true)}
                disabled={journalText.trim().length === 0}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 ${
                  journalSaved
                    ? "bg-[#F2F2F2] text-[#5C5C5C]"
                    : "bg-[#183D46] text-white hover:bg-[#1f4f5c]"
                }`}
              >
                {journalSaved ? "✓ 保存済み" : "完了・保存"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 壁打ちモード ─────────────────────────────── */}
      {mode === "coach" && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

              {visibleMessages.length === 0 && isLoading && <TypingIndicator />}

              {visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* アバター */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      m.role === "assistant"
                        ? "bg-[#183D46] text-white"
                        : "bg-[#D8E8EB] text-[#183D46]"
                    }`}
                  >
                    {m.role === "assistant" ? "🪞" : initial}
                  </div>

                  {/* バブル */}
                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "assistant"
                        ? "bg-white border border-[#D8E8EB] text-[#171717] rounded-tl-sm shadow-sm"
                        : "bg-[#183D46] text-white rounded-tr-sm"
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

          {/* Coach footer */}
          <div className={`border-t ${borderBg} backdrop-blur-md sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-3 py-2.5">

              {/* ── セーフティモード トグル ── */}
              <div className="flex items-center justify-between px-1 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">
                    {safetyMode ? "🛡️" : "💪"}
                  </span>
                  <span className="text-[11px] text-[#9A9A9A]">
                    {safetyMode
                      ? "セーフティモード（絶対的受容）"
                      : "通常コーチング"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSafetyMode((s) => !s)}
                  aria-label="セーフティモード切替"
                  className="flex items-center gap-1.5 focus:outline-none"
                >
                  <span className="text-[10px] text-[#BCBCBC]">切替</span>
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                      safetyMode ? "bg-[#183D46]" : "bg-[#D8D8D8]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        safetyMode ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {remaining <= 0 ? (
                <p className="text-center text-sm text-[#9A9A9A] py-3">
                  今日はここまでにしましょう。明日また話しましょう。
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    handleSubmit(e);
                    if (textareaRef.current) textareaRef.current.style.height = "auto";
                  }}
                  className="flex items-end gap-2"
                >
                  {/* マイクボタン */}
                  <button
                    type="button"
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#E6F0F2] hover:bg-[#D8E8EB] transition-colors text-[#183D46]"
                    aria-label="音声入力"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="1" width="6" height="10" rx="3" />
                      <path d="M3 9c0 3.314 2.686 6 6 6s6-2.686 6-6" />
                      <path d="M9 15v2" />
                    </svg>
                  </button>

                  {/* テキスト入力 */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleCoachInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      safetyMode
                        ? "何でも話して、ただ聴いてもらう..."
                        : "コーチに相談・意見を求める..."
                    }
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none bg-white border border-[#C8DDE2] focus:border-[#183D46]/50 rounded-xl px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#BCBCBC] focus:outline-none disabled:opacity-50 transition-colors shadow-sm"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />

                  {/* 送信ボタン */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#183D46] text-white hover:bg-[#1f4f5c] transition-colors disabled:opacity-30"
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

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-8 h-8 rounded-full bg-[#183D46] flex items-center justify-center text-base flex-shrink-0">
        🪞
      </div>
      <div className="bg-white border border-[#D8E8EB] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-[#B0C8CE] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
