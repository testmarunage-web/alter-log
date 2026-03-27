"use client";

import { useEffect, useState } from "react";

// BeforeInstallPromptEvent is not in the standard TS lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /ipad|iphone|ipod/i.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const DISMISSED_KEY = "alter-log-pwa-dismissed";

export function AddToHomePrompt() {
  const [showIos, setShowIos] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      const t = setTimeout(() => setShowIos(true), 4000);
      return () => clearTimeout(t);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        const t = setTimeout(() => setShowAndroid(true), 4000);
        return () => clearTimeout(t);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShowIos(false);
    setShowAndroid(false);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  }

  if (!showIos && !showAndroid) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-500">
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
            {/* App icon */}
            <div
              className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden relative"
              style={{
                background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 45%, #1A6B8A)",
                boxShadow: "0 0 10px rgba(58,175,202,0.4)",
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

        {showIos && (
          <div
            className="rounded-xl p-3 text-xs text-[#9A9488] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-[#C4A35A] font-semibold">Safari</span> のメニューから
            <span className="mx-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[#E8E3D8] font-medium" style={{ background: "rgba(255,255,255,0.08)" }}>
              共有
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
            → <span className="text-[#E8E3D8] font-medium">「ホーム画面に追加」</span> をタップしてください。
          </div>
        )}

        {showAndroid && (
          <button
            onClick={installAndroid}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#C4A35A] hover:bg-[#C4A35A]/25 transition-colors"
            style={{
              background: "rgba(196,163,90,0.12)",
              border: "1px solid rgba(196,163,90,0.35)",
            }}
          >
            ホーム画面に追加
          </button>
        )}
      </div>
    </div>
  );
}
