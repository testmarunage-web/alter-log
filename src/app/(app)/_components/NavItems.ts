export const navItems = [
  { href: "/dashboard", label: "ホーム",      shortLabel: "ホーム",    icon: "home"    },
  { href: "/chat",      label: "セッション",   shortLabel: "セッション", icon: "chat"    },
  { href: "/archive",   label: "レポート",     shortLabel: "レポート",  icon: "archive" },
  { href: "/alter-log", label: "観測ログ",     shortLabel: "ログ",      icon: "log"     },
] as const;

export type NavIcon = (typeof navItems)[number]["icon"];
