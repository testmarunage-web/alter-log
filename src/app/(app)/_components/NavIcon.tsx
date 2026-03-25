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
    case "reports":
      return (
        <svg {...props}>
          <path d="M4 14v-4M8 14V8M12 14v-6M16 14V4" />
        </svg>
      );
    case "profile":
      return (
        <svg {...props}>
          <circle cx="10" cy="7" r="3.5" />
          <path d="M3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" />
        </svg>
      );
  }
}
