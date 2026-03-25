import type { NavIcon } from "./NavItems";

export function NavIconSvg({ icon, size = 20 }: { icon: NavIcon; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "home":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="7" height="7" rx="1.5" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...props}>
          <path d="M17 12a2 2 0 0 1-2 2H6l-3 3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7Z" />
        </svg>
      );
    case "archive":
      return (
        <svg {...props}>
          <path d="M4 4h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M5 8v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8" />
          <path d="M8 12h4" />
        </svg>
      );
    case "log":
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="8" />
          <circle cx="10" cy="10" r="2.5" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2" />
        </svg>
      );
  }
}
