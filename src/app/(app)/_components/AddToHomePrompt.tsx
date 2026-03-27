"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Scenario =
  | { kind: "in-app" }              // LINE / Twitter(X) / Instagram 等
  | { kind: "ios-safari" }          // iOS Safari
  | { kind: "ios-chrome" }          // iOS Chrome
  | { kind: "android-native"; prompt: BeforeInstallPromptEvent }
  | { kind: "android-manual" };     // Android フォールバック

// ─────────────────────────────────────────────────────────────────────────────
// 24時間スヌーズ（localStorage）
// ─────────────────────────────────────────────────────────────────────────────
const SNOOZE_KEY = "alter-log-pwa-snoozed-at";
const SNOOZE_MS  = 86_400_000; // 24時間

function isAlreadySnoozed(): boolean {
  try {
    const ts = localStorage.getItem(SNOOZE_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function saveSnooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch { /* unavailable */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// 環境判定
// ─────────────────────────────────────────────────────────────────────────────
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type EnvKind = "in-app" | "ios-safari" | "ios-chrome" | "android" | "other";

function detectEnv(): EnvKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;

  // アプリ内ブラウザ（LINE / Twitter(X) / Instagram / Facebook）
  if (/line\/|twitterandroid|twitteriphone|instagram|fban|fbav/i.test(ua)) {
    return "in-app";
  }

  const isIos =
    /ipad|iphone|ipod/i.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (isIos) {
    if (/crios/i.test(ua)) return "ios-chrome";   // iOS Chrome
    if (/safari/i.test(ua) && !/fxios|opios|mercury/i.test(ua)) return "ios-safari";
    // その他のiOSブラウザはアプリ内ブラウザと同様に案内
    return "in-app";
  }

  if (/android/i.test(ua)) return "android";
  return "other";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function AddToHomePrompt() {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (isAlreadySnoozed()) return;

    const env = detectEnv();

    if (env === "in-app") {
      const t = setTimeout(() => setScenario({ kind: "in-app" }), 4000);
      return () => clearTimeout(t);
    }

    if (env === "ios-safari") {
      const t = setTimeout(() => setScenario({ kind: "ios-safari" }), 4000);
      return () => clearTimeout(t);
    }

    if (env === "ios-chrome") {
      const t = setTimeout(() => setScenario({ kind: "ios-chrome" }), 4000);
      return () => clearTimeout(t);
    }

    if (env === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        const t = setTimeout(
          () => setScenario({ kind: "android-native", prompt: e as BeforeInstallPromptEvent }),
          4000
        );
        return () => clearTimeout(t);
      };
      window.addEventListener("beforeinstallprompt", handler);

      // 8秒でネイティブプロンプトが来なければメニュー案内
      const fallback = setTimeout(() => {
        setScenario((prev) => (prev === null ? { kind: "android-manual" } : prev));
      }, 8000);

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(fallback);
      };
    }
  }, []);

  function dismiss() {
    saveSnooze();
    setScenario(null);
  }

  async function installNative() {
    if (scenario?.kind !== "android-native") return;
    await scenario.prompt.prompt();
    await scenario.prompt.userChoice;
    dismiss();
  }

  if (!scenario) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto">
      <div
        className="rounded-2xl p-4 shadow-2xl"
        style={{
          background: "rgba(20, 26, 34, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(196,163,90,0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden relative"
              style={{
                background: "radial-gradient(circle at 38% 38%, #E8E3D8, #C4A35A 45%, #8A8276)",
                boxShadow: "0 0 10px rgba(196,163,90,0.4)",
              }}
            >
              <div
                className="absolute inset-0 rounded-xl"
                style={{ background: "radial-gradient(circle at 62% 28%, rgba(255,255,255,0.35), transparent 55%)" }}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#E8E3D8]">Alter Log</p>
              <p className="text-[10px] text-[#8A8276]">ホーム画面に追加</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#8A8276] hover:text-[#E8E3D8] hover:bg-white/[0.08] transition-colors flex-shrink-0 mt-0.5"
            aria-label="閉じる"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l9 9M10 1L1 10" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-[#9A9488] leading-relaxed mb-3">
          このアプリをホーム画面に追加して、いつでもすぐに思考を記録できるようにしましょう。
        </p>

        {/* LINE / SNS アプリ内ブラウザ */}
        {scenario.kind === "in-app" && (
          <div
            className="rounded-xl p-3 text-xs text-[#9A9488] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-[#C4A35A] font-semibold">Safari</span> や <span className="text-[#C4A35A] font-semibold">Chrome</span> で開き直すと、ホーム画面に追加してアプリとして使えます。
          </div>
        )}

        {/* iOS Safari */}
        {scenario.kind === "ios-safari" && (
          <div
            className="rounded-xl p-3 text-xs text-[#9A9488] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            下部の
            <span className="mx-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[#E8E3D8] font-medium" style={{ background: "rgba(255,255,255,0.08)" }}>
              シェアボタン
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
            から <span className="text-[#E8E3D8] font-medium">「ホーム画面に追加」</span> を選択してください。
          </div>
        )}

        {/* iOS Chrome */}
        {scenario.kind === "ios-chrome" && (
          <div
            className="rounded-xl p-3 text-xs text-[#9A9488] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            右上の
            <span className="mx-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[#E8E3D8] font-medium" style={{ background: "rgba(255,255,255,0.08)" }}>
              シェアボタン
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
            から <span className="text-[#E8E3D8] font-medium">「ホーム画面に追加」</span> を選択してください。
          </div>
        )}

        {/* Android Chrome: ネイティブプロンプト */}
        {scenario.kind === "android-native" && (
          <button
            onClick={installNative}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#C4A35A] hover:bg-[#C4A35A]/25 transition-colors"
            style={{
              background: "rgba(196,163,90,0.12)",
              border: "1px solid rgba(196,163,90,0.35)",
            }}
          >
            ホーム画面に追加
          </button>
        )}

        {/* Android フォールバック */}
        {scenario.kind === "android-manual" && (
          <div
            className="rounded-xl p-3 text-xs text-[#9A9488] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            ブラウザの
            <span className="mx-1 inline-flex items-center px-1.5 py-0.5 rounded text-[#E8E3D8] font-medium" style={{ background: "rgba(255,255,255,0.08)" }}>
              メニュー（︙）
            </span>
            から <span className="text-[#E8E3D8] font-medium">「ホーム画面に追加」</span> を選択してください。
          </div>
        )}
      </div>
    </div>
  );
}
