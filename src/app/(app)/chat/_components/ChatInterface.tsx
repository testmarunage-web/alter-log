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

  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") === "coach" ? "coach" : "journal") as Mode;

  const [journalText, setJournalText]   = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [localUsedCount, setLocalUsedCount] = useState(initialUsedCount);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: { sessionId },
      onFinish: () => setLocalUsedCount((c) => c + 1),
    });

  // コーチモード：初回のみ開幕トリガーを送る
  useEffect(() => {
    if (mode !== "coach") return;
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

  const isJournal = mode === "journal";
  const pageBg    = isJournal ? "bg-[#FAFAF8]" : "bg-[#F4F8F9]";
  const headerBg  = isJournal ? "bg-[#FAFAF8]/95 border-[#E8E4DE]" : "bg-[#F4F8F9]/95 border-[#C8DDE2]";
  const footerBg  = headerBg;

  const modeTitle    = isJournal ? "吐き出す" : "思考を整理する";
  const modeSubtitle = isJournal
    ? "まとまっていなくて構いません。ここに置いていってください。"
    : "コーチと一緒に、モヤモヤの正体を見つけていきましょう。";

  return (
    <div className={`h-full min-h-screen ${pageBg} text-[#171717] flex flex-col`}>

      {/* ── ヘッダー ── */}
      <header className={`border-b ${headerBg} backdrop-blur-md sticky top-0 z-10`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {/* 戻るボタン */}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="ダッシュボードへ戻る"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#9A9A9A] hover:text-[#5C5C5C] hover:bg-black/[0.05] transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          {/* タイトル */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-[#1A1A1A] leading-tight">{modeTitle}</p>
            <p className="text-[11px] text-[#BCBCBC] leading-snug mt-0.5 truncate">{modeSubtitle}</p>
          </div>
        </div>
      </header>

      {/* ── ジャーナルモード ── */}
      {isJournal && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8">
              {/* 日付 */}
              <p className="text-xs text-[#C8C8C8] mb-6 select-none">
                {new Date().toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>

              {/* 書き込みエリア */}
              <textarea
                value={journalText}
                onChange={(e) => {
                  setJournalText(e.target.value);
                  setJournalSaved(false);
                }}
                placeholder="今、心にあることをそのまま書き出してみてください。うまく書かなくて大丈夫です。"
                className="w-full resize-none border-none bg-transparent text-base text-[#2A2A2A] leading-loose placeholder:text-[#D4D0CA] focus:outline-none"
                style={{ minHeight: "58vh" }}
              />
            </div>
          </main>

          {/* フッター */}
          <div className={`border-t ${footerBg} backdrop-blur-md sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
              <span className="text-xs text-[#C8C8C8] tabular-nums">
                {journalText.length} 文字
              </span>
              <button
                onClick={() => setJournalSaved(true)}
                disabled={journalText.trim().length === 0}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 ${
                  journalSaved
                    ? "bg-[#F2F2F2] text-[#5C5C5C]"
                    : "bg-[#183D46] text-white hover:bg-[#1e4d59]"
                }`}
              >
                {journalSaved ? "✓ 保存済み" : "完了・保存"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── コーチモード ── */}
      {!isJournal && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

              {visibleMessages.length === 0 && isLoading && <TypingIndicator />}

              {visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* アバター */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      m.role === "assistant"
                        ? "bg-[#183D46] text-white"
                        : "bg-[#D8E8EB] text-[#183D46]"
                    }`}
                  >
                    {m.role === "assistant" ? "🪞" : initial}
                  </div>

                  {/* バブル */}
                  <div
                    className={`max-w-[78%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "assistant"
                        ? "bg-white border border-[#D8E8EB] text-[#2A2A2A] rounded-tl-sm shadow-sm"
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

          {/* フッター */}
          <div className={`border-t ${footerBg} backdrop-blur-md sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-4 py-3.5">
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
                  {/* テキスト入力 */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleCoachInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="何でも話しかけてください..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none bg-white border border-[#C8DDE2] focus:border-[#183D46]/50 rounded-2xl px-4 py-3 text-sm text-[#2A2A2A] placeholder:text-[#C0C0C0] focus:outline-none disabled:opacity-50 transition-colors shadow-sm"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />

                  {/* 送信ボタン */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-[#183D46] text-white hover:bg-[#1e4d59] transition-colors disabled:opacity-30 shadow-sm"
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
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-full bg-[#183D46] flex items-center justify-center text-base flex-shrink-0">
        🪞
      </div>
      <div className="bg-white border border-[#D8E8EB] rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
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
