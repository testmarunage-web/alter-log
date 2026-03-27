export const navItems = [
  { href: "/dashboard",          label: "ホーム",    shortLabel: "ホーム",    icon: "home"    },
  { href: "/chat?mode=journal",  label: "ジャーナル", shortLabel: "ジャーナル", icon: "journal" },
  { href: "/chat?mode=coach",    label: "壁打ち",    shortLabel: "壁打ち",    icon: "coach"   },
  { href: "/archive",            label: "レポート",   shortLabel: "レポート",  icon: "archive" },
  { href: "/alter-log",          label: "Alter Log",  shortLabel: "Alter Log", icon: "log"     },
] as const;

export type NavIcon = (typeof navItems)[number]["icon"];
