export const navItems = [
  { href: "/chat?mode=journal", label: "ジャーナル",  shortLabel: "ジャーナル",  icon: "journal" },
  { href: "/dashboard",         label: "ダッシュボード", shortLabel: "ダッシュ",   icon: "home"    },
  { href: "/chat?mode=coach",   label: "セッション",  shortLabel: "セッション",  icon: "coach"   },
  { href: "/alter-log",         label: "Alter Log",   shortLabel: "Alter Log",   icon: "log"     },
] as const;

export type NavIcon = (typeof navItems)[number]["icon"];
