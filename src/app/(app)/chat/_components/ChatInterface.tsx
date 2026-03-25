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

// ── 処方箋カード（ダークテーマ） ─────────────────────────────────────────────
function PrescriptionCard() {
  return (
    <div className="flex gap-3">
      <AlterOrb />
      <div className="max-w-[84%] space-y-0">
        {/* 通常バブル（導入テキスト） */}
        <div className="bg-[#3AAFCA]/10 border border-[#3AAFCA]/20 rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm leading-relaxed text-[#E8E3D8] mb-3">
          ペソさんと話してきて、少し気づいたことがあります。今日は、いつもと違う形でお伝えさせてください。
        </div>

        {/* 処方箋カード本体 */}
        <div className="bg-[#3AAFCA]/[0.06] border border-[#3AAFCA]/20 rounded-2xl overflow-hidden">
          {/* カードヘッダー */}
          <div
            className="px-5 py-3.5 flex items-center gap-2.5"
            style={{ background: "linear-gradient(135deg, #1A6B8A 0%, #2A9D8F 100%)" }}
          >
            <div
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{
                background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 50%, #1A6B8A)",
                boxShadow: "0 0 8px rgba(147,228,212,0.6)",
              }}
            />
            <p className="text-[11px] font-bold tracking-widest text-white/90 uppercase">
              Alterからの処方箋
            </p>
          </div>

          {/* カード本文 */}
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-[#9A9488] leading-relaxed">
              ペソさんのここ数ヶ月の葛藤を分析した結果、今の壁を越えるためには小手先のテクニックではなく、
              <span className="font-semibold text-[#E8E3D8]">この本が決定的なブレイクスルーになるはず</span>
              です。
            </p>

            {/* 書籍情報 */}
            <div className="flex gap-3.5 items-start bg-black/20 rounded-xl px-4 py-3.5">
              <div
                className="w-12 h-16 rounded-lg flex-shrink-0 flex items-end justify-center pb-1"
                style={{ background: "linear-gradient(160deg, #1A3A4A 0%, #0F2530 100%)" }}
              >
                <span className="text-[7px] text-white/40 font-bold tracking-tight text-center leading-tight px-0.5">
                  HIGH OUTPUT
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#E8E3D8] leading-snug mb-1">
                  HIGH OUTPUT MANAGEMENT
                </p>
                <p className="text-[11px] text-[#8A8276] mb-1">アンドリュー・S・グローブ</p>
                <p className="text-xs text-[#9A9488] leading-relaxed">
                  「成果を出す」ことの本質を、マネジメントの視点から再定義した一冊。
                  今のペソさんが感じている「頑張っているのに前に進まない感覚」の正体が、ここにあります。
                </p>
              </div>
            </div>

            {/* アフィリエイトボタン */}
            <a
              href="https://www.amazon.co.jp/s?k=HIGH+OUTPUT+MANAGEMENT"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1A6B8A 0%, #2A9D8F 100%)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 1h6v6M13 1L6 8M5 3H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-3" />
              </svg>
              Amazonで詳細を見る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── モックメッセージ（初回デモ表示用） ───────────────────────────────────────
const MOCK_DEMO: Array<{ role: "user" | "assistant" | "prescription"; content: string; id: string }> = [
  {
    id: "mock-1",
    role: "assistant",
    content: "こんにちは。今日はどんなことが頭の中にありますか？どんな小さなことでも構いません、話しかけてください。",
  },
  {
    id: "mock-2",
    role: "user",
    content: "最近、仕事で頑張っているつもりなのに、なかなか結果が出なくて。自分のやり方が間違っているのかなと思ってしまって…",
  },
  {
    id: "mock-3",
    role: "assistant",
    content: "「頑張っているのに結果が出ない」という感覚、もう少し聞かせてもらえますか？具体的にどんな場面でそれを感じますか？",
  },
  { id: "mock-4", role: "prescription", content: "" },
];

// ── メインコンポーネント ─────────────────────────────────────────────────────
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

  const router       = useRouter();
  const searchParams = useSearchParams();

  const [currentMode, setCurrentMode] = useState<Mode>(
    searchParams.get("mode") === "coach" ? "coach" : "journal"
  );
  const [journalText, setJournalText]       = useState("");
  const [journalSaved, setJournalSaved]     = useState(false);
  const [localUsedCount, setLocalUsedCount] = useState(initialUsedCount);
  const [hintOpen, setHintOpen]             = useState(false);

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
  const isJournal       = currentMode === "journal";

  const headerFooterCls = "bg-[#0B0E13]/80 border-[#C4A35A]/10 backdrop-blur-md";

  // コーチモードで本番メッセージがない場合はモックデモを表示
  const showDemo = !isJournal && visibleMessages.length === 0 && !isLoading;

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
                独白（吐き出す）
              </button>
              <button
                type="button"
                onClick={() => setCurrentMode("coach")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  !isJournal
                    ? "bg-[#3AAFCA]/20 text-[#E8E3D8]"
                    : "text-[#8A8276] hover:text-[#E8E3D8]"
                }`}
              >
                探索（壁打ち）
              </button>
            </div>
          </div>

          {/* 右端スペーサー（レイアウト均衡用） */}
          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
            {!isJournal && <AlterOrb size="sm" />}
          </div>
        </div>
      </header>

      {/* ── ジャーナルモード ── */}
      {isJournal && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8">
              <p className="text-xs text-[#8A8276] mb-6 select-none">
                {new Date().toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>
              <textarea
                value={journalText}
                onChange={(e) => {
                  setJournalText(e.target.value);
                  setJournalSaved(false);
                }}
                placeholder="今、心にあることをそのまま書き出してみてください。うまく書かなくて大丈夫です。"
                className="w-full resize-none border-none bg-transparent text-base text-[#E8E3D8] leading-loose placeholder:text-[#8A8276] focus:outline-none"
                style={{ minHeight: "58vh" }}
              />
            </div>
          </main>

          <div className={`border-t ${headerFooterCls} sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-5 pt-2.5">
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
                <div className="mt-1.5 mb-2 bg-white/[0.02] border border-[#C4A35A]/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-[#8A8276] mb-1">Alterからの問いかけ</p>
                  <p className="text-sm text-[#E8E3D8] leading-relaxed">
                    <span className="font-semibold text-[#C4A35A]">「最近、一番ホッとした瞬間はいつですか？」</span>
                  </p>
                </div>
              )}
            </div>
            <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
              <span className="text-xs text-[#8A8276] tabular-nums">
                {journalText.length} 文字
              </span>
              <button
                onClick={() => setJournalSaved(true)}
                disabled={journalText.trim().length === 0}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 ${
                  journalSaved
                    ? "bg-white/[0.06] text-[#9A9488]"
                    : "bg-[#3AAFCA] text-[#0B0E13] hover:bg-[#4ABFDA]"
                }`}
              >
                {journalSaved ? "✓ 保存済み" : "完了・保存"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Alterモード（壁打ち） ── */}
      {!isJournal && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

              {/* デモ表示（本番メッセージがない場合） */}
              {showDemo && MOCK_DEMO.map((m) =>
                m.role === "prescription" ? (
                  <PrescriptionCard key={m.id} />
                ) : (
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
                      {m.content}
                    </div>
                  </div>
                )
              )}

              {/* 本番メッセージ */}
              {!showDemo && (
                <>
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
                </>
              )}

              <div ref={bottomRef} />
            </div>
          </main>

          {/* フッター */}
          <div className={`border-t ${headerFooterCls} sticky bottom-0`}>
            <div className="max-w-2xl mx-auto px-4 pt-2.5 pb-3">
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

              {remaining <= 0 ? (
                <p className="text-center text-sm text-[#9A9488] py-2">
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
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleAlterInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="何でも話しかけてください..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none bg-black/40 border border-[#3AAFCA]/30 focus:border-[#3AAFCA]/60 rounded-2xl px-4 py-3 text-sm text-[#E8E3D8] placeholder:text-[#8A8276] focus:outline-none disabled:opacity-50 transition-colors"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-[#3AAFCA] text-[#0B0E13] hover:bg-[#4ABFDA] transition-colors disabled:opacity-30"
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
