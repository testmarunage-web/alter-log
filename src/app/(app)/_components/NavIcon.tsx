import { Home, Mic, MessagesSquare } from "lucide-react";
import type { NavIcon } from "./NavItems";

// Alter Orb — グラデーション球体（ナビ専用・小サイズ）
function AlterOrbIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <defs>
        <radialGradient id="nav-orb-g" cx="38%" cy="38%" r="62%" fx="38%" fy="38%">
          <stop offset="0%" stopColor="#93E4D4" />
          <stop offset="45%" stopColor="#3AAFCA" />
          <stop offset="100%" stopColor="#1A6B8A" />
        </radialGradient>
        <radialGradient id="nav-orb-gloss" cx="62%" cy="28%" r="58%" fx="62%" fy="28%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="7" fill="url(#nav-orb-g)" />
      <circle cx="10" cy="10" r="7" fill="url(#nav-orb-gloss)" />
    </svg>
  );
}

export function NavIconSvg({ icon, size = 20 }: { icon: NavIcon; size?: number }) {
  const lucideProps = { size, strokeWidth: 1.6 };

  switch (icon) {
    case "home":
      return <Home {...lucideProps} />;
    case "journal":
      return <Mic {...lucideProps} />;
    case "coach":
      return <MessagesSquare {...lucideProps} />;
    case "archive":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M5 8v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8" />
          <path d="M8 12h4" />
        </svg>
      );
    case "log":
      return <AlterOrbIcon size={size} />;
  }
}
